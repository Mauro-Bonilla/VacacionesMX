import { Card } from "@/app/ui/components/dashboard/cards";
import { monserrat } from "@/app/ui/fonts";
import { fetchVacationSummary } from "../lib/db/services/get-ordinary-vacation-summary";
import { fetchUserRequests } from "../lib/db/services/get-vacation-request-data";
import VacationRequestTable from "@/app/ui/components/vacation-requests/VacationRequestTable/VacationRequestTable";
import { Divider } from "@mui/material";

export default async function Page() {

  const vacationSummary = await fetchVacationSummary();
  if (!vacationSummary) {
    return <div>Error: Unable to fetch vacation summary.</div>;
  }

  const { entitledDays, usedDays, availableVacations, periodEnd} = vacationSummary;
  const requests = await fetchUserRequests();

  return (
    <main>
      <div className="flex justify-between items-center mb-4">
        <h1 className={`${monserrat.className} text-xl md:text-2xl font-extrabold`}>
          Mis Vacaciones Ordinarias
        </h1>
        <h2 className="text-sm text-gray-500">
          {periodEnd ? `Vigencia hasta ${new Date(periodEnd).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })}` : 'Vigencia indefinida'}
        </h2>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="Total de días" value={entitledDays}/>
        <Card title="Vacaciones disfrutadas" value={usedDays}/>
        <Card title="Vacaciones disponibles" value={availableVacations}/>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-4 lg:grid-cols-8"></div>
      <Divider className="my-4" />
      <h1 className={`${monserrat.className} mb-4 text-xl md:text-2xl mt-6`}>
        Mis Solicitudes de vacaciones
      </h1>
      <VacationRequestTable 
        requests={requests}>
        </VacationRequestTable>
    </main>
  );
}
