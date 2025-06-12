// OpenAPI Editor Main Application
import { OpenAPIEditor } from './js/editor.js';
import { UIManager } from './js/ui-manager.js';
import { ValidationService } from './js/validation.js';
import { SchemaManager } from './js/schema-manager.js';
import { TagManager } from './js/tag-manager.js';
import { SecurityManager } from './js/security-manager.js';
import { ThemeManager } from './js/theme-manager.js';

class App {
    constructor() {
        this.editor = new OpenAPIEditor();
        this.ui = new UIManager(this.editor);
        this.validator = new ValidationService();
        this.schemaManager = new SchemaManager(this.editor);
        this.tagManager = new TagManager(this.editor);
        this.securityManager = new SecurityManager(this.editor);
        this.themeManager = new ThemeManager();

        // localStorage key for persistence
        this.STORAGE_KEY = 'openapi_editor_schema';

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.ui.render();
        this.schemaManager.init();
        this.tagManager.init(); this.securityManager.init();

        // Expose managers globally for cross-component communication
        window.uiManager = this.ui;
        window.schemaManager = this.schemaManager;
        window.tagManager = this.tagManager;
        window.securityManager = this.securityManager;
        window.themeManager = this.themeManager;
        window.app = this; // Expose app instance for auto-save

        // Try to load from localStorage first
        const savedSpec = this.loadFromStorage();
        if (savedSpec) {
            try {
                this.editor.import(savedSpec);
                this.ui.updateAPIInfo();
                this.ui.renderEndpoints();
                this.schemaManager.renderSchemas();
                this.tagManager.renderTags();
                this.securityManager.renderSecuritySchemes();
                console.log('Loaded saved schema from localStorage');
            } catch (error) {
                console.warn('Error loading saved schema, initializing empty:', error);
                this.initializeEmpty();
            }
        } else {
            this.initializeEmpty();
        }
    }

    initializeEmpty() {
        // Initialize with a basic OpenAPI structure
        this.editor.initializeEmpty();
        this.ui.updateAPIInfo();
        this.schemaManager.renderSchemas();
        this.tagManager.renderTags();
        this.securityManager.renderSecuritySchemes();
        this.saveToStorage();
    } setupEventListeners() {
        // Import/Export functionality
        document.getElementById('import-btn').addEventListener('click', () => {
            this.handleImport();
        }); document.getElementById('export-btn').addEventListener('click', () => {
            this.handleExport();
        });

        document.getElementById('copy-json-btn').addEventListener('click', () => {
            this.handleCopyToClipboard();
        });

        document.getElementById('clear-data-btn').addEventListener('click', () => {
            this.handleClearData();
        });

        // API Info updates
        ['api-title', 'api-version', 'api-description', 'api-base-url'].forEach(id => {
            document.getElementById(id).addEventListener('input', (e) => {
                this.handleAPIInfoUpdate(id, e.target.value);
            });
        });

        // Endpoint management
        document.getElementById('add-endpoint-btn').addEventListener('click', () => {
            this.ui.showEndpointEditor();
        });

        // Tab switching for Bootstrap nav-links (exclude schema editor modal tabs)
        document.querySelectorAll('.nav-link[data-tab]:not(#schema-editor-modal .nav-link)').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.ui.switchTab(e.target.dataset.tab);
            });
        });

        // Endpoint editor actions
        document.getElementById('save-endpoint-btn').addEventListener('click', () => {
            this.handleSaveEndpoint();
        });

        document.getElementById('delete-endpoint-btn').addEventListener('click', () => {
            this.handleDeleteEndpoint();
        });

        document.getElementById('cancel-edit-btn').addEventListener('click', () => {
            this.ui.hideEndpointEditor();
        });

        // Parameter and response management
        document.getElementById('add-parameter-btn').addEventListener('click', () => {
            this.ui.addParameter();
        });

        document.getElementById('add-response-btn').addEventListener('click', () => {
            this.ui.addResponse();
        });

        // Request body toggle
        document.getElementById('has-request-body').addEventListener('change', (e) => {
            this.ui.toggleRequestBody(e.target.checked);
        });

        // File input for import
        document.getElementById('file-input').addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files[0]);
        });
    }

    handleImport() {
        document.getElementById('file-input').click();
    }

    handleFileSelect(file) {
        if (!file) return;

        // Check if there's existing data and warn the user
        const existingData = this.loadFromStorage();
        if (existingData) {
            const confirmed = confirm(
                'You have a saved schema in your browser. Importing this file will overwrite your current work.\n\n' +
                'Are you sure you want to continue?'
            );
            if (!confirmed) {
                // Clear the file input so the same file can be selected again if needed
                document.getElementById('file-input').value = '';
                return;
            }
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target.result);

                this.editor.import(json);
                this.ui.updateAPIInfo();
                this.ui.renderEndpoints();
                this.ui.hideEndpointEditor();
                this.schemaManager.renderSchemas();
                this.tagManager.renderTags();
                this.securityManager.renderSecuritySchemes();
                this.showValidationResults();

                // Save the imported schema to localStorage
                this.saveToStorage();

                // Clear the file input for next use
                document.getElementById('file-input').value = '';
            } catch (error) {
                alert('Error importing file: ' + error.message);
                // Clear the file input on error too
                document.getElementById('file-input').value = '';
            }
        };
        reader.readAsText(file);
    } handleExport() {
        const spec = this.editor.export();
        const blob = new Blob([JSON.stringify(spec, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url; a.download = 'openapi.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async handleCopyToClipboard() {
        try {
            const spec = this.editor.export();
            const jsonString = JSON.stringify(spec, null, 2);

            await navigator.clipboard.writeText(jsonString);

            // Show success feedback
            const button = document.getElementById('copy-json-btn');
            const originalText = button.textContent;
            button.textContent = 'Copied!';
            button.classList.remove('btn-outline-primary');
            button.classList.add('btn-success');

            // Reset button after 2 seconds
            setTimeout(() => {
                button.textContent = originalText;
                button.classList.remove('btn-success');
                button.classList.add('btn-outline-primary');
            }, 2000);
        } catch (error) {
            // Fallback for older browsers or if clipboard API fails
            console.warn('Clipboard API failed, using fallback:', error);
            this.copyToClipboardFallback();
        }
    }

    copyToClipboardFallback() {
        try {
            const spec = this.editor.export();
            const jsonString = JSON.stringify(spec, null, 2);

            // Create a temporary textarea element
            const textarea = document.createElement('textarea');
            textarea.value = jsonString;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);

            // Select and copy the text
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);

            // Show success feedback
            const button = document.getElementById('copy-json-btn');
            const originalText = button.textContent;
            button.textContent = 'Copied!';
            button.classList.remove('btn-outline-primary');
            button.classList.add('btn-success');

            // Reset button after 2 seconds
            setTimeout(() => {
                button.textContent = originalText;
                button.classList.remove('btn-success');
                button.classList.add('btn-outline-primary');
            }, 2000);
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            alert('Failed to copy to clipboard. Please try again or use the Export JSON button instead.');
        }
    }

    handleClearData() {
        const confirmed = confirm(
            'Are you sure you want to clear all saved data?\n\n' +
            'This will remove your current API specification from browser storage and start fresh. ' +
            'You can export your current work before clearing if you want to keep it.'
        );

        if (confirmed) {
            this.clearStorage();
            this.initializeEmpty();
            alert('Saved data has been cleared. Starting with a fresh API specification.');
        }
    }

    handleAPIInfoUpdate(field, value) {
        const mapping = {
            'api-title': 'title',
            'api-version': 'version',
            'api-description': 'description',
            'api-base-url': 'baseUrl'
        };

        this.editor.updateAPIInfo(mapping[field], value);
        this.showValidationResults();
        this.saveToStorage(); // Auto-save on changes
    }

    handleSaveEndpoint() {
        const endpointData = this.ui.getEndpointFormData();

        if (!endpointData.path || !endpointData.method) {
            alert('Path and method are required');
            return;
        }

        try {
            if (this.ui.currentEndpointId) {
                this.editor.updateEndpoint(this.ui.currentEndpointId, endpointData);
            } else {
                this.editor.addEndpoint(endpointData);
            }

            this.ui.renderEndpoints();
            this.ui.hideEndpointEditor();
            this.schemaManager.renderSchemas();
            this.tagManager.renderTags(); // Update tag counts
            this.showValidationResults();
            this.saveToStorage(); // Auto-save on changes
        } catch (error) {
            alert('Error saving endpoint: ' + error.message);
        }
    }

    handleDeleteEndpoint() {
        if (!this.ui.currentEndpointId) return;

        if (confirm('Are you sure you want to delete this endpoint?')) {
            this.editor.deleteEndpoint(this.ui.currentEndpointId);
            this.ui.renderEndpoints();
            this.ui.hideEndpointEditor();
            this.tagManager.renderTags(); // Update tag counts
            this.showValidationResults();
            this.saveToStorage(); // Auto-save on changes
        }
    }

    showValidationResults() {
        const spec = this.editor.export();
        const results = this.validator.validate(spec);
        this.ui.showValidationResults(results);
    } saveToStorage() {
        try {
            const spec = this.editor.export();
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(spec));
            this.showAutoSaveIndicator();
        } catch (error) {
            console.warn('Failed to save to localStorage:', error);
        }
    }

    showAutoSaveIndicator() {
        const indicator = document.getElementById('auto-save-indicator');
        if (indicator) {
            indicator.classList.remove('d-none');
            setTimeout(() => {
                indicator.classList.add('d-none');
            }, 2000); // Hide after 2 seconds
        }
    }

    loadFromStorage() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            return saved ? JSON.parse(saved) : null;
        } catch (error) {
            console.warn('Failed to load from localStorage:', error);
            return null;
        }
    }

    clearStorage() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
        } catch (error) {
            console.warn('Failed to clear localStorage:', error);
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new App();
});
