/**
 * Example MCP Client for Enhanced Home Assistant MCP Server
 * This demonstrates how to connect to and use the server deployed on Smithery
 */

import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createSmitheryUrl } from "@smithery/sdk/shared/config.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

// Configuration for your Home Assistant instance
const config = {
  homeAssistantToken: "your_long_lived_access_token",
  homeAssistantUrl: "http://your-hass-ip:8123",
  debug: false,
  requestTimeout: 10000
};

// Create the Smithery URL for your deployed server
const serverUrl = createSmitheryUrl(
  "https://server.smithery.ai/@gilberth/enhanced-homeassistant-mcp", 
  { 
    config, 
    apiKey: "your-smithery-api-key" 
  }
);

// Create HTTP transport
const transport = new StreamableHTTPClientTransport(serverUrl);

// Create MCP client
const client = new Client({
  name: "Enhanced Home Assistant Client",
  version: "1.0.0"
});

async function main() {
  try {
    console.log("🔗 Connecting to Enhanced Home Assistant MCP Server...");
    await client.connect(transport);
    console.log("✅ Connected successfully!");

    // List available tools
    console.log("\n📋 Available tools:");
    const tools = await client.listTools();
    tools.tools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });

    // Example 1: Get Home Assistant API status
    console.log("\n🏠 Testing Home Assistant connection...");
    const apiResult = await client.callTool({
      name: "homeassistant_api",
      arguments: {}
    });
    console.log("API Status:", apiResult.content[0].text);

    // Example 2: List some entities
    console.log("\n📱 Getting entity list...");
    const entitiesResult = await client.callTool({
      name: "homeassistant_list_entities",
      arguments: { limit: 5 }
    });
    console.log("Sample entities:", entitiesResult.content[0].text);

    // Example 3: Get state of a specific entity (adjust entity_id as needed)
    console.log("\n🔍 Getting entity state...");
    try {
      const stateResult = await client.callTool({
        name: "homeassistant_get_state",
        arguments: { entity_id: "sun.sun" } // This entity should exist in most HA instances
      });
      console.log("Sun entity state:", stateResult.content[0].text);
    } catch (error) {
      console.log("Note: Adjust entity_id in the example for your specific setup");
    }

    // Example 4: List automations
    console.log("\n🤖 Getting automations...");
    try {
      const automationsResult = await client.callTool({
        name: "homeassistant_list_automations",
        arguments: {}
      });
      console.log("Automations:", automationsResult.content[0].text);
    } catch (error) {
      console.log("Automations call failed (this is normal if you have no automations)");
    }

    // Example 5: Get system information
    console.log("\n⚙️ Getting system information...");
    try {
      const systemResult = await client.callTool({
        name: "homeassistant_get_system_info",
        arguments: {}
      });
      console.log("System info:", systemResult.content[0].text);
    } catch (error) {
      console.log("System info call failed:", error.message);
    }

    // Example 6: Search entities
    console.log("\n🔍 Searching entities...");
    try {
      const searchResult = await client.callTool({
        name: "homeassistant_search_entities",
        arguments: { 
          query: "light",
          limit: 3
        }
      });
      console.log("Light entities:", searchResult.content[0].text);
    } catch (error) {
      console.log("Search call failed:", error.message);
    }

    console.log("\n🎉 All examples completed successfully!");

  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("\n🔧 Troubleshooting tips:");
    console.error("1. Check your Home Assistant URL and token");
    console.error("2. Ensure Home Assistant is accessible");
    console.error("3. Verify your Smithery API key");
    console.error("4. Make sure the server is deployed on Smithery");
  } finally {
    // Clean up
    try {
      await client.close();
      console.log("\n👋 Connection closed.");
    } catch (error) {
      console.error("Error closing connection:", error.message);
    }
  }
}

// Run the example
main().catch(console.error);
