// Security Manager for OpenAPI Editor
export class SecurityManager {
    constructor(editor) {
        this.editor = editor;
        this.currentSecurity = null;
        this.currentSecurityId = null;
    } init() {
        this.setupEventListeners();
        this.renderSecuritySchemes();
    } setupEventListeners() {        // Security scheme management
        const addSecurityBtn = document.getElementById('add-security-btn');
        if (addSecurityBtn) {
            addSecurityBtn.addEventListener('click', () => {
                this.showSecurityEditor();
            });
        }

        // Security editor modal elements (will be available when modal is created)
        const closeSecurityEditor = document.getElementById('close-security-editor');
        if (closeSecurityEditor) {
            closeSecurityEditor.addEventListener('click', () => {
                this.hideSecurityEditor();
            });
        }

        const securityModal = document.getElementById('security-editor-modal');
        if (securityModal) {
            // Close modal when clicking outside of it
            securityModal.addEventListener('click', (e) => {
                if (e.target.id === 'security-editor-modal') {
                    this.hideSecurityEditor();
                }
            });
        }

        // Close modal with ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('security-editor-modal');
                if (modal && modal.style.display === 'block') {
                    this.hideSecurityEditor();
                }
            }
        });

        const saveSecurityBtn = document.getElementById('save-security-btn');
        if (saveSecurityBtn) {
            saveSecurityBtn.addEventListener('click', () => {
                this.saveSecurity();
            });
        }

        const cancelSecurityBtn = document.getElementById('cancel-security-btn');
        if (cancelSecurityBtn) {
            cancelSecurityBtn.addEventListener('click', () => {
                this.hideSecurityEditor();
            });
        }

        // Security type change
        const securityType = document.getElementById('security-type');
        if (securityType) {
            securityType.addEventListener('change', (e) => {
                this.handleSecurityTypeChange(e.target.value);
            });
        }

        // Security requirement management in endpoints (these might not be available initially)
        const securityToggle = document.getElementById('security-requirements-toggle');
        if (securityToggle) {
            securityToggle.addEventListener('change', (e) => {
                this.toggleSecurityRequirements(e.target.checked);
            });
        }

        const addSecurityReqBtn = document.getElementById('add-security-requirement-btn');
        if (addSecurityReqBtn) {
            addSecurityReqBtn.addEventListener('click', () => {
                this.addSecurityRequirement();
            });
        }
    } showSecurityEditor(securityId = null) {
        this.currentSecurityId = securityId;

        if (securityId) {
            // Edit existing security scheme
            this.currentSecurity = this.editor.getSecurityScheme(securityId);
            this.populateSecurityEditor(this.currentSecurity);
            document.getElementById('security-editor-title').textContent = 'Edit Security Scheme';
        } else {
            // Create new security scheme
            this.currentSecurity = {
                type: 'apiKey',
                name: '',
                in: 'header'
            };
            this.clearSecurityEditor();
            document.getElementById('security-editor-title').textContent = 'Add Security Scheme';
        }

        this.handleSecurityTypeChange(this.currentSecurity.type);
        // Show modal using Bootstrap's modal methods
        const modal = document.getElementById('security-editor-modal');
        if (modal) {
            // Use Bootstrap modal if available, otherwise fallback to direct style
            if (window.bootstrap && window.bootstrap.Modal) {
                const bootstrapModal = new window.bootstrap.Modal(modal);
                bootstrapModal.show();
            } else {
                modal.style.display = 'block';
                modal.classList.add('show');
            }
        } else {
            console.error('Security: Modal element not found');
        }
    } hideSecurityEditor() {
        const modal = document.getElementById('security-editor-modal');
        if (modal) {
            // Use Bootstrap modal if available, otherwise fallback to direct style
            if (window.bootstrap && window.bootstrap.Modal) {
                const bootstrapModal = window.bootstrap.Modal.getInstance(modal);
                if (bootstrapModal) {
                    bootstrapModal.hide();
                }
            } else {
                modal.style.display = 'none';
                modal.classList.remove('show');
            }
        }
        this.currentSecurity = null;
        this.currentSecurityId = null;
    }

    populateSecurityEditor(security) {
        document.getElementById('security-name').value = this.currentSecurityId || '';
        document.getElementById('security-description').value = security.description || '';
        document.getElementById('security-type').value = security.type;

        // Type-specific fields
        if (security.type === 'apiKey') {
            document.getElementById('api-key-name').value = security.name || '';
            document.getElementById('api-key-in').value = security.in || 'header';
        } else if (security.type === 'http') {
            document.getElementById('http-scheme').value = security.scheme || '';
            document.getElementById('http-bearer-format').value = security.bearerFormat || '';
        } else if (security.type === 'oauth2') {
            this.populateOAuth2Fields(security);
        } else if (security.type === 'openIdConnect') {
            document.getElementById('openid-url').value = security.openIdConnectUrl || '';
        }
    }

    populateOAuth2Fields(security) {
        if (security.flows) {
            // Implicit flow
            if (security.flows.implicit) {
                document.getElementById('oauth2-implicit-enabled').checked = true;
                document.getElementById('oauth2-implicit-auth-url').value = security.flows.implicit.authorizationUrl || '';
                document.getElementById('oauth2-implicit-refresh-url').value = security.flows.implicit.refreshUrl || '';
                this.populateScopes('oauth2-implicit-scopes', security.flows.implicit.scopes);
            }

            // Authorization Code flow
            if (security.flows.authorizationCode) {
                document.getElementById('oauth2-authcode-enabled').checked = true;
                document.getElementById('oauth2-authcode-auth-url').value = security.flows.authorizationCode.authorizationUrl || '';
                document.getElementById('oauth2-authcode-token-url').value = security.flows.authorizationCode.tokenUrl || '';
                document.getElementById('oauth2-authcode-refresh-url').value = security.flows.authorizationCode.refreshUrl || '';
                this.populateScopes('oauth2-authcode-scopes', security.flows.authorizationCode.scopes);
            }

            // Client Credentials flow
            if (security.flows.clientCredentials) {
                document.getElementById('oauth2-client-enabled').checked = true;
                document.getElementById('oauth2-client-token-url').value = security.flows.clientCredentials.tokenUrl || '';
                document.getElementById('oauth2-client-refresh-url').value = security.flows.clientCredentials.refreshUrl || '';
                this.populateScopes('oauth2-client-scopes', security.flows.clientCredentials.scopes);
            }

            // Password flow
            if (security.flows.password) {
                document.getElementById('oauth2-password-enabled').checked = true;
                document.getElementById('oauth2-password-token-url').value = security.flows.password.tokenUrl || '';
                document.getElementById('oauth2-password-refresh-url').value = security.flows.password.refreshUrl || '';
                this.populateScopes('oauth2-password-scopes', security.flows.password.scopes);
            }
        }
    }

    populateScopes(containerId, scopes) {
        if (!scopes) return;

        const container = document.getElementById(containerId);
        const scopesList = container.querySelector('.scopes-list');
        scopesList.innerHTML = '';

        Object.entries(scopes).forEach(([scope, description]) => {
            this.addScopeToContainer(scopesList, scope, description);
        });
    }

    clearSecurityEditor() {
        document.getElementById('security-name').value = '';
        document.getElementById('security-description').value = '';
        document.getElementById('security-type').value = 'apiKey';

        // Clear type-specific fields
        document.getElementById('api-key-name').value = '';
        document.getElementById('api-key-in').value = 'header';
        document.getElementById('http-scheme').value = '';
        document.getElementById('http-bearer-format').value = '';
        document.getElementById('openid-url').value = '';

        // Clear OAuth2 fields
        document.querySelectorAll('#oauth2-config input[type="checkbox"]').forEach(cb => cb.checked = false);
        document.querySelectorAll('#oauth2-config input[type="text"], #oauth2-config input[type="url"]').forEach(input => input.value = '');
        document.querySelectorAll('.scopes-list').forEach(list => list.innerHTML = '');

        this.updateOAuth2FlowVisibility();
    }

    handleSecurityTypeChange(type) {
        // Hide all type-specific sections
        document.getElementById('api-key-config').style.display = 'none';
        document.getElementById('http-config').style.display = 'none';
        document.getElementById('oauth2-config').style.display = 'none';
        document.getElementById('openid-config').style.display = 'none';

        // Show relevant section
        switch (type) {
            case 'apiKey':
                document.getElementById('api-key-config').style.display = 'block';
                break;
            case 'http':
                document.getElementById('http-config').style.display = 'block';
                this.handleHttpSchemeChange();
                break;
            case 'oauth2':
                document.getElementById('oauth2-config').style.display = 'block';
                this.setupOAuth2EventListeners();
                this.updateOAuth2FlowVisibility();
                break;
            case 'openIdConnect':
                document.getElementById('openid-config').style.display = 'block';
                break;
        }
    }

    handleHttpSchemeChange() {
        const scheme = document.getElementById('http-scheme').value;
        const bearerFormatContainer = document.getElementById('http-bearer-format-container');

        if (scheme === 'bearer') {
            bearerFormatContainer.style.display = 'block';
        } else {
            bearerFormatContainer.style.display = 'none';
            document.getElementById('http-bearer-format').value = '';
        }
    }

    setupOAuth2EventListeners() {
        // Flow toggle handlers
        document.getElementById('oauth2-implicit-enabled').addEventListener('change', () => this.updateOAuth2FlowVisibility());
        document.getElementById('oauth2-authcode-enabled').addEventListener('change', () => this.updateOAuth2FlowVisibility());
        document.getElementById('oauth2-client-enabled').addEventListener('change', () => this.updateOAuth2FlowVisibility());
        document.getElementById('oauth2-password-enabled').addEventListener('change', () => this.updateOAuth2FlowVisibility());

        // HTTP scheme change handler
        document.getElementById('http-scheme').addEventListener('change', () => this.handleHttpSchemeChange());

        // Scope management
        document.querySelectorAll('.add-scope-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const flowType = e.target.dataset.flow;
                this.addScope(flowType);
            });
        });
    }

    updateOAuth2FlowVisibility() {
        const flows = ['implicit', 'authcode', 'client', 'password'];

        flows.forEach(flow => {
            const enabled = document.getElementById(`oauth2-${flow}-enabled`).checked;
            const container = document.getElementById(`oauth2-${flow}-config`);
            container.style.display = enabled ? 'block' : 'none';
        });
    }

    addScope(flowType) {
        const scopesList = document.querySelector(`#oauth2-${flowType}-scopes .scopes-list`);
        this.addScopeToContainer(scopesList, '', '');
    }

    addScopeToContainer(container, scopeName = '', scopeDescription = '') {
        const div = document.createElement('div');
        div.className = 'scope-item d-flex gap-2 mb-2';
        div.innerHTML = `
            <input type="text" class="form-control scope-name" placeholder="Scope name" value="${scopeName}">
            <input type="text" class="form-control scope-description" placeholder="Scope description" value="${scopeDescription}">
            <button type="button" class="btn btn-outline-danger btn-sm remove-scope-btn">Remove</button>
        `;

        div.querySelector('.remove-scope-btn').addEventListener('click', () => {
            div.remove();
        });

        container.appendChild(div);
    }

    saveSecurity() {
        const name = document.getElementById('security-name').value.trim();
        const description = document.getElementById('security-description').value.trim();
        const type = document.getElementById('security-type').value;

        if (!name) {
            alert('Security scheme name is required');
            return;
        }

        const securityScheme = {
            type,
            description: description || undefined
        };

        try {
            // Build security scheme based on type
            switch (type) {
                case 'apiKey':
                    securityScheme.name = document.getElementById('api-key-name').value.trim();
                    securityScheme.in = document.getElementById('api-key-in').value;

                    if (!securityScheme.name) {
                        alert('API key name is required');
                        return;
                    }
                    break;

                case 'http':
                    securityScheme.scheme = document.getElementById('http-scheme').value.trim();
                    const bearerFormat = document.getElementById('http-bearer-format').value.trim();

                    if (!securityScheme.scheme) {
                        alert('HTTP scheme is required');
                        return;
                    }

                    if (securityScheme.scheme === 'bearer' && bearerFormat) {
                        securityScheme.bearerFormat = bearerFormat;
                    }
                    break;

                case 'oauth2':
                    securityScheme.flows = this.buildOAuth2Flows();

                    if (!securityScheme.flows || Object.keys(securityScheme.flows).length === 0) {
                        alert('At least one OAuth2 flow must be configured');
                        return;
                    }
                    break;

                case 'openIdConnect':
                    securityScheme.openIdConnectUrl = document.getElementById('openid-url').value.trim();

                    if (!securityScheme.openIdConnectUrl) {
                        alert('OpenID Connect URL is required');
                        return;
                    }
                    break;
            }            // Clean up undefined values
            Object.keys(securityScheme).forEach(key => {
                if (securityScheme[key] === undefined) {
                    delete securityScheme[key];
                }
            }); if (this.currentSecurityId) {
                // Check if the name has changed
                if (name !== this.currentSecurityId) {
                    // Name has changed - delete old and add new
                    this.editor.deleteSecurityScheme(this.currentSecurityId);
                    this.editor.addSecurityScheme(name, securityScheme);

                    // Update any endpoint security requirements that reference the old name
                    this.editor.updateSecuritySchemeReferences(this.currentSecurityId, name);
                } else {
                    // Name hasn't changed - just update
                    this.editor.updateSecurityScheme(this.currentSecurityId, securityScheme);
                }
            } else {
                this.editor.addSecurityScheme(name, securityScheme);
            } this.hideSecurityEditor();
            this.renderSecuritySchemes();

            // Refresh security options in the UI
            if (window.uiManager) {
                window.uiManager.refreshSecurityOptions();
            }

            // Auto-save to localStorage
            if (window.app) {
                window.app.saveToStorage();
            }

        } catch (error) {
            alert('Error saving security scheme: ' + error.message);
        }
    }

    buildOAuth2Flows() {
        const flows = {};

        // Implicit flow
        if (document.getElementById('oauth2-implicit-enabled').checked) {
            const authUrl = document.getElementById('oauth2-implicit-auth-url').value.trim();
            if (authUrl) {
                flows.implicit = {
                    authorizationUrl: authUrl,
                    scopes: this.getScopesFromContainer('oauth2-implicit-scopes')
                };

                const refreshUrl = document.getElementById('oauth2-implicit-refresh-url').value.trim();
                if (refreshUrl) flows.implicit.refreshUrl = refreshUrl;
            }
        }

        // Authorization Code flow
        if (document.getElementById('oauth2-authcode-enabled').checked) {
            const authUrl = document.getElementById('oauth2-authcode-auth-url').value.trim();
            const tokenUrl = document.getElementById('oauth2-authcode-token-url').value.trim();

            if (authUrl && tokenUrl) {
                flows.authorizationCode = {
                    authorizationUrl: authUrl,
                    tokenUrl: tokenUrl,
                    scopes: this.getScopesFromContainer('oauth2-authcode-scopes')
                };

                const refreshUrl = document.getElementById('oauth2-authcode-refresh-url').value.trim();
                if (refreshUrl) flows.authorizationCode.refreshUrl = refreshUrl;
            }
        }

        // Client Credentials flow
        if (document.getElementById('oauth2-client-enabled').checked) {
            const tokenUrl = document.getElementById('oauth2-client-token-url').value.trim();

            if (tokenUrl) {
                flows.clientCredentials = {
                    tokenUrl: tokenUrl,
                    scopes: this.getScopesFromContainer('oauth2-client-scopes')
                };

                const refreshUrl = document.getElementById('oauth2-client-refresh-url').value.trim();
                if (refreshUrl) flows.clientCredentials.refreshUrl = refreshUrl;
            }
        }

        // Password flow
        if (document.getElementById('oauth2-password-enabled').checked) {
            const tokenUrl = document.getElementById('oauth2-password-token-url').value.trim();

            if (tokenUrl) {
                flows.password = {
                    tokenUrl: tokenUrl,
                    scopes: this.getScopesFromContainer('oauth2-password-scopes')
                };

                const refreshUrl = document.getElementById('oauth2-password-refresh-url').value.trim();
                if (refreshUrl) flows.password.refreshUrl = refreshUrl;
            }
        }

        return flows;
    }

    getScopesFromContainer(containerId) {
        const scopes = {};
        const container = document.getElementById(containerId);
        const scopeItems = container.querySelectorAll('.scope-item');

        scopeItems.forEach(item => {
            const name = item.querySelector('.scope-name').value.trim();
            const description = item.querySelector('.scope-description').value.trim();

            if (name) {
                scopes[name] = description || '';
            }
        });

        return scopes;
    } renderSecuritySchemes() {
        const container = document.getElementById('security-schemes-list');
        if (!container) {
            console.error('Security schemes container not found');
            return;
        }

        const securitySchemes = this.editor.getAllSecuritySchemes();
        container.innerHTML = ''; if (Object.keys(securitySchemes).length === 0) {
            container.innerHTML = '<p class="empty-state text-muted small">No security schemes created yet.</p>';
            return;
        }

        // Sort security schemes alphabetically by name
        const sortedSecuritySchemes = Object.entries(securitySchemes).sort(([nameA], [nameB]) => nameA.localeCompare(nameB));

        sortedSecuritySchemes.forEach(([name, scheme]) => {
            const div = document.createElement('div');
            div.className = 'security-item p-2 border rounded mb-2 d-flex justify-content-between align-items-center';

            const typeLabel = this.getSecurityTypeLabel(scheme.type);
            const description = scheme.description ? ` - ${scheme.description}` : '';

            div.innerHTML = `
                <div class="security-info">
                    <div class="fw-semibold">${name}</div>
                    <small class="text-muted">${typeLabel}${description}</small>
                </div>
                <button type="button" class="btn btn-sm text-danger delete-security-btn" onclick="window.securityManager.deleteSecurityScheme('${name}')" title="Delete security scheme">
                    <i class="bi bi-x-lg"></i>
                </button>
            `;

            // Add click handler to the main area (excluding the delete button)
            div.addEventListener('click', (e) => {
                // Don't open editor if delete button was clicked
                if (!e.target.closest('.delete-security-btn')) {
                    this.showSecurityEditor(name);
                }
            });

            container.appendChild(div);
        });

        // Expose globally for inline handlers
        window.securityManager = this;
    }

    getSecurityTypeLabel(type) {
        const labels = {
            'apiKey': 'API Key',
            'http': 'HTTP',
            'oauth2': 'OAuth 2.0',
            'openIdConnect': 'OpenID Connect',
            'mutualTLS': 'Mutual TLS'
        };
        return labels[type] || type;
    }

    deleteSecurityScheme(name) {
        if (confirm(`Are you sure you want to delete the security scheme "${name}"?`)) {
            this.editor.deleteSecurityScheme(name);
            this.renderSecuritySchemes();

            if (window.uiManager) {
                window.uiManager.refreshSecurityOptions();
            }

            // Auto-save to localStorage
            if (window.app) {
                window.app.saveToStorage();
            }
        }
    }

    toggleSecurityRequirements(enabled) {
        const container = document.getElementById('security-requirements-container');
        container.style.display = enabled ? 'block' : 'none';

        if (!enabled) {
            // Clear requirements when disabled
            document.getElementById('security-requirements-list').innerHTML = '';
        }
    }

    addSecurityRequirement() {
        const container = document.getElementById('security-requirements-list');
        const securitySchemes = this.editor.getAllSecuritySchemes();

        if (Object.keys(securitySchemes).length === 0) {
            alert('No security schemes available. Please add security schemes first.');
            return;
        }

        const div = document.createElement('div');
        div.className = 'security-requirement-item border rounded p-3 mb-2'; let schemesOptions = '';
        // Sort security scheme names alphabetically
        const sortedSchemeNames = Object.keys(securitySchemes).sort((a, b) => a.localeCompare(b));
        sortedSchemeNames.forEach(name => {
            schemesOptions += `<option value="${name}">${name}</option>`;
        });

        div.innerHTML = `
            <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                    <label class="form-label">Security Scheme</label>
                    <select class="form-select security-scheme-select">
                        <option value="">Select security scheme</option>
                        ${schemesOptions}
                    </select>
                    <div class="scopes-container mt-2" style="display: none;">
                        <label class="form-label">Required Scopes</label>
                        <div class="scopes-input">
                            <input type="text" class="form-control" placeholder="Enter comma-separated scopes (e.g., read, write)">
                            <small class="form-text text-muted">Leave empty if no scopes are required</small>
                        </div>
                    </div>
                </div>
                <button type="button" class="btn btn-outline-danger btn-sm ms-2 remove-requirement-btn">Remove</button>
            </div>
        `;

        // Add event listeners
        const schemeSelect = div.querySelector('.security-scheme-select');
        const scopesContainer = div.querySelector('.scopes-container');

        schemeSelect.addEventListener('change', (e) => {
            const schemeName = e.target.value;
            if (schemeName) {
                const scheme = securitySchemes[schemeName];
                // Show scopes input only for OAuth2
                if (scheme && scheme.type === 'oauth2') {
                    scopesContainer.style.display = 'block';
                } else {
                    scopesContainer.style.display = 'none';
                }
            } else {
                scopesContainer.style.display = 'none';
            }
        });

        div.querySelector('.remove-requirement-btn').addEventListener('click', () => {
            div.remove();
        });

        container.appendChild(div);
    }

    getEndpointSecurityRequirements() {
        const requirements = [];
        const items = document.querySelectorAll('.security-requirement-item');

        items.forEach(item => {
            const schemeName = item.querySelector('.security-scheme-select').value;
            if (schemeName) {
                const scopesInput = item.querySelector('.scopes-input input');
                const scopesValue = scopesInput ? scopesInput.value.trim() : '';

                const requirement = {};
                if (scopesValue) {
                    // Parse comma-separated scopes
                    const scopes = scopesValue.split(',').map(s => s.trim()).filter(s => s.length > 0);
                    requirement[schemeName] = scopes;
                } else {
                    requirement[schemeName] = [];
                }

                requirements.push(requirement);
            }
        });

        return requirements;
    }

    setEndpointSecurityRequirements(requirements) {
        const toggle = document.getElementById('security-requirements-toggle');
        const container = document.getElementById('security-requirements-list');

        if (!requirements || requirements.length === 0) {
            toggle.checked = false;
            this.toggleSecurityRequirements(false);
            return;
        }

        toggle.checked = true;
        this.toggleSecurityRequirements(true);
        container.innerHTML = '';

        requirements.forEach(requirement => {
            this.addSecurityRequirement();
            const lastItem = container.lastElementChild;

            // Set the scheme and scopes
            Object.entries(requirement).forEach(([schemeName, scopes]) => {
                const schemeSelect = lastItem.querySelector('.security-scheme-select');
                schemeSelect.value = schemeName;

                // Trigger change event to show/hide scopes
                const changeEvent = new Event('change');
                schemeSelect.dispatchEvent(changeEvent);

                // Set scopes if any
                if (scopes && scopes.length > 0) {
                    const scopesInput = lastItem.querySelector('.scopes-input input');
                    if (scopesInput) {
                        scopesInput.value = scopes.join(', ');
                    }
                }
            });
        });
    } getSecuritySelectOptions() {
        const securitySchemes = this.editor.getAllSecuritySchemes();
        const options = ['<option value="">No security</option>'];

        // Sort security scheme names alphabetically
        const sortedSchemeNames = Object.keys(securitySchemes).sort((a, b) => a.localeCompare(b));

        sortedSchemeNames.forEach(name => {
            options.push(`<option value="${name}">${name}</option>`);
        });

        return options.join('');
    }
}
