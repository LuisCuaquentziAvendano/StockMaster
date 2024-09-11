import express, {Request, Response} from 'express';

const app = express();
const port = process.env.PORT || 3000;

app.get('', (req: Request, res: Response) => {
    res.send('API works');
});

app.listen(port, () => {
    console.log(`app is running in port ${port}`);
});
