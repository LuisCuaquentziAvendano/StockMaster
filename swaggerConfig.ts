const swaggerConfig = (host: string) => {
    return {
        swaggerDefinition: {
            openapi: "3.1.0",
            info: {
                title: "Stock Master",
                description: "Web application to manage inventories, products and sales",
                version: "0.0.0"
            },
            servers: [
                { url: host }
            ]
        },
        apis: ["./src/**/*.ts"]
    }
}

export default swaggerConfig;