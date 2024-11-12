import {
    CopyObjectCommand,
    CopyObjectCommandInput,
    DeleteObjectCommand,
    GetObjectCommand,
    GetObjectCommandInput,
    S3Client
} from '@aws-sdk/client-s3';
import { SendMessageBatchCommand, SQSClient } from '@aws-sdk/client-sqs';
import { S3Event, S3Handler } from "aws-lambda";
import { fromSSO } from "@aws-sdk/credential-providers";
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { parse } from "csv-parse";


export const handler: S3Handler = async (event: S3Event) => {
    console.log("event", event);

    try {
        const s3Client = new S3Client([{
            region: process.env.AWS_REGION,
            credentials: fromSSO({profile: process.env.AWS_PROFILE})
        }]);

        const sqsClient = new SQSClient([{
            region: process.env.AWS_REGION,
            credentials: fromSSO({profile: process.env.AWS_PROFILE})
        }]);

        const record = event.Records[0];
        const bucket = record.s3.bucket.name;
        const key = record.s3.object.key;

        console.log('s3', record.s3);

        const getObjectParams: GetObjectCommandInput = {
            Bucket: bucket,
            Key: key,
        };

        const getObjectCommand = new GetObjectCommand(getObjectParams);
        const response = await s3Client.send(getObjectCommand);

        const s3Stream = response.Body as Readable;

        const csvParser = parse({
            columns: true,
            skip_empty_lines: true,
        });

        const batchSize = 5;
        let batch: Promise<void>[] = [];

        const sendBatch = async () => {
            const sendMessageBatchCommand = new SendMessageBatchCommand({
                QueueUrl: process.env.SQS_QUEUE_URL!,
                Entries: batch.map((item, index) => ({
                    Id: index.toString(),
                    MessageBody: JSON.stringify(item),
                }))
            });

            try {
                const response = await sqsClient.send(sendMessageBatchCommand);
                console.log('Batch Message sent:', response);
            } catch (error) {
                console.error('Error sending batch message:', error);
            }
        };

        await pipeline(
            s3Stream,
            csvParser,
            async function* (source) {
                for await (const data of source) {
                    batch.push(data);

                    if (batch.length >= batchSize) {
                        await sendBatch();
                        batch = [];
                    }
                }

                if (batch.length > 0) {
                    await sendBatch();
                }
            }
        );

        const copyObjectParams: CopyObjectCommandInput = {
            Bucket: bucket,
            CopySource: `${bucket}/${key}`,
            Key: key.replace('uploaded/', 'parsed/'),
        };

        const copyObjectCommand = new CopyObjectCommand(copyObjectParams);
        await s3Client.send(copyObjectCommand);

        const deleteObjectCommand = new DeleteObjectCommand(getObjectParams);
        await s3Client.send(deleteObjectCommand);
    } catch (error) {
        console.error(error);
    }
};