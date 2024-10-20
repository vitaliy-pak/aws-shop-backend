import { APIGatewayProxyResult } from "aws-lambda";
import { RequestError } from "./errors";

export const createSuccessfulResponse = (data: unknown): APIGatewayProxyResult => {
    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'OPTIONS,GET',
        },
        body: JSON.stringify(data)
    };
}

export const createFailedResponse = (error: RequestError): APIGatewayProxyResult => {
    return {
        statusCode: error.statusCode,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'OPTIONS,GET',
        },
        body: JSON.stringify({message: error.message})
    };
}