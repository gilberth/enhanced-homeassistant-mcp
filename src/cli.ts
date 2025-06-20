#!/usr/bin/env node

/**
 * Enhanced Home Assistant MCP CLI
 * Command-line interface for the Enhanced Home Assistant MCP Server
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get command line arguments
const args = process.argv.slice(2);
const command = args[0];

// CLI Configuration
const CLI_VERSION = "1.0.0";
const SERVER_SCRIPT = join(__dirname, 'index.js');

// Help text
const HELP_TEXT = `
🏠 Enhanced Home Assistant MCP Server v${CLI_VERSION}

USAGE:
  npx @thelord/enhanced-homeassistant-mcp [command] [options]

COMMANDS:
  start                    Start the MCP server (default)
  inspect                  Start with MCP Inspector for debugging
  minimal                  Start minimal server (faster scanning)
  test                     Test server functionality
  health                   Check server health
  version                  Show version information
  help                     Show this help message

OPTIONS:
  --port <port>           Specify port (default: auto)
  --debug                 Enable debug mode
  --config <file>         Specify config file
  --timeout <ms>          Request timeout in milliseconds

ENVIRONMENT VARIABLES:
  HOMEASSISTANT_URL       Home Assistant URL (required)
  HOMEASSISTANT_TOKEN     Long-lived access token (required)
  DEBUG                   Enable debug logging
  REQUEST_TIMEOUT         Request timeout in milliseconds

EXAMPLES:
  npx @thelord/enhanced-homeassistant-mcp start
  npx @thelord/enhanced-homeassistant-mcp inspect
  npx @thelord/enhanced-homeassistant-mcp minimal
  npx @thelord/enhanced-homeassistant-mcp --debug start

For more information, visit:
https://github.com/thelord/enhanced-homeassistant-mcp
`;

// Version information
const VERSION_INFO = `
🏠 Enhanced Home Assistant MCP Server
Version: ${CLI_VERSION}
Node.js: ${process.version}
Platform: ${process.platform}
Architecture: ${process.arch}
`;

// Health check function
async function healthCheck() {
  console.log("🔍 Performing Health Check...\n");
  
  // Check environment variables
  const requiredEnvVars = ['HOMEASSISTANT_URL', 'HOMEASSISTANT_TOKEN'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.log("❌ Missing required environment variables:");
    missingVars.forEach(varName => {
      console.log(`   - ${varName}`);
    });
    console.log("\nPlease set these variables before starting the server.");
    return false;
  }
  
  console.log("✅ Environment variables configured");
  console.log(`   - HOMEASSISTANT_URL: ${process.env.HOMEASSISTANT_URL}`);
  console.log(`   - HOMEASSISTANT_TOKEN: ${'*'.repeat(20)}...`);
  
  if (process.env.DEBUG) {
    console.log("🐛 Debug mode enabled");
  }
  
  if (process.env.REQUEST_TIMEOUT) {
    console.log(`⏱️  Request timeout: ${process.env.REQUEST_TIMEOUT}ms`);
  }
  
  console.log("\n✅ Health check passed - Ready to start server!");
  return true;
}

// Start server function
function startServer(scriptPath: string, extraArgs: string[] = []) {
  console.log(`🚀 Starting Enhanced Home Assistant MCP Server...\n`);
  
  const child = spawn('node', [scriptPath, ...extraArgs], {
    stdio: 'inherit',
    env: process.env
  });
  
  child.on('error', (error) => {
    console.error(`❌ Failed to start server: ${error.message}`);
    process.exit(1);
  });
  
  child.on('exit', (code) => {
    if (code !== 0) {
      console.error(`❌ Server exited with code ${code}`);
      process.exit(code || 1);
    }
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    child.kill('SIGINT');
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down server...');
    child.kill('SIGTERM');
  });
}

// Parse command line options
function parseOptions(args: string[]) {
  const options: Record<string, any> = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--debug') {
      options.debug = true;
      process.env.DEBUG = 'true';
    } else if (arg === '--port' && i + 1 < args.length) {
      options.port = args[i + 1];
      i++;
    } else if (arg === '--timeout' && i + 1 < args.length) {
      options.timeout = args[i + 1];
      process.env.REQUEST_TIMEOUT = args[i + 1];
      i++;
    } else if (arg === '--config' && i + 1 < args.length) {
      options.config = args[i + 1];
      i++;
    }
  }
  
  return options;
}

// Main CLI logic
async function main() {
  const options = parseOptions(args);
  
  switch (command) {
    case 'help':
    case '--help':
    case '-h':
      console.log(HELP_TEXT);
      break;
      
    case 'version':
    case '--version':
    case '-v':
      console.log(VERSION_INFO);
      break;
      
    case 'health':
      await healthCheck();
      break;
      
    case 'inspect':
      console.log("🔍 Starting MCP Inspector...");
      startServer(SERVER_SCRIPT, ['--inspect']);
      break;
      
    case 'minimal':
      console.log("⚡ Starting minimal server...");
      const minimalScript = join(__dirname, 'minimal-index.js');
      startServer(minimalScript);
      break;
      
    case 'test':
      console.log("🧪 Running server tests...");
      // Add test logic here
      console.log("Tests not implemented yet. Use 'health' command instead.");
      break;
      
    case 'start':
    case undefined:
      // Default command - start server
      const healthy = await healthCheck();
      if (healthy) {
        startServer(SERVER_SCRIPT);
      } else {
        console.log("\n💡 Tip: Run 'npx enhanced-homeassistant-mcp health' to check configuration");
        process.exit(1);
      }
      break;
      
    default:
      console.log(`❌ Unknown command: ${command}`);
      console.log("Run 'npx enhanced-homeassistant-mcp help' for usage information.");
      process.exit(1);
  }
}

// Run CLI
main().catch((error) => {
  console.error(`❌ CLI Error: ${error.message}`);
  process.exit(1);
});