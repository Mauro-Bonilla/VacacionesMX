// app/lib/context/auth-context.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../db/models/users';

// Define the shape of our auth context
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  logout: async () => {},
  refetchUser: async () => {},
});

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// Props for the AuthProvider component
interface AuthProviderProps {
  initialUser?: User | null;
  children: ReactNode;
}

export function AuthProvider({ initialUser = null, children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Function to fetch user data
  const fetchUser = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/session');
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user || null);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Public method to refetch user data
  const refetchUser = async () => {
    await fetchUser();
  };
  
  // Function to handle user logout
  const logout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        setUser(null);
        window.location.href = '/'; // Redirect to login page
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Load user data if not provided initially
  useEffect(() => {
    // If we have initialUser data, use it immediately
    if (initialUser) {
      setUser(initialUser);
      setIsLoading(false);
    } else {
      // Otherwise fetch the user data
      fetchUser();
    }
    
    // Set a maximum loading time
    const maxLoadingTimer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);
    
    return () => clearTimeout(maxLoadingTimer);
  }, [initialUser]);

  // Provide the auth context value to children
  return (
    <AuthContext.Provider value={{ user, isLoading, logout, refetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}