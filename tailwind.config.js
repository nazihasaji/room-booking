import defaultTheme from 'tailwindcss/defaultTheme';
import daisyui from 'daisyui';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.tsx',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ['Figtree', ...defaultTheme.fontFamily.sans],
            },
        },
    },

    plugins: [forms, daisyui],

    daisyui: {
        themes: [
            {
                roomreserve: {
                    primary: '#be123c',
                    secondary: '#0f766e',
                    accent: '#f59e0b',
                    neutral: '#1f2937',
                    'base-100': '#ffffff',
                    'base-200': '#f8fafc',
                    'base-300': '#e2e8f0',
                    info: '#0284c7',
                    success: '#059669',
                    warning: '#d97706',
                    error: '#dc2626',
                },
            },
        ],
    },
};
