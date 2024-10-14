import { APIGatewayProxyResult } from "aws-lambda";
import { RequestError } from "./errors";

export const createSuccessfulResponse = (data: unknown): APIGatewayProxyResult => {
    return {
        statusCode: 200,
        body: JSON.stringify(data)
    };
}

export const createFailedResponse = (error: RequestError): APIGatewayProxyResult => {
    return {
        statusCode: error.statusCode,
        body: JSON.stringify({message: error.message})
    };
}