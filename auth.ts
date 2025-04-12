import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import { z } from 'zod';
import { User } from '@/app/lib/db/models/users';
import bcryptjs from 'bcryptjs'; 
import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });
const rfcRegex = /^([A-ZÑ&]{3,4})(\d{6})([A-Z\d]{3})$/;

async function getUser(rfc: string): Promise<User | undefined> {
  try {
    const user = await sql<User[]>`SELECT * FROM users WHERE rfc=${rfc}`;
    return user[0];
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}

export const { auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,

    async jwt({ token, user }) {

      if (user) {
        token.user = {
          id: user.rfc, 
          name: user.name || null,
          email: user.email || null,
          image: null,
          emailVerified: null,
          rfc: user.rfc,
          password: user.password,
          hire_date: user.hire_date,
          department_id: user.department_id,
          is_admin: user.is_admin,
          is_active: user.is_active,
          created_at: user.created_at,
          updated_at: user.updated_at
        };
      }
      
      return token;
    },
    async session({ session, token }) {
      if (token.user) {
        session.user = {
          id: token.user.id || '', 
          name: token.user.name || null,
          email: token.user.email || '',
          image: token.user.image || null,
          emailVerified: token.user.emailVerified || null, 

          rfc: token.user.rfc,
          password: token.user.password, 
          hire_date: token.user.hire_date,
          department_id: token.user.department_id,
          is_admin: token.user.is_admin,
          is_active: token.user.is_active,
          created_at: token.user.created_at,
          updated_at: token.user.updated_at
        };
      }
      return session;
    }
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ 
            rfc: z.string().regex(rfcRegex, 'Invalid RFC format. Must be a valid Mexican RFC.'),
            password: z.string().min(6) 
          })
          .safeParse(credentials);
          
        if (parsedCredentials.success) {
          const { rfc, password } = parsedCredentials.data;
          const user = await getUser(rfc);
          if (!user) return null;
          
          const passwordsMatch = await bcryptjs.compare(password, user.password);
          
          if (passwordsMatch) {
            return user;
          }
        }
        
        console.log('Credenciales Invalidas');
        return null;
      },
    }),
  ],
});