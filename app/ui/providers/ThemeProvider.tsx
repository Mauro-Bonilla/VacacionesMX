'use client';

import React from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import appTheme from '@/app/ui/assets/muiTheme';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  return (
    <MuiThemeProvider theme={appTheme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
};

export default ThemeProvider;