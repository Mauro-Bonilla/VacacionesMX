'use client';
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Stack,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { 
  Event as EventIcon,
  Notes as NotesIcon,
  Cancel as CancelIcon,
  CalendarToday as CalendarTodayIcon,
} from '@mui/icons-material';
import type { RequestStatus, VacationRequest } from "@/app/lib/db/models/requestTypes";

// Status color mapping for consistent styling
const statusColorMap: Record<RequestStatus, "warning" | "success" | "error" | "default" | "primary"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "error",
  CANCELLED: "default",
};

// Format date to Spanish format consistently
function formatDate(dateString: string | Date): string {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  
  // Check if date is valid
  if (isNaN(date.getTime())) return '';
  
  // Use a fixed format that won't change between server and client
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleString('es-MX', { month: 'short' });
  const year = date.getFullYear();
  
  return `${day} ${month} ${year}`;
}

// Translate status for display
function getStatusName(status: RequestStatus): string {
  const statusMap: Record<RequestStatus, string> = {
    PENDING: "Pendiente",
    APPROVED: "Aprobado",
    REJECTED: "Rechazado",
    CANCELLED: "Cancelado",
  };
  return statusMap[status] || status;
}

interface NotesDialogProps {
  open: boolean;
  onClose: () => void;
  request: VacationRequest | null;
}

export function NotesDialog({ open, onClose, request }: NotesDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  
  if (!request) return null;
  
  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      fullScreen={fullScreen}
      maxWidth="sm"
      fullWidth
      aria-labelledby="vacation-notes-dialog"
    >
      <DialogTitle id="vacation-notes-dialog" sx={{ 
        pb: 1, 
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}>
        <NotesIcon color="primary" />
        Detalles de Solicitud
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
              <Chip 
                label={request.leave_type_name || "Tipo no especificado"} 
                color="primary"
                variant="outlined"
                icon={<EventIcon />}
              />
              <Chip 
                label={getStatusName(request.status)} 
                color={statusColorMap[request.status]}
                variant="outlined"
              />
            </Stack>
            
            <Box sx={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: 3, 
              p: 2, 
              bgcolor: 'grey.50', 
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider'
            }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Fecha Inicio</Typography>
                <Typography variant="body1">
                  <CalendarTodayIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle', fontSize: '0.9rem' }} />
                  {formatDate(request.start_date)}
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="caption" color="text.secondary">Fecha Fin</Typography>
                <Typography variant="body1">
                  <CalendarTodayIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle', fontSize: '0.9rem' }} />
                  {formatDate(request.end_date)}
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="caption" color="text.secondary">Días Hábiles</Typography>
                <Typography variant="body1">{request.total_days} días</Typography>
              </Box>
              
              <Box>
                <Typography variant="caption" color="text.secondary">Fecha Solicitud</Typography>
                <Typography variant="body1">{formatDate(request.created_at)}</Typography>
              </Box>
            </Box>
          </Box>
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        <Typography variant="subtitle2" gutterBottom color="primary">
          Notas
        </Typography>
        
        {request.notes ? (
          <DialogContentText sx={{ 
            p: 2, 
            borderRadius: 1, 
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            whiteSpace: 'pre-line'
          }}>
            {request.notes}
          </DialogContentText>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            No hay notas disponibles para esta solicitud.
          </Typography>
        )}
        
        {request.rejection_reason && (
          <>
            <Typography variant="subtitle2" gutterBottom color="error" sx={{ mt: 2 }}>
              Motivo de Rechazo
            </Typography>
            <DialogContentText sx={{ 
              p: 2, 
              borderRadius: 1, 
              bgcolor: 'error.light',
              color: 'error.dark',
              border: '1px solid',
              borderColor: 'error.main',
              whiteSpace: 'pre-line'
            }}>
              {request.rejection_reason}
            </DialogContentText>
          </>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}

interface CancelRequestDialogProps {
  open: boolean;
  onClose: () => void;
  request: VacationRequest | null;
  onConfirm: (requestId: string) => Promise<void>;
}

export function CancelRequestDialog({ open, onClose, request, onConfirm }: CancelRequestDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  if (!request) return null;
  
  const handleConfirm = async () => {
    if (!request.id) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      await onConfirm(request.id);
      onClose();
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Hubo un error al cancelar la solicitud.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog
      open={open}
      onClose={!isSubmitting ? onClose : undefined}
      aria-labelledby="cancel-request-dialog"
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle id="cancel-request-dialog" sx={{ 
        pb: 1, 
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        color: 'error.main'
      }}>
        <CancelIcon color="error" />
        Cancelar Solicitud
      </DialogTitle>
      
      <DialogContent>
        <DialogContentText>
          ¿Estás seguro que deseas cancelar esta solicitud de vacaciones? Esta acción no se puede deshacer.
        </DialogContentText>
        
        <Box sx={{ 
          mt: 2, 
          p: 2, 
          bgcolor: 'grey.50', 
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 3
        }}>
          <Box>
            <Typography variant="caption" color="text.secondary">Tipo</Typography>
            <Typography variant="body2">{request.leave_type_name}</Typography>
          </Box>
          
          <Box>
            <Typography variant="caption" color="text.secondary">Período</Typography>
            <Typography variant="body2">
              {formatDate(request.start_date)} - {formatDate(request.end_date)}
            </Typography>
          </Box>
          
          <Box>
            <Typography variant="caption" color="text.secondary">Días</Typography>
            <Typography variant="body2">{request.total_days} días</Typography>
          </Box>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button 
          onClick={onClose} 
          disabled={isSubmitting}
          variant="outlined"
        >
          Cancelar
        </Button>
        <Button 
          onClick={handleConfirm} 
          color="error" 
          variant="contained"
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <CancelIcon />}
        >
          {isSubmitting ? 'Procesando...' : 'Confirmar Cancelación'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}