import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  getAllStates,
  callHomeAssistantService,
  restartHomeAssistant,
  stopHomeAssistant,
  renderTemplate,
  makeGetRequest,
  formatErrorResponse,
  formatSuccessResponse
} from "../../utils/api.js";

/**
 * Register system administration and management tools
 */
export function registerSystemTools(server: McpServer) {
  // System information tool
  server.tool(
    "homeassistant_system_info",  
    "Get Home Assistant system information and health status",
    {},
    async () => {
      try {
        // Get multiple system endpoints
        const [statesResult, configResult] = await Promise.all([
          getAllStates(),
          makeGetRequest('/api/config')
        ]);
        
        const output = ["Home Assistant System Information:", ""];
        
        if (configResult.success && configResult.data) {
          const config = configResult.data;
          output.push(`Version: ${config.version || 'Unknown'}`);
          output.push(`Installation Type: ${config.installation_type || 'Unknown'}`);
          output.push(`Location: ${config.location_name || 'Unknown'}`);
          output.push(`Time Zone: ${config.time_zone || 'Unknown'}`);
          output.push(`Unit System: ${config.unit_system?.temperature || 'Unknown'} / ${config.unit_system?.length || 'Unknown'}`);
          output.push(`Components: ${config.components ? config.components.length : 0}`);
          output.push("");
        }
        
        if (statesResult.success && statesResult.data) {
          const entities = statesResult.data;
          const entityStats: { [key: string]: number } = {};
          
          entities.forEach((entity: any) => {
            const domain = entity.entity_id.split('.')[0];
            entityStats[domain] = (entityStats[domain] || 0) + 1;
          });
          
          output.push(`Total Entities: ${entities.length}`);
          output.push("Entities by Domain:");
          Object.entries(entityStats)
            .sort(([,a], [,b]) => b - a)
            .forEach(([domain, count]) => {
              output.push(`  ${domain}: ${count}`);
            });
        }
        
        return formatSuccessResponse(output.join('\n'));
      } catch (error) {
        return formatErrorResponse(`Failed to get system info: ${error}`);
      }
    }
  );

  // Template rendering tool
  server.tool(
    "homeassistant_render_template",  
    "Render a Home Assistant Jinja2 template",
    {
      template: z.string().describe("The Jinja2 template to render (e.g., '{{ states.sensor.temperature.state }}')"),
    },
    async ({ template }) => {
      const result = await renderTemplate(template);
      
      if (!result.success) {
        return formatErrorResponse(`Failed to render template: ${result.message}`);
      }
      
      return formatSuccessResponse(`Template result: ${result.data}`);
    }
  );

  // Get all areas
  server.tool(
    "homeassistant_list_areas",  
    "Get all areas defined in Home Assistant",
    {},
    async () => {
      const result = await makeGetRequest('/api/config/area_registry');
      
      if (!result.success) {
        return formatErrorResponse(`Failed to get areas: ${result.message}`);
      }
      
      const areas = result.data;
      
      if (!areas || areas.length === 0) {
        return formatSuccessResponse("No areas configured");
      }
      
      const output = [`Found ${areas.length} areas:`, ""];
      
      areas.forEach((area: any) => {
        output.push(`🏠 ${area.name} (${area.area_id})`);
        if (area.aliases && area.aliases.length > 0) {
          output.push(`   Aliases: ${area.aliases.join(', ')}`);
        }
        output.push("");
      });
      
      return formatSuccessResponse(output.join('\n'));
    }
  );

  // Get all devices
  server.tool(
    "homeassistant_list_devices",  
    "Get all devices registered in Home Assistant",
    {},
    async () => {
      const result = await makeGetRequest('/api/config/device_registry');
      
      if (!result.success) {
        return formatErrorResponse(`Failed to get devices: ${result.message}`);
      }
      
      const devices = result.data;
      
      if (!devices || devices.length === 0) {
        return formatSuccessResponse("No devices found");
      }
      
      const output = [`Found ${devices.length} devices:`, ""];
      
      devices.slice(0, 50).forEach((device: any) => {
        output.push(`📱 ${device.name || device.name_by_user || 'Unknown Device'}`);
        output.push(`   ID: ${device.id}`);
        if (device.manufacturer) output.push(`   Manufacturer: ${device.manufacturer}`);
        if (device.model) output.push(`   Model: ${device.model}`);
        if (device.area_id) output.push(`   Area: ${device.area_id}`);
        output.push("");
      });
      
      if (devices.length > 50) {
        output.push(`... and ${devices.length - 50} more devices`);
      }
      
      return formatSuccessResponse(output.join('\n'));
    }
  );

  // Get integrations
  server.tool(
    "homeassistant_list_integrations",  
    "Get all installed integrations/components",
    {},
    async () => {
      const result = await makeGetRequest('/api/config');
      
      if (!result.success) {
        return formatErrorResponse(`Failed to get integrations: ${result.message}`);
      }
      
      const config = result.data;
      
      if (!config.components || config.components.length === 0) {
        return formatSuccessResponse("No components found");
      }
      
      const components = config.components.sort();
      const output = [
        `Found ${components.length} components/integrations:`,
        "",
        components.join(', ')
      ];
      
      return formatSuccessResponse(output.join('\n'));
    }
  );

  // Restart Home Assistant (dangerous - requires confirmation)
  server.tool(
    "homeassistant_restart_service",  
    "Restart Home Assistant (WARNING: This will restart the entire system)",
    {
      confirm: z.boolean().describe("Set to true to confirm you want to restart Home Assistant")
    },
    async ({ confirm }) => {
      if (!confirm) {
        return formatErrorResponse("Restart cancelled. Set confirm=true to proceed with restart.");
      }
      
      const result = await restartHomeAssistant();
      
      if (!result.success) {
        return formatErrorResponse(`Failed to restart Home Assistant: ${result.message}`);
      }
      
      return formatSuccessResponse("⚠️ Home Assistant restart initiated. The system will be unavailable for a few minutes.");
    }
  );

  // Get supervisor info (if running Home Assistant OS/Supervised)
  server.tool(
    "homeassistant_supervisor_info",  
    "Get Home Assistant Supervisor information (if available)",
    {},
    async () => {
      const result = await makeGetRequest('/api/hassio/supervisor/info');
      
      if (!result.success) {
        if (result.statusCode === 404) {
          return formatSuccessResponse("Home Assistant Supervisor not available (running in Core mode)");
        }
        return formatErrorResponse(`Failed to get supervisor info: ${result.message}`);
      }
      
      const info = result.data;
      
      const output = [
        "Home Assistant Supervisor Information:",
        "",
        `Version: ${info.version || 'Unknown'}`,
        `Channel: ${info.channel || 'Unknown'}`,
        `Arch: ${info.arch || 'Unknown'}`,
        `Hostname: ${info.hostname || 'Unknown'}`,
        `Timezone: ${info.timezone || 'Unknown'}`,
        `Healthy: ${info.healthy ? '✅' : '❌'}`,
        `Supported: ${info.supported ? '✅' : '❌'}`
      ];
      
      if (info.addons && info.addons.length > 0) {
        output.push("", `Add-ons: ${info.addons.length}`);
      }
      
      return formatSuccessResponse(output.join('\n'));
    }
  );

  // Get add-ons list
  server.tool(
    "homeassistant_list_addons",  
    "Get list of Home Assistant add-ons (if Supervisor is available)",
    {},
    async () => {
      const result = await makeGetRequest('/api/hassio/addons');
      
      if (!result.success) {
        if (result.statusCode === 404) {
          return formatSuccessResponse("Add-ons not available (not running Home Assistant OS/Supervised)");
        }
        return formatErrorResponse(`Failed to get add-ons: ${result.message}`);
      }
      
      const addons = result.data;
      
      if (!addons.addons || addons.addons.length === 0) {
        return formatSuccessResponse("No add-ons installed");
      }
      
      const output = [`Found ${addons.addons.length} add-ons:`, ""];
      
      addons.addons.forEach((addon: any) => {
        const status = addon.installed ? (addon.state === 'started' ? '🟢 Running' : '🟡 Stopped') : '⚪ Not Installed';
        output.push(`${status} ${addon.name}`);
        output.push(`   Slug: ${addon.slug}`);
        if (addon.version) output.push(`   Version: ${addon.version}`);
        if (addon.description) output.push(`   Description: ${addon.description}`);
        output.push("");
      });
      
      return formatSuccessResponse(output.join('\n'));
    }
  );

  // Get entity registry
  server.tool(
    "homeassistant_search_entities",  
    "Search for entities by name or ID pattern",
    {
      search: z.string().describe("Search term to find in entity IDs or friendly names"),
      domain: z.string().optional().describe("Limit search to specific domain")
    },
    async ({ search, domain }) => {
      const result = await getAllStates();
      
      if (!result.success) {
        return formatErrorResponse(`Failed to search entities: ${result.message}`);
      }
      
      let entities = result.data;
      
      // Filter by domain if specified
      if (domain) {
        entities = entities.filter((entity: any) => entity.entity_id.startsWith(`${domain}.`));
      }
      
      // Search in entity ID and friendly name
      const searchLower = search.toLowerCase();
      const matchingEntities = entities.filter((entity: any) => {
        const entityIdMatch = entity.entity_id.toLowerCase().includes(searchLower);
        const nameMatch = entity.attributes?.friendly_name?.toLowerCase().includes(searchLower);
        return entityIdMatch || nameMatch;
      });
      
      if (matchingEntities.length === 0) {
        return formatSuccessResponse(`No entities found matching "${search}"`);
      }
      
      const output = [`Found ${matchingEntities.length} entities matching "${search}":`, ""];
      
      matchingEntities.slice(0, 20).forEach((entity: any) => {
        output.push(`📍 ${entity.entity_id}`);
        if (entity.attributes?.friendly_name) {
          output.push(`   Name: ${entity.attributes.friendly_name}`);
        }
        output.push(`   State: ${entity.state}`);
        output.push("");
      });
      
      if (matchingEntities.length > 20) {
        output.push(`... and ${matchingEntities.length - 20} more matches`);
      }
      
      return formatSuccessResponse(output.join('\n'));
    }
  );
}