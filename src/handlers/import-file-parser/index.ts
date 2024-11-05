import {
    CopyObjectCommand,
    CopyObjectCommandInput,
    DeleteObjectCommand,
    GetObjectCommand,
    GetObjectCommandInput,
    S3Client
} from '@aws-sdk/client-s3';
import { S3Event, S3Handler } from "aws-lambda";
import { fromSSO } from "@aws-sdk/credential-providers";
import csv from 'csv-parser';
import { Readable } from 'stream';

export const handler: S3Handler = async (event: S3Event) => {
    console.log("event", event);

    try {
        const s3Client = new S3Client([{
            region: process.env.AWS_REGION,
            credentials: fromSSO({profile: process.env.AWS_PROFILE})
        }]);

        const record = event.Records[0];
        const bucket = record.s3.bucket.name;
        const key = record.s3.object.key;

        const getObjectParams: GetObjectCommandInput = {
            Bucket: bucket,
            Key: key,
        };

        const getObjectCommand = new GetObjectCommand(getObjectParams);
        const response = await s3Client.send(getObjectCommand);

        const s3Stream = response.Body as Readable;

        s3Stream.pipe(csv())
            .on('data', (data) => console.log("product", data))
            .on('end', async () => {
                const copyObjectParams: CopyObjectCommandInput = {
                    Bucket: bucket,
                    CopySource: `${bucket}/${key}`,
                    Key: key.replace('uploaded/', 'parsed/'),
                };

                const copyObjectCommand = new CopyObjectCommand(copyObjectParams);
                await s3Client.send(copyObjectCommand);

                const deleteObjectCommand = new DeleteObjectCommand(getObjectParams);
                await s3Client.send(deleteObjectCommand);
            });
    } catch (error) {
        console.error(error);
    }
};