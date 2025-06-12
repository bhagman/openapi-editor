// Schema Manager for OpenAPI Editor
import { sortObjectKeys } from './utils.js';

export class SchemaManager {
    constructor(editor) {
        this.editor = editor;
        this.currentSchema = null;
        this.currentSchemaId = null;
        this.currentProperties = [];
        this.editContext = null; // 'global', 'request-body', 'response'
        this.contextTarget = null; // target element for inline schemas
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Schema list management
        document.getElementById('add-schema-btn').addEventListener('click', () => {
            this.showSchemaEditor();
        });        // Schema editor modal
        document.getElementById('close-schema-editor').addEventListener('click', () => {
            this.hideSchemaEditor();
        });

        // Close modal when clicking outside of it
        document.getElementById('schema-editor-modal').addEventListener('click', (e) => {
            if (e.target.id === 'schema-editor-modal') {
                this.hideSchemaEditor();
            }
        });

        // Close modal with ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.getElementById('schema-editor-modal').style.display === 'block') {
                this.hideSchemaEditor();
            }
        });

        document.getElementById('save-schema-btn').addEventListener('click', () => {
            this.saveSchema();
        });

        document.getElementById('cancel-schema-btn').addEventListener('click', () => {
            this.hideSchemaEditor();
        });

        // Schema type change
        document.getElementById('schema-type').addEventListener('change', (e) => {
            this.handleSchemaTypeChange(e.target.value);
        });

        // Add property button
        document.getElementById('add-property-btn').addEventListener('click', () => {
            this.addProperty();
        });        // Tab switching in schema editor modal
        document.querySelectorAll('#schema-editor-modal .nav-link[data-tab]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchSchemaTab(e.target.dataset.tab);
            });
        });

        // JSON editor sync
        document.getElementById('schema-json').addEventListener('input', () => {
            this.syncFromJSON();
        });
    } showSchemaEditor(schemaId = null, context = 'global', targetElement = null) {
        this.currentSchemaId = schemaId;
        this.editContext = context;
        this.contextTarget = targetElement;

        if (schemaId && context === 'global') {
            // Edit existing global schema
            const schema = this.editor.getSchema(schemaId);
            this.loadSchemaData(schema, schemaId);
            document.getElementById('schema-editor-title').textContent = 'Edit Schema';
        } else {
            // Check if we should load existing content from target element
            let existingSchema = null;
            if (targetElement && targetElement.value.trim()) {
                try {
                    existingSchema = JSON.parse(targetElement.value.trim());
                } catch (e) {
                    // Invalid JSON, will fall back to default behavior
                    console.warn('Invalid JSON in target element, starting with default schema');
                }
            }

            if (existingSchema) {
                // Load existing schema from textarea
                this.loadSchemaData(existingSchema, '');
            } else {
                // Create new schema (either global or inline)
                this.clearSchemaForm();
            }

            if (context === 'global') {
                document.getElementById('schema-editor-title').textContent = 'Create Global Schema';
            } else if (context === 'request-body') {
                document.getElementById('schema-editor-title').textContent = existingSchema ? 'Edit Request Body Schema' : 'Create Request Body Schema';
                // Hide schema name field for inline schemas
                document.getElementById('schema-name').closest('.mb-3').style.display = 'none';
            } else if (context === 'response') {
                document.getElementById('schema-editor-title').textContent = existingSchema ? 'Edit Response Schema' : 'Create Response Schema';
                // Hide schema name field for inline schemas
                document.getElementById('schema-name').closest('.mb-3').style.display = 'none';
            }
        }

        // Show the modal using Bootstrap classes
        const modal = document.getElementById('schema-editor-modal');
        modal.style.display = 'block';
        modal.classList.add('show');
        document.body.classList.add('modal-open');

        // Create backdrop if it doesn't exist
        if (!document.querySelector('.modal-backdrop')) {
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop fade show';
            document.body.appendChild(backdrop);
        }
    } hideSchemaEditor() {
        // Hide the modal using Bootstrap classes
        const modal = document.getElementById('schema-editor-modal');
        modal.style.display = 'none';
        modal.classList.remove('show');
        document.body.classList.remove('modal-open');

        // Remove backdrop
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
            backdrop.remove();
        }

        this.currentSchemaId = null;
        this.currentSchema = null;
        this.currentProperties = [];
        this.editContext = null;
        this.contextTarget = null;

        // Show schema name field (in case it was hidden for inline schemas)
        document.getElementById('schema-name').closest('.mb-3').style.display = 'block';
    }

    loadSchemaData(schema, name) {
        document.getElementById('schema-name').value = name;
        document.getElementById('schema-description').value = schema.description || '';

        // Load schema structure
        this.currentSchema = { ...schema };
        this.updateSchemaBuilder();
        this.updateJSONEditor();
    }

    clearSchemaForm() {
        document.getElementById('schema-name').value = '';
        document.getElementById('schema-description').value = '';
        document.getElementById('schema-type').value = 'object';

        this.currentSchema = {
            type: 'object',
            properties: {}
        };
        this.currentProperties = [];
        this.updateSchemaBuilder();
        this.updateJSONEditor();
    }

    handleSchemaTypeChange(type) {
        if (!this.currentSchema) this.currentSchema = {};

        this.currentSchema.type = type;

        // Show/hide array items configuration
        const arrayItemsGroup = document.getElementById('array-items-group');
        const objectProperties = document.getElementById('object-properties');

        if (type === 'array') {
            arrayItemsGroup.style.display = 'block';
            objectProperties.style.display = 'none';
            if (!this.currentSchema.items) {
                this.currentSchema.items = { type: 'string' };
            }
        } else if (type === 'object') {
            arrayItemsGroup.style.display = 'none';
            objectProperties.style.display = 'block';
            if (!this.currentSchema.properties) {
                this.currentSchema.properties = {};
            }
        } else {
            arrayItemsGroup.style.display = 'none';
            objectProperties.style.display = 'none';
            // Remove object/array specific properties
            delete this.currentSchema.properties;
            delete this.currentSchema.items;
        }

        this.updateJSONEditor();
    } addProperty() {
        this.currentProperties.push({
            name: '',
            type: 'string',
            description: '',
            required: false,
            example: '',
            default: '',
            // String enum support
            enum: [],
            // Integer constraints
            minimum: '',
            maximum: '',
            multipleOf: ''
        });
        this.renderProperties();
    }

    renderProperties() {
        const container = document.getElementById('properties-list');
        container.innerHTML = '';

        this.currentProperties.forEach((property, index) => {
            const div = document.createElement('div');
            div.className = 'property-item'; div.innerHTML = `
                <div class="property-header">
                    <span class="property-title">Property ${index + 1}</span>
                    <button type="button" class="btn btn-sm btn-danger" onclick="window.schemaManager.removeProperty(${index})">Remove</button>
                </div>
                <div class="row mb-3">
                    <div class="col-md-6">
                        <label class="form-label">Name</label>
                        <input type="text" class="form-control" value="${property.name}" onchange="window.schemaManager.updateProperty(${index}, 'name', this.value)">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Type</label>
                        <select class="form-select" onchange="window.schemaManager.updateProperty(${index}, 'type', this.value); window.schemaManager.updatePropertyTypeVisibility(${index}, this.value)">
                            <option value="string" ${property.type === 'string' ? 'selected' : ''}>String</option>
                            <option value="integer" ${property.type === 'integer' ? 'selected' : ''}>Integer</option>
                            <option value="number" ${property.type === 'number' ? 'selected' : ''}>Number</option>
                            <option value="boolean" ${property.type === 'boolean' ? 'selected' : ''}>Boolean</option>
                            <option value="array" ${property.type === 'array' ? 'selected' : ''}>Array</option>
                            <option value="object" ${property.type === 'object' ? 'selected' : ''}>Object</option>
                        </select>
                    </div>
                </div>
                <div class="row mb-3">
                    <div class="col-md-6">
                        <label class="form-label">Description</label>
                        <input type="text" class="form-control" value="${property.description}" onchange="window.schemaManager.updateProperty(${index}, 'description', this.value)">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Example</label>
                        <input type="text" class="form-control" value="${property.example}" onchange="window.schemaManager.updateProperty(${index}, 'example', this.value)">
                    </div>
                </div>

                <div class="mb-3">
                    <label class="form-label">Default Value</label>
                    <input type="text" class="form-control" value="${property.default || ''}" placeholder="No default value" onchange="window.schemaManager.updatePropertyDefault(${index}, this.value)">
                    <small class="form-text text-muted">Default value for this property when not provided.</small>
                </div>

                <!-- String enum support -->
                <div class="mb-3 enum-group" style="display: ${property.type === 'string' ? 'block' : 'none'}">
                    <label class="form-label">Enum Values (one per line, leave empty for no enum)</label>
                    <textarea class="form-control" rows="3" placeholder="value1&#10;value2&#10;value3" onchange="window.schemaManager.updatePropertyEnum(${index}, this.value)">${(property.enum || []).join('\n')}</textarea>
                    <small class="form-text text-muted">Define allowed string values. Each value should be on a separate line.</small>
                </div>

                <!-- Integer constraints -->
                <div class="constraints-group" style="display: ${property.type === 'integer' ? 'block' : 'none'}">
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <label class="form-label">Minimum</label>
                            <input type="number" class="form-control" value="${property.minimum || ''}" placeholder="No minimum" onchange="window.schemaManager.updateProperty(${index}, 'minimum', this.value)">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Maximum</label>
                            <input type="number" class="form-control" value="${property.maximum || ''}" placeholder="No maximum" onchange="window.schemaManager.updateProperty(${index}, 'maximum', this.value)">
                        </div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Multiple Of</label>
                        <input type="number" class="form-control" value="${property.multipleOf || ''}" placeholder="Any integer" onchange="window.schemaManager.updateProperty(${index}, 'multipleOf', this.value)">
                        <small class="form-text text-muted">Value must be a multiple of this number.</small>
                    </div>
                </div>

                <div class="form-check">
                    <input type="checkbox" class="form-check-input" ${property.required ? 'checked' : ''} onchange="window.schemaManager.updateProperty(${index}, 'required', this.checked)">
                    <label class="form-check-label">Required</label>
                </div>
            `;

            container.appendChild(div);
        });

        // Update the schema object
        this.updateSchemaFromBuilder();

        // Expose globally for inline handlers
        window.schemaManager = this;
    } updateProperty(index, field, value) {
        if (this.currentProperties[index]) {
            this.currentProperties[index][field] = value;
            this.updateSchemaFromBuilder();
        }
    } updatePropertyEnum(index, enumText) {
        if (this.currentProperties[index]) {
            // Parse enum values from textarea (one per line)
            const enumValues = enumText.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);

            this.currentProperties[index].enum = enumValues.length > 0 ? enumValues : [];
            this.updateSchemaFromBuilder();
        }
    }

    updatePropertyDefault(index, value) {
        if (this.currentProperties[index]) {
            // Handle different data types for default values
            let defaultValue = value.trim();

            if (defaultValue === '') {
                this.currentProperties[index].default = '';
                this.updateSchemaFromBuilder();
                return;
            }

            const propertyType = this.currentProperties[index].type;

            try {
                switch (propertyType) {
                    case 'boolean':
                        // Parse boolean values
                        if (defaultValue.toLowerCase() === 'true') {
                            defaultValue = true;
                        } else if (defaultValue.toLowerCase() === 'false') {
                            defaultValue = false;
                        } else {
                            throw new Error('Invalid boolean value');
                        }
                        break;
                    case 'integer':
                        // Parse integer values
                        const intValue = parseInt(defaultValue, 10);
                        if (isNaN(intValue)) {
                            throw new Error('Invalid integer value');
                        }
                        defaultValue = intValue;
                        break;
                    case 'number':
                        // Parse number values
                        const numValue = parseFloat(defaultValue);
                        if (isNaN(numValue)) {
                            throw new Error('Invalid number value');
                        }
                        defaultValue = numValue;
                        break;
                    case 'array':
                        // Try to parse as JSON array
                        try {
                            defaultValue = JSON.parse(defaultValue);
                            if (!Array.isArray(defaultValue)) {
                                throw new Error('Not an array');
                            }
                        } catch (e) {
                            throw new Error('Invalid array value - must be valid JSON array');
                        }
                        break;
                    case 'object':
                        // Try to parse as JSON object
                        try {
                            defaultValue = JSON.parse(defaultValue);
                            if (typeof defaultValue !== 'object' || Array.isArray(defaultValue)) {
                                throw new Error('Not an object');
                            }
                        } catch (e) {
                            throw new Error('Invalid object value - must be valid JSON object');
                        }
                        break;
                    case 'string':
                    default:
                        // Keep as string
                        break;
                }

                this.currentProperties[index].default = defaultValue;
                this.updateSchemaFromBuilder();
            } catch (error) {
                // Show error message to user and revert to previous value
                alert(`Error setting default value: ${error.message}`);
                // Revert the input field to the previous value
                const input = document.querySelector(`#properties-list .property-item:nth-child(${index + 1}) input[onchange*="updatePropertyDefault"]`);
                if (input) {
                    const prevDefault = this.currentProperties[index].default;
                    input.value = prevDefault !== undefined && prevDefault !== '' ?
                        (typeof prevDefault === 'object' ? JSON.stringify(prevDefault) : prevDefault.toString()) : '';
                }
            }
        }
    }

    updatePropertyTypeVisibility(index, type) {
        // Update visibility of type-specific fields
        const propertyDiv = document.querySelector(`#properties-list .property-item:nth-child(${index + 1})`);
        if (propertyDiv) {
            const enumGroup = propertyDiv.querySelector('.enum-group');
            const constraintsGroup = propertyDiv.querySelector('.constraints-group');

            if (enumGroup) {
                enumGroup.style.display = type === 'string' ? 'block' : 'none';
            }
            if (constraintsGroup) {
                constraintsGroup.style.display = type === 'integer' ? 'block' : 'none';
            }
        }
    }

    removeProperty(index) {
        this.currentProperties.splice(index, 1);
        this.renderProperties();
    }

    updateSchemaFromBuilder() {
        if (!this.currentSchema) return;

        if (this.currentSchema.type === 'object') {
            this.currentSchema.properties = {};
            const required = []; this.currentProperties.forEach(prop => {
                if (prop.name) {
                    const propSchema = {
                        type: prop.type,
                        description: prop.description || undefined,
                        example: prop.example || undefined
                    };

                    // Add default value if provided
                    if (prop.default !== undefined && prop.default !== '') {
                        propSchema.default = prop.default;
                    }

                    // Add enum values for strings
                    if (prop.type === 'string' && prop.enum && prop.enum.length > 0) {
                        propSchema.enum = prop.enum;
                    }

                    // Add constraints for integers
                    if (prop.type === 'integer') {
                        if (prop.minimum !== '' && prop.minimum !== undefined) {
                            propSchema.minimum = parseInt(prop.minimum, 10);
                        }
                        if (prop.maximum !== '' && prop.maximum !== undefined) {
                            propSchema.maximum = parseInt(prop.maximum, 10);
                        }
                        if (prop.multipleOf !== '' && prop.multipleOf !== undefined) {
                            propSchema.multipleOf = parseInt(prop.multipleOf, 10);
                        }
                    }

                    this.currentSchema.properties[prop.name] = propSchema;

                    // Clean up undefined values
                    Object.keys(this.currentSchema.properties[prop.name]).forEach(key => {
                        if (this.currentSchema.properties[prop.name][key] === undefined) {
                            delete this.currentSchema.properties[prop.name][key];
                        }
                    });

                    if (prop.required) {
                        required.push(prop.name);
                    }
                }
            });

            if (required.length > 0) {
                this.currentSchema.required = required;
            } else {
                delete this.currentSchema.required;
            }
        }

        this.updateJSONEditor();
    }

    updateSchemaBuilder() {
        if (!this.currentSchema) return;

        // Set type
        document.getElementById('schema-type').value = this.currentSchema.type || 'object';
        this.handleSchemaTypeChange(this.currentSchema.type || 'object');

        // Load properties for object type
        if (this.currentSchema.type === 'object' && this.currentSchema.properties) {
            this.currentProperties = [];
            const required = this.currentSchema.required || []; Object.entries(this.currentSchema.properties).forEach(([name, prop]) => {
                const property = {
                    name,
                    type: prop.type || 'string',
                    description: prop.description || '',
                    required: required.includes(name),
                    example: prop.example || '',
                    default: prop.default !== undefined ?
                        (typeof prop.default === 'object' ? JSON.stringify(prop.default) : prop.default.toString()) : '',
                    // Load enum values
                    enum: prop.enum || [],
                    // Load integer constraints
                    minimum: prop.minimum !== undefined ? prop.minimum.toString() : '',
                    maximum: prop.maximum !== undefined ? prop.maximum.toString() : '',
                    multipleOf: prop.multipleOf !== undefined ? prop.multipleOf.toString() : ''
                };

                this.currentProperties.push(property);
            });

            this.renderProperties();
        }

        // Handle array items
        if (this.currentSchema.type === 'array' && this.currentSchema.items) {
            document.getElementById('array-items-type').value = this.currentSchema.items.type || 'string';
        }
    } updateJSONEditor() {
        const jsonEditor = document.getElementById('schema-json');
        if (this.currentSchema) {
            // Sort the schema keys for consistent display
            const sortedSchema = sortObjectKeys(this.currentSchema);
            jsonEditor.value = JSON.stringify(sortedSchema, null, 2);
        }
    }

    syncFromJSON() {
        try {
            const jsonText = document.getElementById('schema-json').value;
            if (jsonText.trim()) {
                this.currentSchema = JSON.parse(jsonText);
                this.updateSchemaBuilder();
            }
        } catch (e) {
            // Invalid JSON, ignore for now
        }
    } switchSchemaTab(tabName) {
        // Update Bootstrap nav-link buttons in modal
        document.querySelectorAll('#schema-editor-modal .nav-link[data-tab]').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`#schema-editor-modal .nav-link[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('#schema-editor-modal .tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // Sync content when switching tabs
        if (tabName === 'schema-json') {
            this.updateJSONEditor();
        } else if (tabName === 'schema-builder') {
            this.syncFromJSON();
        }
    } saveSchema() {
        if (this.editContext === 'global') {
            // Save as global schema
            const name = document.getElementById('schema-name').value.trim();
            const description = document.getElementById('schema-description').value.trim();

            if (!name) {
                alert('Schema name is required');
                return;
            }

            if (!this.currentSchema) {
                alert('Invalid schema');
                return;
            }

            try {
                // Ensure we have the latest JSON
                this.syncFromJSON();

                const schemaData = { ...this.currentSchema };
                if (description) {
                    schemaData.description = description;
                }

                if (this.currentSchemaId) {
                    this.editor.updateSchema(this.currentSchemaId, schemaData);
                } else {
                    this.editor.addSchema(name, schemaData);
                } this.hideSchemaEditor();
                this.renderSchemas();

                // Refresh schema options in the UI
                if (window.uiManager) {
                    window.uiManager.refreshSchemaOptions();
                }

                // Auto-save to localStorage
                if (window.app) {
                    window.app.saveToStorage();
                }
            } catch (error) {
                alert('Error saving schema: ' + error.message);
            }
        } else {
            // Save as inline schema
            if (!this.currentSchema) {
                alert('Invalid schema');
                return;
            }

            try {
                // Ensure we have the latest JSON
                this.syncFromJSON();

                const description = document.getElementById('schema-description').value.trim();
                const schemaData = { ...this.currentSchema };
                if (description) {
                    schemaData.description = description;
                }                // Populate the target textarea with the inline schema
                if (this.contextTarget) {
                    // Sort the schema keys for consistent display
                    const sortedSchema = sortObjectKeys(schemaData);
                    this.contextTarget.value = JSON.stringify(sortedSchema, null, 2);

                    // If this is a request body, make sure we're in custom schema mode
                    if (this.editContext === 'request-body') {
                        document.getElementById('request-schema-ref').value = '';
                        document.getElementById('request-custom-schema').style.display = 'block';
                        // Edit button will be shown automatically since we set ref to empty
                        document.getElementById('request-schema-edit').style.display = 'inline-flex';
                    }
                    // For response schemas, we need to ensure the custom schema is visible
                    else if (this.editContext === 'response') {
                        // The response UI will handle the display automatically
                        // Just trigger a change event to update the UI
                        const event = new Event('change', { bubbles: true });
                        this.contextTarget.dispatchEvent(event);
                    }
                }

                this.hideSchemaEditor();
            } catch (error) {
                alert('Error saving schema: ' + error.message);
            }
        }
    } renderSchemas() {
        const container = document.getElementById('schemas-list');
        const schemas = this.editor.getAllSchemas();

        container.innerHTML = ''; if (Object.keys(schemas).length === 0) {
            container.innerHTML = '<p class="empty-state">No schemas defined. Schemas help structure your API data models.</p>';
            return;
        }

        // Sort schemas alphabetically by name
        const sortedSchemas = Object.entries(schemas).sort(([nameA], [nameB]) => nameA.localeCompare(nameB));

        sortedSchemas.forEach(([name, schema]) => {
            const div = document.createElement('div');
            div.className = 'schema-item';
            div.dataset.schemaName = name;

            div.innerHTML = `
                <div class="schema-info">
                    <div>
                        <span class="schema-name">${name}</span>
                        <span class="schema-type">${schema.type || 'object'}</span>
                    </div>
                    ${schema.description ? `<div class="schema-description">${schema.description}</div>` : ''}
                </div>
                <button type="button" class="btn btn-sm text-danger delete-schema-btn" onclick="window.schemaManager.deleteSchema('${name}')" title="Delete schema">
                    <i class="bi bi-x-lg"></i>
                </button>
            `;

            // Add click handler to the main area (excluding the delete button)
            div.addEventListener('click', (e) => {
                // Don't open editor if delete button was clicked
                if (!e.target.closest('.delete-schema-btn')) {
                    this.showSchemaEditor(name);
                }
            });

            container.appendChild(div);
        });

        // Expose globally for inline handlers
        window.schemaManager = this;
    }

    deleteSchema(schemaName) {
        if (confirm(`Are you sure you want to delete the schema "${schemaName}"?`)) {
            this.editor.deleteSchema(schemaName);
            this.renderSchemas();
        }
    } getSchemaSelectOptions() {
        const schemas = this.editor.getAllSchemas();
        const options = ['<option value="">Select Schema</option>'];

        // Sort schema names alphabetically
        const sortedSchemaNames = Object.keys(schemas).sort((a, b) => a.localeCompare(b));

        sortedSchemaNames.forEach(name => {
            options.push(`<option value="#/components/schemas/${name}">${name}</option>`);
        });

        return options.join('');
    }
}
