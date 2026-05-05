export type ColorScheme = 'light' | 'dark';

export type Colors = {
  bg: string;
  surface: string;
  surface2: string;
  text: string;
  text2: string;
  text3: string;
  text4: string;
  accent: string;
  accentBg: string;
  border: string;
  border2: string;
  success: string;
  danger: string;
};

export const LIGHT: Colors = {
  bg:        '#f5f6fa',
  surface:   '#ffffff',
  surface2:  '#f8f9fd',
  text:      '#1a1a2e',
  text2:     '#444444',
  text3:     '#888888',
  text4:     '#bbbbbb',
  accent:    '#4f6ef7',
  accentBg:  '#eef1fd',
  border:    '#e0e4ef',
  border2:   '#f4f5f9',
  success:   '#22c55e',
  danger:    '#e53e3e',
};

export const DARK: Colors = {
  bg:        '#0f1117',
  surface:   '#161b27',
  surface2:  '#1e2535',
  text:      '#e0e6f5',
  text2:     '#b0bcd4',
  text3:     '#6a7a98',
  text4:     '#3a4560',
  accent:    '#6b84fa',
  accentBg:  '#1a2040',
  border:    '#2a3245',
  border2:   '#1e2535',
  success:   '#22c55e',
  danger:    '#ef4444',
};

export function getColors(scheme: ColorScheme): Colors {
  return scheme === 'dark' ? DARK : LIGHT;
}
