'use server';
 
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
 
 
export async function authenticate(
  formData: FormData,
) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Credenciales Invalidas.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}