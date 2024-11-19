import express from 'express';
import { connect } from 'mongoose';
import swaggerJSDoc from 'swagger-jsdoc';
import { serve, setup } from 'swagger-ui-express';
import cors from 'cors';
import { config } from 'dotenv';
config();
import * as _ from './types/request';
import routes from './routes';
import { swaggerConfig } from './utils/swaggerConfig';
import { socket } from "./controllers";
import { PORT, HOST, DB_URL } from './utils/envVariables';

const app = express();

connect(DB_URL)
.then(() => {
    console.log('Connected to database');
    app.use(cors());
    app.use('/api', routes);
    const swaggerDocs = swaggerJSDoc(swaggerConfig(HOST));
    app.use('/api/documentation', serve, setup(swaggerDocs));
    const server = app.listen(PORT, () => {
        console.log(`App is running in port ${PORT}`);
    });
    socket.initialize(server);
}).catch(() => {
    console.log('Something went wrong');
});