/**
 * Centralized color palette for the application
 * This file defines all available color themes and allows easy theme switching.
 */

// Define the active theme - change this single value to switch the entire app theme
const activeTheme = 'blue'; // Change this to 'green', 'purple', 'red', 'orange', 'teal', 'indigo' to switch themes

const themeOptions = {
  blue: {
    50:  '#e6eeff',
    100: '#ccdeff',
    200: '#99bdff',
    300: '#669cff',
    400: '#337bff',
    500: '#0055e6',
    600: '#0044b8',
    700: '#00338a',
    800: '#00225c',
    900: '#00112e',
    950: '#000919',
  },
  
  green: {
    50:  '#e6f5ef',
    100: '#ceeadf',
    200: '#a0d5c0',
    300: '#71c0a1',
    400: '#42ab82',
    500: '#00754a',
    600: '#00623e',
    700: '#004f32',
    800: '#003c26',
    900: '#00291a',
    950: '#001a10',
  },
  
  purple: {
    50:  '#f2e6ff',
    100: '#e5ccff',
    200: '#cc99ff',
    300: '#b266ff',
    400: '#9933ff',
    500: '#8000ff',
    600: '#6600cc',
    700: '#4d0099',
    800: '#330066',
    900: '#1a0033',
    950: '#0d001a',
  },
  
  red: {
    50:  '#ffe6e6',
    100: '#ffcccc',
    200: '#ff9999',
    300: '#ff6666',
    400: '#ff3333',
    500: '#ff0000',
    600: '#cc0000',
    700: '#990000',
    800: '#660000',
    900: '#330000',
    950: '#1a0000',
  },
  
  orange: {
    50:  '#fff2e6',
    100: '#ffe5cc',
    200: '#ffcc99',
    300: '#ffb266',
    400: '#ff9933',
    500: '#ff8000',
    600: '#cc6600',
    700: '#994d00',
    800: '#663300',
    900: '#331a00',
    950: '#190d00',
  },
  
  teal: {
    50:  '#e6fff2',
    100: '#ccffe5',
    200: '#99ffcc',
    300: '#66ffb2',
    400: '#33ff99',
    500: '#00e680',
    600: '#00b866',
    700: '#00994d',
    800: '#006633',
    900: '#00331a',
    950: '#00190d',
  },
  
  indigo: {
    50:  '#e6e6ff',
    100: '#ccccff',
    200: '#9999ff',
    300: '#6666ff',
    400: '#3333ff',
    500: '#0000ff',
    600: '#0000cc',
    700: '#000099',
    800: '#000066',
    900: '#000033',
    950: '#00001a',
  },

  black: {
    50:  '#f2f2f2',
    100: '#e6e6e6',
    200: '#cccccc',
    300: '#b3b3b3',
    400: '#999999',
    500: '#808080',
    600: '#666666',
    700: '#4d4d4d',
    800: '#333333',
    900: '#1a1a1a',
    950: '#0d0d0d',
  },

  pink: {
    50:  '#ffe6f2',
    100: '#ffcce5',
    200: '#ff99cc',
    300: '#ff66b2',
    400: '#ff3399',
    500: '#ff0080',
    600: '#cc0066',
    700: '#99004d',
    800: '#660033',
    900: '#33001a',
    950: '#19000d',
  },

  cyan: {
    50:  '#e6fbff',
    100: '#ccf7ff',
    200: '#99eeff',
    300: '#66e6ff',
    400: '#33ddff',
    500: '#00d5ff',
    600: '#00aacc',
    700: '#008099',
    800: '#005566',
    900: '#002b33',
    950: '#00151a',
  },

  lime: {
    50:  '#f2ffe6',
    100: '#e5ffcc',
    200: '#ccff99',
    300: '#b2ff66',
    400: '#99ff33',
    500: '#80ff00',
    600: '#66cc00',
    700: '#4d9900',
    800: '#336600',
    900: '#1a3300',
    950: '#0d1a00',
  },

  brown: {
    50:  '#f5f0e6',
    100: '#ebe0cc',
    200: '#d6c199',
    300: '#c2a366',
    400: '#ad8433',
    500: '#996600',
    600: '#7a5200',
    700: '#5c3d00',
    800: '#3d2900',
    900: '#1f1400',
    950: '#0f0a00',
  },

  gray: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0d0d0d',
  }
};

const sharedColors = {
  white: '#ffffff',
  black: '#000000',
  
  grey: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#eeeeee',
    300: '#e0e0e0',
    400: '#bdbdbd',
    500: '#9e9e9e',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },
  
  success: {
    light: '#4caf50',
    main: '#2e7d32',
    dark: '#1b5e20',
    contrastText: '#ffffff',
  },
  error: {
    light: '#ef5350',
    main: '#d32f2f',
    dark: '#c62828',
    contrastText: '#ffffff',
  },
  warning: {
    light: '#ff9800',
    main: '#ed6c02',
    dark: '#e65100',
    contrastText: '#ffffff',
  },
  info: {
    light: '#03a9f4',
    main: '#0288d1',
    dark: '#01579b',
    contrastText: '#ffffff',
  },
};

export const colors = {
  primary: themeOptions[activeTheme],
  
  secondary: {
    main: themeOptions[activeTheme][400],
    contrastText: '#ffffff',
  },
  
  ...sharedColors,
};

export const componentTokens = {
  borderRadius: {
    button: '0.5rem',
    chip: '16px',
    paper: '0.5rem',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
};

export const themeInfo = {
  activeTheme,
  availableThemes: Object.keys(themeOptions),
};

export default { colors, componentTokens, themeInfo };