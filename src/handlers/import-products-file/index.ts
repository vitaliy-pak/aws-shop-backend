import { createFailedResponse, createSuccessfulResponse } from "/opt/utils/api-responses";
import { BadRequestError, InternalServerError } from "/opt/utils/errors";
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import { fromSSO } from "@aws-sdk/credential-providers";

export const handler: APIGatewayProxyHandler = async (event): Promise<APIGatewayProxyResult> => {

    try {
        const s3Client = new S3Client([{
            region: process.env.AWS_REGION,
            credentials: fromSSO({profile: process.env.AWS_PROFILE})
        }]);

        const fileName = event.queryStringParameters?.name;

        if (!fileName) {
            return createFailedResponse(new BadRequestError('File name is required'));
        }

        const command = new PutObjectCommand({
            Bucket: process.env.BUCKET_NAME,
            Key: `uploaded/${fileName}`,
        });

        const signedUrl = await getSignedUrl(s3Client, command, {expiresIn: 60});

        return createSuccessfulResponse(signedUrl);
    } catch (error) {
        console.error(error);
        return createFailedResponse(new InternalServerError());
    }
};