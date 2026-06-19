/** @type {import('tailwindcss').Config} */
// Acelera brand v2 — design tokens.
// Source of truth: ../../brand/style-guide/styles.css
module.exports = {
    content: [
        "./*.html",
        "./assets/**/*.js"
    ],
    theme: {
        extend: {
            colors: {
                // Brand v2 semantic tokens
                ink:         '#0B0F14',
                inkDeep:     '#06090C',
                paper:       '#F7F5F0',
                paperPure:   '#FFFFFF',
                accent:      '#C96A43',
                accentSoft:  '#EFD8CD',
                signal:      '#C2410C',
                muted:       '#6B7280',
                mutedStrong: '#4B5563',
                rule:        '#E5E1D8',
                ruleStrong:  '#D4CFC1',
                // Legacy aliases (keep until full class migration)
                background:    '#F7F5F0',
                surface:       '#FFFFFF',
                surfaceAlt:    '#EFEBE0',
                primary:       '#C96A43',
                textPrimary:   '#0B0F14',
                textSecondary: '#6B7280',
                borderSubtle:  '#E5E1D8'
            },
            fontFamily: {
                sans:    ['"Inter"', 'system-ui', 'sans-serif'],
                serif:   ['"Inter Tight"', 'system-ui', 'sans-serif'],
                display: ['"Inter Tight"', 'system-ui', 'sans-serif'],
                mono:    ['"JetBrains Mono"', 'ui-monospace', 'monospace']
            },
            boxShadow: {
                // Brand kit pide nada dramático — bordes finos, no sombras grandes
                'premium':  '0 1px 0 0 rgba(11, 15, 20, 0.04)',
                'floating': '0 2px 0 0 rgba(11, 15, 20, 0.06)'
            },
            borderRadius: {
                DEFAULT: '0',
                sm: '2px',
                md: '4px',
                lg: '8px',
                xl: '8px',
                '2xl': '8px',
                '3xl': '8px'
            }
        }
    },
    plugins: [
        require('@tailwindcss/forms')
    ]
};
