enum StatusCode {
    BadRequest = 400,
    NotFound = 404,
    InternalServerError = 500
}

interface ErrorType {
    statusText: string;
    statusCode: StatusCode;
}

const errorTypes: Record<string, ErrorType> = {
    badRequestError: { statusText: 'Bad Request Error', statusCode: StatusCode.BadRequest },
    notFoundError: { statusText: 'Not Found Error', statusCode: StatusCode.NotFound },
    internalServerError: { statusText: 'Internal Server Error', statusCode: StatusCode.InternalServerError },
};

export class RequestError extends Error {
    public readonly statusCode: StatusCode;
    public readonly statusText: string;

    constructor({ statusCode, statusText }: ErrorType = errorTypes.internalServerError, message: string = 'Unknown error has occurred') {
        super(message);
        this.statusCode = statusCode;
        this.statusText = statusText;
    }
}

export class BadRequestError extends RequestError {
    constructor(message: string) {
        super(errorTypes.badRequestError, message);
    }
}

export class NotFoundError extends RequestError {
    constructor(message: string) {
        super(errorTypes.notFoundError, message);
    }
}

export class InternalServerError extends RequestError {
    constructor(message: string = 'Internal Server Error') {
        super(errorTypes.internalServerError, message);
    }
}