import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Code, Runtime } from "aws-cdk-lib/aws-lambda";
import * as path from 'path';
import { LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import { Function } from "aws-cdk-lib/aws-lambda";
import { Duration } from "aws-cdk-lib";
import { InstanceClass, InstanceSize, InstanceType, Port, SecurityGroup, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import { Credentials, DatabaseInstance, DatabaseInstanceEngine, StorageType } from "aws-cdk-lib/aws-rds";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";

export class CartServiceStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);
        if (!process.env.DB_NAME || !process.env.DB_USER) {
            throw new Error('Missing env variables');
        }

        const dbUser = process.env.DB_USER.trim();
        const dbName = process.env.DB_NAME.trim();

        const vpc = new Vpc(this, 'CartServiceVPC', {
            maxAzs: 2,
        });

        const dbSecret = new Secret(this, 'DBSecret', {
            secretName: 'MyDatabaseSecret',
            generateSecretString: {
                secretStringTemplate: JSON.stringify({ username: dbUser }),
                generateStringKey: 'password',
                excludePunctuation: true,
            },
        });

        const rdsSecurityGroup = new SecurityGroup(this, 'RDSSecurityGroup', {
            vpc,
            description: 'Allow access to RDS instance',
            allowAllOutbound: true,
        });

        const lambdaSecurityGroup = new SecurityGroup(this, 'LambdaSecurityGroup', {
            vpc,
            description: 'Allow access to Lambda function',
            allowAllOutbound: true,
        });

        rdsSecurityGroup.addIngressRule(lambdaSecurityGroup, Port.tcp(5432), 'Allow PostgreSQL access from Lambda');

        const dbInstance = new DatabaseInstance(this, 'PostgresDB', {
            engine: DatabaseInstanceEngine.POSTGRES,
            instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
            vpc,
            vpcSubnets: {
                subnetType: SubnetType.PRIVATE_WITH_EGRESS,
            },
            multiAz: false,
            allocatedStorage: 20,
            storageType: StorageType.GP2,
            databaseName: dbName,
            credentials: Credentials.fromGeneratedSecret(dbUser),
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            deletionProtection: false,
            securityGroups: [rdsSecurityGroup],
        });

        const nestJsFunction = new Function(this, 'NestJSFunction', {
            runtime: Runtime.NODEJS_20_X,
            handler: 'main.handler',
            code: Code.fromAsset(path.join(__dirname, '../../nodejs-aws-cart-api/dist')),
            memorySize: 1024,
            timeout: Duration.seconds(30),
            environment: {
                DB_HOST: dbInstance.dbInstanceEndpointAddress,
                DB_PORT: dbInstance.dbInstanceEndpointPort,
                DB_NAME: dbName,
                DB_SECRET_ARN: dbSecret.secretArn
            },
            vpc,
            securityGroups: [lambdaSecurityGroup],
        });

        dbInstance.grantConnect(nestJsFunction);

        dbSecret.grantRead(nestJsFunction);

        const api = new RestApi(this, 'CartServiceApi', {
            restApiName: 'Cart Service API',
            description: 'This service serves a Nest.js application with cart processing logic.',
        });

        const lambdaIntegration = new LambdaIntegration(nestJsFunction);

        api.root.addMethod('ANY', lambdaIntegration);
    }
}