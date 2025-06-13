import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from 'zod';

// Import all tool modules
import { registerBasicTools } from "./tools/homeassistant/basic.js";
import { registerAutomationTools } from "./tools/homeassistant/automation.js";
import { registerHistoryTools } from "./tools/homeassistant/history.js";
import { registerDeviceTools } from "./tools/homeassistant/devices.js";
import { registerSystemTools } from "./tools/homeassistant/system.js";
import { registerResourceTools } from "./tools/homeassistant/resources.js";

// Configuration schema for validation
export const configSchema = z.object({
  homeAssistantToken: z.string().describe("Long-Lived Access Token for authenticating with Home Assistant"),
  homeAssistantUrl: z.string().url().describe("URL of your Home Assistant instance"),
  debug: z.boolean().default(false).describe("Enable debug logging"),
  requestTimeout: z.number().min(1000).max(60000).default(10000).describe("Request timeout in milliseconds")
});

export type Config = z.infer<typeof configSchema>;

// Create stateless server function for Smithery
export function createStatelessServer({ config }: { config: Config }) {
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

  // Register all tools
  console.error('Registering Home Assistant MCP tools...');
  
  registerBasicTools(server);
  registerAutomationTools(server);
  registerHistoryTools(server);
  registerDeviceTools(server);
  registerSystemTools(server);
  registerResourceTools(server);
  
  console.error('All tools registered successfully');
  console.error(`Connected to: ${config.homeAssistantUrl}`);
  console.error('Available tool categories:');
  console.error('  - Basic: API status, entity states, service calls');
  console.error('  - Automation: Automations, scenes, scripts, input booleans');
  console.error('  - History: Entity history, logbook, events, error logs');
  console.error('  - Devices: Lights, climate, media players, covers, notifications');
  console.error('  - System: System info, templates, areas, devices, integrations');

  return server.server;
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});