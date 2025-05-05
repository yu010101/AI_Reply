import { compare, hash } from 'bcrypt';
import { sign, verify } from 'jsonwebtoken';
import { db } from '../db';
import { User } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const SALT_ROUNDS = 10;

export class AuthService {
  static async register(email: string, password: string, tenantId: string): Promise<User> {
    const passwordHash = await hash(password, SALT_ROUNDS);
    
    const result = await db.query(
      'INSERT INTO users (email, password_hash, tenant_id, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [email, passwordHash, tenantId, 'user', 'active']
    );
    
    return result.rows[0];
  }

  static async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      throw new Error('User not found');
    }

    const isValid = await compare(password, user.password_hash);
    if (!isValid) {
      throw new Error('Invalid password');
    }

    const token = sign(
      { userId: user.id, tenantId: user.tenant_id, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return { user, token };
  }

  static async verifyToken(token: string): Promise<{ userId: string; tenantId: string; role: string }> {
    try {
      const decoded = verify(token, JWT_SECRET) as { userId: string; tenantId: string; role: string };
      return decoded;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  static async getUser(userId: string): Promise<User> {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (!result.rows[0]) {
      throw new Error('User not found');
    }
    return result.rows[0];
  }
} 