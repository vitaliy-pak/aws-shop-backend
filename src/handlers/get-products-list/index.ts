import { createFailedResponse, createSuccessfulResponse } from "/opt/utils/api-responses";
import { APIGatewayProxyEvent, APIGatewayProxyResult, Handler } from "aws-lambda";
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { fromSSO } from "@aws-sdk/credential-providers";
import { InternalServerError } from "/opt/utils/errors";

export const handler: Handler<APIGatewayProxyEvent, APIGatewayProxyResult> = async (): Promise<APIGatewayProxyResult> => {
    const client = new DynamoDBClient([{
        region: process.env.AWS_REGION,
        credentials: fromSSO({ profile: process.env.AWS_PROFILE })
    }]);

    try {
        const productsCommand = new ScanCommand({
            TableName: process.env.PRODUCTS_TABLE,
        });
        const productsResult = await client.send(productsCommand);

        const stockCommand = new ScanCommand({
            TableName: process.env.STOCK_TABLE,
        });
        const stockResult = await client.send(stockCommand);

        const products = productsResult.Items?.map(product => {
            const stockItem = stockResult.Items?.find(stock => stock.product_id.S === product.id.S);
            return {
                id: product.id.S || '',
                title: product.title.S || '',
                description: product.description.S || '',
                price: parseInt(product.price.N || '') || 0,
                count: parseInt(stockItem?.count?.N || '') || 0,
            };
        }) || [];

        return createSuccessfulResponse(products);
    } catch (error) {
        console.error('Error fetching products:', error);
        return createFailedResponse(new InternalServerError());
    }
};