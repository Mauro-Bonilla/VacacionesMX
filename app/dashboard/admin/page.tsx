import { fetchPendingVacationRequests } from '@/app/lib/actions/admin-actions';
import { getCurrentUser } from '@/app/utils/get-current-user';
import { notFound, redirect } from 'next/navigation';
import { monserrat } from "@/app/ui/fonts";
import { Divider } from "@mui/material";
import AdminRequestTable from '@/app/ui/components/admin/AdminRequestTable/AdminRequestTable';

export default async function AdminDashboardPage() {
  // Check if the user is an admin
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/');
  }
  
  if (!user.is_admin) {
    notFound();
  }
  
  // Fetch pending vacation requests
  const { success, requests, message } = await fetchPendingVacationRequests();
  
  if (!success) {
    return <div className="p-6">Error: {message}</div>;
  }
  
  return (
    <main>
      <div className="flex justify-between items-center mb-4">
        <h1 className={`${monserrat.className} text-xl md:text-2xl font-extrabold`}>
          Panel de Administración
        </h1>
      </div>
      
      <Divider className="my-4" />
      
      <div className="mt-6">
        
        <AdminRequestTable requests={requests} />
      </div>
    </main>
  );
}