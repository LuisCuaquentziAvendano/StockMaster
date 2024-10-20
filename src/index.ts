import { config } from 'dotenv';
config();
import express from 'express';
import { connect } from 'mongoose';
import swaggerJSDoc from 'swagger-jsdoc';
import { serve, setup } from 'swagger-ui-express';
import swaggerConfig from '../swaggerConfig';
import routes from './routes';
import * as _ from './types/request';

const app = express();
const port = process.env.PORT || 3000;
const host = process.env.HOST || `http://localhost:${port}`;
const dbUrl = process.env.DB_URL;

connect(dbUrl)
.then(() => {
    console.log('Connected to database');
    app.use('/api', routes);
    const swaggerDocs = swaggerJSDoc(swaggerConfig(host));
    app.use('/api/documentation', serve, setup(swaggerDocs));
    app.listen(port, () => {
        console.log(`App is running in port ${port}`);
    });
}).catch(() => {
    console.log('Ocurrió un error');
});