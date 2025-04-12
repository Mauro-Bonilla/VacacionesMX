import './ui/global.css';
import { getCurrentUser } from '@/app/utils/get-current-user';
import { AuthProvider } from './lib/context/auth-context';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  
  return (
    <html lang="en">
      <body>
        <AuthProvider initialUser={user || null}>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}