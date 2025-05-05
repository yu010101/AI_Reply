import { Pool, QueryResult } from 'pg';

export interface Database {
  query: <T = any>(text: string, params?: any[]) => Promise<QueryResult<T>>;
  pool: Pool;
}

export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
  command: string;
  fields: any[];
} 