import Joi from 'joi';
import { Product } from "/opt/models/product";

const productSchema = Joi.object({
    title: Joi.string().required(),
    description: Joi.string().optional(),
    price: Joi.number().min(0).required(),
    count: Joi.number().min(0).required(),
});

export const validateProduct = (data: Product): string | null => {
    const {error} = productSchema.validate(data);
    if (error) {
        return 'Invalid product data'
    }

    return null;
};