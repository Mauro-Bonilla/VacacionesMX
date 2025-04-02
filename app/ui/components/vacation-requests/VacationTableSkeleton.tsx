'use client';
import React from 'react';
import { 
  Box, 
  ThemeProvider, 
  createTheme,
  Stack,
  Skeleton
} from '@mui/material';

// Create MUI theme with our green color
const theme = createTheme({
  palette: {
    primary: {
      main: '#00754a',
    },
    secondary: {
      main: '#42ab82',
    },
  }
});

export const VacationTableSkeleton = () => {
  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ 
        width: '100%', 
        pb: 5,
      }}>
        {/* Table header/toolbar skeleton */}
        <Box sx={{ 
          backgroundColor: '#fff', 
          padding: '16px', 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #f0f0f0',
        }}>
          <Box sx={{ width: '40%' }}>
            <Skeleton variant="rectangular" width="80%" height={40} />
          </Box>
          <Stack direction="row" spacing={2}>
            <Skeleton variant="rectangular" width={100} height={36} />
            <Skeleton 
              variant="rectangular" 
              width={180} 
              height={36} 
              sx={{ backgroundColor: 'rgba(0, 117, 74, 0.1)' }} 
            />
          </Stack>
        </Box>

        {/* Table column headers skeleton */}
        <Box sx={{ 
          display: 'flex', 
          backgroundColor: '#f5f5f5',
          borderBottom: '1px solid #e0e0e0',
          height: '56px',
        }}>
          <Box sx={{ flex: 1, padding: '10px 16px', display: 'flex', alignItems: 'center' }}>
            <Skeleton variant="text" width="90%" height={24} />
          </Box>
          <Box sx={{ width: '130px', padding: '10px 16px', display: 'flex', alignItems: 'center' }}>
            <Skeleton variant="text" width="90%" height={24} />
          </Box>
          <Box sx={{ width: '130px', padding: '10px 16px', display: 'flex', alignItems: 'center' }}>
            <Skeleton variant="text" width="90%" height={24} />
          </Box>
          <Box sx={{ width: '140px', padding: '10px 16px', display: 'flex', alignItems: 'center' }}>
            <Skeleton variant="text" width="90%" height={24} />
          </Box>
          <Box sx={{ width: '140px', padding: '10px 16px', display: 'flex', alignItems: 'center' }}>
            <Skeleton variant="text" width="90%" height={24} />
          </Box>
        </Box>

        {/* Table rows skeleton - Using array of fixed indexes to avoid randomness */}
        {[1, 2, 3, 4, 5].map((index) => (
          <Box key={index} sx={{ display: 'flex', borderBottom: '1px solid #f0f0f0', height: '60px' }}>
            <Box sx={{ flex: 1, padding: '10px 16px', display: 'flex', alignItems: 'center' }}>
              <Skeleton variant="text" width="75%" height={24} />
            </Box>
            <Box sx={{ width: '130px', padding: '10px 16px', display: 'flex', alignItems: 'center' }}>
              <Skeleton variant="text" width="80%" height={24} />
            </Box>
            <Box sx={{ width: '130px', padding: '10px 16px', display: 'flex', alignItems: 'center' }}>
              <Skeleton variant="text" width="80%" height={24} />
            </Box>
            <Box sx={{ width: '140px', padding: '10px 16px', display: 'flex', alignItems: 'center' }}>
              <Skeleton variant="text" width="50%" height={24} />
            </Box>
            <Box sx={{ width: '140px', padding: '10px 16px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Skeleton variant="rounded" width={70} height={24} sx={{ borderRadius: '16px' }} />
            </Box>
          </Box>
        ))}

        {/* Pagination skeleton */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          alignItems: 'center', 
          p: 2, 
          borderTop: '1px solid #f0f0f0',
          backgroundColor: '#f5f5f5',
          gap: 2,
        }}>
          <Skeleton variant="text" width={100} height={24} />
          <Skeleton variant="rounded" width={32} height={32} />
          <Skeleton variant="rounded" width={32} height={32} />
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default VacationTableSkeleton;