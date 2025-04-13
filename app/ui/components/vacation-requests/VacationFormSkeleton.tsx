"use client";
import React from 'react';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { lusitana } from "@/app/ui/fonts";

// Create MUI theme with green colors to match the main component
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
});

const VacationFormSkeleton = () => {
  return (
    <ThemeProvider theme={theme}>
      <Box className="space-y-6 mb-8">
        {/* Static Form Title - No longer a skeleton */}
        <Typography
          variant="h5"
          component="h1"
          className={lusitana.className}
          sx={{ color: "primary.main", mb: 4 }}
        >
          Solicitud de Vacaciones
        </Typography>
        
        
        {/* Form Container */}
        <FormSkeleton />
      </Box>
    </ThemeProvider>
  );
};


const FormSkeleton = () => {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        border: "1px solid",
        borderColor: "divider",
      }}
      className="rounded-lg shadow-sm"
    >
      {/* Leave Type Selection */}
      <Box sx={{ mb: 3 }}>
        <Skeleton variant="rectangular" width="100%" height={56} sx={{ borderRadius: 1 }} />
      </Box>
      
      {/* Date Fields */}
      <Box sx={{ 
        mb: 3,
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 2
      }}>
        <Skeleton variant="rectangular" width="100%" height={56} sx={{ borderRadius: 1 }} />
        <Skeleton variant="rectangular" width="100%" height={56} sx={{ borderRadius: 1 }} />
      </Box>
      
      {/* Notes Textarea */}
      <Box sx={{ mb: 4 }}>
        <Skeleton variant="rectangular" width="100%" height={100} sx={{ borderRadius: 1 }} />
      </Box>
      
      {/* Submit Button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Skeleton variant="rectangular" width={180} height={45} sx={{ borderRadius: 8 }} />
      </Box>
    </Paper>
  );
};

export default VacationFormSkeleton;