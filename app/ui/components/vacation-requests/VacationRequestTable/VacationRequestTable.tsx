'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Box, 
  Button, 
  Chip, 
  Typography, 
  useTheme, 
  useMediaQuery, 
  Stack,
  Menu,
  MenuItem,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
} from '@mui/material';
import { 
  Add as AddIcon,
  FilterAlt as FilterAltIcon,
  Close as CloseIcon,
  MoreVert as MoreVertIcon,
  Visibility as VisibilityIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { 
  DataGrid, 
  GridColDef, 
  GridRenderCellParams,
  GridToolbarContainer,
  GridToolbarProps,
} from '@mui/x-data-grid';
import type { RequestStatus, VacationRequest } from "@/app/lib/db/models/requestTypes";
import { VacationTableSkeleton } from './VacationRequestTableSkeleton';
import { useRouter } from 'next/navigation';
import { NotesDialog, CancelRequestDialog } from './VacationRequestTableDialog';
import { cancelVacationRequest } from '@/app/lib/actions/vacation-request-actions';

// Define the column interface
interface ColumnDef {
  name: string;
  uid: string;
  sortable: boolean;
}

// Define our columns (without ACCIONES)
const columns: ColumnDef[] = [
  { name: "TIPO", uid: "leave_type_name", sortable: true },
  { name: "FECHA INICIO", uid: "start_date", sortable: true },
  { name: "FECHA FIN", uid: "end_date", sortable: true },
  { name: "DÍAS HÁBILES", uid: "total_days", sortable: true },
  { name: "DÍAS CALENDARIO", uid: "calendar_days", sortable: true },
  { name: "ESTADO", uid: "status", sortable: true },
  { name: "FECHA SOLICITUD", uid: "created_at", sortable: true },
  { name: "ACCIONES", uid: "actions", sortable: false },
];

// Define status options with Spanish translations
const statusOptions = [
  { name: "Pendiente", uid: "PENDING" },
  { name: "Aprobado", uid: "APPROVED" },
  { name: "Rechazado", uid: "REJECTED" },
  { name: "Cancelado", uid: "CANCELLED" },
];

// Map status to color for visual indication
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
function getStatusName(statusCode: RequestStatus): string {
  const status = statusOptions.find(s => s.uid === statusCode);
  return status ? status.name : statusCode;
}

// Custom toolbar component with proper typing
interface CustomToolbarProps extends GridToolbarProps {
  onStatusFilterChange: (statuses: RequestStatus[]) => void;
  activeFilters: RequestStatus[];
}

function CustomToolbar({ onStatusFilterChange, activeFilters }: CustomToolbarProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const router = useRouter();
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  
  const handleFilterClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleFilterClose = () => {
    setAnchorEl(null);
  };
  
  const handleStatusFilter = (status: RequestStatus) => {
    const newActiveFilters = activeFilters.includes(status)
      ? activeFilters.filter(s => s !== status)
      : [...activeFilters, status];
    
    onStatusFilterChange(newActiveFilters);
    handleFilterClose();
  };
  
  const clearFilters = () => {
    onStatusFilterChange([]);
  };

  const handleNewRequest = () => {
    try {
      router.push('/dashboard/form');
    } catch (error) {
      window.location.href = '/dashboard/form';
    }
  };

  return (
    <Box sx={{ 
      p: 2,
      mb: 2,
      borderRadius: 1,
      boxShadow: '0px 2px 4px -1px rgba(0,0,0,0.1)',
      borderBottom: 'none',
    }}>
      <GridToolbarContainer sx={{ 
        p: 0, 
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? 1 : 0
      }}>
        <Box sx={{ 
          flexGrow: 1, 
          marginBottom: isMobile ? 3 : 4,
          mb: isMobile ? 3 : 4,
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1
        }}>
          {activeFilters.length > 0 && (
            <>
              <Typography variant="body2" sx={{ mr: 1 }}>Filtros activos:</Typography>
              {activeFilters.map(status => (
                <Chip 
                  key={status}
                  label={getStatusName(status)}
                  color={statusColorMap[status]}
                  size="small"
                  onDelete={() => handleStatusFilter(status)}
                  sx={{ fontWeight: 500 }}
                />
              ))}
              <Tooltip title="Limpiar filtros">
                <IconButton 
                  size="small" 
                  onClick={clearFilters}
                  color="primary"
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
        <Stack 
          direction={isMobile ? "column" : "row"} 
          spacing={1}
          sx={{ width: isMobile ? '100%' : 'auto' }}
        >
          <Button 
            startIcon={<FilterAltIcon />}
            onClick={handleFilterClick}
            sx={{ 
              fontWeight: 500,
              width: isMobile ? '100%' : 'auto',
              justifyContent: isMobile ? 'flex-start' : 'center',
              color: activeFilters.length > 0 ? 'primary.main' : 'inherit',
              borderColor: activeFilters.length > 0 ? 'primary.main' : 'inherit',
              m: isMobile ? '8px 0' : '0 16px',
              padding: '8px 16px',
            }}
          >
            FILTRAR
          </Button>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleFilterClose}
            PaperProps={{
              sx: { 
                width: 200,
                maxHeight: 300,
                padding: 1,
              }
            }}
          >
            <Typography variant="subtitle2" sx={{ px: 2, mb: 1, fontWeight: 600 }}>
              Filtrar por estado
            </Typography>
            {statusOptions.map(status => (
              <MenuItem 
                key={status.uid} 
                onClick={() => handleStatusFilter(status.uid as RequestStatus)}
                sx={{ 
                  backgroundColor: activeFilters.includes(status.uid as RequestStatus) 
                    ? 'rgba(0, 117, 74, 0.08)' 
                    : 'transparent',
                }}
              >
                <Chip 
                  label={status.name}
                  color={statusColorMap[status.uid as RequestStatus]}
                  size="small"
                  sx={{ mr: 1, fontWeight: 500 }}
                />
              </MenuItem>
            ))}
          </Menu>
          <Button 
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleNewRequest}
            sx={{ 
              ml: isMobile ? 0 : 1, 
              width: isMobile ? '100%' : 'auto',
              fontWeight: 500,
            }}
          >
            NUEVA SOLICITUD
          </Button>
        </Stack>
      </GridToolbarContainer>
    </Box>
  );
}


interface VacationRequestTableProps {
  requests: VacationRequest[];
  isAdmin?: boolean;
}

export function VacationRequestTable({ requests = [], isAdmin = false }: VacationRequestTableProps) {
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  
  // State for handling dialogs
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<VacationRequest | null>(null);
  const [actionsMenuAnchorEl, setActionsMenuAnchorEl] = useState<{ [key: string]: HTMLElement | null }>({});
  
  // State for alerts
  const [alert, setAlert] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 600);
      setIsTablet(window.innerWidth >= 600 && window.innerWidth < 900);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const [activeStatusFilters, setActiveStatusFilters] = useState<RequestStatus[]>([]);
  
  // Handle menu open/close
  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>, requestId: string) => {
    event.stopPropagation();
    setActionsMenuAnchorEl(prev => ({ ...prev, [requestId]: event.currentTarget }));
  };

  const handleMenuClose = (requestId: string) => {
    setActionsMenuAnchorEl(prev => ({ ...prev, [requestId]: null }));
  };

  // Handle view notes
  const handleViewNotes = (request: VacationRequest) => {
    setSelectedRequest(request);
    setNotesDialogOpen(true);
    // Close menu
    if (request.id) {
      handleMenuClose(request.id);
    }
  };

  // Handle cancel request
  const handleCancelRequest = (request: VacationRequest) => {
    setSelectedRequest(request);
    setCancelDialogOpen(true);
    // Close menu
    if (request.id) {
      handleMenuClose(request.id);
    }
  };

  // Handle cancel confirmation
  const handleConfirmCancel = async (requestId: string) => {
    try {
      const result = await cancelVacationRequest(requestId);
      
      if (result.success) {
        setAlert({
          open: true,
          message: 'Solicitud cancelada exitosamente',
          severity: 'success',
        });
        // Close the dialog
        setCancelDialogOpen(false);
        
        // Reload the page to get fresh data
        router.refresh();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setAlert({
        open: true,
        message: typeof error === 'string' ? error : 
          error instanceof Error ? error.message : 'Error al cancelar la solicitud',
        severity: 'error',
      });
    }
  };

  // Close alert
  const handleAlertClose = () => {
    setAlert(prev => ({ ...prev, open: false }));
  };
  
  const renderAlignedCell = (content: React.ReactNode) => (
    <Box sx={{ 
      height: '100%', 
      width: '100%', 
      display: 'flex', 
      alignItems: 'center' 
    }}>
      {content}
    </Box>
  );
  
  // Determine if a request can be cancelled
  const canCancelRequest = useCallback((request: VacationRequest): boolean => {
    return request.status === 'PENDING' || request.status === 'APPROVED';
  }, []);
  
  const dataGridColumns: GridColDef[] = useMemo(() => [
    { 
      field: 'leave_type_name', 
      headerName: 'TIPO DE VACACIONES', 
      flex: 1,
      minWidth: 150,
      renderCell: (params: GridRenderCellParams<VacationRequest>) => renderAlignedCell(
        <Typography variant="body2" fontWeight={500}>
          {params.value}
        </Typography>
      ),
    },
    { 
      field: 'start_date', 
      headerName: 'FECHA INICIO', 
      width: 130,
      renderCell: (params: GridRenderCellParams<VacationRequest>) => renderAlignedCell(
        <Typography variant="body2">
          {formatDate(params.value as string | Date)}
        </Typography>
      ),
    },
    { 
      field: 'end_date', 
      headerName: 'FECHA FIN', 
      width: 130,
      renderCell: (params: GridRenderCellParams<VacationRequest>) => renderAlignedCell(
        <Typography variant="body2">
          {formatDate(params.value as string | Date)}
        </Typography>
      ),
    },
    { 
      field: 'total_days', 
      headerName: 'DÍAS HÁBILES', 
      width: 140,
      renderCell: (params) => renderAlignedCell(
        <Typography variant="body2">
          {params.value} días
        </Typography>
      ),
    },
    { 
      field: 'calendar_days', 
      headerName: 'DÍAS CALENDARIO', 
      width: 160,
      renderCell: (params) => renderAlignedCell(
        <Typography variant="body2">
          {params.value} días
        </Typography>
      ),
    },
    { 
      field: 'status', 
      headerName: 'ESTADO', 
      width: 140,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<VacationRequest>) => (
        <Box sx={{ 
          height: '100%',
          width: '100%', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center' 
        }}>
          <Chip 
            label={getStatusName(params.value as RequestStatus)}
            color={statusColorMap[params.value as RequestStatus]}
            size="small"
            sx={{ 
              fontWeight: 500,
            }}
          />
        </Box>
      ),
    },
    { 
      field: 'created_at', 
      headerName: 'FECHA SOLICITUD', 
      width: 150,
      renderCell: (params: GridRenderCellParams<VacationRequest>) => renderAlignedCell(
        <Typography variant="body2">
          {formatDate(params.value as string | Date)}
        </Typography>
      ),
    },
    {
      field: 'actions',
      headerName: 'ACCIONES',
      width: 100,
      sortable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<VacationRequest>) => {
        const request = params.row as VacationRequest;
        const requestId = request.id || '';
        
        return (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            height: '100%'
          }}>
            <IconButton
              size="small"
              onClick={(event) => handleMenuOpen(event, requestId)}
              aria-haspopup="true"
              aria-label="Acciones"
              color="primary"
            >
              <MoreVertIcon />
            </IconButton>
            <Menu
              keepMounted
              anchorEl={actionsMenuAnchorEl[requestId] || null}
              open={Boolean(actionsMenuAnchorEl[requestId])}
              onClose={() => handleMenuClose(requestId)}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              PaperProps={{
                sx: { minWidth: 150 }
              }}
            >
              <MenuItem 
                onClick={() => handleViewNotes(request)}
                dense
              >
                <VisibilityIcon fontSize="small" sx={{ mr: 1 }} color="primary" />
                Ver detalles
              </MenuItem>
              
              {canCancelRequest(request) && (
                <MenuItem 
                  onClick={() => handleCancelRequest(request)}
                  dense
                  sx={{ color: 'error.main' }}
                >
                  <CancelIcon fontSize="small" sx={{ mr: 1 }} />
                  Cancelar
                </MenuItem>
              )}
            </Menu>
          </Box>
        );
      },
    },
  ], [actionsMenuAnchorEl, canCancelRequest, handleCancelRequest, handleMenuClose, handleMenuOpen, handleViewNotes]);
  
  const rows = useMemo(() => {
    if (!requests || !Array.isArray(requests)) return [];
    
    return requests.map((request) => {
      return {
        ...request,
        id: request.id || `${request.user_rfc || 'unknown'}-${request.created_at || ''}`
      };
    });
  }, [requests]);
  
  // Modified to show all columns in all views
  const columnVisibilityModel = useMemo(() => {
    return {
      leave_type_name: true,
      start_date: true,
      end_date: true,
      total_days: true,
      calendar_days: true,
      status: true,
      created_at: true,
      actions: true
    };
  }, []);
  
  const filteredRows = useMemo(() => {
    if (activeStatusFilters.length === 0) {
      return rows;
    }
    
    return rows.filter(row => activeStatusFilters.includes(row.status as RequestStatus));
  }, [rows, activeStatusFilters]);
  
  const handleStatusFilterChange = (statuses: RequestStatus[]) => {
    setActiveStatusFilters(statuses);
  };
  
  function CustomToolbarWithProps(props: GridToolbarProps) {
    return (
      <CustomToolbar 
        {...props}
        activeFilters={activeStatusFilters}
        onStatusFilterChange={handleStatusFilterChange}
      />
    );
  }
  
  if (!isClient) {
    return <VacationTableSkeleton />;
  }
  
  return (
      <Box sx={{ 
        width: '100%',
        pb: 5,
        '& .MuiDataGrid-root': {
          border: 'none',
          '& .MuiDataGrid-row': {
            minHeight: '60px !important',
          },
          '& .MuiDataGrid-cell': {
            padding: '0 16px',
          },
        },
        '& .MuiDataGrid-cell': {
          borderBottom: '1px solid #f0f0f0',
        },
        '& .MuiDataGrid-columnHeaders': {
          backgroundColor: '#f5f5f5',
          borderBottom: 'none',
        },
        '& .MuiDataGrid-virtualScroller': {
          backgroundColor: '#fff',
        },
        '& .MuiDataGrid-footerContainer': {
          borderTop: '1px solid #f0f0f0',
          backgroundColor: '#f5f5f5',
        },
        '& .MuiDataGrid-toolbarContainer': {
          borderBottom: '1px solid #f0f0f0',
          padding: 0,
        },
        '& .MuiDataGrid-columnHeaderTitle': {
          color: 'primary.main',
          fontWeight: 600,
          whiteSpace: 'normal',
          lineHeight: 'normal'
        },
        '& .MuiDataGrid-cell--textCenter': {
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        },
      }}>
        <DataGrid
          rows={filteredRows}
          columns={dataGridColumns}
          disableColumnSelector
          disableColumnMenu
          columnHeaderHeight={56}
          initialState={{
            pagination: {
              paginationModel: { page: 0, pageSize: 10 },
            },
            columns: {
              columnVisibilityModel: columnVisibilityModel,
            },
          }}
          columnVisibilityModel={columnVisibilityModel}
          sx={{
            '& .MuiDataGrid-columnHeader': {
              whiteSpace: 'normal',
              minHeight: '56px',
            },
            '& .MuiDataGrid-columnHeaderTitleContainer': {
              whiteSpace: 'normal',
              overflow: 'visible',
              lineHeight: '1.43rem',
            }
          }}
          pageSizeOptions={[10, 25, 50]}
          slots={{ 
            toolbar: CustomToolbarWithProps,
          }}
          checkboxSelection={isAdmin}
          disableRowSelectionOnClick
          getRowHeight={() => 'auto'}
          localeText={{
            filterPanelAddFilter: 'Añadir filtro',
            filterPanelRemoveAll: 'Quitar todos',
            filterPanelDeleteIconLabel: 'Borrar',
            filterPanelOperator: 'Operadores',
            filterPanelOperatorAnd: 'Y',
            filterPanelOperatorOr: 'O',
            filterPanelColumns: 'Columnas',
            filterPanelInputLabel: 'Valor',
            filterPanelInputPlaceholder: 'Valor de filtro',
            noRowsLabel: 'No se encontraron solicitudes',
            MuiTablePagination: {
              labelRowsPerPage: 'Filas por página:',
              labelDisplayedRows: ({ from, to, count }) => `${from}-${to} de ${count}`,
            },
          }}
          autoHeight
        />
        
        {/* Dialogs */}
        <NotesDialog 
          open={notesDialogOpen}
          onClose={() => setNotesDialogOpen(false)}
          request={selectedRequest}
        />
        
        <CancelRequestDialog
          open={cancelDialogOpen}
          onClose={() => setCancelDialogOpen(false)}
          request={selectedRequest}
          onConfirm={handleConfirmCancel}
        />
        
        {/* Alerts */}
        <Snackbar
          open={alert.open}
          autoHideDuration={6000}
          onClose={handleAlertClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            onClose={handleAlertClose} 
            severity={alert.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {alert.message}
          </Alert>
        </Snackbar>
      </Box>
  );
}

export default VacationRequestTable;