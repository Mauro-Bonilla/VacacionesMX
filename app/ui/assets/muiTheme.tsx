// app/ui/assets/muiTheme.tsx
import { createTheme } from '@mui/material/styles';
import type {} from '@mui/x-data-grid/themeAugmentation';
import { colors, componentTokens } from './themeColors';


export const appTheme = createTheme({
  palette: {
    primary: {
      main: colors.primary[500],
      light: colors.primary[400],
      dark: colors.primary[600],
      contrastText: '#ffffff',
    },
    secondary: {
      main: colors.secondary.main,
      contrastText: '#ffffff',
    },
    warning: {
      main: colors.warning.main,
      light: colors.warning.light,
      dark: colors.warning.dark,
      contrastText: colors.warning.contrastText,
    },
    success: {
      main: colors.success.main,
      light: colors.success.light,
      dark: colors.success.dark,
      contrastText: colors.success.contrastText,
    },
    error: {
      main: colors.error.main,
      light: colors.error.light,
      dark: colors.error.dark,
      contrastText: colors.error.contrastText,
    },
    grey: {
      50: colors.grey[50],
      100: colors.grey[100],
      200: colors.grey[200],
      300: colors.grey[300],
      400: colors.grey[400],
      500: colors.grey[500],
      600: colors.grey[600],
      700: colors.grey[700],
      800: colors.grey[800],
      900: colors.grey[900],
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: componentTokens.borderRadius.button,
          textTransform: "none",
          fontWeight: componentTokens.fontWeight.medium,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: componentTokens.fontWeight.medium,
        },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: 'none',
          '& .MuiDataGrid-row': {
            minHeight: '60px !important',
          },
          '& .MuiDataGrid-cell': {
            padding: '0 16px',
            borderBottom: `1px solid ${colors.grey[200]}`,
          },
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: colors.grey[100],
            borderBottom: 'none',
          },
          '& .MuiDataGrid-virtualScroller': {
            backgroundColor: '#fff',
          },
          '& .MuiDataGrid-footerContainer': {
            borderTop: `1px solid ${colors.grey[200]}`,
            backgroundColor: colors.grey[100],
          },
          '& .MuiDataGrid-toolbarContainer': {
            borderBottom: `1px solid ${colors.grey[200]}`,
            padding: 0,
          },
          '& .MuiDataGrid-columnHeaderTitle': {
            color: colors.primary[500],
            fontWeight: componentTokens.fontWeight.semibold,
            whiteSpace: 'normal',
            lineHeight: 'normal'
          },
          '& .MuiDataGrid-cell--textCenter': {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          },
        }
      }
    }
  },
});

export default appTheme;