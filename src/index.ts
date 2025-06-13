import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import all tool modules
import { registerBasicTools } from "./tools/homeassistant/basic.js";
import { registerAutomationTools } from "./tools/homeassistant/automation.js";
import { registerHistoryTools } from "./tools/homeassistant/history.js";
import { registerDeviceTools } from "./tools/homeassistant/devices.js";
import { registerSystemTools } from "./tools/homeassistant/system.js";
import { registerResourceTools } from "./tools/homeassistant/resources.js";
// import { registerPrompts } from "./tools/homeassistant/prompts.js";

// Create the MCP server
const server = new McpServer({
  name: "Enhanced Home Assistant MCP",
  version: "1.0.0",
  capabilities: {
    tools: {},
    resources: {},
    prompts: {}
  }
});

// Validate required environment variables
function validateEnvironment() {
  const requiredVars = ['HOME_ASSISTANT_URL', 'HOME_ASSISTANT_TOKEN'];
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing.join(', '));
    console.error('Please set these variables in your .env file or environment.');
    console.error('Example:');
    console.error('HOME_ASSISTANT_URL=http://homeassistant.local:8123');
    console.error('HOME_ASSISTANT_TOKEN=your_long_lived_access_token');
    process.exit(1);
  }
  
  // Validate URL format
  try {
    new URL(process.env.HOME_ASSISTANT_URL!);
  } catch (error) {
    console.error('Invalid HOME_ASSISTANT_URL format. Please provide a valid URL (e.g., http://homeassistant.local:8123)');
    process.exit(1);
  }
}

// Register all tools
function registerAllTools() {
  console.error('Registering Home Assistant MCP tools...');
  
  // Register tool categories
  registerBasicTools(server);
  registerAutomationTools(server);
  registerHistoryTools(server);
  registerDeviceTools(server);
  registerSystemTools(server);
  registerResourceTools(server);
  
  // Note: Prompts temporarily disabled due to MCP compatibility
  // registerPrompts(server);
  
  console.error('All tools registered successfully');
}

// Main function
async function main() {
  try {
    // Validate environment first
    validateEnvironment();
    
    // Register all tools
    registerAllTools();
    
    // Create and connect transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    console.error('Enhanced Home Assistant MCP Server running via stdio');
    console.error(`Connected to: ${process.env.HOME_ASSISTANT_URL}`);
    console.error('Available tool categories:');
    console.error('  - Basic: API status, entity states, service calls');
    console.error('  - Automation: Automations, scenes, scripts, input booleans');
    console.error('  - History: Entity history, logbook, events, error logs');
    console.error('  - Devices: Lights, climate, media players, covers, notifications');
    console.error('  - System: System info, templates, areas, devices, integrations');
    
  } catch (error) {
    console.error('Fatal error in main():', error);
    process.exit(1);
  }
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

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});