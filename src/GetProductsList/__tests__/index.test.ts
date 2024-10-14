import "jest";
import { handler } from '../src';
import { APIGatewayProxyResult } from "aws-lambda";
import { products } from "../../shared/data/products";

jest.mock('../../shared/data/products', () => ({
    products: [
        {id: 1, title: 'Product 1', price: 10.99, count: 1, description: 'Product 1'},
        {id: 2, title: 'Product 2', price: 20.99, count: 2, description: 'Product 2'},
        {id: 3, title: 'Product 3', price: 30.99, count: 3, description: 'Product 3'}
    ]
}));

describe('GetProductsList handler', () => {
    it('should return a successful response with products', async () => {
        const result: APIGatewayProxyResult = await handler();

        expect(result.statusCode).toBe(200);
        expect(JSON.parse(result.body)).toEqual(products);
    });
});