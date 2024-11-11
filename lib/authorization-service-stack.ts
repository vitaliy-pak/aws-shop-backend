import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Code, Function, Runtime } from "aws-cdk-lib/aws-lambda";
import path from "path";

export class AuthorizationServiceStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const username = process.env.TEST_USERNAME?.trim();
        const password = process.env.TEST_PASSWORD?.trim();
        const credentials = `${username}=${password}`;

        const basicAuthorizer = new Function(this, 'BasicAuthorizer', {
            runtime: Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: Code.fromAsset(path.join(__dirname, '../dist/src/handlers/basic-authorizer')),
            environment: {
                CREDENTIALS: credentials
            }
        });

        new cdk.CfnOutput(this, 'BasicAuthorizerArn', {
            value: basicAuthorizer.functionArn,
            exportName: 'BasicAuthorizerArn'
        });
    }
}