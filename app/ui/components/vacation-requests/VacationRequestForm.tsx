"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { lusitana } from "@/app/ui/fonts";
import { addDays, format } from "date-fns";
import VacationFormSkeleton from './VacationFormSkeleton';

// MUI Components
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormHelperText from "@mui/material/FormHelperText";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Chip from "@mui/material/Chip";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { EventAvailable as EventAvailableIcon } from "@mui/icons-material";
import { CalendarToday as CalendarTodayIcon } from "@mui/icons-material";
import { ViewDay as ViewDayIcon } from "@mui/icons-material";
import { LockClock as LockClockIcon } from "@mui/icons-material";
import { Schedule as ScheduleIcon } from "@mui/icons-material";
import { EventBusy as EventBusyIcon } from "@mui/icons-material";
import { DateRange as DateRangeIcon } from "@mui/icons-material";

// Server actions
import {
  getLeaveTypes,
  checkIfSpecialLeaveType,
  getUserVacationBalances,
  submitVacationRequest,
  getHolidaysForPeriod,
} from "@/app/lib/actions/vacation-actions";

// Import LeaveType and LeaveTypeBalance types
import { LeaveType } from "@/app/lib/db/models/leaveTypes";
import { LeaveTypeBalance } from "@/app/lib/db/models/vacationBalance";

interface FormRequestData {
  leave_type_id: string;
  start_date: string;
  end_date: string;
  notes?: string;
}

// Create MUI theme with green colors from tailwind config
const theme = createTheme({
  palette: {
    primary: {
      main: "#00754a",
      light: "#42ab82",
      dark: "#00623e",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#42ab82",
      contrastText: "#ffffff",
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: "0.5rem",
          textTransform: "none",
          fontWeight: 500,
        },
      },
    },
  },
});

// Define props interface for VacationSummaryCard
interface VacationSummaryCardProps {
  balance: LeaveTypeBalance | null;
  selectedDays: number;
  workingDays: number;
  maxDaysPerRequest: number | null;
  leaveType: LeaveType;
  formatDate: (date: Date | string) => string;
  holidays: any[];
  hasSelectedDates: boolean;
}

// Memoized helper functions for date handling
const createDateWithoutTimezone = (dateString: string): Date => {
  if (!dateString) return new Date();
  // Parse the date parts
  const [year, month, day] = dateString.split("-").map(Number);
  // Create a date with the specified year, month (0-indexed), and day
  // Setting the time to noon helps avoid timezone issues
  return new Date(year, month - 1, day, 12, 0, 0);
};

const isSunday = (dateString: string): boolean => {
  if (!dateString) return false;
  // Use the fixed date creation function to ensure proper timezone handling
  const date = createDateWithoutTimezone(dateString);
  // 0 is Sunday in JavaScript
  return date.getDay() === 0;
};

const formatDate = (dateObj: Date | string): string => {
  if (!dateObj) return "";
  const date = typeof dateObj === "string" ? new Date(dateObj) : dateObj;
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Vacation Request Summary Card - Memoized for performance
const VacationSummaryCard: React.FC<VacationSummaryCardProps> = React.memo(({
  balance,
  selectedDays,
  workingDays,
  maxDaysPerRequest,
  leaveType,
  formatDate,
  holidays,
  hasSelectedDates,
}) => {
  if (!leaveType) return null;

  return (
    <div className="w-full p-4 mb-6 bg-white rounded-lg border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <div
            className={`w-2.5 h-2.5 rounded-full mr-2`}
            style={{ backgroundColor: leaveType.color_code }}
          />
          <h3 className="text-lg font-medium text-gray-900">
            {leaveType.name}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-3">
        <div className="flex items-center p-3 bg-gray-50 rounded-md">
          <EventAvailableIcon color="primary" className="mr-3" />
          <div>
            <p className="text-xs text-gray-500">Días disponibles</p>
            <p className="text-lg font-semibold">
              {balance?.availableDays || 0}
            </p>
          </div>
        </div>

        <div className="flex items-center p-3 bg-gray-50 rounded-md">
          <CalendarTodayIcon color="primary" className="mr-3" />
          <div>
            <p className="text-xs text-gray-500">
              Días laborables seleccionados
            </p>
            {hasSelectedDates ? (
              <>
                <p className="text-lg font-semibold">{workingDays}</p>
                {workingDays !== selectedDays && (
                  <p className="text-xs text-gray-500">
                    (De {selectedDays} días calendario)
                  </p>
                )}
              </>
            ) : (
              <p className="text-lg font-semibold text-gray-400">--</p>
            )}
          </div>
        </div>

        <div className="flex items-center p-3 bg-gray-50 rounded-md">
          <LockClockIcon color="primary" className="mr-3" />
          <div>
            <p className="text-xs text-gray-500">Máx. días por solicitud</p>
            <p className="text-lg font-semibold">
              {maxDaysPerRequest || "Sin límite"}
            </p>
          </div>
        </div>

        <div className="flex items-center p-3 bg-gray-50 rounded-md">
          <ScheduleIcon color="primary" className="mr-3" />
          <div>
            <p className="text-xs text-gray-500">Días de anticipación</p>
            <p className="text-lg font-semibold">
              {leaveType.min_notice_days || 0}
            </p>
          </div>
        </div>

        <div className="flex items-center p-3 bg-gray-50 rounded-md">
          <ViewDayIcon color="primary" className="mr-3" />
          <div>
            <p className="text-xs text-gray-500">Período</p>
            <p className="text-sm font-medium">
              {balance
                ? `${formatDate(balance.periodStart)} - ${formatDate(
                    balance.periodEnd
                  )}`
                : "N/A"}
            </p>
          </div>
        </div>
      </div>

      {/* Date selection prompt when dates not selected */}
      {!hasSelectedDates && (
        <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-100">
          <div className="flex items-center">
            <DateRangeIcon style={{ color: "#0288d1" }} className="mr-3" />
            <div className="flex items-center">
              <p className="text-sm font-medium text-blue-800">
                Selecciona las fechas de inicio y fin
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Holiday information - only show if dates are selected */}
      {hasSelectedDates && holidays && holidays.length > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 rounded-md border border-yellow-100">
          <div className="flex items-start">
            <EventBusyIcon style={{ color: "#f57c00" }} className="mr-3 mt-1" />
            <div>
              <p className="text-sm font-medium text-yellow-800">
                Días festivos en el período seleccionado:
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {holidays.map((holiday, index) => (
                  <Chip
                    key={index}
                    label={`${formatDate(holiday.date)} - ${
                      holiday.description
                    }`}
                    size="small"
                    variant="outlined"
                    style={{
                      backgroundColor: "#ffecb3",
                      color: "#916f00",
                      borderColor: "#f57c00",
                    }}
                  />
                ))}
              </div>
              <p className="mt-2 text-xs text-yellow-700">
                Estos días festivos no se contabilizarán como días laborables en
                tu solicitud.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

VacationSummaryCard.displayName = 'VacationSummaryCard';

// Main Form Component
const VacationRequestForm: React.FC = () => {
  const router = useRouter();

  // Define types for state variables
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [alertMessage, setAlertMessage] = useState<string>("");
  const [alertType, setAlertType] = useState<"success" | "error">("success");
  const [maxDaysAllowed, setMaxDaysAllowed] = useState<number | null>(null);
  const [minStartDate, setMinStartDate] = useState<string>("");
  const [selectedDays, setSelectedDays] = useState<number>(0);
  const [workingDays, setWorkingDays] = useState<number>(0);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [fetchingHolidays, setFetchingHolidays] = useState<boolean>(false);

  // Store data from database with proper typing
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveTypeBalance[]>([]);
  const [currentBalance, setCurrentBalance] = useState<LeaveTypeBalance | null>(null);

  // Memoized selected leave type to prevent unnecessary recalculations
  const selectedLeaveType = useMemo(() => 
    leaveTypes.find((type) => type.id === selectedLeaveTypeId) || null,
  [selectedLeaveTypeId, leaveTypes]);

  // Fetch leave types and vacation balances on mount - optimized with AbortController
  useEffect(() => {
    const abortController = new AbortController();
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch both data sources in parallel
        const [typesResult, balancesResult] = await Promise.all([
          getLeaveTypes(),
          getUserVacationBalances()
        ]);
        
        if (!abortController.signal.aborted) {
          if (typesResult.success && typesResult.leaveTypes) {
            setLeaveTypes(typesResult.leaveTypes);
          }
          
          if (balancesResult.success && balancesResult.balances) {
            setBalances(balancesResult.balances);
          }
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error("Error fetching data:", error);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();
    
    return () => {
      abortController.abort();
    };
  }, []);

  // Update data when leave type changes - optimized using useMemo for calculations
  useEffect(() => {
    if (selectedLeaveType) {
      // Clear dates when changing leave type
      setStartDate("");
      setEndDate("");
      setSelectedDays(0);
      setWorkingDays(0);
      setHolidays([]);

      // Find balance for this leave type - memoized to prevent recalculation
      const balance = balances.find(b => b.leaveTypeId === selectedLeaveTypeId);
      setCurrentBalance(balance || null);

      // Calculate minimum start date based on min notice days
      const today = new Date();

      // Check if this is a special leave type
      const checkSpecial = async () => {
        try {
          const isSpecial = await checkIfSpecialLeaveType(selectedLeaveTypeId);

          if (isSpecial) {
            // Special leave types can be backdated
            setMinStartDate("");
          } else {
            // Calculate min date including notice days
            const minDate = addDays(today, selectedLeaveType.min_notice_days || 0);
            setMinStartDate(minDate.toISOString().split("T")[0]);
          }
        } catch (error) {
          console.error("Error checking special leave type:", error);
          // Default to using notice days if there's an error
          const minDate = addDays(today, selectedLeaveType.min_notice_days || 0);
          setMinStartDate(minDate.toISOString().split("T")[0]);
        }
      };

      checkSpecial();

      // Calculate maximum days allowed - more efficient calculation
      const maxDaysFromType = selectedLeaveType.max_days_per_request || Number.MAX_SAFE_INTEGER;
      const maxDaysFromBalance = balance ? balance.availableDays : Number.MAX_SAFE_INTEGER;
      setMaxDaysAllowed(Math.min(maxDaysFromType, maxDaysFromBalance));
    } else {
      setCurrentBalance(null);
      setMinStartDate("");
      setMaxDaysAllowed(null);
    }
  }, [selectedLeaveTypeId, balances, leaveTypes, selectedLeaveType]);

  // Optimized function to calculate working days - memoized with useCallback
  const calculateWorkingDays = useCallback((startStr: string, endStr: string) => {
    if (!startStr || !endStr) return { totalDays: 0, workingDays: 0 };
    
    const start = createDateWithoutTimezone(startStr);
    const end = createDateWithoutTimezone(endStr);
    
    if (start > end) return { totalDays: 0, workingDays: 0 };
    
    // Calculate total calendar days
    const totalDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // Optimize working days calculation - use date math instead of loop
    let workingDays = 0;
    const current = new Date(start);
    const endTime = end.getTime();
    
    // Using a more efficient looping approach
    while (current.getTime() <= endTime) {
      if (current.getDay() !== 0) { // Skip Sundays (0)
        workingDays++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return { totalDays, workingDays };
  }, []);

  // Calculate days and fetch holidays when dates change - optimized calculation
  useEffect(() => {
    let isMounted = true;
    
    if (startDate && endDate) {
      const { totalDays, workingDays: tempWorkingDays } = calculateWorkingDays(startDate, endDate);
      
      if (isMounted) {
        setSelectedDays(totalDays);
        setWorkingDays(tempWorkingDays);
      }
      
      // Debounced holiday fetching to prevent excessive API calls
      const timeoutId = setTimeout(() => {
        // Fetch holidays from the server
        const fetchHolidays = async () => {
          if (!isMounted) return;
          
          setFetchingHolidays(true);
          try {
            const start = createDateWithoutTimezone(startDate);
            const end = createDateWithoutTimezone(endDate);
            
            // Get the years covered by the date range
            const startYear = start.getFullYear();
            const endYear = end.getFullYear();

            const holidaysResult = await getHolidaysForPeriod(startYear, endYear);

            if (holidaysResult.success && isMounted) {
              // Optimize filtering and calculation
              const filteredHolidays = (holidaysResult.holidays || []).filter(holiday => {
                const holidayDate = createDateWithoutTimezone(holiday.date);
                return holidayDate >= start && holidayDate <= end;
              });

              // Set holidays
              setHolidays(filteredHolidays);

              // Calculate working days excluding holidays and Sundays
              let calculatedWorkingDays = tempWorkingDays;

              // Create a map of non-Sunday holidays for O(1) lookups
              const nonSundayHolidays = filteredHolidays.reduce((count, holiday) => {
                const holidayDate = createDateWithoutTimezone(holiday.date);
                if (holidayDate.getDay() !== 0) {
                  count++;
                }
                return count;
              }, 0);

              // Subtract holidays that fall on weekdays
              calculatedWorkingDays -= nonSundayHolidays;
              
              // Update working days
              setWorkingDays(Math.max(0, calculatedWorkingDays));
            }
          } catch (error) {
            if (isMounted) {
              console.error("Error fetching holidays:", error);
            }
          } finally {
            if (isMounted) {
              setFetchingHolidays(false);
            }
          }
        };

        fetchHolidays();
      }, 300); // Debounce holiday API calls
      
      return () => {
        clearTimeout(timeoutId);
      };
    } else if (isMounted) {
      setSelectedDays(0);
      setWorkingDays(0);
      setHolidays([]);
    }
    
    return () => {
      isMounted = false;
    };
  }, [startDate, endDate, calculateWorkingDays]);

  // Optimized form submission with validation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form - optimized validation logic
    const newErrors: { [key: string]: string } = {};
    
    // Batch validation checks for better performance
    if (!selectedLeaveTypeId) newErrors.leaveTypeId = "Selecciona un tipo de solicitud";
    if (!startDate) newErrors.startDate = "Selecciona una fecha de inicio";
    if (!endDate) newErrors.endDate = "Selecciona una fecha de fin";

    // Only run date validation if both dates exist
    if (startDate && endDate) {
      // Use the memoized date comparison
      const start = createDateWithoutTimezone(startDate);
      const end = createDateWithoutTimezone(endDate);

      if (start > end) {
        newErrors.endDate = "La fecha de fin debe ser posterior a la fecha de inicio";
      }

      // Sunday validation for start date
      if (isSunday(startDate)) {
        newErrors.startDate = "No se puede iniciar una solicitud en domingo";
      }

      // Check max days allowed
      if (maxDaysAllowed !== null && workingDays > maxDaysAllowed) {
        newErrors.endDate = `No puedes solicitar más de ${maxDaysAllowed} días laborables`;
      }
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    // Submit form
    setIsSubmitting(true);

    try {
      // Create request data
      const requestData: FormRequestData = {
        leave_type_id: selectedLeaveTypeId,
        start_date: startDate,
        end_date: endDate,
        notes: notes || undefined,
      };

      // Submit using server action
      const result = await submitVacationRequest(requestData);

      if (result.success) {
        // Batch state updates
        setAlertType("success");
        setAlertMessage("Solicitud enviada con éxito");
        
        // Reset form
        setSelectedLeaveTypeId("");
        setStartDate("");
        setEndDate("");
        setNotes("");

        // Redirect after delay
        setTimeout(() => {
          router.push("/dashboard");
        }, 1500);
      } else {
        setAlertType("error");
        setAlertMessage(result.message || "Error al enviar la solicitud");
      }
    } catch (error) {
      setAlertType("error");
      setAlertMessage("Hubo un problema al enviar tu solicitud");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle date selection - memoized to prevent recreating on each render
  const handleStartDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = e.target.value;

    // Prevent selecting Sunday as start date
    if (isSunday(selectedDate)) {
      setErrors((prevErrors) => ({
        ...prevErrors,
        startDate: "No se puede iniciar una solicitud en domingo",
      }));
      return;
    }

    setStartDate(selectedDate);
    // Clear any previous errors for this field
    setErrors((prevErrors) => {
      if (!prevErrors.startDate) return prevErrors;
      const { startDate, ...restErrors } = prevErrors;
      return restErrors;
    });
  }, []);

  const handleEndDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = e.target.value;
    setEndDate(selectedDate);
    
    // Clear any previous errors for this field
    setErrors((prevErrors) => {
      if (!prevErrors.endDate) return prevErrors;
      const { endDate, ...restErrors } = prevErrors;
      return restErrors;
    });
  }, []);

  // Use the skeleton component instead of CircularProgress
  if (isLoading) {
    return <VacationFormSkeleton />;
  }

  return (
    <ThemeProvider theme={theme}>
      <Box className="space-y-6 mb-8">
        <Typography
          variant="h5"
          component="h1"
          className={lusitana.className}
          sx={{ color: "primary.main", mb: 4 }}
        >
          Solicitud de Vacaciones
        </Typography>

        {alertMessage && (
          <Alert
            severity={alertType}
            sx={{ mb: 3 }}
            onClose={() => setAlertMessage("")}
          >
            {alertMessage}
          </Alert>
        )}

        {/* Vacation Summary Card - Always show when leave type is selected */}
        {selectedLeaveType && (
          <VacationSummaryCard
            leaveType={selectedLeaveType}
            balance={currentBalance}
            selectedDays={selectedDays}
            workingDays={workingDays}
            maxDaysPerRequest={selectedLeaveType.max_days_per_request || null}
            formatDate={formatDate}
            holidays={holidays}
            hasSelectedDates={!!(startDate && endDate)}
          />
        )}

        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: 3,
          }}
        >
          {/* Form */}
          <Box sx={{ flex: 1 }}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                border: "1px solid",
                borderColor: "divider",
              }}
              className="rounded-lg shadow-sm"
            >
              <form onSubmit={handleSubmit}>
                <Box sx={{ mb: 3 }}>
                  <FormControl fullWidth error={!!errors.leaveTypeId} required>
                    <InputLabel id="leave-type-label">
                      Tipo de Ausencia
                    </InputLabel>
                    <Select
                      labelId="leave-type-label"
                      id="leave-type"
                      value={selectedLeaveTypeId}
                      label="Tipo de Ausencia"
                      onChange={(e) => setSelectedLeaveTypeId(e.target.value)}
                      className="rounded-md"
                    >
                      {leaveTypes.map((type) => (
                        <MenuItem key={type.id} value={type.id}>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <Box
                              sx={{
                                width: "10px",
                                height: "10px",
                                borderRadius: "50%",
                                marginRight: "8px",
                                bgcolor: type.color_code,
                              }}
                            />
                            {type.name}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.leaveTypeId && (
                      <FormHelperText>{errors.leaveTypeId}</FormHelperText>
                    )}
                    {selectedLeaveType?.description && !errors.leaveTypeId && (
                      <FormHelperText>
                        {selectedLeaveType.description}
                      </FormHelperText>
                    )}
                  </FormControl>
                </Box>

                <Box
                  sx={{
                    mb: 3,
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    gap: 2,
                  }}
                >
                  <TextField
                    id="start-date"
                    label="Fecha de inicio"
                    type="date"
                    value={startDate}
                    onChange={handleStartDateChange}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{
                      min: minStartDate || undefined,
                    }}
                    fullWidth
                    required
                    error={!!errors.startDate}
                    helperText={errors.startDate}
                    disabled={!selectedLeaveType}
                    className="rounded-md"
                  />

                  <TextField
                    id="end-date"
                    label="Fecha de fin"
                    type="date"
                    value={endDate}
                    onChange={handleEndDateChange}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{
                      min: startDate || minStartDate || undefined,
                    }}
                    fullWidth
                    required
                    error={!!errors.endDate}
                    helperText={errors.endDate}
                    disabled={!selectedLeaveType || !startDate}
                    className="rounded-md"
                  />
                </Box>

                <Box sx={{ mb: 4 }}>
                  <TextField
                    id="notes"
                    label="Notas (opcional)"
                    multiline
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    fullWidth
                    placeholder="Agrega cualquier información adicional sobre tu solicitud"
                    className="rounded-md"
                  />
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 2,
                    flexDirection: { xs: "column", sm: "row" },
                  }}
                >
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={isSubmitting || fetchingHolidays}
                    sx={{ py: 1.5 }}
                    className="rounded-lg hover:shadow-md transition-all duration-200"
                  >
                    {isSubmitting ? (
                      <>
                        <CircularProgress
                          size={20}
                          color="inherit"
                          sx={{ mr: 1 }}
                        />
                        Enviando...
                      </>
                    ) : fetchingHolidays ? (
                      <>
                        <CircularProgress
                          size={20}
                          color="inherit"
                          sx={{ mr: 1 }}
                        />
                        Calculando días...
                      </>
                    ) : (
                      "Enviar solicitud"
                    )}
                  </Button>
                </Box>
              </form>
            </Paper>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default VacationRequestForm;