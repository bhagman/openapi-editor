# OpenAPI Editor

A user-friendly web-based editor for creating and editing OpenAPI 3.1.1 specifications.

## Features

- **Import/Export**: Import existing OpenAPI JSON files and export your specifications
- **User-Friendly Interface**: Edit schemas, security schemes, endpoints, parameters, and responses without needing to understand the full OpenAPI specification
- **Visual Endpoint Management**: Add, modify, and delete API endpoints with an intuitive interface
- **Parameter Configuration**: Define query, path, header, and cookie parameters with proper types
- **Request/Response Schema**: Configure request bodies and response schemas
- **Real-time Validation**: Validate your OpenAPI specification as you build it

## Getting Started

You can always check out the [live demo](https://bhagman.github.io/openapi-editor/) to see the editor in action. The app runs in your browser only, and stores the current OpenAPI specification in your browser's local storage, so you can continue editing later. Nothing is sent to any server.

If you want to run the editor locally, follow these steps:

1. **Clone the Repository**: Clone this repository to your local machine
   ```bash
   git clone https://github.com/bhagman/openapi-editor.git
   ```
2. **Navigate to the Directory**: Change into the cloned directory
   ```bash
   cd openapi-editor
   ```
3. **Start a Local Web Server**: Because this app loads JavaScript modules, you must use a local web server to run it. You cannot simply open `index.html` directly in your browser.

### Quick Start with Python

If you have Python installed, you can start a local server with:

```bash
cd openapi-editor
python -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000) in your browser.

You can use any other static file server if you prefer.

## Usage

1. **API Information**: Start by filling in your API's basic information (title, version, description, base URL)
2. **Add Endpoints**: Click "Add Endpoint" to create new API endpoints
   - Choose the HTTP method (GET, POST, PUT, PATCH, DELETE, etc.)
   - Define the endpoint path (e.g., `/users/{id}`)
   - Add a summary and description
3. **Configure Parameters**: Add parameters for your endpoints
   - Query parameters for filtering and options
   - Path parameters for dynamic routes
   - Header parameters for API keys or custom headers
   - Set parameter types (string, integer, boolean, etc.)
4. **Request Body**: For POST/PUT endpoints, configure the request body
   - Choose content type (JSON, XML, form data, etc.)
   - Define the request schema
5. **Responses**: Define possible responses
   - Set status codes (200, 400, 404, etc.)
   - Add response descriptions
   - Define response schemas
6. **Export**: Generate and download your OpenAPI JSON specification

## OpenAPI 3.1.1 Compliance

https://spec.openapis.org/oas/v3.1.1.html

This editor generates specifications that comply with OpenAPI 3.1.1, including:

- Proper structure with required fields
- Valid parameter definitions
- Correct response formatting
- Schema validation
- Server configuration

There are likely lots of bits missing from the OpenAPI spec, but this editor provides a solid foundation for creating and editing OpenAPI specifications. Add an issue if you find something missing or incorrect!

## File Structure

```
├── index.html                    # Main HTML file
├── petstore-api.json             # Example OpenAPI specification
└── src/
    ├── main.js                   # Application entry point
    ├── styles/
    │   └── main.css              # Application styles
    └── js/
        ├── editor.js             # Core OpenAPI editing logic
        ├── schema-manager.js     # Schema management and validation
        ├── security-manager.js   # Security scheme management
        ├── tag-manager.js        # Tag management for endpoints
        ├── theme-manager.js      # Theme management for UI
        ├── ui-manager.js         # UI management and interactions
        └── validation.js         # OpenAPI specification validation
```

## Contributing

Feel free to submit issues and enhancement requests!

[OpenAPI Editor Issues](https://github.com/bhagman/openapi-editor/issues)

## License

MIT License
