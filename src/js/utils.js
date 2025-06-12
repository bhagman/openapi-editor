// Utility functions for OpenAPI Editor

/**
 * Recursively sorts object keys alphabetically to ensure consistent JSON output
 * @param {any} obj - The object to sort (can be any value)
 * @returns {any} - The sorted object (or original value if not an object)
 */
export function sortObjectKeys(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => sortObjectKeys(item));
    }

    // Create a new object with sorted keys
    const sortedKeys = Object.keys(obj).sort();
    const sortedObj = {};

    for (const key of sortedKeys) {
        sortedObj[key] = sortObjectKeys(obj[key]);
    }

    return sortedObj;
}

/**
 * Sorts an OpenAPI specification object with custom ordering for important sections
 * while maintaining alphabetical order within each section
 * @param {Object} spec - The OpenAPI specification object
 * @returns {Object} - The sorted specification object
 */
export function sortOpenAPISpec(spec) {
    if (!spec || typeof spec !== 'object') {
        return spec;
    }

    // Define the preferred order for top-level OpenAPI keys
    const topLevelOrder = [
        'openapi',
        'info',
        'servers',
        'paths',
        'components',
        'security',
        'tags',
        'externalDocs'
    ];

    // Define the preferred order for components section
    const componentsOrder = [
        'schemas',
        'responses',
        'parameters',
        'examples',
        'requestBodies',
        'headers',
        'securitySchemes',
        'links',
        'callbacks'
    ];

    // Sort the spec with custom ordering
    const sortedSpec = {};

    // First, add top-level keys in preferred order
    for (const key of topLevelOrder) {
        if (spec.hasOwnProperty(key)) {
            if (key === 'components' && spec.components) {
                // Special handling for components section
                const sortedComponents = {};

                // Add components in preferred order
                for (const componentKey of componentsOrder) {
                    if (spec.components.hasOwnProperty(componentKey)) {
                        sortedComponents[componentKey] = sortObjectKeys(spec.components[componentKey]);
                    }
                }

                // Add any remaining component keys alphabetically
                const remainingKeys = Object.keys(spec.components)
                    .filter(k => !componentsOrder.includes(k))
                    .sort();

                for (const componentKey of remainingKeys) {
                    sortedComponents[componentKey] = sortObjectKeys(spec.components[componentKey]);
                }

                sortedSpec.components = sortedComponents;
            } else if (key === 'paths' && spec.paths) {
                // Sort paths alphabetically
                sortedSpec.paths = sortObjectKeys(spec.paths);
            } else {
                // For other top-level keys, sort recursively
                sortedSpec[key] = sortObjectKeys(spec[key]);
            }
        }
    }

    // Add any remaining top-level keys alphabetically
    const remainingKeys = Object.keys(spec)
        .filter(k => !topLevelOrder.includes(k))
        .sort();

    for (const key of remainingKeys) {
        sortedSpec[key] = sortObjectKeys(spec[key]);
    }

    return sortedSpec;
}
