import Link from 'next/link';
import { monserrat } from '@/app/ui/fonts';
import { ArrowLeftIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline';

export default function NotFound() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[70vh]">
      <ShieldExclamationIcon className="w-16 h-16 text-primary-500 mb-6" />
      <h1 className={`${monserrat.className} text-2xl md:text-3xl font-extrabold mb-4 text-gray-800`}>
        Acceso Restringido
      </h1>
      <p className="text-gray-600 text-center mb-8 max-w-md">
        No tienes permisos para acceder a esta página. Esta sección está reservada para administradores del sistema.
      </p>
      <Link
        href="/dashboard"
        className="flex items-center text-primary-600 hover:text-primary-800 transition-colors font-medium"
      >
        <ArrowLeftIcon className="w-5 h-5 mr-2" />
        Volver al panel principal
      </Link>
    </main>
  );
}