import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Code, Function, LayerVersion, Runtime } from "aws-cdk-lib/aws-lambda";
import path from "path";
import { LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import { Bucket, CorsRule, EventType, HttpMethods } from "aws-cdk-lib/aws-s3";
import { LambdaDestination } from "aws-cdk-lib/aws-s3-notifications";


export class ImportServiceStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const sharedLayer = new LayerVersion(this, 'SharedLayer', {
            code: Code.fromAsset(path.join(__dirname, '../dist/src/layers/shared')),
            compatibleRuntimes: [Runtime.NODEJS_20_X],
        });

        const dependenciesLayer = new LayerVersion(this, 'ImportServiceDepsLayer', {
            code: Code.fromAsset(path.join(__dirname, '../src/layers/import-service-deps')),
            compatibleRuntimes: [Runtime.NODEJS_20_X],
        });

        const corsRule: CorsRule = {
            allowedMethods: [
                HttpMethods.GET,
                HttpMethods.PUT,
                HttpMethods.POST,
                HttpMethods.DELETE,
                HttpMethods.HEAD,
            ],
            allowedOrigins: ['https://d1aiaa4o7nci8k.cloudfront.net'],
            allowedHeaders: ['Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'],
        };
        const bucket = new Bucket(this, 'ImportBucket', {
            bucketName: 'import-service-bucket',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            cors: [corsRule]
        });

        const importProductsFile = new Function(this, 'ImportProductsFile', {
            runtime: Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: Code.fromAsset(path.join(__dirname, '../dist/src/handlers/import-products-file')),
            layers: [
                sharedLayer
            ],
            environment: {
                BUCKET_NAME: bucket.bucketName
            }
        });

        const importFileParser = new Function(this, 'ImportFileParser', {
            runtime: Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: Code.fromAsset(path.join(__dirname, '../dist/src/handlers/import-file-parser')),
            layers: [
                dependenciesLayer
            ],
        });

        bucket.grantPut(importProductsFile);

        const api = new RestApi(this, 'ImportServiceApi', {
            restApiName: 'Import Service API',
            description: 'This service serves imports.',
        });
        const importResource = api.root.addResource('import');
        importResource.addMethod('GET', new LambdaIntegration(importProductsFile));


        bucket.grantReadWrite(importFileParser);

        bucket.addEventNotification(EventType.OBJECT_CREATED, new LambdaDestination(importFileParser), {
            prefix: 'uploaded/',
        });
    }
}

