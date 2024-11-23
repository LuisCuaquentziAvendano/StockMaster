import { API_URL } from './envVariables';

export const swaggerConfig = {
    swaggerDefinition: {
        openapi: "3.1.0",
        info: {
            title: "Stock Master",
            description: "Web application to manage inventories, products and sales",
            version: "0.0.0"
        },
        servers: [
            { url: API_URL }
        ]
    },
    apis: ["./src/**/*.ts"]
}