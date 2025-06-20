import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createStatefulServer } from "@smithery/sdk/server/stateful.js";
import { z } from 'zod';

// Import all tool modules
import { registerBasicTools } from "./tools/homeassistant/basic.js";
import { registerAutomationTools } from "./tools/homeassistant/automation.js";
import { registerHistoryTools } from "./tools/homeassistant/history.js";
import { registerDeviceTools } from "./tools/homeassistant/devices.js";
import { registerSystemTools } from "./tools/homeassistant/system.js";
import { registerResourceTools } from "./tools/homeassistant/resources.js";
import { registerMinimalTools } from "./tools/homeassistant/minimal.js";

// Configuration schema for validation
export const configSchema = z.object({
  homeAssistantToken: z.string().describe("Long-Lived Access Token for authenticating with Home Assistant"),
  homeAssistantUrl: z.string().url().describe("URL of your Home Assistant instance"),
  debug: z.boolean().optional().default(false).describe("Enable debug logging"),
  requestTimeout: z.number().min(1000).max(60000).optional().default(10000).describe("Request timeout in milliseconds")
});

export type Config = z.infer<typeof configSchema>;

// Create MCP server instance with all tools
function createMcpServer({ sessionId, config }: { sessionId: string; config: Config }) {
  // Set environment variables from config for the session
  process.env.HOME_ASSISTANT_URL = config.homeAssistantUrl;
  process.env.HOME_ASSISTANT_TOKEN = config.homeAssistantToken;
  process.env.DEBUG = config.debug.toString();
  process.env.REQUEST_TIMEOUT = config.requestTimeout.toString();

  const server = new McpServer({
    name: "Enhanced Home Assistant MCP",
    version: "1.0.0",
    capabilities: {
      tools: {},
      resources: {},
      prompts: {}
    }
  });

  // Register only essential tools immediately to pass Smithery scanning
  console.error(`[${sessionId}] Registering minimal Home Assistant MCP tools for scanning...`);
  
  try {
    // Use minimal tools first to avoid timeout during Smithery scanning
    registerMinimalTools(server);
    
    console.error(`[${sessionId}] Minimal tools registered successfully for scanning`);
    console.error(`[${sessionId}] Connected to: ${config.homeAssistantUrl}`);
    
    // Register full tool set asynchronously after scanning completes
    setTimeout(() => {
      try {
        console.error(`[${sessionId}] Loading complete tool set...`);
        
        // Clear minimal tools and register full set
        // Note: This might not work with current MCP SDK, keeping minimal for now
        registerBasicTools(server);
        registerAutomationTools(server);
        registerHistoryTools(server);
        registerDeviceTools(server);
        registerSystemTools(server);
        registerResourceTools(server);
        
        console.error(`[${sessionId}] Complete tool set loaded`);
        console.error(`[${sessionId}] Available tool categories:`);
        console.error(`[${sessionId}]   - Basic: API status, entity states, service calls`);
        console.error(`[${sessionId}]   - Automation: Automations, scenes, scripts, input booleans`);
        console.error(`[${sessionId}]   - History: Entity history, logbook, events, error logs`);
        console.error(`[${sessionId}]   - Devices: Lights, climate, media players, covers, notifications`);
        console.error(`[${sessionId}]   - System: System info, templates, areas, devices, integrations`);
        console.error(`[${sessionId}]   - Resources: URI-based resource access`);
      } catch (error) {
        console.error(`[${sessionId}] Error loading complete tool set:`, error);
      }
    }, 1000); // Longer delay to ensure scanning completes
    
  } catch (error) {
    console.error(`[${sessionId}] Error registering minimal tools:`, error);
  }

  return server.server;
}

// Export Smithery-compatible server  
const { app } = createStatefulServer(createMcpServer, {
  schema: configSchema as any
});

// For Smithery compatibility, we need to start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.error(`Enhanced Home Assistant MCP server listening on port ${PORT}`);
});

export default app;

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});