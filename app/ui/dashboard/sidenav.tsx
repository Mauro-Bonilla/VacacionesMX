import Link from "next/link";
import NavLinks from "@/app/ui/dashboard/nav-links";
import CompanyLogo from "@/app/ui/company-logo";
import { PowerIcon, UserCircleIcon } from "@heroicons/react/24/outline";
import { auth, signOut } from "@/auth";
import {User} from "@/app/lib/db/models/users";

export default async function SideNav() {
  const session = await auth();
  const user = session?.user as User | undefined;;
  
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
      
      {/* User profile section - responsive for all screen sizes */}
      <div className="flex items-center p-2 md:p-3 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors mb-2 md:mb-0">
        {/* Icon is smaller on mobile, larger on desktop */}
        <UserCircleIcon className="w-8 h-8 md:w-10 md:h-10 text-gray-500 flex-shrink-0" />
        
        {/* User info - simplified on mobile */}
        <div className="ml-2 md:ml-3 overflow-hidden">
          <p className="text-xs md:text-sm font-medium text-gray-700 truncate">
            {user?.name || "Usuario"}
          </p>
          <p className="text-xs text-gray-500 truncate hidden xs:block">{user?.rfc || ""}</p>
        </div>
      </div>
      
      {/* Divider line - visible on all screens */}
      <div className="h-px bg-gray-200 my-2 md:my-3 w-full"></div>
      
      <div className="flex grow flex-row justify-between space-x-2 md:flex-col md:space-x-0 md:space-y-2">
        <NavLinks />
        {/* Empty space div - only visible on md and larger screens */}
        <div className="hidden h-auto w-full grow rounded-md bg-gray-50 md:block"></div>
        
        <form
          action={async () => {
            'use server';
            await signOut({ redirectTo: '/' });
          }}
        >
          <button className="flex h-[48px] w-full grow items-center justify-center gap-2 rounded-md bg-gray-50 p-3 text-sm font-medium hover:bg-green-100 hover:text-green-600 md:flex-none md:justify-start md:p-2 md:px-3">
            <PowerIcon className="w-6" />
            <div className="hidden md:block">Cerrar Sesión</div>
          </button>
        </form>
      </div>
    </div>
  );
}