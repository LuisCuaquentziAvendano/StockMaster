import { connect } from 'mongoose';
import { app } from './app';
import { socket } from './controllers';
import { PORT, DB_URL } from './utils/envVariables';

connect(DB_URL)
.then(() => {
    console.log('Connected to database');
    const server = app.listen(PORT, () => {
        console.log(`App is running in port ${PORT}`);
    });
    socket.initialize(server);
}).catch(() => {
    console.log('Something went wrong');
});