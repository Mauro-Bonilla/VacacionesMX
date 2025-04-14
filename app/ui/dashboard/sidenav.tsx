// app/ui/dashboard/sidenav.tsx
'use client';
import Link from "next/link";
import NavLinks from "@/app/ui/dashboard/nav-links";
import CompanyLogo from "@/app/ui/company-logo";
import { PowerIcon, UserCircleIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@/app/lib/context/auth-context";
import { useState, useEffect } from "react";

export default function SideNav() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [localLoading, setLocalLoading] = useState(true);
  
  // Use a local loading state that resolves after a max time
  useEffect(() => {
    // If user data loaded, immediately stop loading
    if (user && user.name) {
      setLocalLoading(false);
      return;
    }
    
    // Set a maximum timeout for loading state
    const timer = setTimeout(() => {
      setLocalLoading(false);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [user]);
  
  // Update local loading when auth state changes
  useEffect(() => {
    if (!authLoading && user) {
      setLocalLoading(false);
    }
  }, [authLoading, user]);
  
  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    setIsLoggingOut(false);
  };
  
  return (
    <div className="flex h-full flex-col px-3 py-4 md:px-2">
      <Link
        className="mb-2 flex h-20 items-center justify-center rounded-md bg-gray-50 p-4 md:h-40"
        href="/"
      >
        <div className="w-full max-w-xs flex justify-center">
          <CompanyLogo />
        </div>
      </Link>
      
      {/* User profile section - preserve mobile centering */}
      <div className="flex items-center justify-center md:justify-start p-2 md:p-3 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors mb-2 md:mb-0 h-[60px]">
        {/* Icon is smaller on mobile, larger on desktop */}
        <UserCircleIcon className="w-8 h-8 md:w-10 md:h-10 text-gray-500 flex-shrink-0" />
        
        {/* User info with original centering preserved */}
        <div className="ml-2 md:ml-3 overflow-hidden w-full min-w-0">
          {localLoading || authLoading ? (
            /* Skeleton loader with consistent height */
            <>
              <div className="h-4 bg-gray-200 rounded w-24 md:w-32 animate-pulse mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-16 md:w-20 animate-pulse hidden xs:block"></div>
            </>
          ) : (
            <>
              <p className="text-xs md:text-sm font-medium text-gray-700 truncate">
                {user?.name || "No name found"}
              </p>
              <p className="text-xs text-gray-500 truncate hidden xs:block">
                {user?.rfc || "No RFC found"}
              </p>
            </>
          )}
        </div>
      </div>
      
      {/* Divider line - visible on all screens */}
      <div className="h-px bg-gray-200 my-2 md:my-3 w-full"></div>
      
      <div className="flex grow flex-row justify-between space-x-2 md:flex-col md:space-x-0 md:space-y-2">
        {/* Modified NavLinks to ensure proper sizing on mobile but preserve desktop */}
        <div className="grow flex flex-row space-x-2 md:grow-0 md:space-x-0 md:flex-col md:space-y-2">
          <NavLinks />
        </div>
        
        {/* Empty space div - only visible on md and larger screens */}
        <div className="hidden h-auto w-full grow rounded-md bg-gray-50 md:block"></div>
        
        <button 
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex h-[48px] w-auto flex-shrink-0 items-center justify-center gap-2 rounded-md bg-gray-50 p-3 text-sm font-medium hover:bg-green-100 hover:text-green-600 md:flex-none md:justify-start md:p-2 md:px-3"
        >
          <PowerIcon className="w-6" />
          <div className="hidden md:block">{isLoggingOut ? 'Cerrando sesión...' : 'Cerrar Sesión'}</div>
        </button>
      </div>
    </div>
  );
}