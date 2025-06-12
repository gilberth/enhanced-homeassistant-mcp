import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  getAllStates,
  callHomeAssistantService,
  formatErrorResponse,
  formatSuccessResponse
} from "../../utils/api.js";

/**
 * Register device-specific tools for common Home Assistant domains
 */
export function registerDeviceTools(server: McpServer) {
  // Light control tools
  server.tool(
    "homeassistant_control_lights",  
    "Control lights with advanced options (brightness, color, etc.)",
    {
      entity_id: z.union([z.string(), z.array(z.string())]).describe("Light entity ID(s)"),
      action: z.enum(["turn_on", "turn_off", "toggle"]).describe("Action to perform"),
      brightness: z.number().min(0).max(255).optional().describe("Brightness level (0-255)"),
      brightness_pct: z.number().min(0).max(100).optional().describe("Brightness percentage (0-100)"),
      color_name: z.string().optional().describe("Color name (e.g., 'red', 'blue', 'warm_white')"),
      rgb_color: z.array(z.number()).optional().describe("RGB color as [r, g, b] (0-255 each)"),
      kelvin: z.number().optional().describe("Color temperature in Kelvin"),
      transition: z.number().optional().describe("Transition time in seconds")
    },
    async ({ entity_id, action, brightness, brightness_pct, color_name, rgb_color, kelvin, transition }) => {
      const serviceData: any = { entity_id };
      
      if (action === 'turn_on') {
        if (brightness !== undefined) serviceData.brightness = brightness;
        if (brightness_pct !== undefined) serviceData.brightness_pct = brightness_pct;
        if (color_name !== undefined) serviceData.color_name = color_name;
        if (rgb_color !== undefined) serviceData.rgb_color = rgb_color;
        if (kelvin !== undefined) serviceData.kelvin = kelvin;
        if (transition !== undefined) serviceData.transition = transition;
      }
      
      const result = await callHomeAssistantService('light', action, serviceData);
      
      if (!result.success) {
        return formatErrorResponse(`Failed to control lights: ${result.message}`);
      }
      
      const entityIds = Array.isArray(entity_id) ? entity_id : [entity_id];
      return formatSuccessResponse(
        `Lights ${action}: ${entityIds.join(', ')}` +
        (brightness !== undefined ? ` (brightness: ${brightness})` : '') +
        (brightness_pct !== undefined ? ` (brightness: ${brightness_pct}%)` : '') +
        (color_name ? ` (color: ${color_name})` : '')
      );
    }
  );

  // Climate control tools
  server.tool(
    "homeassistant_control_climate",  
    "Control climate/thermostat devices",
    {
      entity_id: z.union([z.string(), z.array(z.string())]).describe("Climate entity ID(s)"),
      temperature: z.number().optional().describe("Target temperature"),
      target_temp_high: z.number().optional().describe("Target high temperature (for heat-cool mode)"),
      target_temp_low: z.number().optional().describe("Target low temperature (for heat-cool mode)"),
      hvac_mode: z.enum(["off", "heat", "cool", "heat_cool", "auto", "dry", "fan_only"]).optional().describe("HVAC mode"),
      fan_mode: z.string().optional().describe("Fan mode (device-specific)"),
      preset_mode: z.string().optional().describe("Preset mode (e.g., 'away', 'home', 'sleep')")
    },
    async ({ entity_id, temperature, target_temp_high, target_temp_low, hvac_mode, fan_mode, preset_mode }) => {
      const serviceData: any = { entity_id };
      
      if (temperature !== undefined) serviceData.temperature = temperature;
      if (target_temp_high !== undefined) serviceData.target_temp_high = target_temp_high;
      if (target_temp_low !== undefined) serviceData.target_temp_low = target_temp_low;
      if (hvac_mode !== undefined) serviceData.hvac_mode = hvac_mode;
      if (fan_mode !== undefined) serviceData.fan_mode = fan_mode;
      if (preset_mode !== undefined) serviceData.preset_mode = preset_mode;
      
      const result = await callHomeAssistantService('climate', 'set_temperature', serviceData);
      
      if (!result.success) {
        return formatErrorResponse(`Failed to control climate: ${result.message}`);
      }
      
      const entityIds = Array.isArray(entity_id) ? entity_id : [entity_id];
      return formatSuccessResponse(
        `Climate settings updated for: ${entityIds.join(', ')}` +
        (temperature !== undefined ? ` (temp: ${temperature}°)` : '') +
        (hvac_mode ? ` (mode: ${hvac_mode})` : '')
      );
    }
  );

  // Media player control tools
  server.tool(
    "homeassistant_control_media_player",  
    "Control media player devices",
    {
      entity_id: z.union([z.string(), z.array(z.string())]).describe("Media player entity ID(s)"),
      action: z.enum([
        "turn_on", "turn_off", "toggle", "play_media", "media_play", "media_pause", 
        "media_stop", "media_next_track", "media_previous_track", "volume_up", 
        "volume_down", "volume_mute", "volume_set"
      ]).describe("Action to perform"),
      media_content_id: z.string().optional().describe("Media content ID (for play_media)"),
      media_content_type: z.string().optional().describe("Media content type (for play_media)"),
      volume_level: z.number().min(0).max(1).optional().describe("Volume level (0.0-1.0)")
    },
    async ({ entity_id, action, media_content_id, media_content_type, volume_level }) => {
      const serviceData: any = { entity_id };
      
      if (action === 'play_media') {
        if (!media_content_id || !media_content_type) {
          return formatErrorResponse("play_media requires both media_content_id and media_content_type");
        }
        serviceData.media_content_id = media_content_id;
        serviceData.media_content_type = media_content_type;
      }
      
      if (action === 'volume_set') {
        if (volume_level === undefined) {
          return formatErrorResponse("volume_set requires volume_level");
        }
        serviceData.volume_level = volume_level;
      }
      
      const result = await callHomeAssistantService('media_player', action, serviceData);
      
      if (!result.success) {
        return formatErrorResponse(`Failed to control media player: ${result.message}`);
      }
      
      const entityIds = Array.isArray(entity_id) ? entity_id : [entity_id];
      return formatSuccessResponse(`Media player ${action}: ${entityIds.join(', ')}`);
    }
  );

  // Cover/blind control
  server.tool(
    "homeassistant_control_covers",  
    "Control covers, blinds, and shades",
    {
      entity_id: z.union([z.string(), z.array(z.string())]).describe("Cover entity ID(s)"),
      action: z.enum(["open_cover", "close_cover", "stop_cover", "set_cover_position"]).describe("Action to perform"),
      position: z.number().min(0).max(100).optional().describe("Position percentage (0-100, for set_cover_position)")
    },
    async ({ entity_id, action, position }) => {
      const serviceData: any = { entity_id };
      
      if (action === 'set_cover_position') {
        if (position === undefined) {
          return formatErrorResponse("set_cover_position requires position parameter");
        }
        serviceData.position = position;
      }
      
      const result = await callHomeAssistantService('cover', action, serviceData);
      
      if (!result.success) {
        return formatErrorResponse(`Failed to control covers: ${result.message}`);
      }
      
      const entityIds = Array.isArray(entity_id) ? entity_id : [entity_id];
      return formatSuccessResponse(
        `Covers ${action}: ${entityIds.join(', ')}` +
        (position !== undefined ? ` (position: ${position}%)` : '')
      );
    }
  );

  // Get devices by domain
  server.tool(
    "homeassistant_get_devices_by_type",  
    "Get all devices of a specific type/domain",
    {
      domain: z.enum([
        "light", "switch", "sensor", "binary_sensor", "climate", "cover", 
        "media_player", "fan", "lock", "camera", "alarm_control_panel", 
        "vacuum", "water_heater", "humidifier", "device_tracker"
      ]).describe("Device domain/type to filter by")
    },
    async ({ domain }) => {
      const result = await getAllStates();
      
      if (!result.success) {
        return formatErrorResponse(`Failed to get devices: ${result.message}`);
      }
      
      const devices = result.data.filter((entity: any) => 
        entity.entity_id.startsWith(`${domain}.`)
      );
      
      if (devices.length === 0) {
        return formatSuccessResponse(`No ${domain} devices found`);
      }
      
      const output = [`Found ${devices.length} ${domain} devices:`, ""];
      
      devices.forEach((device: any) => {
        const name = device.attributes?.friendly_name || device.entity_id;
        const state = device.state;
        const unit = device.attributes?.unit_of_measurement || '';
        
        let status = '';
        if (domain === 'light' || domain === 'switch') {
          status = state === 'on' ? '☀️' : '🌙';
        } else if (domain === 'sensor') {
          status = '📊';
        } else if (domain === 'binary_sensor') {
          status = state === 'on' ? '🔴' : '⚪';
        } else if (domain === 'climate') {
          status = '🌡️';
        } else if (domain === 'cover') {
          status = state === 'open' ? '🔓' : '🔒';
        } else if (domain === 'media_player') {
          status = state === 'playing' ? '▶️' : '⏸️';
        }
        
        output.push(`${status} ${name} (${device.entity_id})`);
        output.push(`   State: ${state} ${unit}`);
        
        // Add relevant attributes based on domain
        if (domain === 'light' && device.attributes?.brightness) {
          output.push(`   Brightness: ${Math.round((device.attributes.brightness / 255) * 100)}%`);
        }
        if (domain === 'climate') {
          if (device.attributes?.current_temperature) {
            output.push(`   Current: ${device.attributes.current_temperature}°`);
          }
          if (device.attributes?.temperature) {
            output.push(`   Target: ${device.attributes.temperature}°`);
          }
        }
        if (domain === 'media_player' && device.attributes?.media_title) {
          output.push(`   Playing: ${device.attributes.media_title}`);
        }
        
        output.push("");
      });
      
      return formatSuccessResponse(output.join('\n'));
    }
  );

  // Notification service
  server.tool(
    "homeassistant_send_notification",  
    "Send a notification through Home Assistant",
    {
      service: z.string().describe("Notification service (e.g., 'mobile_app_iphone', 'persistent_notification')"),
      title: z.string().describe("Notification title"),
      message: z.string().describe("Notification message"),
      target: z.string().optional().describe("Target device/user (for some notification services)")
    },
    async ({ service, title, message, target }) => {
      const serviceData: any = {
        title,
        message
      };
      
      if (target) {
        serviceData.target = target;
      }
      
      const result = await callHomeAssistantService('notify', service, serviceData);
      
      if (!result.success) {
        return formatErrorResponse(`Failed to send notification: ${result.message}`);
      }
      
      return formatSuccessResponse(`Notification sent via ${service}: "${title}"`);
    }
  );
}