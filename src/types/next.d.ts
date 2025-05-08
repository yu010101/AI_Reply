import { NextApiRequest } from 'next';

declare module 'next' {
  interface NextApiRequest {
    user?: {
      id: string;
    };
    socket?: {
      remoteAddress?: string;
    };
  }
} 