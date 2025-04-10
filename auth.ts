import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import { z } from 'zod';
import { User } from './app/lib/db/models/users';
import bcryptjs from 'bcryptjs'; // Changed from bcrypt to bcryptjs
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
          
          if (passwordsMatch) return user;
        }
        
        console.log('Invalid credentials');
        return null;
      },
    }),
  ],
});