'use client';
import { monserrat } from '@/app/ui/fonts';
import {
  DocumentTextIcon,
  KeyIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { ArrowRightIcon } from '@heroicons/react/20/solid';
import { Button } from '@/app/ui/button';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { authenticate } from '@/app/lib/actions/auth-actions';
import { useSearchParams } from 'next/navigation';

function SubmitButton() {
  const { pending } = useFormStatus();
  
  return (
    <Button 
      className="mt-6 w-full bg-primary-600 hover:bg-primary-700 transition-colors" 
      aria-disabled={pending}
      disabled={pending}
      type="submit"
    >
      {pending ? 'Iniciando...' : 'Iniciar Sesión'} 
      <ArrowRightIcon className="ml-auto h-5 w-5 text-gray-50" />
    </Button>
  );
}

export default function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  
  // Tipo para los mensajes de error que mostramos en la UI
  type ErrorMessage = "Credenciales Invalidas." | "Algo salio mal." | undefined;
  
  // Tipo que devuelve la función authenticate
  type AuthenticateResult = "Something went wrong." | "Credenciales Invalidas." | undefined;
  
  const [errorMessage, dispatch] = useActionState<
    ErrorMessage, 
    FormData
  >(
    async (prevState: ErrorMessage, formData: FormData) => {
      try {
        const result = await authenticate(formData) as AuthenticateResult;
        
        // Convertir mensaje en inglés a español
        if (result === "Something went wrong.") {
          return "Algo salio mal.";
        }
        
        // Devolver mensaje en español directamente
        if (result === "Credenciales Invalidas.") {
          return result;
        }
        
        return undefined;
      } catch (error) {
        return "Algo salio mal.";
      }
    },
    undefined
  );
  
  const { pending: isPending } = useFormStatus();

  return (
    <div className="relative min-h-full w-full flex items-center justify-center">
      {isPending && (
        <div className="fixed inset-0 bg-white bg-opacity-70 flex items-center justify-center z-50">
          <div className="spinner-container">
            <div className="spinner"></div>
          </div>
        </div>
      )}
      
      <form 
        action={dispatch} 
        className="space-y-3 w-full max-w-md mx-auto"
      >
        <div className="flex-1 rounded-lg bg-gray-50 px-6 pb-4 pt-8 shadow-md">
          <h1 className={`${monserrat.className} mb-3 text-2xl font-semibold text-center`}>
            Iniciar Sesión
          </h1>
          <div className="w-full">
            <div>
              <label
                className="mb-3 mt-5 block text-xs font-medium text-gray-900"
                htmlFor="rfc"
              >
                RFC
              </label>
              <div className="relative">
                <input
                  className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500 uppercase focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                  id="rfc"
                  type="text"
                  name="rfc"
                  placeholder="Ingresa tu RFC"
                  required
                  pattern="^([A-ZÑ&]{3,4})(\d{6})([A-Z\d]{3})$"
                  title="Formato de RFC inválido. Debe ser un RFC mexicano válido."
                  disabled={isPending}
                  autoComplete="username"
                />
                <DocumentTextIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-primary-600" />
              </div>
            </div>
            <div className="mt-4">
              <label
                className="mb-3 mt-5 block text-xs font-medium text-gray-900"
                htmlFor="password"
              >
                Contraseña
              </label>
              <div className="relative">
                <input
                  className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                  id="password"
                  type="password"
                  name="password"
                  placeholder="Ingresa tu contraseña"
                  required
                  minLength={6}
                  disabled={isPending}
                  autoComplete="current-password"
                />
                <KeyIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-primary-600" />
              </div>
            </div>
          </div>
          <input type="hidden" name="redirectTo" value={callbackUrl} />
          <SubmitButton />
          <div
            className="flex h-8 items-end space-x-1 mt-2"
            aria-live="polite"
            aria-atomic="true"
          >
            {errorMessage && (
              <>
                <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                <p className="text-sm text-red-500">{errorMessage}</p>
              </>
            )}
          </div>
        </div>
      </form>
      <style jsx global>{`
        .spinner-container {
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(0, 117, 74, 0.2);
          border-radius: 50%;
          border-top-color: #00754a;
          animation: spin 1s ease-in-out infinite;
        }
        
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}