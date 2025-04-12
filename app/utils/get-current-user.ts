'use server';

import { auth } from '@/auth';
import { User } from '@/app/lib/db/models/users';
import { cache } from 'react';

export const getCurrentUser = cache(async (): Promise<User | null> => {
  try {
    const session = await auth();
    return (session?.user as User | undefined) || null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
});

export const getCurrentUserRfc = cache(async (): Promise<string | null> => {
  try {
    const user = await getCurrentUser();
    
    if (user?.rfc) {
      return user.rfc;
    }
  
    
    return null;
  } catch (error) {
    console.error('Error getting current user RFC:', error);
    
    return null;
  }
});