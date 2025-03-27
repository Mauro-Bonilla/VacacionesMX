import { Card } from "@/app/ui/dashboard/cards";
import { lusitana } from "@/app/ui/fonts";
import { fetchVacationSummary } from "../lib/db/services/vacation-data";

export default async function Page() {

  const vacationSummary = await fetchVacationSummary();
  if (!vacationSummary) {
    return <div>Error: Unable to fetch vacation summary.</div>;
  }

  const { entitledDays, usedDays, availableVacations, periodEnd} = vacationSummary;

  return (
    <main>
      <div className="flex justify-between items-center mb-4">
        <h1 className={`${lusitana.className} text-xl md:text-2xl`}>
          Mis Vacaciones Ordinarias
        </h1>
        <h2 className="text-sm text-gray-500">
          {periodEnd ? `Vigencia hasta ${new Date(periodEnd).toLocaleDateString('es-MX')}` : 'Vigencia indefinida'}
        </h2>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="Total de días" value={entitledDays}/>
        <Card title="Vacaciones disfrutadas" value={usedDays}/>
        <Card title="Vacaciones disponibles" value={availableVacations}/>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-4 lg:grid-cols-8"></div>
      <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
        Mis Solicitudes de vacaciones
      </h1>
    </main>
  );
}
