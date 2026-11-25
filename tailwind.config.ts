import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        sans: [
          'var(--font-inter)',
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          50: '#F0F4F8',
          100: '#D9E2EC',
          200: '#BCCCDC',
          300: '#9FB3C8',
          400: '#829AB1',
          500: '#627D98',
          600: '#486581',
          700: '#334E68',
          800: '#243B53',
          900: '#16223C', // Deep Corporate Navy Brand (#16223C)
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
          sapphire: '#1D4ED8',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Operational Semantic Status Colors (WCAG AA compliant)
        status: {
          pending: {
            DEFAULT: '#D97706', // Amber-600
            light: '#FFFBEB',   // Amber-50
            border: '#FDE68A',  // Amber-200
            foreground: '#78350F', // Amber-900 (10.4:1 contrast)
          },
          approved: {
            DEFAULT: '#2563EB', // Blue-600
            light: '#EFF6FF',   // Blue-50
            border: '#BFDBFE',  // Blue-200
            foreground: '#1E3A8A', // Blue-900 (10.8:1 contrast)
          },
          assigned: {
            DEFAULT: '#4F46E5', // Indigo-600
            light: '#EEF2FF',   // Indigo-50
            border: '#C7D2FE',  // Indigo-200
            foreground: '#312E81', // Indigo-900
          },
          in_progress: {
            DEFAULT: '#7C3AED', // Violet-600
            light: '#FAF5FF',   // Purple-50
            border: '#E9D5FF',  // Purple-200
            foreground: '#581C87', // Purple-900
          },
          completed: {
            DEFAULT: '#059669', // Emerald-600
            light: '#ECFDF5',   // Emerald-50
            border: '#A7F3D0',  // Emerald-200
            foreground: '#064E3B', // Emerald-900 (9.8:1 contrast)
          },
          rejected: {
            DEFAULT: '#DC2626', // Red-600
            light: '#FFF1F2',   // Rose-50
            border: '#FECDD3',  // Rose-200
            foreground: '#881337', // Rose-900 (10.4:1 contrast)
          },
          cancelled: {
            DEFAULT: '#64748B', // Slate-500
            light: '#F1F5F9',   // Slate-100
            border: '#E2E8F0',  // Slate-200
            foreground: '#334155', // Slate-700 (9.3:1 contrast)
          },
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        'elevation-0': 'none',
        'elevation-1': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'elevation-2': '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
        'elevation-3': '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.04)',
        'elevation-4': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.05)',
      },
    },
  },
  plugins: [],
};

export default config;
