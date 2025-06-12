// Validation Service for OpenAPI specifications
export class ValidationService {
    constructor() {
        this.openApiSchema = this.getOpenAPI311Schema();
    }

    validate(spec) {
        const errors = [];

        // Basic structural validation
        if (!spec.openapi) {
            errors.push({ instancePath: '/openapi', message: 'must have required property "openapi"' });
        } else if (!spec.openapi.startsWith('3.1')) {
            errors.push({ instancePath: '/openapi', message: 'must be OpenAPI version 3.1.x' });
        }

        if (!spec.info) {
            errors.push({ instancePath: '/info', message: 'must have required property "info"' });
        } else {
            if (!spec.info.title) {
                errors.push({ instancePath: '/info/title', message: 'must have required property "title"' });
            }
            if (!spec.info.version) {
                errors.push({ instancePath: '/info/version', message: 'must have required property "version"' });
            }
        }

        // Validate paths
        if (spec.paths) {
            this.validatePaths(spec.paths, errors);
        }

        // Validate servers
        if (spec.servers) {
            this.validateServers(spec.servers, errors);
        }

        // Validate security schemes
        if (spec.components?.securitySchemes) {
            this.validateSecuritySchemes(spec.components.securitySchemes, errors);
        }

        // Validate global security
        if (spec.security) {
            this.validateSecurity(spec.security, spec.components?.securitySchemes, '/security', errors);
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    validatePaths(paths, errors) {
        Object.entries(paths).forEach(([path, pathItem]) => {
            // Validate path format
            if (!path.startsWith('/')) {
                errors.push({
                    instancePath: `/paths/${path}`,
                    message: 'path must start with "/"'
                });
            }

            // Validate operations
            Object.entries(pathItem).forEach(([method, operation]) => {
                if (['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'].includes(method)) {
                    this.validateOperation(operation, `/paths${path}/${method}`, errors);
                }
            });
        });
    }

    validateOperation(operation, basePath, errors) {
        // Validate responses (required)
        if (!operation.responses) {
            errors.push({
                instancePath: `${basePath}/responses`,
                message: 'must have required property "responses"'
            });
        } else if (Object.keys(operation.responses).length === 0) {
            errors.push({
                instancePath: `${basePath}/responses`,
                message: 'must have at least one response'
            });
        }

        // Validate parameters
        if (operation.parameters) {
            operation.parameters.forEach((param, index) => {
                this.validateParameter(param, `${basePath}/parameters/${index}`, errors);
            });
        }

        // Validate request body
        if (operation.requestBody) {
            this.validateRequestBody(operation.requestBody, `${basePath}/requestBody`, errors);
        }

        // Validate security
        if (operation.security) {
            this.validateSecurity(operation.security, null, `${basePath}/security`, errors);
        }
    }

    validateParameter(param, basePath, errors) {
        if (!param.name) {
            errors.push({
                instancePath: `${basePath}/name`,
                message: 'must have required property "name"'
            });
        }

        if (!param.in) {
            errors.push({
                instancePath: `${basePath}/in`,
                message: 'must have required property "in"'
            });
        } else if (!['query', 'header', 'path', 'cookie'].includes(param.in)) {
            errors.push({
                instancePath: `${basePath}/in`,
                message: 'must be one of: query, header, path, cookie'
            });
        }

        // Path parameters must be required
        if (param.in === 'path' && !param.required) {
            errors.push({
                instancePath: `${basePath}/required`,
                message: 'path parameters must be required'
            });
        }

        if (!param.schema) {
            errors.push({
                instancePath: `${basePath}/schema`,
                message: 'must have required property "schema"'
            });
        }
    }

    validateRequestBody(requestBody, basePath, errors) {
        if (!requestBody.content) {
            errors.push({
                instancePath: `${basePath}/content`,
                message: 'must have required property "content"'
            });
        } else if (Object.keys(requestBody.content).length === 0) {
            errors.push({
                instancePath: `${basePath}/content`,
                message: 'must have at least one media type'
            });
        }
    }

    validateServers(servers, errors) {
        servers.forEach((server, index) => {
            if (!server.url) {
                errors.push({
                    instancePath: `/servers/${index}/url`,
                    message: 'must have required property "url"'
                });
            } else {
                try {
                    new URL(server.url);
                } catch (e) {
                    // Check if it's a relative URL or has variables
                    if (!server.url.startsWith('/') && !server.url.includes('{')) {
                        errors.push({
                            instancePath: `/servers/${index}/url`,
                            message: 'must be a valid URL or relative path'
                        });
                    }
                }
            }
        });
    }

    validateSecuritySchemes(securitySchemes, errors) {
        Object.entries(securitySchemes).forEach(([name, scheme]) => {
            const basePath = `/components/securitySchemes/${name}`;

            if (!scheme.type) {
                errors.push({
                    instancePath: `${basePath}/type`,
                    message: 'must have required property "type"'
                });
                return;
            }

            switch (scheme.type) {
                case 'apiKey':
                    if (!scheme.name) {
                        errors.push({
                            instancePath: `${basePath}/name`,
                            message: 'must have required property "name" for apiKey security scheme'
                        });
                    }
                    if (!scheme.in || !['query', 'header', 'cookie'].includes(scheme.in)) {
                        errors.push({
                            instancePath: `${basePath}/in`,
                            message: 'must have valid "in" property (query, header, or cookie) for apiKey security scheme'
                        });
                    }
                    break;

                case 'http':
                    if (!scheme.scheme) {
                        errors.push({
                            instancePath: `${basePath}/scheme`,
                            message: 'must have required property "scheme" for http security scheme'
                        });
                    }
                    break;

                case 'oauth2':
                    if (!scheme.flows) {
                        errors.push({
                            instancePath: `${basePath}/flows`,
                            message: 'must have required property "flows" for oauth2 security scheme'
                        });
                    } else {
                        this.validateOAuth2Flows(scheme.flows, `${basePath}/flows`, errors);
                    }
                    break;

                case 'openIdConnect':
                    if (!scheme.openIdConnectUrl) {
                        errors.push({
                            instancePath: `${basePath}/openIdConnectUrl`,
                            message: 'must have required property "openIdConnectUrl" for openIdConnect security scheme'
                        });
                    }
                    break;

                default:
                    errors.push({
                        instancePath: `${basePath}/type`,
                        message: `unsupported security scheme type: ${scheme.type}`
                    });
            }
        });
    }

    validateOAuth2Flows(flows, basePath, errors) {
        const flowTypes = ['implicit', 'password', 'clientCredentials', 'authorizationCode'];
        const hasValidFlow = flowTypes.some(type => flows[type]);

        if (!hasValidFlow) {
            errors.push({
                instancePath: basePath,
                message: 'must have at least one OAuth2 flow defined'
            });
            return;
        }

        // Validate each flow type
        if (flows.implicit) {
            this.validateOAuth2Flow(flows.implicit, `${basePath}/implicit`, 'implicit', errors);
        }
        if (flows.password) {
            this.validateOAuth2Flow(flows.password, `${basePath}/password`, 'password', errors);
        }
        if (flows.clientCredentials) {
            this.validateOAuth2Flow(flows.clientCredentials, `${basePath}/clientCredentials`, 'clientCredentials', errors);
        }
        if (flows.authorizationCode) {
            this.validateOAuth2Flow(flows.authorizationCode, `${basePath}/authorizationCode`, 'authorizationCode', errors);
        }
    }

    validateOAuth2Flow(flow, basePath, flowType, errors) {
        // Implicit and authorizationCode flows require authorizationUrl
        if (['implicit', 'authorizationCode'].includes(flowType) && !flow.authorizationUrl) {
            errors.push({
                instancePath: `${basePath}/authorizationUrl`,
                message: `must have required property "authorizationUrl" for ${flowType} flow`
            });
        }

        // All flows except implicit require tokenUrl
        if (flowType !== 'implicit' && !flow.tokenUrl) {
            errors.push({
                instancePath: `${basePath}/tokenUrl`,
                message: `must have required property "tokenUrl" for ${flowType} flow`
            });
        }

        // Validate scopes object if present
        if (flow.scopes && typeof flow.scopes !== 'object') {
            errors.push({
                instancePath: `${basePath}/scopes`,
                message: 'scopes must be an object'
            });
        }
    }

    validateSecurity(security, securitySchemes, basePath, errors) {
        if (!Array.isArray(security)) {
            errors.push({
                instancePath: basePath,
                message: 'security must be an array'
            });
            return;
        }

        security.forEach((requirement, index) => {
            if (typeof requirement !== 'object' || requirement === null) {
                errors.push({
                    instancePath: `${basePath}/${index}`,
                    message: 'security requirement must be an object'
                });
                return;
            }

            // Each requirement should reference defined security schemes
            Object.keys(requirement).forEach(schemeName => {
                if (securitySchemes && !securitySchemes[schemeName]) {
                    errors.push({
                        instancePath: `${basePath}/${index}/${schemeName}`,
                        message: `security scheme "${schemeName}" is not defined in components/securitySchemes`
                    });
                }

                const scopes = requirement[schemeName];
                if (!Array.isArray(scopes)) {
                    errors.push({
                        instancePath: `${basePath}/${index}/${schemeName}`,
                        message: 'security requirement scopes must be an array'
                    });
                }
            });
        });
    }

    // Simplified OpenAPI 3.1.1 schema for basic validation
    getOpenAPI311Schema() {
        return {
            type: 'object',
            required: ['openapi', 'info'],
            properties: {
                openapi: {
                    type: 'string',
                    pattern: '^3\\.1\\.'
                },
                info: {
                    type: 'object',
                    required: ['title', 'version'],
                    properties: {
                        title: { type: 'string' },
                        version: { type: 'string' },
                        description: { type: 'string' }
                    }
                },
                servers: {
                    type: 'array',
                    items: {
                        type: 'object',
                        required: ['url'],
                        properties: {
                            url: { type: 'string' },
                            description: { type: 'string' }
                        }
                    }
                },
                paths: {
                    type: 'object',
                    patternProperties: {
                        '^/': {
                            type: 'object'
                        }
                    }
                }
            }
        };
    }
}
