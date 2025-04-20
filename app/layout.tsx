import '@/app/ui/global.css';
import { getCurrentUser } from '@/app/utils/get-current-user';
import { AuthProvider } from '@/app/lib/context/auth-context';
import ThemeProvider from '@/app/ui/providers/ThemeProvider';

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
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}