import { createSuccessfulResponse } from "../../shared/utils/api-responses";
import { products } from "../../shared/data/products";
import { APIGatewayProxyResult } from "aws-lambda";

export const handler = async (): Promise<APIGatewayProxyResult> => {
    return createSuccessfulResponse(products);
}
