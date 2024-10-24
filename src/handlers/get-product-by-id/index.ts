import { createFailedResponse, createSuccessfulResponse } from '/opt/utils/api-responses';
import { products } from "/opt/data/products";
import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { NotFoundError } from "/opt/utils/errors";

export const handler = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
    const productId = event.pathParameters?.productId;
    const product = productId && products.find(p => p.id === parseInt(productId));

    if (!product) {
        return createFailedResponse(new NotFoundError('Product not found'));
    }

    return createSuccessfulResponse(product);
}
