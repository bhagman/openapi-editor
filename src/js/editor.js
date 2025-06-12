// OpenAPI Editor Core Logic
import { sortOpenAPISpec } from './utils.js';

export class OpenAPIEditor {
    constructor() {
        this.spec = null;
        this.endpoints = new Map();
    }

    initializeEmpty() {
        this.spec = {
            openapi: "3.1.1",
            info: {
                title: "My API",
                version: "1.0.0",
                description: ""
            },
            servers: [
                {
                    url: "https://api.example.com",
                    description: "Production server"
                }
            ],
            paths: {},
            components: {
                schemas: {},
                responses: {},
                parameters: {},
                examples: {},
                requestBodies: {},
                headers: {},
                securitySchemes: {},
                links: {},
                callbacks: {}
            }
        };
        this.endpoints.clear();
    }

    import(json) {
        // Validate that it's a valid OpenAPI spec structure
        if (!json.openapi || !json.info || !json.paths) {
            throw new Error('Invalid OpenAPI specification format');
        }

        this.spec = { ...json };
        this.loadEndpointsFromSpec();
    } export() {
        this.updateSpecFromEndpoints();
        // Return a sorted copy of the spec for consistent JSON output
        return sortOpenAPISpec({ ...this.spec });
    }

    updateAPIInfo(field, value) {
        if (!this.spec) this.initializeEmpty();

        switch (field) {
            case 'title':
                this.spec.info.title = value;
                break;
            case 'version':
                this.spec.info.version = value;
                break;
            case 'description':
                this.spec.info.description = value;
                break;
            case 'baseUrl':
                this.spec.servers[0].url = value;
                break;
        }
    }

    addEndpoint(endpointData) {
        const id = this.generateEndpointId();
        const endpoint = this.createEndpointObject(endpointData);
        this.endpoints.set(id, endpoint);
        return id;
    }

    updateEndpoint(id, endpointData) {
        if (!this.endpoints.has(id)) {
            throw new Error('Endpoint not found');
        }

        const endpoint = this.createEndpointObject(endpointData);
        this.endpoints.set(id, endpoint);
    }

    deleteEndpoint(id) {
        this.endpoints.delete(id);
    }

    getEndpoint(id) {
        return this.endpoints.get(id);
    }

    getAllEndpoints() {
        return Array.from(this.endpoints.entries()).map(([id, endpoint]) => ({
            id,
            ...endpoint
        }));
    } createEndpointObject(data) {
        const endpoint = {
            method: data.method,
            path: data.path,
            summary: data.summary || '',
            description: data.description || '',
            parameters: data.parameters || [],
            responses: data.responses || { '200': { description: 'Success' } },
            tags: data.tags || []
        };

        // Add request body if present
        if (data.requestBody) {
            endpoint.requestBody = data.requestBody;
        }

        // Add security requirements if present
        if (data.security) {
            endpoint.security = data.security;
        }

        return endpoint;
    }

    loadEndpointsFromSpec() {
        this.endpoints.clear();

        if (!this.spec.paths) return;

        Object.entries(this.spec.paths).forEach(([path, pathItem]) => {
            Object.entries(pathItem).forEach(([method, operation]) => {
                if (['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(method)) {
                    const id = this.generateEndpointId(); this.endpoints.set(id, {
                        method,
                        path,
                        summary: operation.summary || '',
                        description: operation.description || '',
                        parameters: operation.parameters || [],
                        responses: operation.responses || {},
                        requestBody: operation.requestBody,
                        tags: operation.tags || [],
                        security: operation.security
                    });
                }
            });
        });
    }

    updateSpecFromEndpoints() {
        if (!this.spec) this.initializeEmpty();

        this.spec.paths = {};

        this.endpoints.forEach((endpoint) => {
            const { method, path, ...operation } = endpoint;

            if (!this.spec.paths[path]) {
                this.spec.paths[path] = {};
            }            // Clean up the operation object
            const cleanOperation = {
                summary: operation.summary,
                description: operation.description,
                parameters: operation.parameters.length > 0 ? operation.parameters : undefined,
                responses: operation.responses,
                tags: operation.tags.length > 0 ? operation.tags : undefined,
                security: operation.security && operation.security.length > 0 ? operation.security : undefined
            };

            if (operation.requestBody) {
                cleanOperation.requestBody = operation.requestBody;
            }

            // Remove undefined fields
            Object.keys(cleanOperation).forEach(key => {
                if (cleanOperation[key] === undefined) {
                    delete cleanOperation[key];
                }
            });

            this.spec.paths[path][method] = cleanOperation;
        });
    }

    generateEndpointId() {
        return 'endpoint_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getAPIInfo() {
        if (!this.spec) return {};

        return {
            title: this.spec.info?.title || '',
            version: this.spec.info?.version || '',
            description: this.spec.info?.description || '',
            baseUrl: this.spec.servers?.[0]?.url || ''
        };
    }

    // Schema management methods
    addSchema(name, schema) {
        if (!this.spec) this.initializeEmpty();
        if (!this.spec.components) this.spec.components = {};
        if (!this.spec.components.schemas) this.spec.components.schemas = {};

        this.spec.components.schemas[name] = schema;
    }

    updateSchema(name, schema) {
        if (!this.spec?.components?.schemas) return;
        this.spec.components.schemas[name] = schema;
    }

    deleteSchema(name) {
        if (this.spec?.components?.schemas) {
            delete this.spec.components.schemas[name];
        }
    }

    getSchema(name) {
        return this.spec?.components?.schemas?.[name];
    }

    getAllSchemas() {
        return this.spec?.components?.schemas || {};
    }

    // Response management methods
    addResponse(name, response) {
        if (!this.spec) this.initializeEmpty();
        if (!this.spec.components) this.spec.components = {};
        if (!this.spec.components.responses) this.spec.components.responses = {};

        this.spec.components.responses[name] = response;
    }

    updateResponse(name, response) {
        if (!this.spec?.components?.responses) return;
        this.spec.components.responses[name] = response;
    }

    deleteResponse(name) {
        if (this.spec?.components?.responses) {
            delete this.spec.components.responses[name];
        }
    }

    getResponse(name) {
        return this.spec?.components?.responses?.[name];
    }

    getAllResponses() {
        return this.spec?.components?.responses || {};
    }    // Security scheme management methods
    addSecurityScheme(name, securityScheme) {
        if (!this.spec) this.initializeEmpty();
        if (!this.spec.components) this.spec.components = {};
        if (!this.spec.components.securitySchemes) this.spec.components.securitySchemes = {};

        this.spec.components.securitySchemes[name] = securityScheme;
    }

    updateSecurityScheme(name, securityScheme) {
        if (!this.spec?.components?.securitySchemes) return;
        this.spec.components.securitySchemes[name] = securityScheme;
    }

    deleteSecurityScheme(name) {
        if (this.spec?.components?.securitySchemes) {
            delete this.spec.components.securitySchemes[name];
        }
    }

    getSecurityScheme(name) {
        return this.spec?.components?.securitySchemes?.[name];
    }

    getAllSecuritySchemes() {
        return this.spec?.components?.securitySchemes || {};
    }

    // Update security scheme references in endpoints when scheme name changes
    updateSecuritySchemeReferences(oldName, newName) {
        // Update endpoint security requirements
        this.endpoints.forEach((endpoint) => {
            if (endpoint.security) {
                endpoint.security = endpoint.security.map(requirement => {
                    if (requirement[oldName] !== undefined) {
                        const scopes = requirement[oldName];
                        delete requirement[oldName];
                        requirement[newName] = scopes;
                    }
                    return requirement;
                });
            }
        });

        // Update global security requirements
        if (this.spec?.security) {
            this.spec.security = this.spec.security.map(requirement => {
                if (requirement[oldName] !== undefined) {
                    const scopes = requirement[oldName];
                    delete requirement[oldName];
                    requirement[newName] = scopes;
                }
                return requirement;
            });
        }

        // Update the spec paths as well (in case endpoints are stored there)
        this.updateSpecFromEndpoints();
    }

    // Global security management
    setGlobalSecurity(securityRequirements) {
        if (!this.spec) this.initializeEmpty();
        this.spec.security = securityRequirements;
    }

    getGlobalSecurity() {
        return this.spec?.security || [];
    }

    // Tag management methods
    addTag(name, description = '') {
        if (!this.spec) this.initializeEmpty();
        if (!this.spec.tags) this.spec.tags = [];

        // Check if tag already exists
        const existingTag = this.spec.tags.find(tag => tag.name === name);
        if (existingTag) {
            throw new Error('Tag with this name already exists');
        }

        this.spec.tags.push({ name, description });
    }

    updateTag(oldName, newName, description = '') {
        if (!this.spec?.tags) return;

        const tagIndex = this.spec.tags.findIndex(tag => tag.name === oldName);
        if (tagIndex === -1) {
            throw new Error('Tag not found');
        }

        // Check if new name conflicts with existing tag (unless it's the same tag)
        if (oldName !== newName) {
            const existingTag = this.spec.tags.find(tag => tag.name === newName);
            if (existingTag) {
                throw new Error('Tag with this name already exists');
            }
        }

        this.spec.tags[tagIndex] = { name: newName, description };

        // Update all endpoints that use this tag
        this.endpoints.forEach(endpoint => {
            if (endpoint.tags && endpoint.tags.includes(oldName)) {
                const tagIndex = endpoint.tags.indexOf(oldName);
                endpoint.tags[tagIndex] = newName;
            }
        });
    }

    deleteTag(name) {
        if (!this.spec?.tags) return;

        // Remove from spec
        this.spec.tags = this.spec.tags.filter(tag => tag.name !== name);

        // Remove from all endpoints
        this.endpoints.forEach(endpoint => {
            if (endpoint.tags) {
                endpoint.tags = endpoint.tags.filter(tag => tag !== name);
            }
        });
    }

    getTag(name) {
        return this.spec?.tags?.find(tag => tag.name === name);
    }

    getAllTags() {
        return this.spec?.tags || [];
    }

    getEndpointsByTag() {
        const endpointsByTag = new Map();
        const untaggedEndpoints = [];

        // Initialize with existing tags
        this.getAllTags().forEach(tag => {
            endpointsByTag.set(tag.name, []);
        });

        // Group endpoints by tags
        this.endpoints.forEach((endpoint, id) => {
            if (endpoint.tags && endpoint.tags.length > 0) {
                endpoint.tags.forEach(tagName => {
                    if (!endpointsByTag.has(tagName)) {
                        endpointsByTag.set(tagName, []);
                    }
                    endpointsByTag.get(tagName).push({ id, ...endpoint });
                });
            } else {
                untaggedEndpoints.push({ id, ...endpoint });
            }
        });

        // Add untagged endpoints if any exist
        if (untaggedEndpoints.length > 0) {
            endpointsByTag.set('__untagged__', untaggedEndpoints);
        }

        return endpointsByTag;
    }
}
