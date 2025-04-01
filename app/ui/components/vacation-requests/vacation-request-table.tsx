'use client';
import React, { useState, useMemo } from 'react';
import { 
  Box, 
  Button, 
  Chip, 
  Typography, 
  useTheme, 
  useMediaQuery, 
  ThemeProvider, 
  createTheme,
  Stack,
  Menu,
  MenuItem,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import { 
  Add as AddIcon,
  FilterAlt as FilterAltIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { 
  DataGrid, 
  GridColDef, 
  GridRenderCellParams,
  GridToolbarContainer,
  GridToolbarProps,
} from '@mui/x-data-grid';
import type { RequestStatus, VacationRequest } from "@/app/lib/db/models/requestTypes";

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
  { name: "DÍAS", uid: "total_days", sortable: true },
  { name: "ESTADO", uid: "status", sortable: true },
  { name: "FECHA SOLICITUD", uid: "created_at", sortable: true },
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
  
  return date.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  
  // Handle filter menu opening
  const handleFilterClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  // Handle filter menu closing
  const handleFilterClose = () => {
    setAnchorEl(null);
  };
  
  // Apply status filter
  const handleStatusFilter = (status: RequestStatus) => {
    const newActiveFilters = activeFilters.includes(status)
      ? activeFilters.filter(s => s !== status)
      : [...activeFilters, status];
    
    onStatusFilterChange(newActiveFilters);
    handleFilterClose();
  };
  
  // Clear all filters
  const clearFilters = () => {
    onStatusFilterChange([]);
  };

  return (
    <GridToolbarContainer sx={{ 
      p: 2, 
      display: 'flex', 
      flexDirection: isMobile ? 'column' : 'row',
      gap: isMobile ? 1 : 0
    }}>
      <Box sx={{ 
        flexGrow: 1, 
        mb: isMobile ? 1 : 0,
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 1
      }}>
        {/* Show currently active filters as chips */}
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
                sx={{ color: '#00754a' }}
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
            color: activeFilters.length > 0 ? '#00754a' : 'inherit',
            borderColor: activeFilters.length > 0 ? '#00754a' : 'inherit',
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
          <Divider sx={{ mb: 1 }} />
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
              {status.name}
            </MenuItem>
          ))}
        </Menu>
        <Button 
          variant="contained"
          startIcon={<AddIcon />}
          sx={{ 
            ml: isMobile ? 0 : 1, 
            backgroundColor: '#00754a',
            '&:hover': {
              backgroundColor: '#006040',
            },
            color: 'white',
            width: isMobile ? '100%' : 'auto',
            fontWeight: 500,
          }}
        >
          NUEVA SOLICITUD
        </Button>
      </Stack>
    </GridToolbarContainer>
  );
}

// Create MUI theme with our green color
const theme = createTheme({
  palette: {
    primary: {
      main: '#00754a',
    },
    secondary: {
      main: '#42ab82',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
    // Note: MuiDataGrid styling is moved to the Box sx prop for compatibility
  },
});

interface VacationRequestTableProps {
  requests: VacationRequest[];
  isAdmin?: boolean;
}

export function VacationRequestTable({ requests = [], isAdmin = false }: VacationRequestTableProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  // State for active filters
  const [activeStatusFilters, setActiveStatusFilters] = useState<RequestStatus[]>([]);
  
  // Cell rendering helper for consistent vertical alignment
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
  
  // Configure DataGrid columns based on the data structure
  const dataGridColumns: GridColDef[] = useMemo(() => [
    { 
      field: 'leave_type_name', 
      headerName: 'TIPO', 
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
      headerName: 'DÍAS', 
      width: 80,
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
  ], []);

  // For rows, we need to ensure each row has a unique id
  const rows = useMemo(() => {
    if (!requests || !Array.isArray(requests)) return [];
    
    return requests.map((request) => {
      // Create a unique ID for the row if it doesn't already have one
      return {
        ...request,
        id: request.id || `${request.user_rfc || 'unknown'}-${new Date(request.created_at).getTime() || Date.now()}`
      };
    });
  }, [requests]);

  // Define default column visibility (without actions)
  const defaultColumnVisibility = useMemo(() => {
    if (isMobile) {
      return {
        leave_type_name: true,
        status: true,
        start_date: false,
        end_date: false,
        total_days: false,
        created_at: false
      };
    }
    if (isTablet) {
      return {
        leave_type_name: true,
        start_date: true,
        status: true,
        end_date: false,
        total_days: false,
        created_at: true
      };
    }
    return {
      leave_type_name: true,
      start_date: true,
      end_date: true,
      total_days: true,
      status: true,
      created_at: true
    };
  }, [isMobile, isTablet]);

  // Filter rows based on selected status filters
  const filteredRows = useMemo(() => {
    if (activeStatusFilters.length === 0) {
      return rows;
    }
    
    return rows.filter(row => activeStatusFilters.includes(row.status as RequestStatus));
  }, [rows, activeStatusFilters]);

  // Handle status filter changes
  const handleStatusFilterChange = (statuses: RequestStatus[]) => {
    setActiveStatusFilters(statuses);
  };

  // Ensure column text does not get truncated with ellipsis
  const columnVisiblityModelWithWrapping = { 
    ...defaultColumnVisibility,
  };

  // Create a component that includes both the custom toolbar and its props
  function CustomToolbarWithProps(props: GridToolbarProps) {
    return (
      <CustomToolbar 
        {...props}
        activeFilters={activeStatusFilters}
        onStatusFilterChange={handleStatusFilterChange}
      />
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ 
        width: '100%',
        pb: 5, // Increased bottom padding on the entire component
        '& .MuiDataGrid-root': {
          border: 'none',
          '& .MuiDataGrid-row': {
            minHeight: '60px !important', // Ensure consistent row height
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
        // Apply green to column headers
        '& .MuiDataGrid-columnHeaderTitle': {
          color: '#00754a',
          fontWeight: 600,
          whiteSpace: 'normal',
          lineHeight: 'normal'
        },
        // Center the STATUS column cells
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
              paginationModel: { page: 0, pageSize: 5 },
            },
            columns: {
              columnVisibilityModel: columnVisiblityModelWithWrapping,
            },
          }}
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
          pageSizeOptions={[5, 10, 15]}
          slots={{ 
            toolbar: CustomToolbarWithProps,
          }}
          checkboxSelection={isAdmin}
          disableRowSelectionOnClick
          getRowHeight={() => 'auto'}
          localeText={{
            // Spanish translations
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
      </Box>
    </ThemeProvider>
  );
}

export default VacationRequestTable;