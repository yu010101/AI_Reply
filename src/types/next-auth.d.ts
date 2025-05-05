import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user?: {
      id: string;
      tenantId: string;
      email: string;
      name?: string | null;
      image?: string | null;
    };
  }
} 