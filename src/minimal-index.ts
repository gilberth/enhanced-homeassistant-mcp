import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from 'zod';

// Configuration schema for validation
export const configSchema = z.object({
  homeAssistantToken: z.string().describe("Long-Lived Access Token for authenticating with Home Assistant"),
  homeAssistantUrl: z.string().url().describe("URL of your Home Assistant instance"),
  debug: z.boolean().default(false).describe("Enable debug logging"),
  requestTimeout: z.number().min(1000).max(60000).default(10000).describe("Request timeout in milliseconds")
});

export type Config = z.infer<typeof configSchema>;

// Ultra-minimal server for Smithery compatibility testing
export function createMinimalServer({ config }: { config: Config }) {
  const server = new McpServer({
    name: "Enhanced Home Assistant MCP",
    version: "1.0.0",
    capabilities: {
      tools: {},
      resources: {},
      prompts: {}
    }
  });

  // Single test tool to verify Smithery integration
  server.tool(
    "homeassistant_ping",
    "Test connection to Home Assistant",
    {},
    async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.requestTimeout);

        const response = await fetch(`${config.homeAssistantUrl}/api/`, {
          headers: {
            'Authorization': `Bearer ${config.homeAssistantToken}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          return {
            content: [{ 
              type: 'text', 
              text: `✅ Connected to Home Assistant!\nMessage: ${data.message || 'API accessible'}\nURL: ${config.homeAssistantUrl}` 
            }]
          };
        } else {
          return {
            content: [{ 
              type: 'text', 
              text: `❌ Failed to connect: HTTP ${response.status}` 
            }]
          };
        }
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `❌ Connection error: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }]
        };
      }
    }
  );

  console.error('Minimal Home Assistant MCP server initialized');
  console.error(`Target URL: ${config.homeAssistantUrl}`);
  console.error('Available tools: homeassistant_ping');

  return server.server;
}

// Export both functions for flexibility
export { createMinimalServer as createStatelessServer };
