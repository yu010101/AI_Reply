import { Pool } from 'pg';

declare module '@/lib/db' {
  export const db: Pool;
} 