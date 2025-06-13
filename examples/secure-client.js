/**
 * Environment-based MCP Client
 * Uses environment variables for secure credential management
 */

import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createSmitheryUrl } from "@smithery/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'HOME_ASSISTANT_TOKEN',
  'HOME_ASSISTANT_URL',
  'SMITHERY_API_KEY'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error("❌ Missing required environment variables:");
  missingVars.forEach(varName => console.error(`  - ${varName}`));
  console.error("\n💡 Create a .env file with:");
  console.error("HOME_ASSISTANT_TOKEN=your_token_here");
  console.error("HOME_ASSISTANT_URL=http://your-hass-ip:8123");
  console.error("SMITHERY_API_KEY=your_smithery_key_here");
  process.exit(1);
}

// Configuration from environment variables
const config = {
  homeAssistantToken: process.env.HOME_ASSISTANT_TOKEN,
  homeAssistantUrl: process.env.HOME_ASSISTANT_URL,
  debug: process.env.DEBUG === 'true' || false,
  requestTimeout: parseInt(process.env.REQUEST_TIMEOUT) || 10000
};

console.log("🔧 Configuration loaded:");
console.log(`  - Home Assistant URL: ${config.homeAssistantUrl}`);
console.log(`  - Debug mode: ${config.debug}`);
console.log(`  - Request timeout: ${config.requestTimeout}ms`);
console.log(`  - Token: ${config.homeAssistantToken.substring(0, 10)}...`);

// Create Smithery URL
const serverUrl = createSmitheryUrl(
  "https://server.smithery.ai/@gilberth/enhanced-homeassistant-mcp",
  { 
    config, 
    apiKey: process.env.SMITHERY_API_KEY 
  }
);

const transport = new StreamableHTTPClientTransport(serverUrl);

// Create MCP client
const client = new Client({
  name: "Enhanced Home Assistant Client (Secure)",
  version: "1.0.0"
});

async function demonstrateCapabilities() {
  try {
    console.log("\n🔗 Connecting to Enhanced Home Assistant MCP Server...");
    await client.connect(transport);
    console.log("✅ Connected successfully!");

    // Get available tools
    const tools = await client.listTools();
    console.log(`\n📋 Found ${tools.tools.length} available tools:`);
    
    // Group tools by category
    const categories = {
      basic: [],
      automation: [],
      history: [],
      devices: [],
      system: [],
      resources: []
    };

    tools.tools.forEach(tool => {
      if (tool.name.includes('automation')) {
        categories.automation.push(tool.name);
      } else if (tool.name.includes('history') || tool.name.includes('time') || tool.name.includes('trend')) {
        categories.history.push(tool.name);
      } else if (tool.name.includes('device') || tool.name.includes('area')) {
        categories.devices.push(tool.name);
      } else if (tool.name.includes('system') || tool.name.includes('config') || tool.name.includes('log')) {
        categories.system.push(tool.name);
      } else if (tool.name.includes('resource')) {
        categories.resources.push(tool.name);
      } else {
        categories.basic.push(tool.name);
      }
    });

    Object.entries(categories).forEach(([category, toolNames]) => {
      if (toolNames.length > 0) {
        console.log(`\n  ${category.toUpperCase()}:`);
        toolNames.forEach(name => console.log(`    - ${name}`));
      }
    });

    // Interactive demonstration
    console.log("\n🎮 Running capability demonstration...");

    // Test connection
    console.log("\n1️⃣ Testing Home Assistant API connection...");
    const apiResult = await client.callTool({
      name: "homeassistant_api",
      arguments: {}
    });
    console.log(`   ✅ ${apiResult.content[0].text}`);

    // Get entities overview
    console.log("\n2️⃣ Getting entities overview...");
    const entitiesResult = await client.callTool({
      name: "homeassistant_list_entities",
      arguments: { limit: 10 }
    });
    console.log(`   📱 Retrieved entity list`);

    // Search for lights
    console.log("\n3️⃣ Searching for light entities...");
    try {
      const lightsResult = await client.callTool({
        name: "homeassistant_search_entities",
        arguments: { 
          query: "light",
          limit: 5
        }
      });
      console.log(`   💡 Found light entities`);
    } catch (error) {
      console.log(`   ⚠️ No light entities found or search failed`);
    }

    // Get system info
    console.log("\n4️⃣ Getting system information...");
    try {
      const systemResult = await client.callTool({
        name: "homeassistant_get_system_info",
        arguments: {}
      });
      console.log(`   ⚙️ System information retrieved`);
    } catch (error) {
      console.log(`   ⚠️ System info unavailable: ${error.message}`);
    }

    // Try automations
    console.log("\n5️⃣ Checking automations...");
    try {
      const automationsResult = await client.callTool({
        name: "homeassistant_list_automations",
        arguments: {}
      });
      console.log(`   🤖 Automations list retrieved`);
    } catch (error) {
      console.log(`   ⚠️ Automations unavailable (normal if none exist)`);
    }

    console.log("\n🎉 Capability demonstration completed!");
    console.log("\n💡 Your Enhanced Home Assistant MCP Server is working correctly!");
    console.log("   You can now integrate this with your AI applications.");

  } catch (error) {
    console.error("\n❌ Error during demonstration:", error.message);
    
    if (error.message.includes('unauthorized') || error.message.includes('401')) {
      console.error("\n🔑 Authentication issue:");
      console.error("   - Check your HOME_ASSISTANT_TOKEN");
      console.error("   - Ensure the token has proper permissions");
    } else if (error.message.includes('connect') || error.message.includes('network')) {
      console.error("\n🌐 Connection issue:");
      console.error("   - Check your HOME_ASSISTANT_URL");
      console.error("   - Ensure Home Assistant is accessible from Smithery");
      console.error("   - For local HA, you might need to expose it publicly");
    } else if (error.message.includes('smithery') || error.message.includes('api key')) {
      console.error("\n🔐 Smithery issue:");
      console.error("   - Check your SMITHERY_API_KEY");
      console.error("   - Ensure the server is deployed on Smithery");
    }
  } finally {
    try {
      await client.close();
      console.log("\n👋 Connection closed gracefully.");
    } catch (error) {
      console.error("Warning: Error closing connection:", error.message);
    }
  }
}

// Run the demonstration
demonstrateCapabilities().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});
