import { handler } from '../src';
import { APIGatewayEvent } from 'aws-lambda';
import { products } from '../../shared/data/products';
import "jest";

jest.mock('../../shared/data/products', () => ({
    products: [
        {id: 1, title: 'Product 1', price: 10.99, count: 1, description: 'Product 1'},
        {id: 2, title: 'Product 2', price: 20.99, count: 2, description: 'Product 2'},
        {id: 3, title: 'Product 3', price: 30.99, count: 3, description: 'Product 3'}
    ]
}));

describe('GetProductById handler', () => {
    it('should return a product when a valid productId is provided', async () => {
        const event: APIGatewayEvent = {
            pathParameters: {productId: '1'}
        } as any;

        const result = await handler(event);

        expect(result.statusCode).toBe(200);
        expect(JSON.parse(result.body)).toEqual(products[0]);
    });

    it('should return a 404 error when an invalid productId is provided', async () => {
        const event: APIGatewayEvent = {
            pathParameters: {productId: '999'}
        } as any;

        const result = await handler(event);

        expect(result.statusCode).toBe(404);
        expect(JSON.parse(result.body)).toEqual({message: 'Product not found'});
    });

    it('should return a 404 error when no productId is provided', async () => {
        const event: APIGatewayEvent = {
            pathParameters: {}
        } as any;

        const result = await handler(event);

        expect(result.statusCode).toBe(404);
        expect(JSON.parse(result.body)).toEqual({message: 'Product not found'});
    });
});