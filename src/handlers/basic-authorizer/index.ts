import { APIGatewayAuthorizerResult, APIGatewayTokenAuthorizerEvent } from "aws-lambda";

export const handler = async (event: APIGatewayTokenAuthorizerEvent): Promise<APIGatewayAuthorizerResult> => {
    console.log('event:', event);

    const credentials = process.env.CREDENTIALS;

    if (!credentials) {
        console.warn('CREDENTIALS environment variable is missing');
        return generatePolicy('Deny', event.methodArn);
    }

    const {type, authorizationToken} = event;

    if (type !== 'TOKEN' || !authorizationToken) {
        console.warn('No authorization token provided or wrong type');
        return generatePolicy('Deny', event.methodArn);
    }

    try {
        const encodedCredentials = authorizationToken.split(' ')[1];
        const decodedCredentials = Buffer.from(encodedCredentials, 'base64').toString('utf-8');
        const [username, password] = decodedCredentials.split(':');
        const areCredentialsValid = credentials === `${username}=${password}`;

        if (areCredentialsValid) {
            console.log('Authentication successful');
            return generatePolicy('Allow', event.methodArn);
        }

        console.warn('Invalid credentials');
        return generatePolicy('Deny', event.methodArn);
    } catch (error) {
        console.error('Error during authentication:', error);
        return generatePolicy('Deny', event.methodArn);
    }
}

const generatePolicy = (effect: 'Allow' | 'Deny', resource: string): APIGatewayAuthorizerResult => {
    return {
        principalId: 'user',
        policyDocument: {
            Version: '2012-10-17',
            Statement: [{
                Action: 'execute-api:Invoke',
                Effect: effect,
                Resource: resource
            }]
        }
    };
}