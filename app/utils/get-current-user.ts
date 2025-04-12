'use server';

import { auth } from '@/auth';
import { User } from '@/app/lib/db/models/users';
import { cache } from 'react';

// Use React cache to memoize the result within a single render cycle
export const getCurrentUser = cache(async (): Promise<User | null> => {
  try {
    const session = await auth();
    return (session?.user as User | undefined) || null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
});

// A helper for getting user RFC with fallback for development
export const getCurrentUserRfc = cache(async (): Promise<string | null> => {
  try {
    const user = await getCurrentUser();
    
    if (user?.rfc) {
      return user.rfc;
    }
    
    // Use a fallback for development environments
    if (process.env.NODE_ENV === 'development') {
      return process.env.NEXT_PUBLIC_DEV_USER_RFC || 'MEGS801205ABC'; // Fallback to mock user in dev
    }
    
    return null;
  } catch (error) {
    console.error('Error getting current user RFC:', error);
    
    // Use a fallback for development environments
    if (process.env.NODE_ENV === 'development') {
      return process.env.NEXT_PUBLIC_DEV_USER_RFC || 'MEGS801205ABC'; // Fallback to mock user in dev
    }
    
    return null;
  }
});