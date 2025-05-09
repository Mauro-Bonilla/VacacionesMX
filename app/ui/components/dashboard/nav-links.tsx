'use client';
import {
  HomeIcon,
  DocumentDuplicateIcon,
  ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/app/lib/context/auth-context';

export default function NavLinks() {
  const pathname = usePathname();
  const { user } = useAuth();
  
  // Common links
  const commonLinks = [
    { name: 'Inicio', href: '/dashboard', icon: HomeIcon },
    {
      name: 'Solicitar vacaciones',
      href: '/dashboard/form',
      icon: DocumentDuplicateIcon,
    },
  ];
  
  // Admin-only links
  const adminLinks = [
    {
      name: 'Admin',
      href: '/dashboard/admin',
      icon: ClipboardDocumentCheckIcon,
    },
  ];
  
  // Determine which links to show based on user role
  const links = user?.is_admin 
    ? [...commonLinks, ...adminLinks] 
    : commonLinks;
  
  return (
    <>
      {links.map((link) => {
        const LinkIcon = link.icon;
        // Check if the current path starts with the link's href
        // Special case for dashboard to prevent it from being active on all subpages
        const isActive = link.href === '/dashboard' 
          ? pathname === '/dashboard' || pathname === '/dashboard/' 
          : pathname.startsWith(link.href);
          
        return (
          <Link
            key={link.name}
            href={link.href}
            className={`flex h-[48px] grow items-center justify-center gap-2 rounded-md bg-gray-50 p-3 text-sm font-medium hover:bg-primary-100 hover:text-primary-600 md:flex-none md:justify-start md:p-2 md:px-3 ${
              isActive ? 'bg-primary-100 text-primary-600' : ''
            }`}
          >
            <LinkIcon className="w-6" />
            <p className="hidden md:block">{link.name}</p>
          </Link>
        );
      })}
    </>
  );
}