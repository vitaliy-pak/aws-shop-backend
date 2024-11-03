import { SQSEvent } from 'aws-lambda';
import { DynamoDBClient, TransactWriteItem, TransactWriteItemsCommand } from '@aws-sdk/client-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { fromSSO } from '@aws-sdk/credential-providers';
import { createFailedResponse, createSuccessfulResponse } from '/opt/utils/api-responses';
import { BadRequestError, InternalServerError } from '/opt/utils/errors';
import { validateProduct } from "/opt/utils/validators";
import { PublishBatchCommand, PublishBatchRequestEntry, SNSClient } from '@aws-sdk/client-sns';

export const handler = async (event: SQSEvent) => {
    console.log("event", event);

    try {
        const dynamoDBClient = new DynamoDBClient([{
            region: process.env.AWS_REGION,
            credentials: fromSSO({profile: process.env.AWS_PROFILE}),
        }]);

        const snsClient = new SNSClient([{
            region: process.env.AWS_REGION,
            credentials: fromSSO({profile: process.env.AWS_PROFILE}),
        }]);

        const {transactItems, snsMessages} =
            event.Records
                .reduce((accumulator: {transactItems: TransactWriteItem[], snsMessages: PublishBatchRequestEntry[]}, record): {
                    transactItems: TransactWriteItem[],
                    snsMessages: PublishBatchRequestEntry[]
                } => {
                    const product = JSON.parse(record.body || '{}');
                    const error = validateProduct(product);

                    if (error) {
                        console.error(error);
                        return accumulator;
                    }

                    const {title, description, price, count} = product;
                    const productId = uuidv4();

                    const dynamoDBItems: TransactWriteItem[] = [
                        {
                            Put: {
                                TableName: process.env.PRODUCTS_TABLE,
                                Item: {
                                    id: {S: productId},
                                    title: {S: title},
                                    description: {S: description},
                                    price: {N: price.toString()},
                                },
                            },
                        },
                        {
                            Put: {
                                TableName: process.env.STOCK_TABLE,
                                Item: {
                                    product_id: {S: productId},
                                    count: {N: count.toString()},
                                },
                            },
                        },
                    ];

                    const snsMessage: PublishBatchRequestEntry = {
                        Id: productId,
                        Subject: title,
                        Message: JSON.stringify({productId, title, description, price, count}),
                        MessageAttributes: {
                            price: {
                                DataType: 'Number',
                                StringValue: price.toString()
                            }
                        }
                    };

                    accumulator.transactItems.push(...dynamoDBItems);
                    accumulator.snsMessages.push(snsMessage);

                    return accumulator;
                }, {transactItems: [], snsMessages: []});

        if (transactItems.length === 0) {
            return createFailedResponse(new BadRequestError('No valid products to process'));
        }

        const transactCommand = new TransactWriteItemsCommand({TransactItems: transactItems});
        await dynamoDBClient.send(transactCommand);
        console.log('Products and stocks created successfully');

        const batchedMessages = [];
        while (snsMessages.length) {
            batchedMessages.push(snsMessages.splice(0, 10));
        }

        for (const batch of batchedMessages) {
            const publishBatchCommand = new PublishBatchCommand({
                TopicArn: process.env.SNS_TOPIC_ARN,
                PublishBatchRequestEntries: batch as PublishBatchRequestEntry[]
            });

            await snsClient.send(publishBatchCommand);
            console.log('SNS batch published successfully');
        }

        return createSuccessfulResponse({message: 'Products and stocks created successfully'}, 201);
    } catch (error) {
        console.error('Error creating products and stocks:', error);
        return createFailedResponse(new InternalServerError());
    }
};