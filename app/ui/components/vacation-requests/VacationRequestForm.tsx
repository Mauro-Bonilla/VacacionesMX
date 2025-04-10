'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { lusitana } from "@/app/ui/fonts";
import { addDays } from 'date-fns';
import styles from './VacationRequestForm.module.css';

// MUI Components
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormHelperText from '@mui/material/FormHelperText';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { EventAvailable as EventAvailableIcon } from '@mui/icons-material';
import { CalendarToday as CalendarTodayIcon } from '@mui/icons-material';
import { ViewDay as ViewDayIcon } from '@mui/icons-material';
import { LockClock as LockClockIcon } from '@mui/icons-material';
import { Schedule as ScheduleIcon } from '@mui/icons-material';

// Server actions (instead of direct database imports)
import { getLeaveTypes, checkIfSpecialLeaveType, getUserVacationBalances, submitVacationRequest } from '@/app/lib/actions/vacation-actions';

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
      main: '#00754a',
      light: '#42ab82', 
      dark: '#00623e',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#42ab82',
      contrastText: '#ffffff',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '0.5rem',
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
  },
});

// Import LeaveType and LeaveTypeBalance types
import { LeaveType } from '@/app/lib/db/models/leaveTypes';
import { LeaveTypeBalance } from '@/app/lib/db/models/vacationBalance';

// Define props interface for VacationSummaryCard
interface VacationSummaryCardProps {
  balance: LeaveTypeBalance | null;
  selectedDays: number;
  maxDaysPerRequest: number | null;
  leaveType: LeaveType;
  formatDate: (date: Date | string) => string;
}

// Vacation Request Summary Card
const VacationSummaryCard: React.FC<VacationSummaryCardProps> = ({ 
  balance, 
  selectedDays, 
  maxDaysPerRequest, 
  leaveType, 
  formatDate 
}) => {
  if (!leaveType) return null;
  
  return (
    <div className="w-full p-4 mb-6 bg-white rounded-lg border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <h3 className="text-lg font-medium text-gray-900">{leaveType.name}</h3>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-3">
        <div className="flex items-center p-3 bg-gray-50 rounded-md">
          <EventAvailableIcon color="primary" className="mr-3" />
          <div>
            <p className="text-xs text-gray-500">Días disponibles</p>
            <p className="text-lg font-semibold">{balance?.availableDays || 0}</p>
          </div>
        </div>
        
        <div className="flex items-center p-3 bg-gray-50 rounded-md">
          <CalendarTodayIcon color="primary" className="mr-3" />
          <div>
            <p className="text-xs text-gray-500">Días laborables seleccionados</p>
            <p className="text-lg font-semibold">{selectedDays || 0}</p>
          </div>
        </div>
        
        <div className="flex items-center p-3 bg-gray-50 rounded-md">
          <LockClockIcon color="primary" className="mr-3" />
          <div>
            <p className="text-xs text-gray-500">Máx. días por solicitud</p>
            <p className="text-lg font-semibold">{maxDaysPerRequest || 'Sin límite'}</p>
          </div>
        </div>
        
        <div className="flex items-center p-3 bg-gray-50 rounded-md">
          <ScheduleIcon color="primary" className="mr-3" />
          <div>
            <p className="text-xs text-gray-500">Días de anticipación</p>
            <p className="text-lg font-semibold">{leaveType.min_notice_days || 0}</p>
          </div>
        </div>
        
        <div className="flex items-center p-3 bg-gray-50 rounded-md">
          <ViewDayIcon color="primary" className="mr-3" />
          <div>
            <p className="text-xs text-gray-500">Período</p>
            <p className="text-sm font-medium">
              {balance ? `${formatDate(balance.periodStart)} - ${formatDate(balance.periodEnd)}` : 'N/A'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Form Component
const VacationRequestForm: React.FC = () => {
  const router = useRouter();
  
  // Define types for state variables
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [alertMessage, setAlertMessage] = useState<string>('');
  const [alertType, setAlertType] = useState<'success' | 'error'>('success');
  const [maxDaysAllowed, setMaxDaysAllowed] = useState<number | null>(null);
  const [minStartDate, setMinStartDate] = useState<string>('');
  const [selectedDays, setSelectedDays] = useState<number>(0);
  
  // Store data from database with proper typing
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveTypeBalance[]>([]);
  const [currentBalance, setCurrentBalance] = useState<LeaveTypeBalance | null>(null);

  // Get selected leave type details with type safety
  const selectedLeaveType = leaveTypes.find(type => type.id === selectedLeaveTypeId) || null;

  // Fetch leave types and vacation balances on mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch leave types using server action
        const typesResult = await getLeaveTypes();
        if (typesResult.success && typesResult.leaveTypes) {
          setLeaveTypes(typesResult.leaveTypes);
        }
        
        // Fetch vacation balances using server action
        const balancesResult = await getUserVacationBalances();
        if (balancesResult.success && balancesResult.balances) {
          setBalances(balancesResult.balances);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Update data when leave type changes
  useEffect(() => {
    if (selectedLeaveType) {
      // Clear dates when changing leave type
      setStartDate('');
      setEndDate('');
      setSelectedDays(0);
      
      // Find balance for this leave type
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
            setMinStartDate('');
          } else {
            // Calculate min date including notice days
            const minDate = addDays(today, selectedLeaveType.min_notice_days || 0);
            setMinStartDate(minDate.toISOString().split('T')[0]);
          }
        } catch (error) {
          console.error('Error checking special leave type:', error);
          // Default to using notice days if there's an error
          const minDate = addDays(today, selectedLeaveType.min_notice_days || 0);
          setMinStartDate(minDate.toISOString().split('T')[0]);
        }
      };
      
      checkSpecial();

      // Calculate maximum days allowed
      const maxDaysFromType = selectedLeaveType.max_days_per_request || Number.MAX_SAFE_INTEGER;
      const maxDaysFromBalance = balance ? balance.availableDays : Number.MAX_SAFE_INTEGER;
      
      // Use the minimum of the two limits
      setMaxDaysAllowed(Math.min(maxDaysFromType, maxDaysFromBalance));
    } else {
      setCurrentBalance(null);
      setMinStartDate('');
      setMaxDaysAllowed(null);
    }
  }, [selectedLeaveTypeId, balances, leaveTypes]);

  // Update selected days when dates change
  useEffect(() => {
    if (startDate && endDate) {
      const days = calculateDays(startDate, endDate);
      setSelectedDays(days);
    } else {
      setSelectedDays(0);
    }
  }, [startDate, endDate]);

  // Calculate workdays between two dates (excluding Sundays)
  const calculateDays = (start: string, end: string): number => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    let workdays = 0;
    
    // Clone the start date to avoid modifying it
    const currentDate = new Date(startDate);
    
    // Loop through each day and count if it's not a Sunday
    while (currentDate <= endDate) {
      // 0 = Sunday, 1-6 = Monday-Saturday
      if (currentDate.getDay() !== 0) {
        workdays++;
      }
      // Move to the next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return workdays;
  };

  // Format date for display (YYYY-MM-DD to DD/MM/YYYY)
  const formatDate = (dateObj: Date | string): string => {
    if (!dateObj) return '';
    
    const date = typeof dateObj === 'string' ? new Date(dateObj) : dateObj;
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  };

  // Check if a date is a Sunday
  const isSunday = (dateString: string): boolean => {
    const date = new Date(dateString);
    return date.getDay() === 0; // 0 represents Sunday
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const newErrors: {[key: string]: string} = {};
    if (!selectedLeaveTypeId) newErrors.leaveTypeId = 'Selecciona un tipo de solicitud';
    if (!startDate) newErrors.startDate = 'Selecciona una fecha de inicio';
    if (!endDate) newErrors.endDate = 'Selecciona una fecha de fin';
    
    // Start date validation
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start > end) {
        newErrors.endDate = 'La fecha de fin debe ser posterior a la fecha de inicio';
      }
      
      // Sunday validation for start date
      if (isSunday(startDate)) {
        newErrors.startDate = 'No se puede iniciar una solicitud en domingo';
      }
      
      // Check max days allowed
      if (maxDaysAllowed !== null) {
        const workdays = calculateDays(startDate, endDate);
        if (workdays > maxDaysAllowed) {
          newErrors.endDate = `No puedes solicitar más de ${maxDaysAllowed} días laborables`;
        }
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
        notes: notes || undefined
      };

      // Submit using server action
      const result = await submitVacationRequest(requestData);
      
      if (result.success) {
        setAlertType('success');
        setAlertMessage('Solicitud enviada con éxito');
        
        // Reset form
        setSelectedLeaveTypeId('');
        setStartDate('');
        setEndDate('');
        setNotes('');
        
        // Redirect after delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 100);
      } else {
        setAlertType('error');
        setAlertMessage(result.message || 'Error al enviar la solicitud');
      }
    } catch (error) {
      setAlertType('error');
      setAlertMessage('Hubo un problema al enviar tu solicitud');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress sx={{ color: '#00754a' }} />
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Box className="space-y-6 mb-8">
        <Typography 
          variant="h5" 
          component="h1"
          className={lusitana.className}
          sx={{ color: 'primary.main', mb: 4 }}
        >
          Solicitud de Vacaciones
        </Typography>
        
        {alertMessage && (
          <Alert 
            severity={alertType}
            sx={{ mb: 3 }}
            onClose={() => setAlertMessage('')}
          >
            {alertMessage}
          </Alert>
        )}
        
        {/* Vacation Summary Card */}
        {selectedLeaveType && (
          <VacationSummaryCard 
            leaveType={selectedLeaveType}
            balance={currentBalance}
            selectedDays={selectedDays}
            maxDaysPerRequest={selectedLeaveType.max_days_per_request || null}
            formatDate={formatDate}
          />
        )}
        
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
          {/* Form */}
          <Box sx={{ flex: 1 }}>
            <Paper 
              elevation={0} 
              sx={{ 
                p: 3, 
                border: '1px solid', 
                borderColor: 'divider',
              }}
              className="rounded-lg shadow-sm"
            >
              <form onSubmit={handleSubmit}>
                <Box sx={{ mb: 3 }}>
                  <FormControl 
                    fullWidth 
                    error={!!errors.leaveTypeId}
                    required
                  >
                    <InputLabel id="leave-type-label">Tipo de Ausencia</InputLabel>
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
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box 
                              className={styles.menuItemIndicator}
                              sx={{ bgcolor: type.color_code }}
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
                
                <Box sx={{ mb: 3, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                  <TextField
                    id="start-date"
                    label="Fecha de inicio"
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      const selectedDate = e.target.value;
                      // Prevent selecting Sunday as start date
                      if (isSunday(selectedDate)) {
                        setErrors(prevErrors => ({
                          ...prevErrors,
                          startDate: 'No se puede iniciar una solicitud en domingo'
                        }));
                        return;
                      }
                      setStartDate(selectedDate);
                      // Clear any previous errors for this field
                      if (errors.startDate) {
                        const { startDate, ...restErrors } = errors;
                        setErrors(restErrors);
                      }
                    }}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{
                      min: minStartDate || undefined
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
                    onChange={(e) => {
                      const selectedDate = e.target.value;
                      setEndDate(selectedDate);
                      // Clear any previous errors for this field
                      if (errors.endDate) {
                        setErrors(prevErrors => {
                          const { endDate, ...restErrors } = prevErrors;
                          return restErrors;
                        });
                      }
                    }}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{
                      min: startDate || minStartDate || undefined
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
                
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'flex-end',
                  gap: 2,
                  flexDirection: { xs: 'column', sm: 'row' },
                }}>
                  
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={isSubmitting}
                    sx={{ py: 1.5 }}
                    className="rounded-lg hover:shadow-md transition-all duration-200"
                  >
                    {isSubmitting ? (
                      <>
                        <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                        Enviando...
                      </>
                    ) : 'Enviar solicitud'}
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