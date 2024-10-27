import { createFailedResponse, createSuccessfulResponse } from '/opt/utils/api-responses';
import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { BadRequestError, InternalServerError, NotFoundError } from "/opt/utils/errors";
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { fromSSO } from "@aws-sdk/credential-providers";

export const handler = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
    console.log("event", event);

    const client = new DynamoDBClient([{
        region: process.env.AWS_REGION,
        credentials: fromSSO({profile: process.env.AWS_PROFILE})
    }]);

    try {
        const productId = event.pathParameters?.productId;

        if (!productId) {
            return createFailedResponse(new BadRequestError('Product ID was not provided'))
        }

        const productCommand = new GetItemCommand({
            TableName: process.env.PRODUCTS_TABLE,
            Key: {
                id: {S: productId}
            }
        });

        const productResult = await client.send(productCommand);

        if (!productResult.Item) {
            return createFailedResponse(new NotFoundError('Product not found'));
        }

        const stockCommand = new GetItemCommand({
            TableName: process.env.STOCK_TABLE,
            Key: {
                product_id: {S: productId}
            }
        });

        const stockResult = await client.send(stockCommand);

        const product = {
            id: productResult.Item.id.S,
            title: productResult.Item.title.S,
            description: productResult.Item.description.S,
            price: parseInt(productResult.Item.price.N || '') || 0,
            count: parseInt(stockResult.Item?.count?.N || '') || 0,
        };

        return createSuccessfulResponse(product);
    } catch (error) {
        console.error('Error fetching product by ID:', error);
        return createFailedResponse(new InternalServerError());
    }
}
