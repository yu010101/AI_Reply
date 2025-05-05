import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { corsOptions } from './middleware/security';
import { rateLimiter } from './middleware/rateLimit';
import { csrfProtection } from './middleware/security';
import routes from './routes';

const app = express();

// プロキシの設定
app.set('trust proxy', 1);

// ミドルウェアの設定
app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));
app.use(rateLimiter);
app.use(csrfProtection);

// ルーティング
app.use(routes);

export { app }; 