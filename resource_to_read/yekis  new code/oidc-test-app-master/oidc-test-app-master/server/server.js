import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';

import tokenRoute from './routes/token.js';
import userinfoRoute from './routes/userinfo.js';

const app = express();
app.use(cors(
    {
        origin: 'http://localhost:3000', //Client/React front end dev server 
        credentials: true
    }
));
app.use(express.json());

app.use('/api/token', tokenRoute);
app.use('/api/userinfo', userinfoRoute);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));