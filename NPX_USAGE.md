# 🚀 NPX Usage Guide - Enhanced Home Assistant MCP

## Quick Start with NPX

The Enhanced Home Assistant MCP server can be used directly with `npx` without installing it globally!

### Prerequisites

1. **Node.js 18+** installed
2. **Home Assistant** running and accessible
3. **Long-lived access token** from Home Assistant

### 🏃‍♂️ Quick Start

```bash
# Set environment variables
export HOMEASSISTANT_URL="http://your-ha-ip:8123"
export HOMEASSISTANT_TOKEN="your-long-lived-access-token"

# Start the server
npx @thelord/enhanced-homeassistant-mcp
```

## 📋 Available Commands

### Basic Commands

```bash
# Start the MCP server (default)
npx @thelord/enhanced-homeassistant-mcp start

# Show help
npx @thelord/enhanced-homeassistant-mcp help

# Show version
npx @thelord/enhanced-homeassistant-mcp version

# Check health and configuration
npx @thelord/enhanced-homeassistant-mcp health
```

### Advanced Commands

```bash
# Start with MCP Inspector for debugging
npx @thelord/enhanced-homeassistant-mcp inspect

# Start minimal server (faster, fewer tools)
npx @thelord/enhanced-homeassistant-mcp minimal

# Start with debug mode
npx @thelord/enhanced-homeassistant-mcp --debug start
```

### Alternative Package Names

The package provides multiple command aliases:

```bash
npx @thelord/enhanced-homeassistant-mcp    # Full scoped name
```

## 🔧 Configuration Options

### Environment Variables

```bash
# Required
export HOMEASSISTANT_URL="http://192.168.1.100:8123"
export HOMEASSISTANT_TOKEN="eyJ0eXAiOiJKV1QiLCJhbGc..."

# Optional
export DEBUG="true"                    # Enable debug logging
export REQUEST_TIMEOUT="10000"        # Request timeout in ms
```

### Command Line Options

```bash
# Enable debug mode
npx enhanced-homeassistant-mcp --debug start

# Set custom timeout
npx enhanced-homeassistant-mcp --timeout 15000 start

# Specify port (if needed)
npx enhanced-homeassistant-mcp --port 3000 start
```

## 🏠 Home Assistant Setup

### 1. Create Long-lived Access Token

1. Go to your Home Assistant web interface
2. Click on your profile (bottom left)
3. Scroll to "Long-lived access tokens"
4. Click "Create Token"
5. Give it a name like "MCP Server"
6. Copy the token

### 2. Set Environment Variables

#### Linux/macOS (Terminal)
```bash
export HOMEASSISTANT_URL="http://192.168.1.100:8123"
export HOMEASSISTANT_TOKEN="your-token-here"
```

#### Windows (PowerShell)
```powershell
$env:HOMEASSISTANT_URL="http://192.168.1.100:8123"
$env:HOMEASSISTANT_TOKEN="your-token-here"
```

#### Windows (Command Prompt)
```cmd
set HOMEASSISTANT_URL=http://192.168.1.100:8123
set HOMEASSISTANT_TOKEN=your-token-here
```

### 3. Create .env File (Alternative)

Create a `.env` file in your working directory:

```env
HOMEASSISTANT_URL=http://192.168.1.100:8123
HOMEASSISTANT_TOKEN=your-long-lived-access-token
DEBUG=false
REQUEST_TIMEOUT=10000
```

## 🧪 Testing Your Setup

### Health Check
```bash
npx enhanced-homeassistant-mcp health
```

Expected output:
```
🔍 Performing Health Check...

✅ Environment variables configured
   - HOMEASSISTANT_URL: http://192.168.1.100:8123
   - HOMEASSISTANT_TOKEN: ********************...

✅ Health check passed - Ready to start server!
```

### Quick Test Run
```bash
# Start server and test basic functionality
npx enhanced-homeassistant-mcp start
```

## 🔍 Using with MCP Inspector

For development and testing:

```bash
npx enhanced-homeassistant-mcp inspect
```

This will start the server with the MCP Inspector for interactive testing.

## 🛠️ Available Tools

Once running, the server provides 52+ tools including:

### 🆕 Enhanced Features
- `homeassistant_bulk_operations` - Control multiple entities
- `homeassistant_manage_favorites` - Bookmark frequently used entities  
- `homeassistant_favorite_actions` - Quick actions on favorites
- `homeassistant_validate_config` - Configuration validation
- `homeassistant_system_health` - System health dashboard

### 🔧 Core Features
- Entity state management
- Service calls
- Automation control
- Device control (lights, climate, media players)
- System monitoring
- History and logs

## 📞 Integration Examples

### With Claude Desktop

Add to your Claude Desktop MCP configuration:

```json
{
  "mcpServers": {
    "homeassistant": {
      "command": "npx",
      "args": ["enhanced-homeassistant-mcp"],
      "env": {
        "HOMEASSISTANT_URL": "http://your-ha-ip:8123",
        "HOMEASSISTANT_TOKEN": "your-token"
      }
    }
  }
}
```

### With Other MCP Clients

```javascript
import { spawn } from 'child_process';

const server = spawn('npx', ['enhanced-homeassistant-mcp'], {
  env: {
    ...process.env,
    HOMEASSISTANT_URL: 'http://your-ha-ip:8123',
    HOMEASSISTANT_TOKEN: 'your-token'
  }
});
```

## 🚨 Troubleshooting

### Common Issues

1. **"Module not found" error**
   ```bash
   # Clear npm cache and try again
   npm cache clean --force
   npx enhanced-homeassistant-mcp
   ```

2. **Connection refused**
   ```bash
   # Check your Home Assistant URL and token
   npx enhanced-homeassistant-mcp health
   ```

3. **Timeout errors**
   ```bash
   # Increase timeout
   npx enhanced-homeassistant-mcp --timeout 30000 start
   ```

### Debug Mode

Enable detailed logging:

```bash
npx enhanced-homeassistant-mcp --debug start
```

### Force Reinstall

```bash
# Force fresh install
npx --force enhanced-homeassistant-mcp
```

## 🌟 Advantages of NPX Usage

✅ **No Global Installation** - Always use latest version  
✅ **No Dependency Conflicts** - Isolated environment  
✅ **Easy Updates** - Automatic latest version  
✅ **Cross-Platform** - Works on Windows, macOS, Linux  
✅ **Quick Setup** - Single command to start  

## 📚 Next Steps

1. **Start the server**: `npx enhanced-homeassistant-mcp`
2. **Test with MCP Inspector**: `npx enhanced-homeassistant-mcp inspect`
3. **Integrate with your AI assistant**
4. **Explore the 52+ available tools**
5. **Automate your smart home!**

For more detailed documentation, see the main README.md file.