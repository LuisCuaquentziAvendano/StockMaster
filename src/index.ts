import express from 'express';
import { config } from 'dotenv';
import { connect } from 'mongoose';
import routes from './routes';
import * as _ from './types/request'
config();

const app = express();
const port = process.env.PORT || 3000;
const dbUrl = process.env.DB_URL;

connect(dbUrl)
.then(() => {
    console.log('Connected to database');
    app.use('/api', routes);
    app.listen(port, () => {
        console.log(`App is running in port ${port}`);
    });
}).catch(() => {
    console.log('Ocurrió un error');
});