import { config } from 'dotenv';
config();
import express from 'express';
import { connect } from 'mongoose';
import swaggerJSDoc from 'swagger-jsdoc';
import { serve, setup } from 'swagger-ui-express';
import cors from 'cors';
import { swaggerConfig } from './swaggerConfig';
import routes from './routes';
import { PORT, HOST, DB_URL } from './utils/envVariables';
import * as _ from './types/request';

const app = express();

connect(DB_URL)
.then(() => {
    console.log('Connected to database');
    app.use(cors());
    app.use('/api', routes);
    const swaggerDocs = swaggerJSDoc(swaggerConfig(HOST));
    app.use('/api/documentation', serve, setup(swaggerDocs));
    app.listen(PORT, () => {
        console.log(`App is running in port ${PORT}`);
    });
}).catch(() => {
    console.log('Ocurrió un error');
});