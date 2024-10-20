import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { LambdaIntegration, MethodOptions, Model, RestApi } from 'aws-cdk-lib/aws-apigateway';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import path from "path";

export class ProductServiceStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const getProductsList = new Function(this, 'GetProductsList', {
            runtime: Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: Code.fromAsset(path.join(__dirname, '../src/GetProductsList/dist')),
        });

        const getProductById = new Function(this, 'GetProductById', {
            runtime: Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: Code.fromAsset(path.join(__dirname, '../src/GetProductById/dist')),
        });

        const api = new RestApi(this, 'ProductServiceApi', {
            restApiName: 'Product Service API',
            description: 'This service serves products.',
        });

        const methodResponses: MethodOptions = {
            methodResponses: [
                {
                    statusCode: "200",
                    responseModels: {
                        'application/json': Model.EMPTY_MODEL
                    }
                },
                {
                    statusCode: "404",
                    responseModels: {
                        'application/json': Model.ERROR_MODEL
                    }
                }
            ]
        }

        const productsResource = api.root.addResource('products');
        productsResource.addMethod('GET', new LambdaIntegration(getProductsList), methodResponses);

        const singleProductResource = productsResource.addResource('{productId}');
        singleProductResource.addMethod('GET', new LambdaIntegration(getProductById), methodResponses);
    }
}
