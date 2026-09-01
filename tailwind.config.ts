import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        workspace: {
          950: '#07090C',
          900: '#0C0F14',
          850: '#11161D',
          800: '#171D25',
          700: '#232B36',
          600: '#344050',
          border: '#1F2833',
        },
        precision: {
          amber: '#F59E0B',
          copper: '#D97706',
          emerald: '#10B981',
          cyan: '#06B6D4',
          violet: '#8B5CF6',
        }
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
