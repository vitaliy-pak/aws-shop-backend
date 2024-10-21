import { createSuccessfulResponse } from "/opt/utils/api-responses";
import { products } from "/opt/data/products";
import { APIGatewayProxyResult } from "aws-lambda";

export const handler = async (): Promise<APIGatewayProxyResult> => {
    return createSuccessfulResponse(products);
}
