// Theme Manager for OpenAPI Editor
export class ThemeManager {
    constructor() {
        this.STORAGE_KEY = 'openapi_editor_theme';
        this.currentTheme = 'system';
        this.systemTheme = 'light';

        this.init();
    } init() {
        // Add preload class to prevent transition flash
        document.body.classList.add('preload');

        // Load saved theme preference
        const savedTheme = localStorage.getItem(this.STORAGE_KEY);
        if (savedTheme && ['system', 'light', 'dark'].includes(savedTheme)) {
            this.currentTheme = savedTheme;
        }

        // Set up system theme detection
        this.setupSystemThemeDetection();

        // Apply initial theme immediately
        this.applyTheme();

        // Set up theme selector after DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupThemeSelector();
                // Remove preload class after a short delay to allow transitions
                setTimeout(() => document.body.classList.remove('preload'), 100);
            });
        } else {
            this.setupThemeSelector();
            setTimeout(() => document.body.classList.remove('preload'), 100);
        }
    }

    setupSystemThemeDetection() {
        // Check initial system theme
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            this.systemTheme = 'dark';
        } else {
            this.systemTheme = 'light';
        }

        // Listen for system theme changes
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', (e) => {
                this.systemTheme = e.matches ? 'dark' : 'light';
                if (this.currentTheme === 'system') {
                    this.applyTheme();
                }
            });
        }
    }

    setupThemeSelector() {
        const themeSelect = document.getElementById('theme-select');
        if (!themeSelect) return;

        // Set initial value
        themeSelect.value = this.currentTheme;

        // Listen for changes
        themeSelect.addEventListener('change', (e) => {
            this.setTheme(e.target.value);
        });
    }

    setTheme(theme) {
        if (!['system', 'light', 'dark'].includes(theme)) {
            console.warn('Invalid theme:', theme);
            return;
        }

        this.currentTheme = theme;
        localStorage.setItem(this.STORAGE_KEY, theme);
        this.applyTheme();

        // Update selector if called programmatically
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect && themeSelect.value !== theme) {
            themeSelect.value = theme;
        }
    }

    applyTheme() {
        const effectiveTheme = this.getEffectiveTheme();
        const htmlElement = document.documentElement;

        // Remove existing theme attributes
        htmlElement.removeAttribute('data-theme');

        // Apply new theme
        if (effectiveTheme === 'dark') {
            htmlElement.setAttribute('data-theme', 'dark');
        }
        // Light theme is the default (no attribute needed)

        // Dispatch theme change event for other components
        window.dispatchEvent(new CustomEvent('themeChanged', {
            detail: {
                theme: this.currentTheme,
                effectiveTheme: effectiveTheme
            }
        }));
    }

    getEffectiveTheme() {
        if (this.currentTheme === 'system') {
            return this.systemTheme;
        }
        return this.currentTheme;
    }

    getCurrentTheme() {
        return this.currentTheme;
    }

    getEffectiveThemeValue() {
        return this.getEffectiveTheme();
    }

    // Method to manually toggle between light and dark (useful for testing)
    toggleTheme() {
        const current = this.getEffectiveTheme();
        this.setTheme(current === 'light' ? 'dark' : 'light');
    }
}
