'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

// Use dynamic import to prevent hydration errors and
// any potential issues with modules at build time
const VacationRequestForm = dynamic(
  () => import('@/app/ui/components/vacation-requests/VacationRequestForm'),
  {
    loading: () => (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh' 
      }}>
        <CircularProgress sx={{ color: '#00754a' }} />
      </Box>
    ),
    ssr: false // Disable server-side rendering to avoid module issues
  }
);

const Page = () => {
  return <VacationRequestForm />;
}

export default Page;