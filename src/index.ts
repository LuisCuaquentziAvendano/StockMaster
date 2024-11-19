import { config } from 'dotenv';
config();
import express from 'express';
import { googleAuth } from './middlewares';
const app = express();

import { connect } from 'mongoose';
import swaggerJSDoc from 'swagger-jsdoc';
import { serve, setup } from 'swagger-ui-express';
import cors from 'cors';
import { swaggerConfig } from './utils/swaggerConfig';
import routes from './routes';
import { PORT, API_URL, DB_URL } from './utils/envVariables';
import * as _ from './types/request';

connect(DB_URL)
.then(() => {
    app.use(cors());
    googleAuth(app);
    app.use('/api', routes);
    const swaggerDocs = swaggerJSDoc(swaggerConfig(API_URL));
    app.use('/api/documentation', serve, setup(swaggerDocs));
    app.listen(PORT, () => {
        console.log(`App is running in port ${PORT}`);
    });
}).catch(() => {
    console.log('Something went wrong');
});