# Smithery Deployment Configuration

This project is configured for deployment on [Smithery.ai](https://smithery.ai) with the following specifications:

## Configuration Schema

The server requires the following configuration parameters:

### Required Parameters

- `homeAssistantToken` (string): Long-Lived Access Token from Home Assistant
- `homeAssistantUrl` (string): URL of your Home Assistant instance

### Optional Parameters

- `debug` (boolean): Enable debug logging (default: false)
- `requestTimeout` (number): Request timeout in milliseconds (default: 10000, range: 1000-60000)

## Example Configuration

```json
{
  "homeAssistantToken": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "homeAssistantUrl": "http://homeassistant.local:8123",
  "debug": false,
  "requestTimeout": 10000
}
```

## Deployment Details

- **Runtime**: Container (Docker)
- **Transport**: HTTP
- **Port**: 3000 (internal)
- **Health Check**: Enabled
- **User**: Non-root (mcpuser)

## Build Process

1. Multi-stage Docker build for security and optimization
2. TypeScript compilation during build phase
3. Production dependencies only in final image
4. Non-root user execution

## Security Features

- ✅ Non-root container execution
- ✅ Minimal base image (Node.js 22 Alpine)
- ✅ Multi-stage build (removes dev dependencies)
- ✅ Health check monitoring
- ✅ Proper file permissions

## Usage with Smithery SDK

```javascript
import { createSmitheryUrl } from "@smithery/sdk";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

const config = {
  homeAssistantToken: "your_token_here",
  homeAssistantUrl: "http://your-homeassistant:8123",
  debug: false,
  requestTimeout: 10000,
};

const serverUrl = createSmitheryUrl(
  "https://server.smithery.ai/@gilberth/enhanced-homeassistant-mcp",
  { config, apiKey: "your-smithery-api-key" }
);

const transport = new StreamableHTTPClientTransport(serverUrl);
const client = new Client({ name: "HA Client", version: "1.0.0" });

await client.connect(transport);
```

## Available Tools

The server provides 25+ tools organized into categories:

- **Basic**: API status, entity states, service calls
- **Automation**: Automations, scenes, scripts, input booleans
- **History**: Entity history, logbook, events, error logs
- **Devices**: Lights, climate, media players, covers, notifications
- **System**: System info, templates, areas, devices, integrations
- **Resources**: URI-based resource access

## Support

For issues with Smithery deployment, please check:

1. Configuration parameters are correctly set
2. Home Assistant is accessible from the internet
3. Token has proper permissions
4. URL format is correct (includes http/https)

For Home Assistant connectivity issues, ensure your instance is accessible from Smithery's infrastructure or use a tunnel service for local development.
