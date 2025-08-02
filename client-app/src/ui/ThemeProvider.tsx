import React, { createContext, ReactNode } from 'react';

export interface ColorScheme {
  textPrimary: string;   // nord4
  textSecondary: string; // nord3
  accent: string;        // nord9
  background: string;    // nord0
  surface: string;       // nord1
  button: string;        // nord6
  success: string;       // nord14
  warning: string;       // nord13
  error: string;         // nord11
  muted: string;         // nord2
  highlight: string;     // nord8
}

export const defaultColors: ColorScheme = {
  textPrimary: '#D8DEE9',   // nord4
  textSecondary: '#4C566A', // nord3
  accent: '#81A1C1',        // nord9
  background: '#2E3440',    // nord0
  surface: '#3B4252',       // nord1
  button: '#ECEFF4',        // nord6
  success: '#A3BE8C',       // nord14
  warning: '#EBCB8B',       // nord13
  error: '#BF616A',         // nord11
  muted: '#434C5E',         // nord2
  highlight: '#88C0D0',     // nord8
};

export const ThemeContext = createContext<ColorScheme>(defaultColors);

interface ThemeProviderProps {
  children: ReactNode;
  colorScheme?: Partial<ColorScheme>;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children, colorScheme }) => {
  const theme: ColorScheme = { ...defaultColors, ...(colorScheme || {}) };
  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};
