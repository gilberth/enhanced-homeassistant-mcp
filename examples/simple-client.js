/**
 * Simple MCP Client Example
 * Quick start example for testing the Enhanced Home Assistant MCP Server
 */

import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createSmitheryUrl } from "@smithery/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

// Configuration - Replace with your actual values
const config = {
  homeAssistantToken: "your_long_lived_access_token_here",
  homeAssistantUrl: "http://homeassistant.local:8123", // or your HA IP
  debug: false,
  requestTimeout: 10000
};

const serverUrl = createSmitheryUrl(
  "https://server.smithery.ai/@gilberth/enhanced-homeassistant-mcp", 
  { 
    config, 
    apiKey: "your-smithery-api-key-here" 
  }
);

const transport = new StreamableHTTPClientTransport(serverUrl);

// Create MCP client
const client = new Client({
  name: "Test client",
  version: "1.0.0"
});

await client.connect(transport);

// Use the server tools with your LLM application
const tools = await client.listTools();
console.log(`Available tools: ${tools.tools.map(t => t.name).join(", ")}`);

// Example tool call
const result = await client.callTool({
  name: "homeassistant_api",
  arguments: {}
});

console.log("Result:", result.content[0].text);
