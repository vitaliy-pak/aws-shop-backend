import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Code, Function, LayerVersion, Runtime } from "aws-cdk-lib/aws-lambda";
import path from "path";
import { JsonSchemaType, LambdaIntegration, MethodOptions, Model, RestApi } from "aws-cdk-lib/aws-apigateway";
import { Bucket, CorsRule, EventType, HttpMethods } from "aws-cdk-lib/aws-s3";
import { LambdaDestination } from "aws-cdk-lib/aws-s3-notifications";
import { Queue } from "aws-cdk-lib/aws-sqs";


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
            allowedHeaders: ['*'],
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

        const catalogItemsQueueUrl = cdk.Fn.importValue('CatalogItemsQueueUrl');
        const catalogItemsQueueArn = cdk.Fn.importValue('CatalogItemsQueueArn');

        const importFileParser = new Function(this, 'ImportFileParser', {
            runtime: Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: Code.fromAsset(path.join(__dirname, '../dist/src/handlers/import-file-parser')),
            layers: [
                dependenciesLayer
            ],
            environment: {
                SQS_QUEUE_URL: catalogItemsQueueUrl
            }
        });

        const catalogItemsQueue = Queue.fromQueueArn(this, 'CatalogItemsQueue', catalogItemsQueueArn);
        catalogItemsQueue.grantSendMessages(importFileParser);

        bucket.grantPut(importProductsFile);

        const api = new RestApi(this, 'ImportServiceApi', {
            restApiName: 'Import Service API',
            description: 'This service serves imports.',
        });
        const importResource = api.root.addResource('import');

        const responseModel = new Model(this, 'ResponseModel', {
            restApi: api,
            contentType: 'application/json',
            schema: {
                type: JsonSchemaType.STRING,
            },
        });

        const methodOptions: MethodOptions = {
            methodResponses: [
                {
                    statusCode: '200',
                    responseModels: {
                        'application/json': responseModel,
                    },
                },
                {
                    statusCode: '400',
                    responseModels: {
                        'application/json': Model.ERROR_MODEL,
                    },
                },
                {
                    statusCode: '500',
                    responseModels: {
                        'application/json': Model.ERROR_MODEL,
                    },
                },
            ],
        };

        importResource.addMethod('GET', new LambdaIntegration(importProductsFile), methodOptions);


        bucket.grantReadWrite(importFileParser);

        bucket.addEventNotification(EventType.OBJECT_CREATED, new LambdaDestination(importFileParser), {
            prefix: 'uploaded/',
        });
    }
}

