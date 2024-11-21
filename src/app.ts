import express, { json } from 'express';
import cors from 'cors';
import { config } from 'dotenv';
config();
import * as _ from './types/request';
import routes from './routes';
import { googleAuth } from './middlewares';

export const app = express();
app.use(cors());
googleAuth(app);
app.use(json());
app.use('/api', routes);