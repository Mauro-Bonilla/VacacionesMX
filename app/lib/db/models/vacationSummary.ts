export interface VacationSummary {
    entitledDays: number;
    usedDays: number;
    remainingDays: number;
    periodStart: Date;
    periodEnd: Date;
    expiresAt: Date | null;
    availableVacations: number;
  }
  