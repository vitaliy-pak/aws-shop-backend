import { APIGatewayEvent, APIGatewayProxyResult, Context, Handler } from "aws-lambda";
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBClient, TransactWriteItemsCommand } from "@aws-sdk/client-dynamodb";
import { fromSSO } from "@aws-sdk/credential-providers";
import { createFailedResponse, createSuccessfulResponse } from "/opt/utils/api-responses";
import { BadRequestError, InternalServerError } from "/opt/utils/errors";
import { validateProduct } from "/opt/utils/validators";

export const handler: Handler = async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => {
    console.log("event:", event);

    try {

        const client = new DynamoDBClient([{
            region: process.env.AWS_REGION,
            credentials: fromSSO({profile: process.env.AWS_PROFILE})
        }]);

        const product = JSON.parse(event.body || '{}');
        const error = validateProduct(product);

        if (error) {
            return createFailedResponse(new BadRequestError(error));
        }

        const {title, description, price, count} = product;
        const productId = uuidv4();

        const transactCommand = new TransactWriteItemsCommand({
            TransactItems: [
                {
                    Put: {
                        TableName: process.env.PRODUCTS_TABLE,
                        Item: {
                            id: {S: productId},
                            title: {S: title},
                            description: {S: description},
                            price: {N: price.toString()},
                        }
                    }
                },
                {
                    Put: {
                        TableName: process.env.STOCK_TABLE,
                        Item: {
                            product_id: {S: productId},
                            count: {N: count.toString()},
                        }
                    }
                }
            ]
        });

        await client.send(transactCommand);

        return createSuccessfulResponse({message: 'Product and stock created successfully', productId}, 201);
    } catch (error) {
        console.error('Error creating product and stock:', error);
        return createFailedResponse(new InternalServerError());
    }
};