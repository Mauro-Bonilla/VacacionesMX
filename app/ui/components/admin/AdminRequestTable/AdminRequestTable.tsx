"use client";

import React, { useState, useMemo, useEffect } from "react";
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
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Badge,
  Divider,
  Paper,
  Avatar,
} from "@mui/material";
import {
  FilterAlt as FilterAltIcon,
  Close as CloseIcon,
  MoreVert as MoreVertIcon,
  Visibility as VisibilityIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  AccessTime as AccessTimeIcon,
  CalendarMonth as CalendarMonthIcon,
  Person as PersonIcon,
  EventNote as EventNoteIcon,
} from "@mui/icons-material";
import { DataGrid, GridColDef, GridToolbarProps } from "@mui/x-data-grid";
import {
  approveVacationRequest,
  rejectVacationRequest,
  fetchRequestDetails,
} from "@/app/lib/actions/admin-actions";
import { useRouter } from "next/navigation";
import { RequestStatus } from "@/app/lib/db/models/requestTypes";
import { lusitana } from "@/app/ui/fonts";

const statusColorMap: Record<
  RequestStatus,
  "warning" | "success" | "error" | "default" | "primary"
> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "error",
  CANCELLED: "default",
};

function formatDate(dateString: string | Date): string {
  if (!dateString) return "";

  const date = new Date(dateString);

  if (isNaN(date.getTime())) return "";

  const day = date.getDate().toString().padStart(2, "0");
  const month = date.toLocaleString("es-MX", { month: "short" });
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}

function formatDateTime(dateString: string | Date): string {
  if (!dateString) return "";

  const date = new Date(dateString);

  if (isNaN(date.getTime())) return "";

  const day = date.getDate().toString().padStart(2, "0");
  const month = date.toLocaleString("es-MX", { month: "short" });
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");

  return `${day} ${month} ${year}, ${hours}:${minutes}`;
}

function getStatusName(status: RequestStatus): string {
  const statusMap: Record<RequestStatus, string> = {
    PENDING: "Pendiente",
    APPROVED: "Aprobado",
    REJECTED: "Rechazado",
    CANCELLED: "Cancelado",
  };
  return statusMap[status] || status;
}

function calculateServiceTime(hireDate: string | Date): string {
  if (!hireDate) return "";

  const hire = new Date(hireDate);
  const now = new Date();

  const yearDiff = now.getFullYear() - hire.getFullYear();
  const monthDiff = now.getMonth() - hire.getMonth();

  let years = yearDiff;
  let months = monthDiff;

  if (monthDiff < 0) {
    years -= 1;
    months += 12;
  }

  const yearText = years === 1 ? "año" : "años";
  const monthText = months === 1 ? "mes" : "meses";

  if (years === 0) {
    return `${months} ${monthText}`;
  } else if (months === 0) {
    return `${years} ${yearText}`;
  } else {
    return `${years} ${yearText}, ${months} ${monthText}`;
  }
}

interface CustomToolbarProps extends GridToolbarProps {
  pendingCount: number;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  isSearching: boolean;
}

function CustomToolbar({
  pendingCount,
  searchTerm,
  onSearchChange,
  isSearching,
}: CustomToolbarProps) {
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const handleClearSearch = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSearchChange("");
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  return (
    <Box
      sx={{
        p: 3,
        mb: 2,
        borderRadius: 1,
        boxShadow: "0px 2px 4px -1px rgba(0,0,0,0.1)",
        borderBottom: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexDirection: { xs: "column", sm: "row" },
        gap: { xs: 2, sm: 0 },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Typography
          variant="h6"
          className={lusitana.className}
          sx={{ color: "primary.main", whiteSpace: "nowrap" }}
        >
          Solicitudes Pendientes
          <Badge
            badgeContent={pendingCount}
            color="warning"
            sx={{ ml: 2 }}
            showZero
          />
        </Typography>
      </Box>

      <Box
        sx={{
          display: "flex",
          width: { xs: "100%", sm: "auto" },
          gap: 2,
          alignItems: "center",
        }}
      >
        <TextField
          placeholder="Buscar por nombre o RFC..."
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          inputRef={searchInputRef}
          autoComplete="off"
          InputProps={{
            startAdornment: (
              <Box sx={{ display: "flex", alignItems: "center" }}>
                {isSearching ? (
                  <Box
                    sx={{
                      display: "inline-flex",
                      mr: 1,
                      width: 24,
                      height: 24,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        border: "2px solid",
                        borderColor: "primary.main",
                        borderTopColor: "transparent",
                        animation: "spin 1s linear infinite",
                        "@keyframes spin": {
                          "0%": {
                            transform: "rotate(0deg)",
                          },
                          "100%": {
                            transform: "rotate(360deg)",
                          },
                        },
                      }}
                    />
                  </Box>
                ) : (
                  <FilterAltIcon color="action" sx={{ mr: 1 }} />
                )}
              </Box>
            ),
            endAdornment: searchTerm ? (
              <IconButton
                size="small"
                onClick={handleClearSearch}
                onMouseDown={(e) => e.preventDefault()}
                sx={{ mr: -0.5 }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            ) : null,
            sx: {
              "&:hover": {
                borderColor: "primary.main",
              },
              "&.Mui-focused": {
                borderColor: "primary.main",
              },
            },
          }}
          sx={{
            minWidth: "250px",
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              transition: "all 0.2s ease",
              "&:hover": {
                backgroundColor: "rgba(0, 0, 0, 0.01)",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "primary.light",
                },
              },
              "&.Mui-focused": {
                boxShadow: "0 0 0 2px rgba(0, 85, 230, 0.1)",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "primary.main",
                  borderWidth: "1px",
                },
              },
            },
          }}
        />
      </Box>
    </Box>
  );
}

interface RequestDetailDialogProps {
  open: boolean;
  onClose: () => void;
  requestId: string | null;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
}

function RequestDetailDialog({
  open,
  onClose,
  requestId,
  onApprove,
  onReject,
}: RequestDetailDialogProps) {
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [showRejectForm, setShowRejectForm] = useState<boolean>(false);
  const [rejectionError, setRejectionError] = useState<string | null>(null);

  useEffect(() => {
    const getRequestDetails = async () => {
      if (!requestId || !open) return;

      setLoading(true);
      setError(null);

      try {
        const result = await fetchRequestDetails(requestId);
        if (result.success) {
          setRequest(result.request);
        } else {
          setError(result.message);
        }
      } catch (err) {
        setError("Error al cargar los detalles de la solicitud");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    getRequestDetails();
  }, [requestId, open]);

  useEffect(() => {
    if (!open) {
      setRejectionReason("");
      setShowRejectForm(false);
      setRejectionError(null);
    }
  }, [open]);

  const handleApprove = () => {
    if (!requestId) return;
    onApprove(requestId);
    onClose();
  };

  const handleShowRejectForm = () => {
    setShowRejectForm(true);
  };

  const handleReject = () => {
    if (!requestId) return;

    if (!rejectionReason.trim()) {
      setRejectionError("Debes proporcionar un motivo de rechazo");
      return;
    }

    onReject(requestId, rejectionReason);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
      aria-labelledby="request-detail-dialog"
    >
      <DialogTitle
        id="request-detail-dialog"
        sx={{
          pb: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid",
          borderColor: "divider",
          mb: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <EventNoteIcon color="primary" />
          Detalles de Solicitud
        </Box>
        <IconButton
          edge="end"
          color="inherit"
          onClick={onClose}
          aria-label="close"
          size="small"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
            <Typography>Cargando detalles...</Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ my: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && request && (
          <>
            <Paper
              elevation={0}
              sx={{ p: 3, mb: 3, border: "1px solid", borderColor: "divider" }}
            >
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <Avatar sx={{ bgcolor: "primary.main", mr: 2 }}>
                  <PersonIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">{request.user_name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {request.user_rfc}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 4, mt: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Correo Electrónico
                  </Typography>
                  <Typography variant="body2">{request.user_email}</Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Departamento
                  </Typography>
                  <Typography variant="body2">
                    {request.department_name}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Fecha de Contratación
                  </Typography>
                  <Typography variant="body2">
                    {formatDate(request.hire_date)}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Antigüedad
                  </Typography>
                  <Typography variant="body2">
                    {calculateServiceTime(request.hire_date)}
                  </Typography>
                </Box>
              </Box>
            </Paper>

            <Paper
              elevation={0}
              sx={{ p: 3, mb: 3, border: "1px solid", borderColor: "divider" }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  mb: 2,
                  flexWrap: "wrap",
                  gap: 2,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <CalendarMonthIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    Solicitud de {request.leave_type_name}
                  </Typography>
                </Box>

                <Chip
                  label={getStatusName(request.status as RequestStatus)}
                  color={statusColorMap[request.status as RequestStatus]}
                  sx={{ fontWeight: 500 }}
                />
              </Box>

              <Box
                sx={{
                  bgcolor: "grey.50",
                  p: 2,
                  borderRadius: 1,
                  border: "1px solid",
                  borderColor: "divider",
                  mb: 2,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: { xs: 2, sm: 4 },
                    mb: 2,
                  }}
                >
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Fecha Inicio
                    </Typography>
                    <Typography variant="body2">
                      {formatDate(request.start_date)}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Fecha Fin
                    </Typography>
                    <Typography variant="body2">
                      {formatDate(request.end_date)}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Días Calendario
                    </Typography>
                    <Typography variant="body2">
                      {request.calendar_days} días
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Días Hábiles
                    </Typography>
                    <Typography variant="body2">
                      {request.total_days} días
                    </Typography>
                  </Box>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: { xs: 2, sm: 4 },
                  }}
                >
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Fecha de Solicitud
                    </Typography>
                    <Typography variant="body2">
                      {formatDateTime(request.created_at)}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Con Goce de Sueldo
                    </Typography>
                    <Typography variant="body2">
                      {request.is_paid ? "Sí" : "No"}
                    </Typography>
                  </Box>

                  {request.anniversary_year !== null && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Año de Aniversario
                      </Typography>
                      <Typography variant="body2">
                        {request.anniversary_year}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom color="primary">
                  Notas del Solicitante
                </Typography>

                {request.notes ? (
                  <Typography
                    variant="body2"
                    sx={{
                      p: 2,
                      borderRadius: 1,
                      bgcolor: "background.paper",
                      border: "1px solid",
                      borderColor: "divider",
                      whiteSpace: "pre-line",
                    }}
                  >
                    {request.notes}
                  </Typography>
                ) : (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontStyle: "italic" }}
                  >
                    No hay notas adicionales para esta solicitud.
                  </Typography>
                )}
              </Box>
            </Paper>

            {showRejectForm ? (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom color="error">
                  Motivo de Rechazo
                </Typography>

                <TextField
                  autoFocus
                  multiline
                  rows={3}
                  fullWidth
                  variant="outlined"
                  placeholder="Escribe el motivo por el que rechazas esta solicitud..."
                  value={rejectionReason}
                  onChange={(e) => {
                    setRejectionReason(e.target.value);
                    if (e.target.value.trim()) {
                      setRejectionError(null);
                    }
                  }}
                  error={!!rejectionError}
                  helperText={rejectionError}
                  sx={{ mb: 2 }}
                />

                <Box
                  sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}
                >
                  <Button
                    onClick={() => setShowRejectForm(false)}
                    variant="outlined"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleReject}
                    variant="contained"
                    color="error"
                    startIcon={<CancelIcon />}
                  >
                    Confirmar Rechazo
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 2,
                  mt: 2,
                }}
              >
                <Button
                  onClick={handleShowRejectForm}
                  variant="outlined"
                  color="error"
                  startIcon={<CancelIcon />}
                >
                  Rechazar
                </Button>
                <Button
                  onClick={handleApprove}
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircleIcon />}
                >
                  Aprobar
                </Button>
              </Box>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface RejectDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  requestInfo: { id: string; userName: string; leaveType: string } | null;
}

function RejectDialog({
  open,
  onClose,
  onConfirm,
  requestInfo,
}: RejectDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setReason("");
      setError(null);
    }
  }, [open]);

  const handleConfirm = () => {
    if (!reason.trim()) {
      setError("Debes proporcionar un motivo para el rechazo");
      return;
    }

    onConfirm(reason);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="reject-dialog-title"
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle id="reject-dialog-title" sx={{ color: "error.main" }}>
        Rechazar Solicitud
      </DialogTitle>

      <DialogContent>
        {requestInfo && (
          <DialogContentText sx={{ mb: 2 }}>
            Estás por rechazar la solicitud de{" "}
            <strong>{requestInfo.leaveType}</strong> de{" "}
            <strong>{requestInfo.userName}</strong>. Por favor, proporciona un
            motivo para el rechazo:
          </DialogContentText>
        )}

        <TextField
          autoFocus
          multiline
          rows={4}
          fullWidth
          variant="outlined"
          placeholder="Escribe el motivo por el que rechazas esta solicitud..."
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            if (e.target.value.trim()) {
              setError(null);
            }
          }}
          error={!!error}
          helperText={error}
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          Cancelar
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="error"
          startIcon={<CancelIcon />}
        >
          Confirmar Rechazo
        </Button>
      </DialogActions>
    </Dialog>
  );
}

interface AdminRequestTableProps {
  requests: Array<{
    id: string;
    user_rfc: string;
    user_name: string;
    department_name: string;
    leave_type_id: string;
    leave_type_name: string;
    color_code: string;
    start_date: string | Date;
    end_date: string | Date;
    calendar_days: number;
    total_days: number;
    status: string;
    notes?: string;
    created_at: string | Date;
    anniversary_year?: number;
    balance_at_request?: number;
  }>;
}

export default function AdminRequestTable({
  requests,
}: AdminRequestTableProps) {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [isClient, setIsClient] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    null
  );
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectRequestInfo, setRejectRequestInfo] = useState<{
    id: string;
    userName: string;
    leaveType: string;
  } | null>(null);
  const [actionsMenuAnchorEl, setActionsMenuAnchorEl] = useState<{
    [key: string]: HTMLElement | null;
  }>({});
  const [alert, setAlert] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({
    open: false,
    message: "",
    severity: "success",
  });
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const rows = useMemo(() => {
    if (!requests || !Array.isArray(requests)) return [];

    return requests.map((request) => ({
      id: request.id,
      user_rfc: request.user_rfc,
      user_name: request.user_name,
      department_name: request.department_name,
      leave_type_id: request.leave_type_id,
      leave_type_name: request.leave_type_name,
      color_code: request.color_code,
      start_date: new Date(request.start_date),
      end_date: new Date(request.end_date),
      calendar_days: request.calendar_days,
      total_days: request.total_days,
      status: request.status,
      notes: request.notes,
      created_at: new Date(request.created_at),
      anniversary_year: request.anniversary_year,
      balance_at_request: request.balance_at_request,
    }));
  }, [requests]);

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLButtonElement>,
    requestId: string
  ) => {
    event.stopPropagation();
    setActionsMenuAnchorEl((prev) => ({
      ...prev,
      [requestId]: event.currentTarget,
    }));
  };

  const handleMenuClose = (requestId: string) => {
    setActionsMenuAnchorEl((prev) => ({ ...prev, [requestId]: null }));
  };

  const handleViewDetails = (requestId: string) => {
    setSelectedRequestId(requestId);
    setDetailDialogOpen(true);
    handleMenuClose(requestId);
  };

  const handleApprove = async (requestId: string) => {
    try {
      const result = await approveVacationRequest(requestId);

      if (result.success) {
        setAlert({
          open: true,
          message: "Solicitud aprobada exitosamente",
          severity: "success",
        });

        router.refresh();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setAlert({
        open: true,
        message:
          typeof error === "string"
            ? error
            : error instanceof Error
            ? error.message
            : "Error al aprobar la solicitud",
        severity: "error",
      });
    }
  };

  const handleShowRejectDialog = (request: any) => {
    setRejectRequestInfo({
      id: request.id,
      userName: request.user_name,
      leaveType: request.leave_type_name,
    });
    setRejectDialogOpen(true);
    handleMenuClose(request.id);
  };

  const handleReject = async (requestId: string, reason: string) => {
    try {
      const result = await rejectVacationRequest(requestId, reason);

      if (result.success) {
        setAlert({
          open: true,
          message: "Solicitud rechazada exitosamente",
          severity: "success",
        });

        router.refresh();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setAlert({
        open: true,
        message:
          typeof error === "string"
            ? error
            : error instanceof Error
            ? error.message
            : "Error al rechazar la solicitud",
        severity: "error",
      });
    }
  };

  const handleAlertClose = () => {
    setAlert((prev) => ({ ...prev, open: false }));
  };

  useEffect(() => {
    if (searchInput.length <= 1) {
      setSearchTerm(searchInput);
      setIsSearching(false);
      return;
    }

    if (searchInput.length > 2) {
      setIsSearching(true);
    }

    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
      setIsSearching(false);
    }, 150);

    return () => {
      clearTimeout(timer);
    };
  }, [searchInput]);

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;

    const searchTermLower = searchTerm.toLowerCase().trim();

    return rows.filter((row) => {
      const userName = String(row.user_name || "").toLowerCase();
      const userRfc = String(row.user_rfc || "").toLowerCase();

      return (
        userName.includes(searchTermLower) || userRfc.includes(searchTermLower)
      );
    });
  }, [rows, searchTerm]);

  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: "user_name",
        headerName: "EMPLEADO",
        flex: 1,
        minWidth: 180,
        renderCell: (params) => (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              height: "100%",
              py: 1,
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {params.value}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {params.row.user_rfc}
            </Typography>
          </Box>
        ),
      },
      {
        field: "department_name",
        headerName: "DEPARTAMENTO",
        width: 220,
        renderCell: (params) => (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              height: "100%",
            }}
          >
            <Typography
              variant="body2"
              sx={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {params.value}
            </Typography>
          </Box>
        ),
      },
      {
        field: "leave_type_name",
        headerName: "TIPO",
        width: 220,
        renderCell: (params) => (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              height: "100%",
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                bgcolor: params.row.color_code,
                mr: 1,
                flexShrink: 0,
              }}
            />
            <Typography
              variant="body2"
              sx={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {params.value}
            </Typography>
          </Box>
        ),
      },
      {
        field: "start_date",
        headerName: "FECHA INICIO",
        width: 120,
        align: "center",
        headerAlign: "center",
        renderCell: (params) => (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
            }}
          >
            <Typography variant="body2">{formatDate(params.value)}</Typography>
          </Box>
        ),
      },
      {
        field: "end_date",
        headerName: "FECHA FIN",
        width: 120,
        align: "center",
        headerAlign: "center",
        renderCell: (params) => (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
            }}
          >
            <Typography variant="body2">{formatDate(params.value)}</Typography>
          </Box>
        ),
      },
      {
        field: "total_days",
        headerName: "DÍAS",
        width: 80,
        align: "center",
        headerAlign: "center",
        renderCell: (params) => (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
            }}
          >
            <Chip
              label={params.value}
              size="small"
              color="primary"
              variant="outlined"
              sx={{
                minWidth: "40px",
                "& .MuiChip-label": {
                  px: 1,
                },
              }}
            />
          </Box>
        ),
      },
      {
        field: "created_at",
        headerName: "SOLICITADO",
        width: 180,
        align: "center",
        headerAlign: "center",
        renderCell: (params) => (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
            }}
          >
            <Typography variant="body2">{formatDate(params.value)}</Typography>
          </Box>
        ),
      },
      {
        field: "actions",
        headerName: "ACCIONES",
        width: 120,
        align: "center",
        headerAlign: "center",
        sortable: false,
        renderCell: (params) => {
          const requestId = params.row.id;

          return (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100%",
              }}
            >
              <IconButton
                size="small"
                onClick={(event) => handleMenuOpen(event, requestId)}
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
                MenuListProps={{ dense: true }}
              >
                <MenuItem onClick={() => handleViewDetails(requestId)}>
                  <VisibilityIcon
                    fontSize="small"
                    sx={{ mr: 1 }}
                    color="primary"
                  />
                  Ver detalles
                </MenuItem>
                <MenuItem onClick={() => handleApprove(requestId)}>
                  <CheckCircleIcon
                    fontSize="small"
                    sx={{ mr: 1 }}
                    color="success"
                  />
                  Aprobar
                </MenuItem>
                <MenuItem onClick={() => handleShowRejectDialog(params.row)}>
                  <CancelIcon fontSize="small" sx={{ mr: 1 }} color="error" />
                  Rechazar
                </MenuItem>
              </Menu>
            </Box>
          );
        },
      },
    ],
    [actionsMenuAnchorEl]
  );

  const columnVisibilityModel = useMemo(
    () => ({
      user_name: true,
      department_name: !isMobile,
      leave_type_name: true,
      start_date: true,
      end_date: true,
      total_days: !isMobile,
      created_at: !isMobile,
      actions: true,
    }),
    [isMobile]
  );

  return (
    <Box
      sx={{
        width: "100%",
        height: "auto",
        pb: 5,
        display: "flex",
        flexDirection: "column",
        "& .MuiDataGrid-root": {
          border: "none",
          borderRadius: 1,
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        },
        "& .MuiDataGrid-cell": {
          borderBottom: "1px solid #f0f0f0",
          padding: "8px 16px",
        },
        "& .MuiDataGrid-columnHeaders": {
          backgroundColor: "#f5f5f5",
          borderBottom: "none",
        },
        "& .MuiDataGrid-virtualScroller": {
          backgroundColor: "#fff",
        },
        "& .MuiDataGrid-footerContainer": {
          borderTop: "1px solid #f0f0f0",
          backgroundColor: "#f5f5f5",
        },
        "& .MuiDataGrid-columnHeaderTitle": {
          color: "primary.main",
          fontWeight: 600,
          whiteSpace: "normal",
          lineHeight: "normal",
        },
        "& .MuiDataGrid-row": {
          "&:hover": {
            backgroundColor: "rgba(0, 0, 0, 0.02)",
          },
        },
        "& .MuiDataGrid-row:nth-of-type(even)": {
          backgroundColor: "rgba(0, 0, 0, 0.02)",
        },
      }}
    >
      <Box
        sx={{
          p: 3,
          mb: 2,
          borderRadius: 1,
          boxShadow: "0px 2px 4px -1px rgba(0,0,0,0.1)",
          borderBottom: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexDirection: { xs: "column", sm: "row" },
          gap: { xs: 2, sm: 0 },
          backgroundColor: "white",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography
            variant="h6"
            className={lusitana.className}
            sx={{ color: "primary.main", whiteSpace: "nowrap" }}
          >
            Solicitudes Pendientes
            <Badge
              badgeContent={filteredRows.length}
              color="warning"
              sx={{ ml: 2 }}
              showZero
            />
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            width: { xs: "100%", sm: "auto" },
            gap: 2,
            alignItems: "center",
          }}
        >
          <TextField
            placeholder="Buscar por nombre o RFC..."
            variant="outlined"
            size="small"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            autoComplete="off"
            InputProps={{
              startAdornment: (
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  {isSearching ? (
                    <Box
                      sx={{
                        display: "inline-flex",
                        mr: 1,
                        width: 24,
                        height: 24,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Box
                        sx={{
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          border: "2px solid",
                          borderColor: "primary.main",
                          borderTopColor: "transparent",
                          animation: "spin 1s linear infinite",
                          "@keyframes spin": {
                            "0%": {
                              transform: "rotate(0deg)",
                            },
                            "100%": {
                              transform: "rotate(360deg)",
                            },
                          },
                        }}
                      />
                    </Box>
                  ) : (
                    <FilterAltIcon color="action" sx={{ mr: 1 }} />
                  )}
                </Box>
              ),
              endAdornment: searchInput ? (
                <IconButton
                  size="small"
                  onClick={() => setSearchInput("")}
                  onMouseDown={(e) => e.preventDefault()}
                  sx={{ mr: -0.5 }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              ) : null,
            }}
            sx={{
              minWidth: "250px",
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                transition: "all 0.2s ease",
                "&:hover": {
                  backgroundColor: "rgba(0, 0, 0, 0.01)",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "primary.light",
                  },
                },
                "&.Mui-focused": {
                  boxShadow: "0 0 0 2px rgba(0, 85, 230, 0.1)",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "primary.main",
                    borderWidth: "1px",
                  },
                },
              },
            }}
          />
        </Box>
      </Box>

      <DataGrid
        rows={filteredRows}
        columns={columns}
        initialState={{
          pagination: {
            paginationModel: { page: 0, pageSize: 10 },
          },
          sorting: {
            sortModel: [{ field: "created_at", sort: "desc" }],
          },
        }}
        pageSizeOptions={[5, 10, 25]}
        columnVisibilityModel={columnVisibilityModel}
        disableRowSelectionOnClick
        autoHeight
        slots={{
          toolbar: undefined,
        }}
        localeText={{
          noRowsLabel: searchTerm
            ? "No se encontraron resultados para la búsqueda"
            : "No hay solicitudes pendientes",
          MuiTablePagination: {
            labelRowsPerPage: "Filas por página:",
            labelDisplayedRows: ({ from, to, count }) =>
              `${from}-${to} de ${count}`,
          },
        }}
        getRowHeight={() => "auto"}
        sx={{
          "& .MuiDataGrid-cell": {
            py: 1.5,
          },
        }}
      />

      <RequestDetailDialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        requestId={selectedRequestId}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      <RejectDialog
        open={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        onConfirm={(reason) =>
          handleReject(rejectRequestInfo?.id || "", reason)
        }
        requestInfo={rejectRequestInfo}
      />

      <Snackbar
        open={alert.open}
        autoHideDuration={5000}
        onClose={handleAlertClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleAlertClose}
          severity={alert.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
