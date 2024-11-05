import { handler } from './index';
import { APIGatewayProxyEvent, APIGatewayProxyResult, Callback, Context } from 'aws-lambda';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { InternalServerError } from "/opt/utils/errors";

jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner');

describe('import-products-file', () => {
    const context: Context = {} as any;
    const callback: Callback = () => {
    };

    beforeEach(() => {
        (getSignedUrl as jest.Mock).mockResolvedValue('https://signed-url');
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return a signed URL when fileName is provided', async () => {
        const event: APIGatewayProxyEvent = {
            queryStringParameters: {name: 'test.csv'},
        } as any;

        const result = await handler(event, context, callback) as APIGatewayProxyResult;

        expect(result.statusCode).toBe(200);
        expect(JSON.parse(result.body)).toBe('https://signed-url');
    });

    it('should return a BadRequestError when fileName is missing', async () => {
        const event: APIGatewayProxyEvent = {
            queryStringParameters: {},
        } as any;

        const result = await handler(event, context, callback) as APIGatewayProxyResult;

        expect(result.statusCode).toBe(400);
        expect(JSON.parse(result.body).message).toBe('File name is required');
    });

    it('should return an InternalServerError on failure', async () => {
        (getSignedUrl as jest.Mock).mockRejectedValue(new InternalServerError());

        const event: APIGatewayProxyEvent = {
            queryStringParameters: {name: 'test.csv'},
        } as any;

        const result = await handler(event, context, callback) as APIGatewayProxyResult;

        expect(result.statusCode).toBe(500);
    });
});