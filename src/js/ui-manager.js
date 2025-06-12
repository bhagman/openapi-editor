// UI Management for OpenAPI Editor
export class UIManager {
    constructor(editor) {
        this.editor = editor;
        this.currentEndpointId = null;
        this.currentParameters = [];
        this.currentResponses = [];
        this.currentRequestBodyContentTypes = [];
    }

    render() {
        this.renderEndpoints();
        // Only show welcome screen if there are no endpoints
        const endpointsByTag = this.editor.getEndpointsByTag();
        const hasEndpoints = Array.from(endpointsByTag.values()).some(arr => arr.length > 0);
        if (hasEndpoints) {
            document.getElementById('endpoint-editor').style.display = 'none';
            document.getElementById('welcome-screen').style.display = 'none';
        } else {
            document.getElementById('endpoint-editor').style.display = 'none';
            document.getElementById('welcome-screen').style.display = 'block';
        }
    }

    updateAPIInfo() {
        const info = this.editor.getAPIInfo();

        document.getElementById('api-title').value = info.title || '';
        document.getElementById('api-version').value = info.version || '';
        document.getElementById('api-description').value = info.description || '';
        document.getElementById('api-base-url').value = info.baseUrl || '';
    } renderEndpoints() {
        const container = document.getElementById('endpoints-list');
        const endpointsByTag = this.editor.getEndpointsByTag();

        container.innerHTML = '';

        if (endpointsByTag.size === 0) {
            container.innerHTML = '<p class="empty-state">No endpoints created yet.</p>';
            return;
        }

        // Convert Map to array and sort tag groups alphabetically (untagged goes last)
        const sortedTags = Array.from(endpointsByTag.entries()).sort(([tagA], [tagB]) => {
            // Put untagged endpoints at the end
            if (tagA === '__untagged__') return 1;
            if (tagB === '__untagged__') return -1;
            return tagA.localeCompare(tagB);
        });

        // Render endpoints grouped by tags
        sortedTags.forEach(([tagName, endpoints]) => {
            if (endpoints.length === 0) return;

            // Sort endpoints within each group by path then method
            const sortedEndpoints = [...endpoints].sort((a, b) => {
                const pathCompare = a.path.localeCompare(b.path);
                return pathCompare !== 0 ? pathCompare : a.method.localeCompare(b.method);
            });

            const groupDiv = document.createElement('div');
            groupDiv.className = 'endpoint-group';

            const isUntagged = tagName === '__untagged__';
            const displayName = isUntagged ? 'Untagged Endpoints' : tagName;
            const tagInfo = isUntagged ? null : this.editor.getTag(tagName);

            groupDiv.innerHTML = `
                <div class="endpoint-group-header" onclick="window.uiManager.toggleEndpointGroup('${tagName}')">
                    <div>
                        <span class="group-name">${displayName}</span>
                        ${tagInfo?.description ? `<div class="group-description">${tagInfo.description}</div>` : ''}
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span class="endpoint-count">${sortedEndpoints.length}</span>
                        <span class="group-toggle">▼</span>
                    </div>
                </div>
                <div class="endpoint-group-content" id="group-${tagName}">
                    ${this.renderEndpointsInGroup(sortedEndpoints)}
                </div>
            `;

            container.appendChild(groupDiv);
        });

        // Expose method globally for inline handlers
        window.uiManager = this;
    }

    renderEndpointsInGroup(endpoints) {
        return endpoints.map(endpoint => `
            <div class="endpoint-item" data-endpoint-id="${endpoint.id}" onclick="window.uiManager.selectEndpoint('${endpoint.id}')">
                <div>
                    <span class="endpoint-method method-${endpoint.method}">${endpoint.method.toUpperCase()}</span>
                    <span class="endpoint-path">${endpoint.path}</span>
                </div>
                ${endpoint.summary ? `<div class="endpoint-summary">${endpoint.summary}</div>` : ''}
            </div>
        `).join('');
    }

    toggleEndpointGroup(tagName) {
        const content = document.getElementById(`group-${tagName}`);
        const header = content.previousElementSibling;
        const toggle = header.querySelector('.group-toggle');

        if (content.classList.contains('collapsed')) {
            content.classList.remove('collapsed');
            header.classList.remove('collapsed');
            toggle.textContent = '▼';
        } else {
            content.classList.add('collapsed');
            header.classList.add('collapsed');
            toggle.textContent = '▶';
        }
    }

    selectEndpoint(id) {
        // Update UI selection
        document.querySelectorAll('.endpoint-item').forEach(item => {
            item.classList.remove('active');
        });

        const selectedItem = document.querySelector(`[data-endpoint-id="${id}"]`);
        if (selectedItem) {
            selectedItem.classList.add('active');
        }

        // Load endpoint data
        this.loadEndpointData(id);
        this.showEndpointEditor();
    }

    loadEndpointData(id) {
        const endpoint = this.editor.getEndpoint(id);
        if (!endpoint) return;

        this.currentEndpointId = id;

        // Basic info
        document.getElementById('endpoint-method').value = endpoint.method;
        document.getElementById('endpoint-path').value = endpoint.path;
        document.getElementById('endpoint-summary').value = endpoint.summary || '';
        document.getElementById('endpoint-description').value = endpoint.description || '';

        // Tags
        this.updateTagSelectOptions();
        const tagSelect = document.getElementById('endpoint-tags-select');
        // Clear all selections first
        Array.from(tagSelect.options).forEach(option => option.selected = false);
        // Select the endpoint's tags
        if (endpoint.tags) {
            endpoint.tags.forEach(tag => {
                const option = Array.from(tagSelect.options).find(opt => opt.value === tag);
                if (option) option.selected = true;
            });
        }

        // Parameters
        this.currentParameters = [...(endpoint.parameters || [])];
        this.renderParameters();        // Request body
        const hasRequestBody = !!endpoint.requestBody;
        document.getElementById('has-request-body').checked = hasRequestBody;

        // Reset request body content types
        this.currentRequestBodyContentTypes = [];

        if (hasRequestBody && endpoint.requestBody.content) {
            // Load multiple content types
            Object.entries(endpoint.requestBody.content).forEach(([mediaType, content]) => {
                const contentTypeData = {
                    mediaType,
                    schema: '',
                    example: '',
                    schemaRef: ''
                };

                // Handle schema reference or inline schema
                if (content.schema) {
                    if (content.schema.$ref) {
                        contentTypeData.schemaRef = content.schema.$ref;
                    } else {
                        contentTypeData.schema = JSON.stringify(content.schema, null, 2);
                    }
                }

                // Handle example
                if (content.example) {
                    contentTypeData.example = typeof content.example === 'string'
                        ? content.example
                        : JSON.stringify(content.example, null, 2);
                }

                this.currentRequestBodyContentTypes.push(contentTypeData);
            });
        }

        this.toggleRequestBody(hasRequestBody);// Responses with enhanced structure
        this.currentResponses = Object.entries(endpoint.responses || {}).map(([code, response]) => {
            const responseData = {
                code,
                description: response.description || '',
                contentTypes: [],
                headers: []
            };

            // Process content types
            if (response.content) {
                Object.entries(response.content).forEach(([mediaType, content]) => {
                    const contentTypeData = {
                        mediaType,
                        schema: '',
                        example: '',
                        schemaRef: ''
                    };

                    // Handle schema reference or inline schema
                    if (content.schema) {
                        if (content.schema.$ref) {
                            contentTypeData.schemaRef = content.schema.$ref;
                        } else {
                            contentTypeData.schema = JSON.stringify(content.schema, null, 2);
                        }
                    }

                    // Handle example
                    if (content.example) {
                        contentTypeData.example = typeof content.example === 'string'
                            ? content.example
                            : JSON.stringify(content.example, null, 2);
                    }

                    responseData.contentTypes.push(contentTypeData);
                });
            }

            // Process headers
            if (response.headers) {
                Object.entries(response.headers).forEach(([name, header]) => {
                    responseData.headers.push({
                        name,
                        description: header.description || '',
                        type: header.schema?.type || 'string'
                    });
                });
            }

            return responseData;
        });
        this.renderResponses();

        // Security requirements
        if (window.securityManager) {
            window.securityManager.setEndpointSecurityRequirements(endpoint.security || []);
        }
    }

    showEndpointEditor() {
        document.getElementById('welcome-screen').style.display = 'none';
        document.getElementById('endpoint-editor').style.display = 'block';

        if (!this.currentEndpointId) {
            // New endpoint
            this.clearEndpointForm();
        }
    }

    hideEndpointEditor() {
        document.getElementById('endpoint-editor').style.display = 'none';
        document.getElementById('welcome-screen').style.display = 'block';
        this.currentEndpointId = null;

        // Clear selection
        document.querySelectorAll('.endpoint-item').forEach(item => {
            item.classList.remove('active');
        });
    }

    clearEndpointForm() {
        document.getElementById('endpoint-method').value = 'get';
        document.getElementById('endpoint-path').value = '';
        document.getElementById('endpoint-summary').value = '';
        document.getElementById('endpoint-description').value = '';
        document.getElementById('has-request-body').checked = false;
        this.toggleRequestBody(false);        // Clear tags
        this.updateTagSelectOptions();
        const tagSelect = document.getElementById('endpoint-tags-select');
        Array.from(tagSelect.options).forEach(option => option.selected = false);

        this.currentParameters = [];
        this.currentRequestBodyContentTypes = [];
        this.currentResponses = [{
            code: '200',
            description: 'Success',
            contentTypes: [{ mediaType: 'application/json', schema: '', example: '' }],
            headers: []
        }]; this.renderParameters();
        this.renderResponses();

        // Clear security requirements
        if (window.securityManager) {
            window.securityManager.setEndpointSecurityRequirements([]);
        }
    } switchTab(tabName) {
        // Update Bootstrap nav-link buttons (only main tabs, not schema editor tabs)
        document.querySelectorAll('.nav-link[data-tab]:not(#schema-editor-modal .nav-link)').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`.nav-link[data-tab="${tabName}"]:not(#schema-editor-modal .nav-link[data-tab="${tabName}"])`)?.classList.add('active');

        // Update tab content (only main tab panes, not schema editor panes)
        document.querySelectorAll('.tab-pane:not(#schema-editor-modal .tab-pane)').forEach(pane => {
            pane.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`)?.classList.add('active');
    }

    addParameter() {
        this.currentParameters.push({
            name: '',
            in: 'query',
            required: false,
            description: '',
            schema: { type: 'string' }
        });
        this.renderParameters();
    }

    renderParameters() {
        const container = document.getElementById('parameters-list');
        container.innerHTML = '';

        this.currentParameters.forEach((param, index) => {
            const div = document.createElement('div');
            div.className = 'parameter-item';

            div.innerHTML = `
                <div class="item-header">
                    <span class="item-title">Parameter ${index + 1}</span>
                    <button type="button" class="remove-btn" onclick="window.uiManager.removeParameter(${index})">Remove</button>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Name</label>
                        <input type="text" value="${param.name}" onchange="window.uiManager.updateParameter(${index}, 'name', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Location</label>
                        <select onchange="window.uiManager.updateParameter(${index}, 'in', this.value)">
                            <option value="query" ${param.in === 'query' ? 'selected' : ''}>Query</option>
                            <option value="path" ${param.in === 'path' ? 'selected' : ''}>Path</option>
                            <option value="header" ${param.in === 'header' ? 'selected' : ''}>Header</option>
                            <option value="cookie" ${param.in === 'cookie' ? 'selected' : ''}>Cookie</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Type</label>
                        <select onchange="window.uiManager.updateParameterType(${index}, this.value)">
                            <option value="string" ${param.schema?.type === 'string' ? 'selected' : ''}>String</option>
                            <option value="integer" ${param.schema?.type === 'integer' ? 'selected' : ''}>Integer</option>
                            <option value="number" ${param.schema?.type === 'number' ? 'selected' : ''}>Number</option>
                            <option value="boolean" ${param.schema?.type === 'boolean' ? 'selected' : ''}>Boolean</option>
                            <option value="array" ${param.schema?.type === 'array' ? 'selected' : ''}>Array</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="checkbox">
                            <input type="checkbox" ${param.required ? 'checked' : ''} onchange="window.uiManager.updateParameter(${index}, 'required', this.checked)">
                            <span>Required</span>
                        </label>
                    </div>
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <input type="text" value="${param.description || ''}" onchange="window.uiManager.updateParameter(${index}, 'description', this.value)">
                </div>
            `;

            container.appendChild(div);
        });

        // Expose methods globally for inline event handlers
        window.uiManager = this;
    }

    updateParameter(index, field, value) {
        if (this.currentParameters[index]) {
            this.currentParameters[index][field] = value;
        }
    }

    updateParameterType(index, type) {
        if (this.currentParameters[index]) {
            this.currentParameters[index].schema = { type };
        }
    }

    removeParameter(index) {
        this.currentParameters.splice(index, 1);
        this.renderParameters();
    } toggleRequestBody(show) {
        const form = document.getElementById('request-body-form');
        form.style.display = show ? 'block' : 'none';

        if (show) {
            // Initialize with one content type if none exist
            if (this.currentRequestBodyContentTypes.length === 0) {
                this.addRequestBodyContentType();
            } else {
                this.renderRequestBodyContentTypes();
            }
        }
    }

    refreshSchemaOptions() {
        // Update request body schema options if form is visible
        const requestBodyForm = document.getElementById('request-body-form');
        if (requestBodyForm.style.display !== 'none') {
            this.renderRequestBodyContentTypes();
        }

        // Update response schema options if responses exist
        if (this.currentResponses && this.currentResponses.length > 0) {
            this.renderResponses();
        }
    }

    addResponse() {
        this.currentResponses.push({
            code: '200',
            description: '',
            schema: ''
        });
        this.renderResponses();
    } renderResponses() {
        const container = document.getElementById('responses-list');
        container.innerHTML = '';

        this.currentResponses.forEach((response, index) => {
            const div = document.createElement('div');
            div.className = 'response-item';

            div.innerHTML = `
                <div class="item-header">
                    <span class="item-title">Response ${response.code}</span>
                    <button type="button" class="remove-btn" onclick="window.uiManager.removeResponse(${index})">Remove</button>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Status Code</label>
                        <input type="text" value="${response.code}" onchange="window.uiManager.updateResponse(${index}, 'code', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <input type="text" value="${response.description}" onchange="window.uiManager.updateResponse(${index}, 'description', this.value)">
                    </div>
                </div>

                <div class="response-content-types">
                    <div class="section-header">
                        <h4>Content Types</h4>
                        <button type="button" class="btn btn-small btn-secondary" onclick="window.uiManager.addResponseContentType(${index})">Add Content Type</button>
                    </div>
                    <div id="response-${index}-content-types">
                        ${this.renderResponseContentTypes(response, index)}
                    </div>
                </div>

                <div class="response-headers">
                    <div class="section-header">
                        <h4>Response Headers</h4>
                        <button type="button" class="btn btn-small btn-secondary" onclick="window.uiManager.addResponseHeader(${index})">Add Header</button>
                    </div>
                    <div id="response-${index}-headers">
                        ${this.renderResponseHeaders(response, index)}
                    </div>
                </div>
            `;

            container.appendChild(div);
        });
    }

    renderResponseContentTypes(response, responseIndex) {
        if (!response.contentTypes) {
            response.contentTypes = [{ mediaType: 'application/json', schema: '', example: '' }];
        }

        return response.contentTypes.map((content, contentIndex) => `
            <div class="content-type-item">
                <div class="content-type-header">
                    <span class="content-type-label">${content.mediaType}</span>
                    <button type="button" class="remove-btn" onclick="window.uiManager.removeResponseContentType(${responseIndex}, ${contentIndex})">Remove</button>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Media Type</label>
                        <select onchange="window.uiManager.updateResponseContentType(${responseIndex}, ${contentIndex}, 'mediaType', this.value)">
                            <option value="application/json" ${content.mediaType === 'application/json' ? 'selected' : ''}>application/json</option>
                            <option value="application/xml" ${content.mediaType === 'application/xml' ? 'selected' : ''}>application/xml</option>
                            <option value="text/plain" ${content.mediaType === 'text/plain' ? 'selected' : ''}>text/plain</option>
                            <option value="text/html" ${content.mediaType === 'text/html' ? 'selected' : ''}>text/html</option>
                            <option value="application/octet-stream" ${content.mediaType === 'application/octet-stream' ? 'selected' : ''}>application/octet-stream</option>
                        </select>
                    </div>                    <div class="form-group">
                        <div class="schema-reference">
                            <label>Schema</label>
                            <div class="schema-selector">
                                <select onchange="window.uiManager.updateResponseContentType(${responseIndex}, ${contentIndex}, 'schemaRef', this.value)">
                                    <option value="">Custom Schema</option>
                                    ${this.getSchemaSelectOptions()}
                                </select>
                                <button type="button" class="btn btn-small btn-secondary" onclick="window.uiManager.openResponseSchemaEditor(${responseIndex}, ${contentIndex})" style="display: ${content.schemaRef ? 'none' : 'inline-flex'};">
                                    Edit
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="form-group" style="display: ${content.schemaRef ? 'none' : 'block'}" id="custom-schema-${responseIndex}-${contentIndex}">
                    <label>Schema (JSON)</label>
                    <textarea onchange="window.uiManager.updateResponseContentType(${responseIndex}, ${contentIndex}, 'schema', this.value)">${content.schema || ''}</textarea>
                </div>
                <div class="form-group" style="display: ${content.schemaRef ? 'block' : 'none'}" id="ref-schema-${responseIndex}-${contentIndex}">
                    <div class="reference-info">Using schema reference: ${content.schemaRef || 'None'}</div>
                </div>
                <div class="form-group">
                    <label>Example</label>
                    <textarea onchange="window.uiManager.updateResponseContentType(${responseIndex}, ${contentIndex}, 'example', this.value)">${content.example || ''}</textarea>
                </div>
            </div>
        `).join('');
    }

    renderResponseHeaders(response, responseIndex) {
        if (!response.headers) {
            response.headers = [];
        }

        return response.headers.map((header, headerIndex) => `
            <div class="header-item">
                <div class="item-header">
                    <span class="item-title">${header.name || 'Header'}</span>
                    <button type="button" class="remove-btn" onclick="window.uiManager.removeResponseHeader(${responseIndex}, ${headerIndex})">Remove</button>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Name</label>
                        <input type="text" value="${header.name || ''}" onchange="window.uiManager.updateResponseHeader(${responseIndex}, ${headerIndex}, 'name', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Type</label>
                        <select onchange="window.uiManager.updateResponseHeader(${responseIndex}, ${headerIndex}, 'type', this.value)">
                            <option value="string" ${header.type === 'string' ? 'selected' : ''}>String</option>
                            <option value="integer" ${header.type === 'integer' ? 'selected' : ''}>Integer</option>
                            <option value="number" ${header.type === 'number' ? 'selected' : ''}>Number</option>
                            <option value="boolean" ${header.type === 'boolean' ? 'selected' : ''}>Boolean</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <input type="text" value="${header.description || ''}" onchange="window.uiManager.updateResponseHeader(${responseIndex}, ${headerIndex}, 'description', this.value)">
                </div>
            </div>
        `).join('');
    } getSchemaSelectOptions() {
        const schemas = this.editor.getAllSchemas();
        const options = [];

        // Sort schema names alphabetically
        const sortedSchemaNames = Object.keys(schemas).sort((a, b) => a.localeCompare(b));

        sortedSchemaNames.forEach(name => {
            options.push(`<option value="#/components/schemas/${name}">${name}</option>`);
        });

        return options.join('');
    }

    addResponseContentType(responseIndex) {
        if (!this.currentResponses[responseIndex].contentTypes) {
            this.currentResponses[responseIndex].contentTypes = [];
        }

        this.currentResponses[responseIndex].contentTypes.push({
            mediaType: 'application/json',
            schema: '',
            example: ''
        });

        this.renderResponses();
    }

    removeResponseContentType(responseIndex, contentIndex) {
        if (this.currentResponses[responseIndex]?.contentTypes) {
            this.currentResponses[responseIndex].contentTypes.splice(contentIndex, 1);
            this.renderResponses();
        }
    } updateResponseContentType(responseIndex, contentIndex, field, value) {
        if (this.currentResponses[responseIndex]?.contentTypes?.[contentIndex]) {
            this.currentResponses[responseIndex].contentTypes[contentIndex][field] = value;

            if (field === 'schemaRef') {
                // Re-render to show/hide custom schema field and edit button
                this.renderResponses();
            }
        }
    }

    addResponseHeader(responseIndex) {
        if (!this.currentResponses[responseIndex].headers) {
            this.currentResponses[responseIndex].headers = [];
        }

        this.currentResponses[responseIndex].headers.push({
            name: '',
            type: 'string',
            description: ''
        });

        this.renderResponses();
    }

    removeResponseHeader(responseIndex, headerIndex) {
        if (this.currentResponses[responseIndex]?.headers) {
            this.currentResponses[responseIndex].headers.splice(headerIndex, 1);
            this.renderResponses();
        }
    }

    updateResponseHeader(responseIndex, headerIndex, field, value) {
        if (this.currentResponses[responseIndex]?.headers?.[headerIndex]) {
            this.currentResponses[responseIndex].headers[headerIndex][field] = value;
        }
    }

    updateResponse(index, field, value) {
        if (this.currentResponses[index]) {
            this.currentResponses[index][field] = value;
        }
    }

    removeResponse(index) {
        this.currentResponses.splice(index, 1);
        this.renderResponses();
    }

    openResponseSchemaEditor(responseIndex, contentIndex) {
        if (window.schemaManager) {
            // Get the target textarea for this response content type
            const schemaTextarea = document.querySelector(`#custom-schema-${responseIndex}-${contentIndex} textarea`);
            if (schemaTextarea) {
                window.schemaManager.showSchemaEditor(null, 'response', schemaTextarea);
            }
        }
    } getEndpointFormData() {
        const data = {
            method: document.getElementById('endpoint-method').value,
            path: document.getElementById('endpoint-path').value,
            summary: document.getElementById('endpoint-summary').value,
            description: document.getElementById('endpoint-description').value,
            parameters: this.currentParameters,
            responses: {},
            tags: []
        };

        // Get selected tags
        const tagSelect = document.getElementById('endpoint-tags-select');
        Array.from(tagSelect.selectedOptions).forEach(option => {
            data.tags.push(option.value);
        });

        // Process responses with enhanced structure
        this.currentResponses.forEach(response => {
            data.responses[response.code] = {
                description: response.description
            };

            // Process content types
            if (response.contentTypes && response.contentTypes.length > 0) {
                data.responses[response.code].content = {};

                response.contentTypes.forEach(contentType => {
                    if (contentType.mediaType) {
                        const mediaTypeContent = {};

                        // Handle schema (either reference or inline)
                        if (contentType.schemaRef) {
                            mediaTypeContent.schema = { $ref: contentType.schemaRef };
                        } else if (contentType.schema) {
                            try {
                                mediaTypeContent.schema = JSON.parse(contentType.schema);
                            } catch (e) {
                                // Invalid JSON, skip schema
                            }
                        }

                        // Add example if provided
                        if (contentType.example) {
                            try {
                                mediaTypeContent.example = JSON.parse(contentType.example);
                            } catch (e) {
                                // If not valid JSON, treat as string
                                mediaTypeContent.example = contentType.example;
                            }
                        }

                        data.responses[response.code].content[contentType.mediaType] = mediaTypeContent;
                    }
                });
            }

            // Process headers
            if (response.headers && response.headers.length > 0) {
                data.responses[response.code].headers = {};

                response.headers.forEach(header => {
                    if (header.name) {
                        data.responses[response.code].headers[header.name] = {
                            description: header.description,
                            schema: {
                                type: header.type || 'string'
                            }
                        };
                    }
                });
            }
        });

        // Process request body
        if (document.getElementById('has-request-body').checked && this.currentRequestBodyContentTypes.length > 0) {
            data.requestBody = {
                required: true,
                content: {}
            };

            this.currentRequestBodyContentTypes.forEach(contentType => {
                if (contentType.mediaType) {
                    const mediaTypeContent = {};

                    // Handle schema (either reference or inline)
                    if (contentType.schemaRef) {
                        mediaTypeContent.schema = { $ref: contentType.schemaRef };
                    } else if (contentType.schema) {
                        try {
                            mediaTypeContent.schema = JSON.parse(contentType.schema);
                        } catch (e) {
                            // Invalid JSON, skip schema
                        }
                    }

                    // Add example if provided
                    if (contentType.example) {
                        try {
                            mediaTypeContent.example = JSON.parse(contentType.example);
                        } catch (e) {
                            // If not valid JSON, treat as string
                            mediaTypeContent.example = contentType.example;
                        }
                    }

                    data.requestBody.content[contentType.mediaType] = mediaTypeContent;
                }
            });
        }

        // Get security requirements if enabled
        if (window.securityManager) {
            data.security = window.securityManager.getEndpointSecurityRequirements();
        }

        return data;
    }

    showValidationResults(results) {
        const panel = document.getElementById('validation-panel');
        const container = document.getElementById('validation-results');

        container.innerHTML = '';

        if (results.valid) {
            container.innerHTML = '<div class="validation-success">✓ OpenAPI specification is valid</div>';
            panel.classList.add('show');
            setTimeout(() => panel.classList.remove('show'), 3000);
        } else {
            results.errors.forEach(error => {
                const div = document.createElement('div');
                div.className = 'validation-error';
                div.textContent = `${error.instancePath || 'root'}: ${error.message}`;
                container.appendChild(div);
            });
            panel.classList.add('show');
        }
    } updateTagSelectOptions() {
        const select = document.getElementById('endpoint-tags-select');
        const tags = this.editor.getAllTags();

        select.innerHTML = '';

        // Sort tags alphabetically by name
        const sortedTags = [...tags].sort((a, b) => a.name.localeCompare(b.name));

        sortedTags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag.name;
            option.textContent = tag.name + (tag.description ? ` - ${tag.description}` : '');
            select.appendChild(option);
        });
    }

    // Request body content type management
    addRequestBodyContentType() {
        this.currentRequestBodyContentTypes.push({
            mediaType: 'application/json',
            schema: '',
            example: '',
            schemaRef: ''
        });
        this.renderRequestBodyContentTypes();
    }

    removeRequestBodyContentType(contentIndex) {
        this.currentRequestBodyContentTypes.splice(contentIndex, 1);
        this.renderRequestBodyContentTypes();
    }

    updateRequestBodyContentType(contentIndex, field, value) {
        if (this.currentRequestBodyContentTypes[contentIndex]) {
            this.currentRequestBodyContentTypes[contentIndex][field] = value;

            if (field === 'schemaRef') {
                // Re-render to show/hide custom schema field and edit button
                this.renderRequestBodyContentTypes();
            }
        }
    }

    renderRequestBodyContentTypes() {
        const container = document.getElementById('request-body-content-types-list');

        if (this.currentRequestBodyContentTypes.length === 0) {
            container.innerHTML = '<p class="text-muted">No content types defined. Click "Add Content Type" to add one.</p>';
            return;
        }

        container.innerHTML = this.currentRequestBodyContentTypes.map((content, contentIndex) => `
            <div class="content-type-item">
                <div class="content-type-header">
                    <span class="content-type-label">${content.mediaType}</span>
                    <button type="button" class="remove-btn" onclick="window.uiManager.removeRequestBodyContentType(${contentIndex})">Remove</button>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Media Type</label>
                        <select onchange="window.uiManager.updateRequestBodyContentType(${contentIndex}, 'mediaType', this.value)">
                            <option value="application/json" ${content.mediaType === 'application/json' ? 'selected' : ''}>application/json</option>
                            <option value="application/xml" ${content.mediaType === 'application/xml' ? 'selected' : ''}>application/xml</option>
                            <option value="application/x-www-form-urlencoded" ${content.mediaType === 'application/x-www-form-urlencoded' ? 'selected' : ''}>application/x-www-form-urlencoded</option>
                            <option value="multipart/form-data" ${content.mediaType === 'multipart/form-data' ? 'selected' : ''}>multipart/form-data</option>
                            <option value="text/plain" ${content.mediaType === 'text/plain' ? 'selected' : ''}>text/plain</option>
                            <option value="application/octet-stream" ${content.mediaType === 'application/octet-stream' ? 'selected' : ''}>application/octet-stream</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <div class="schema-reference">
                            <label>Schema</label>
                            <div class="schema-selector">
                                <select onchange="window.uiManager.updateRequestBodyContentType(${contentIndex}, 'schemaRef', this.value)">
                                    <option value="">Custom Schema</option>
                                    ${this.getSchemaSelectOptions()}
                                </select>
                                <button type="button" class="btn btn-small btn-secondary" onclick="window.uiManager.openRequestBodySchemaEditor(${contentIndex})" style="display: ${content.schemaRef ? 'none' : 'inline-flex'};">
                                    Edit
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="form-group" style="display: ${content.schemaRef ? 'none' : 'block'}" id="custom-request-schema-${contentIndex}">
                    <label>Schema (JSON)</label>
                    <textarea onchange="window.uiManager.updateRequestBodyContentType(${contentIndex}, 'schema', this.value)">${content.schema || ''}</textarea>
                </div>
                <div class="form-group" style="display: ${content.schemaRef ? 'block' : 'none'}" id="ref-request-schema-${contentIndex}">
                    <div class="reference-info">Using schema reference: ${content.schemaRef || 'None'}</div>
                </div>
                <div class="form-group">
                    <label>Example</label>
                    <textarea onchange="window.uiManager.updateRequestBodyContentType(${contentIndex}, 'example', this.value)">${content.example || ''}</textarea>
                </div>
            </div>
        `).join('');

        // Expose globally for inline handlers
        window.uiManager = this;
    }

    openRequestBodySchemaEditor(contentIndex) {
        if (window.schemaManager) {
            // Get the target textarea for this request body content type
            const schemaTextarea = document.querySelector(`#custom-request-schema-${contentIndex} textarea`);
            if (schemaTextarea) {
                window.schemaManager.showSchemaEditor(null, 'request-body', schemaTextarea);
            }
        }
    } refreshSecurityOptions() {
        // Refresh security options in endpoint security requirements
        if (window.securityManager) {
            // Re-render any open security requirements dropdowns
            const securityRequirements = document.querySelectorAll('.security-scheme-select');
            securityRequirements.forEach(select => {
                const currentValue = select.value;
                const securitySchemes = this.editor.getAllSecuritySchemes();

                select.innerHTML = '<option value="">Select security scheme</option>';

                // Sort security scheme names alphabetically
                const sortedSchemeNames = Object.keys(securitySchemes).sort((a, b) => a.localeCompare(b));

                sortedSchemeNames.forEach(name => {
                    const option = document.createElement('option');
                    option.value = name;
                    option.textContent = name;
                    if (name === currentValue) {
                        option.selected = true;
                    }
                    select.appendChild(option);
                });
            });
        }
    }
}
