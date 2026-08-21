import fs from 'fs';

const newIndex = fs.readFileSync('apps/frontend/src/index.css', 'utf-8');
const oldIndex = fs.readFileSync('temp-old-index-utf8.css', 'utf-8');

// Convert newIndex :root into @theme for Tailwind utilities, but keep :root for CSS vars!
// Actually, Tailwind v4 allows mapping CSS vars in @theme.
const themeBlock = `
@theme {
  --color-bg: var(--color-bg);
  --color-bg-elevated: var(--color-bg-elevated);
  --color-bg-subtle: var(--color-bg-subtle);
  --color-bg-hover: var(--color-bg-hover);
  --color-bg-active: var(--color-bg-active);

  --color-border: var(--color-border);
  --color-border-strong: var(--color-border-strong);
  --color-border-focus: var(--color-border-focus);

  --color-text: var(--color-text);
  --color-text-secondary: var(--color-text-secondary);
  --color-text-tertiary: var(--color-text-tertiary);
  --color-text-inverse: var(--color-text-inverse);
  --color-text-link: var(--color-text-link);

  --color-primary: var(--color-primary);
  --color-primary-hover: var(--color-primary-hover);
  --color-primary-active: var(--color-primary-active);
  --color-primary-light: var(--color-primary-light);
  --color-primary-text: var(--color-primary-text);

  --color-teal: var(--color-teal);
  --color-teal-hover: var(--color-teal-hover);
  --color-teal-light: var(--color-teal-light);
  --color-teal-text: var(--color-teal-text);

  --color-lime: var(--color-lime);
  --color-lime-hover: var(--color-lime-hover);
  --color-lime-light: var(--color-lime-light);
  --color-lime-text: var(--color-lime-text);

  --color-success: var(--color-success);
  --color-success-light: var(--color-success-light);
  --color-success-text: var(--color-success-text);

  --color-warning: var(--color-warning);
  --color-warning-light: var(--color-warning-light);
  --color-warning-text: var(--color-warning-text);

  --color-error: var(--color-error);
  --color-error-light: var(--color-error-light);
  --color-error-text: var(--color-error-text);

  --color-info: var(--color-info);
  --color-info-light: var(--color-info-light);
  --color-info-text: var(--color-info-text);

  --font-sans: var(--font-sans);
  --font-heading: var(--font-heading);
  --font-mono: var(--font-mono);

  --radius-sm: var(--radius-sm);
  --radius-md: var(--radius-md);
  --radius-lg: var(--radius-lg);
  --radius-xl: var(--radius-xl);
  --radius-full: var(--radius-full);

  --shadow-xs: var(--shadow-xs);
  --shadow-sm: var(--shadow-sm);
  --shadow-md: var(--shadow-md);
  --shadow-lg: var(--shadow-lg);
  --shadow-xl: var(--shadow-xl);
}
`;

// Remove the first few lines of oldIndex (imports and root blocks)
let oldComponents = oldIndex;
oldComponents = oldComponents.replace(/@import url\('[^']+'\);\n?/g, '');
oldComponents = oldComponents.replace(/:root\s*\{[^}]+\}\n?/g, '');
oldComponents = oldComponents.replace(/:root\[data-theme="[^"]+"\]\s*\{[^}]+\}\n?/g, '');
oldComponents = oldComponents.replace(/:root\[data-theme="[^"]+"\]\s*body\s*\{[^}]+\}\n?/g, '');

// Replace old variables with new variables
let mappedComponents = oldComponents
  .replace(/var\(--card\)/g, 'var(--color-bg-elevated)')
  .replace(/var\(--border\)/g, 'var(--color-border)')
  .replace(/var\(--radius\)/g, 'var(--radius-md)')
  .replace(/var\(--primary\)/g, 'var(--color-primary)')
  .replace(/var\(--secondary\)/g, 'var(--color-bg-subtle)')
  .replace(/var\(--foreground\)/g, 'var(--color-text)')
  .replace(/var\(--muted-foreground\)/g, 'var(--color-text-secondary)')
  .replace(/var\(--shadow\)/g, 'var(--shadow-md)')
  .replace(/var\(--yekis-card\)/g, 'var(--color-bg-elevated)')
  .replace(/var\(--yekis-border\)/g, 'var(--color-border)')
  .replace(/var\(--yekis-muted\)/g, 'var(--color-text-secondary)')
  .replace(/var\(--yekis-teal\)/g, 'var(--color-teal)')
  .replace(/var\(--yekis-lime\)/g, 'var(--color-lime)')
  .replace(/var\(--yekis-bg\)/g, 'var(--color-bg)')
  .replace(/var\(--yekis-surface\)/g, 'var(--color-bg-subtle)')
  .replace(/var\(--yekis-copy\)/g, 'var(--color-text)')
  .replace(/var\(--yekis-border-hover\)/g, 'var(--color-border-strong)')
  .replace(/#2b3631/gi, 'var(--color-text)')
  .replace(/#f9f6f0/gi, 'var(--color-bg)')
  .replace(/#d8f36b/gi, 'var(--color-lime)')
  .replace(/#77d9c5/gi, 'var(--color-teal)');

const finalCss = newIndex + '\n/* === RESTORED COMPONENTS === */\n' + themeBlock + '\n' + mappedComponents;

fs.writeFileSync('apps/frontend/src/index.css', finalCss);
console.log('Restored old CSS components to index.css and mapped them to new tokens.');
