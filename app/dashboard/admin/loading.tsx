import { monserrat } from "@/app/ui/fonts";
import { Divider, Skeleton, Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody } from "@mui/material";

export default function Loading() {
  return (
    <main>
      <div className="flex justify-between items-center mb-4">
        <h1 className={`${monserrat.className} text-xl md:text-2xl font-extrabold`}>
          Panel de Administración
        </h1>
      </div>
      
      <Divider className="my-4" />
      
      <div className="mt-6">
        <h2 className={`${monserrat.className} mb-4 text-lg md:text-xl font-semibold`}>
          Solicitudes Pendientes de Aprobación
        </h2>
        
        <Box sx={{ width: '100%', mb: 2 }}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 2, 
              mb: 2, 
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderRadius: 1,
              boxShadow: '0px 2px 4px -1px rgba(0,0,0,0.1)',
            }}
          >
            <Typography variant="h6">
              <Skeleton width={180} />
            </Typography>
            <Skeleton width={100} height={40} />
          </Paper>
          
          <Table aria-label="Tabla de solicitudes pendientes">
            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
              <TableRow>
                <TableCell><Skeleton width={150} /></TableCell>
                <TableCell><Skeleton width={100} /></TableCell>
                <TableCell><Skeleton width={100} /></TableCell>
                <TableCell><Skeleton width={100} /></TableCell>
                <TableCell><Skeleton width={80} /></TableCell>
                <TableCell><Skeleton width={100} /></TableCell>
                <TableCell align="center"><Skeleton width={80} /></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[...Array(5)].map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Skeleton variant="circular" width={30} height={30} sx={{ mr: 1 }} />
                      <Box>
                        <Skeleton width={120} />
                        <Skeleton width={80} height={12} />
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell><Skeleton width={90} /></TableCell>
                  <TableCell><Skeleton width={80} /></TableCell>
                  <TableCell><Skeleton width={80} /></TableCell>
                  <TableCell><Skeleton width={50} /></TableCell>
                  <TableCell><Skeleton width={80} /></TableCell>
                  <TableCell align="center"><Skeleton variant="circular" width={24} height={24} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </div>
    </main>
  );
}