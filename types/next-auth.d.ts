import { User as DbUser } from '@/app/lib/db/models/users';
import NextAuth from 'next-auth';
import { DefaultSession, DefaultUser } from 'next-auth';
import { JWT } from 'next-auth/jwt';

declare module 'next-auth' {
  /**
   * Extend the built-in session types
   */
  interface Session {
    user: DefaultSession["user"] & {
      rfc: string;
      hire_date: Date;
      department_id: string;
      is_admin: boolean;
      is_active: boolean;
      created_at: Date;
      updated_at: Date;
    }
  }

  /**
   * Extend the built-in user types
   */
  interface User extends DefaultUser {
    rfc: string;
    password: string;
    hire_date: Date;
    department_id: string;
    is_admin: boolean;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
  }
}

declare module 'next-auth/jwt' {
  /**
   * Extend the JWT types
   */
  interface JWT {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      emailVerified?: Date | null;
      rfc: string;
      password: string;
      hire_date: Date;
      department_id: string;
      is_admin: boolean;
      is_active: boolean;
      created_at: Date;
      updated_at: Date;
    }
  }
}