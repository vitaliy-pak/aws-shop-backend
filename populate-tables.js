const {DynamoDBClient, PutItemCommand} = require('@aws-sdk/client-dynamodb');
const { fromSSO } = require('@aws-sdk/credential-providers');
const {v4: uuidv4} = require('uuid');

const client = new DynamoDBClient({
    region: process.env.AWS_REGION,
    credentials: fromSSO({profile: process.env.AWS_PROFILE})
});

const products = [
    {
        id: uuidv4(),
        title: 'Product 1',
        description: 'Description for Product 1',
        price: 100,
    },
    {
        id: uuidv4(),
        title: 'Product 2',
        description: 'Description for Product 2',
        price: 150,
    },
];

const stock = [
    {
        product_id: products[0].id,
        count: 10,
    },
    {
        product_id: products[1].id,
        count: 5,
    },
];

async function populateProductsTable() {
    for (const product of products) {
        const command = new PutItemCommand({
            TableName: 'Products',
            Item: {
                id: {S: product.id},
                title: {S: product.title},
                description: {S: product.description},
                price: {N: product.price.toString()},
            },
        });
        await client.send(command);
        console.log(`Inserted product: ${product.title}`);
    }
}

async function populateStockTable() {
    for (const item of stock) {
        const command = new PutItemCommand({
            TableName: 'Stock',
            Item: {
                product_id: {S: item.product_id},
                count: {N: item.count.toString()},
            },
        });
        await client.send(command);
        console.log(`Inserted stock for product_id: ${item.product_id}`);
    }
}

(async () => {
    try {
        await populateProductsTable();
        await populateStockTable();
        console.log('Data insertion complete.');
    } catch (error) {
        console.error('Error inserting data:', error);
    }
})();