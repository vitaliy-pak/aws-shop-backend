import { handler } from './index';
import { DynamoDBClient, TransactWriteItemsCommand } from '@aws-sdk/client-dynamodb';
import { PublishBatchCommand, SNSClient } from '@aws-sdk/client-sns';

jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/client-sns');

const mockedDynamoDBClient = new DynamoDBClient();
const mockedSNSClient = new SNSClient();

beforeEach(() => {
    (mockedDynamoDBClient.send as jest.Mock).mockClear();
    (mockedSNSClient.send as jest.Mock).mockClear();
});

describe('catalog-batch-process', () => {
    it('should process records and interact with DynamoDB and SNS', async () => {
        const mockEvent = {
            Records: [{body: JSON.stringify({title: "Test Product", price: 100, count: 10})}]
        };

        (mockedDynamoDBClient.send as jest.Mock).mockResolvedValue({});
        (mockedSNSClient.send as jest.Mock).mockResolvedValue({});

        await handler(mockEvent as any);

        expect(mockedDynamoDBClient.send).toHaveBeenCalledWith(expect.any(TransactWriteItemsCommand));
        expect(mockedSNSClient.send).toHaveBeenCalledWith(expect.any(PublishBatchCommand));
    });

    it('should handle DynamoDB transaction failures', async () => {
        const mockEvent = {
            Records: [{body: JSON.stringify({title: "Faulty Product", price: 100, count: 10})}]
        };

        (mockedDynamoDBClient.send as jest.Mock).mockRejectedValue(new Error("DynamoDB Error"));
        (mockedSNSClient.send as jest.Mock).mockResolvedValue({});

        const response = await handler(mockEvent as any);

        expect(response.statusCode).toBe(500);
        expect(response.body).toContain('Internal Server Error');
        expect(mockedDynamoDBClient.send).toHaveBeenCalledWith(expect.any(TransactWriteItemsCommand));
        expect(mockedSNSClient.send).not.toHaveBeenCalled();
    });

    it('should handle SNS notification failures', async () => {
        const mockEvent = {
            Records: [{body: JSON.stringify({title: "Another Product", price: 200, count: 20})}]
        };

        (mockedDynamoDBClient.send as jest.Mock).mockResolvedValue({});
        (mockedSNSClient.send as jest.Mock).mockRejectedValue(new Error("SNS Error"));

        const response = await handler(mockEvent as any);

        expect(response.statusCode).toBe(500);
        expect(response.body).toContain('Internal Server Error');

        expect(mockedDynamoDBClient.send).toHaveBeenCalledWith(expect.any(TransactWriteItemsCommand));
        expect(mockedSNSClient.send).toHaveBeenCalledWith(expect.any(PublishBatchCommand));
    });
});