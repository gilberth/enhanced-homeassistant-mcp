# Enhanced Home Assistant MCP

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9+-blue.svg)](https://www.typescriptlang.org/)
[![Home Assistant](https://img.shields.io/badge/Home%20Assistant-Compatible-green.svg)](https://www.home-assistant.io/)

A comprehensive MCP (Model Context Protocol) server that provides extensive integration with Home Assistant, enabling AI assistants to interact with smart home devices, automations, and system management.

## 🎆 Features

### 📊 Basic Operations
- ✅ API status verification
- 📱 Entity state management
- 🔄 Service calls with advanced parameters
- 📝 Entity discovery and listing
- 🛠️ Configuration information

### 🤖 Automation & Control
- 📜 Automation management (enable/disable/trigger)
- 🎬 Scene activation
- 📜 Script execution
- 🔘 Input boolean controls
- 📅 Scheduled automation insights

### 📊 History & Monitoring
- 📈 Entity history tracking
- 📝 Logbook entries
- ⚠️ Error log monitoring
- 📡 System events
- 🔍 Configuration validation

### 🏠 Device Control
- 💡 **Lights**: Brightness, color, temperature control
- 🌡️ **Climate**: Temperature, HVAC modes, presets
- 📺 **Media Players**: Play/pause, volume, media selection
- 🏠 **Covers**: Open/close, position control
- 📢 **Notifications**: Multi-service messaging
- 🔍 **Device Discovery**: Filter by type/domain

### ⚙️ System Administration
- 📊 System information and health
- 🏷️ Template rendering (Jinja2)
- 🏠 Area and device management
- 🔌 Integration monitoring
- 🔄 System restart capabilities
- 📱 Supervisor and add-on management
- 🔍 Entity search and discovery

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Home Assistant instance with API access
- Long-lived access token from Home Assistant

### Installation

```bash
# Clone the repository
git clone https://github.com/gilberth/enhanced-homeassistant-mcp.git
cd enhanced-homeassistant-mcp

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### Configuration

Edit the `.env` file with your Home Assistant details:

```env
HOME_ASSISTANT_URL=http://homeassistant.local:8123
HOME_ASSISTANT_TOKEN=your_long_lived_access_token_here
DEBUG=false
REQUEST_TIMEOUT=10000
```

### Getting Your Access Token

1. Open Home Assistant in your browser
2. Go to your Profile (click on your username in the sidebar)
3. Scroll down to "Long-Lived Access Tokens"
4. Click "Create Token"
5. Give it a name and copy the generated token

### Running the Server

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start

# With MCP Inspector (for testing)
npm run inspector
```

## 🛠️ Available Tools

### Basic Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `homeassistant_api_status` | Check API connectivity | None |
| `homeassistant_get_entity_state` | Get entity state | `entity_id` |
| `homeassistant_list_all_entities` | List all entities | `domain` (optional) |
| `homeassistant_call_service` | Call HA service | `domain`, `service`, `entity_id`, `service_data` |
| `homeassistant_list_services` | List available services | `domain` (optional) |
| `homeassistant_get_config` | Get HA configuration | None |

### Automation Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `homeassistant_list_automations` | List all automations | None |
| `homeassistant_toggle_automation` | Enable/disable automation | `entity_id`, `action` |
| `homeassistant_trigger_automation` | Trigger automation | `entity_id` |
| `homeassistant_list_scenes` | List all scenes | None |
| `homeassistant_activate_scene` | Activate scene | `entity_id` |
| `homeassistant_list_scripts` | List all scripts | None |
| `homeassistant_run_script` | Run script | `entity_id` |
| `homeassistant_list_input_booleans` | List input booleans | None |
| `homeassistant_toggle_input_boolean` | Toggle input boolean | `entity_id`, `action` |

### History Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `homeassistant_get_entity_history` | Get entity history | `entity_id`, `start_time`, `end_time`, `minimal_response` |
| `homeassistant_get_logbook` | Get logbook entries | `entity_id`, `start_time`, `end_time` |
| `homeassistant_get_events` | List event types | None |
| `homeassistant_get_error_log` | Get error log | None |
| `homeassistant_check_config` | Validate configuration | None |

### Device Control Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `homeassistant_control_lights` | Control lights | `entity_id`, `action`, `brightness`, `color_name`, `rgb_color`, etc. |
| `homeassistant_control_climate` | Control climate devices | `entity_id`, `temperature`, `hvac_mode`, `preset_mode`, etc. |
| `homeassistant_control_media_player` | Control media players | `entity_id`, `action`, `media_content_id`, `volume_level`, etc. |
| `homeassistant_control_covers` | Control covers/blinds | `entity_id`, `action`, `position` |
| `homeassistant_get_devices_by_type` | List devices by domain | `domain` |
| `homeassistant_send_notification` | Send notifications | `service`, `title`, `message`, `target` |

### System Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `homeassistant_system_info` | Get system information | None |
| `homeassistant_render_template` | Render Jinja2 template | `template` |
| `homeassistant_list_areas` | List all areas | None |
| `homeassistant_list_devices` | List all devices | None |
| `homeassistant_list_integrations` | List integrations | None |
| `homeassistant_restart_service` | Restart Home Assistant | `confirm` |
| `homeassistant_supervisor_info` | Get Supervisor info | None |
| `homeassistant_list_addons` | List add-ons | None |
| `homeassistant_search_entities` | Search entities | `search`, `domain` |

## 📝 Usage Examples

### Basic Entity Control

```javascript
// Get light state
const lightState = await homeassistant_get_entity_state({
  entity_id: "light.living_room"
});

// Turn on light with brightness and color
const result = await homeassistant_control_lights({
  entity_id: "light.living_room",
  action: "turn_on",
  brightness_pct: 75,
  color_name: "warm_white"
});
```

### Automation Management

```javascript
// List all automations
const automations = await homeassistant_list_automations();

// Enable an automation
const enabled = await homeassistant_toggle_automation({
  entity_id: "automation.morning_routine",
  action: "turn_on"
});

// Activate a scene
const scene = await homeassistant_activate_scene({
  entity_id: "scene.movie_time"
});
```

### Climate Control

```javascript
// Set thermostat temperature
const climate = await homeassistant_control_climate({
  entity_id: "climate.living_room",
  temperature: 22,
  hvac_mode: "heat"
});
```

### System Information

```javascript
// Get system overview
const systemInfo = await homeassistant_system_info();

// Search for entities
const searchResults = await homeassistant_search_entities({
  search: "temperature",
  domain: "sensor"
});
```

## 🔧 Development

### Project Structure

```
src/
├── index.ts                    # Main server file
├── utils/
│   └── api.ts                  # API utilities
└── tools/
    └── homeassistant/
        ├── basic.ts            # Basic HA operations
        ├── automation.ts       # Automation tools
        ├── history.ts          # History and monitoring
        ├── devices.ts          # Device control
        └── system.ts           # System administration
```

### Adding New Tools

1. Create a new function in the appropriate tool file
2. Register it with the server using `server.tool()`
3. Follow the existing patterns for error handling and response formatting
4. Add documentation to the README

### Testing

```bash
# Run with inspector for interactive testing
npm run inspector

# Test specific endpoints
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:8123/api/states"
```

## 🚑 Troubleshooting

### Common Issues

**Connection Failed**
- Verify HOME_ASSISTANT_URL is correct and accessible
- Check that Home Assistant is running
- Ensure no firewall blocking the connection

**Authentication Failed**
- Verify your long-lived access token is correct
- Check token hasn't expired or been revoked
- Ensure token has necessary permissions

**Entity Not Found**
- Use `homeassistant_list_all_entities` to find correct entity IDs
- Check entity exists and is enabled in Home Assistant
- Verify correct domain prefix (e.g., `light.`, `sensor.`)

**Service Call Failed**
- Use `homeassistant_list_services` to verify service availability
- Check service parameters are correct for your device
- Some services require specific entity types or states

### Debug Mode

Enable debug logging in your `.env`:

```env
DEBUG=true
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow existing code style and patterns
- Add proper TypeScript types
- Include error handling for all API calls
- Update documentation for new features
- Test with real Home Assistant instance

## 📜 API Reference

This MCP server uses the [Home Assistant REST API](https://developers.home-assistant.io/docs/api/rest/). Key endpoints:

- `/api/` - API information
- `/api/states` - Entity states
- `/api/services` - Available services
- `/api/config` - Configuration
- `/api/history` - Historical data
- `/api/logbook` - Logbook entries

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Home Assistant](https://www.home-assistant.io/) - The amazing smart home platform
- [Model Context Protocol](https://modelcontextprotocol.io/) - Protocol specification
- [TypeScript](https://www.typescriptlang.org/) - Language and tooling

## 📞 Support

If you encounter issues or have questions:

1. Check the [troubleshooting section](#-troubleshooting)
2. Search existing [GitHub issues](https://github.com/gilberth/enhanced-homeassistant-mcp/issues)
3. Create a new issue with:
   - Home Assistant version
   - MCP server logs
   - Steps to reproduce
   - Expected vs actual behavior

---

**Made with ❤️ for the Home Assistant community**