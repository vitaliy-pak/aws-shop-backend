import { Code, Function, LayerVersion, Runtime } from 'aws-cdk-lib/aws-lambda';
import { JsonSchemaType, LambdaIntegration, Model, RestApi } from 'aws-cdk-lib/aws-apigateway';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import path from "path";
import { AttributeType, Table } from "aws-cdk-lib/aws-dynamodb";


export class ProductServiceStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const sharedLayer = new LayerVersion(this, 'SharedLayer', {
            code: Code.fromAsset(path.join(__dirname, '../dist/src/layers/shared')),
            compatibleRuntimes: [Runtime.NODEJS_20_X],
        });

        const dependenciesLayer = new LayerVersion(this, 'ProductServiceDepsLayer', {
            code: Code.fromAsset(path.join(__dirname, '../src/layers/product-service-deps')),
            compatibleRuntimes: [Runtime.NODEJS_20_X],
        });

        const productsTable = new Table(this, 'Products', {
            partitionKey: {name: 'id', type: AttributeType.STRING},
            tableName: 'Products',

        });

        const stockTable = new Table(this, 'Stock', {
            partitionKey: {name: 'product_id', type: AttributeType.STRING},
            tableName: 'Stock',
        });

        const getProductsList = new Function(this, 'GetProductsList', {
            runtime: Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: Code.fromAsset(path.join(__dirname, '../dist/src/handlers/get-products-list')),
            layers: [sharedLayer],
            environment: {
                PRODUCTS_TABLE: productsTable.tableName,
                STOCK_TABLE: stockTable.tableName
            }
        });

        const getProductById = new Function(this, 'GetProductById', {
            runtime: Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: Code.fromAsset(path.join(__dirname, '../dist/src/handlers/get-product-by-id')),
            layers: [sharedLayer],
            environment: {
                PRODUCTS_TABLE: productsTable.tableName,
                STOCK_TABLE: stockTable.tableName
            }
        });

        const api = new RestApi(this, 'ProductServiceApi', {
            restApiName: 'Product Service API',
            description: 'This service serves products.',
        });

        const productSchema = {
            type: JsonSchemaType.OBJECT,
            properties: {
                id: {type: JsonSchemaType.STRING},
                title: {type: JsonSchemaType.STRING},
                description: {type: JsonSchemaType.STRING},
                price: {type: JsonSchemaType.NUMBER},
                count: {type: JsonSchemaType.NUMBER},
            },
        };

        const productModel = new Model(this, 'ProductModel', {
            restApi: api,
            contentType: 'application/json',
            schema: productSchema
        });

        const productsListModel = new Model(this, 'ProductsListModel', {
            restApi: api,
            contentType: 'application/json',
            schema: {
                type: JsonSchemaType.ARRAY,
                items: productSchema
            },
        });

        const productsResource = api.root.addResource('products');
        productsResource.addMethod('GET', new LambdaIntegration(getProductsList), {
            methodResponses: [
                {
                    statusCode: "200",
                    responseModels: {
                        'application/json': productsListModel
                    }
                },
                {
                    statusCode: "500",
                    responseModels: {
                        'application/json': Model.ERROR_MODEL
                    }
                }
            ]
        });

        const singleProductResource = productsResource.addResource('{productId}');
        singleProductResource.addMethod('GET', new LambdaIntegration(getProductById), {
            methodResponses: [
                {
                    statusCode: "200",
                    responseModels: {
                        'application/json': productModel
                    }
                },
                {
                    statusCode: "404",
                    responseModels: {
                        'application/json': Model.ERROR_MODEL
                    }
                },
                {
                    statusCode: "500",
                    responseModels: {
                        'application/json': Model.ERROR_MODEL
                    }
                }
            ]
        });

        const {id: idProp, ...rest} = productSchema.properties;
        const createProductModel = new Model(this, 'CreateProductModel', {
            restApi: api,
            contentType: 'application/json',
            schema: {
                properties: {
                    ...rest,
                },
                required: ['title', 'price', 'count'],
            },
        });

        const createProduct = new Function(this, 'CreateProduct', {
            runtime: Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: Code.fromAsset(path.join(__dirname, '../dist/src/handlers/create-product')),
            layers: [sharedLayer, dependenciesLayer],
            environment: {
                PRODUCTS_TABLE: productsTable.tableName,
                STOCK_TABLE: stockTable.tableName
            }
        });

        productsResource.addMethod('POST', new LambdaIntegration(createProduct), {
            requestModels: {
                'application/json': createProductModel,
            },
            methodResponses: [
                {
                    statusCode: '201',
                    responseModels: {
                        'application/json': Model.ERROR_MODEL,
                    },
                },
                {
                    statusCode: "400",
                    responseModels: {
                        'application/json': Model.ERROR_MODEL
                    }
                },
                {
                    statusCode: "500",
                    responseModels: {
                        'application/json': Model.ERROR_MODEL
                    }
                }
            ],
        });

        productsTable.grantWriteData(createProduct);
        stockTable.grantWriteData(createProduct);

        productsTable.grantReadData(getProductById);
        stockTable.grantReadData(getProductById);

        productsTable.grantReadData(getProductsList);
        stockTable.grantReadData(getProductsList);
    }
}
