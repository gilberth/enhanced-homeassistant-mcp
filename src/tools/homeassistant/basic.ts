import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  getHomeAssistantApi,
  getHomeAssistantState,
  getAllStates,
  callHomeAssistantService,
  getServices,
  getConfig,
  formatErrorResponse,
  formatSuccessResponse
} from "../../utils/api.js";

/**
 * Register basic Home Assistant API tools
 */
export function registerBasicTools(server: McpServer) {
  // Tool to verify if the Home Assistant API is online
  server.tool(
    "homeassistant_api_status",  
    "Verify if the Home Assistant API is online and get basic info",
    {},
    async () => {
      const result = await getHomeAssistantApi();
      
      if (!result.success) {
        return formatErrorResponse(`Failed to connect to Home Assistant: ${result.message}`);
      }
      
      const response = result.data;
      return formatSuccessResponse(`Home Assistant API is online!\nMessage: ${response.message || 'API is accessible'}`);
    }
  );

  // Tool to get the state of a specific Home Assistant entity
  server.tool(
    "homeassistant_get_entity_state",  
    "Get the current state of a specific Home Assistant entity with optional field filtering",
    {
      entity_id: z.string().describe("The entity ID (e.g., 'light.living_room', 'sensor.temperature')"),
      fields: z.array(z.string()).optional().describe("Optional list of specific fields to include (e.g., ['state', 'attributes', 'last_updated'])"),
      detailed: z.boolean().optional().describe("If true, returns all details. If false, returns a lean response for token efficiency")
    },
    async ({ entity_id, fields, detailed = false }: {
      entity_id: string;
      fields?: string[];
      detailed?: boolean;
    }) => {  
      const result = await getHomeAssistantState(entity_id);
      
      if (!result.success) {
        return formatErrorResponse(`Failed to get entity state: ${result.message}`);
      }
      
      const entity = result.data;
      
      // Apply field filtering if requested
      if (fields && fields.length > 0) {
        const filteredEntity: any = { entity_id };
        
        fields.forEach((field: string) => {
          if (field === "state") {
            filteredEntity.state = entity.state;
          } else if (field === "attributes") {
            filteredEntity.attributes = entity.attributes;
          } else if (field.startsWith("attr.") && field.length > 5) {
            const attrName = field.substring(5);
            if (!filteredEntity.attributes) filteredEntity.attributes = {};
            filteredEntity.attributes[attrName] = entity.attributes?.[attrName];
          } else if (field === "last_updated") {
            filteredEntity.last_updated = entity.last_updated;
          } else if (field === "last_changed") {
            filteredEntity.last_changed = entity.last_changed;
          } else if (field === "context") {
            filteredEntity.context = entity.context;
          }
        });
        
        return formatSuccessResponse(JSON.stringify(filteredEntity, null, 2));
      }
      
      // Apply lean formatting if not detailed
      if (!detailed) {
        const domain = entity_id.split('.')[0];
        const leanEntity = {
          entity_id,
          state: entity.state,
          friendly_name: entity.attributes?.friendly_name
        };
        
        // Add domain-specific important attributes
        const domainAttributes: { [key: string]: string[] } = {
          "light": ["brightness", "color_temp", "rgb_color", "supported_color_modes"],
          "switch": ["device_class"],
          "binary_sensor": ["device_class"],
          "sensor": ["device_class", "unit_of_measurement", "state_class"],
          "climate": ["hvac_mode", "current_temperature", "temperature", "hvac_action"],
          "media_player": ["media_title", "media_artist", "source", "volume_level"],
          "cover": ["current_position", "current_tilt_position"],
          "fan": ["percentage", "preset_mode"],
          "camera": ["entity_picture"],
          "automation": ["last_triggered"],
          "scene": [],
          "script": ["last_triggered"],
        };
        
        const importantAttrs = domainAttributes[domain] || [];
        importantAttrs.forEach(attr => {
          if (entity.attributes?.[attr] !== undefined) {
            (leanEntity as any)[attr] = entity.attributes[attr];
          }
        });
        
        return formatSuccessResponse(JSON.stringify(leanEntity, null, 2));
      }
      
      // Return full detailed entity information
      const stateInfo = [
        `Entity: ${entity_id}`,
        `Name: ${entity.attributes?.friendly_name || "Unknown"}`,
        `State: ${entity.state || "Unknown"}`,
        `Last Changed: ${entity.last_changed || "Unknown"}`,
        `Last Updated: ${entity.last_updated || "Unknown"}`,
        `Domain: ${entity_id.split('.')[0]}`,
        `\nAttributes:`
      ];
      
      // Format attributes in a readable way
      if (entity.attributes) {
        Object.entries(entity.attributes).forEach(([key, value]) => {
          if (key !== 'friendly_name') {
            stateInfo.push(`  ${key}: ${JSON.stringify(value)}`);
          }
        });
      }
      
      return formatSuccessResponse(stateInfo.join('\n'));
    }
  );

  // Tool to perform actions on entities (equivalent to entity_action in Python)
  server.tool(
    "homeassistant_entity_action",
    "Perform an action on a Home Assistant entity (on, off, toggle) with optional parameters",
    {
      entity_id: z.string().describe("The entity ID to act on"),
      action: z.enum(["on", "off", "toggle"]).describe("The action to perform"),
      brightness: z.number().optional().describe("Brightness level (0-255) for lights"),
      color_temp: z.number().optional().describe("Color temperature for lights"),
      rgb_color: z.array(z.number()).optional().describe("RGB color [r,g,b] for lights"),
      temperature: z.number().optional().describe("Temperature for climate entities"),
      hvac_mode: z.string().optional().describe("HVAC mode for climate entities"),
      source: z.string().optional().describe("Source for media players"),
      volume_level: z.number().optional().describe("Volume level (0-1) for media players")
    },
    async ({ entity_id, action, ...params }: {
      entity_id: string;
      action: 'on' | 'off' | 'toggle';
      brightness?: number;
      color_temp?: number;
      rgb_color?: number[];
      temperature?: number;
      hvac_mode?: string;
      source?: string;
      volume_level?: number;
    }) => {
      // Extract the domain from the entity_id
      const domain = entity_id.split(".")[0];
      
      // Map action to service name
      const service = action === "toggle" ? "toggle" : `turn_${action}`;
      
      // Prepare service data
      const serviceData: any = { entity_id };
      
      // Add domain-specific parameters
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          serviceData[key] = value;
        }
      });
      
      console.error(`Performing action '${action}' on entity: ${entity_id} with params: ${JSON.stringify(params)}`);
      
      const result = await callHomeAssistantService(domain, service, serviceData);
      
      if (!result.success) {
        return formatErrorResponse(`Failed to perform action: ${result.message}`);
      }
      
      return formatSuccessResponse(`Successfully performed '${action}' on ${entity_id}`);
    }
  );

  // Tool to list all entities and their states with filtering and search
  server.tool(
    "homeassistant_list_entities",  
    "Get a list of Home Assistant entities with optional domain filtering and search",
    {
      domain: z.string().optional().describe("Optional: Filter by domain (e.g., 'light', 'sensor', 'switch')"),
      search_query: z.string().optional().describe("Optional: Search term to filter by entity_id, friendly_name or other attributes"),
      limit: z.number().optional().default(100).describe("Maximum number of entities to return (default: 100)"),
      fields: z.array(z.string()).optional().describe("Optional: Specific fields to include for each entity"),
      detailed: z.boolean().optional().default(false).describe("If true, returns full entity data. If false, returns lean format for token efficiency")
    },
    async ({ domain, search_query, limit = 100, fields, detailed = false }: {
      domain?: string;
      search_query?: string;
      limit?: number;
      fields?: string[];
      detailed?: boolean;
    }) => {  
      const result = await getAllStates();
      
      if (!result.success) {
        return formatErrorResponse(`Failed to get all states: ${result.message}`);
      }
      
      let entities = result.data;
      
      // Filter by domain if specified
      if (domain) {
        entities = entities.filter((entity: any) => entity.entity_id.startsWith(`${domain}.`));
      }
      
      // Apply search query if provided
      if (search_query && search_query.trim() && search_query !== "*") {
        const searchTerm = search_query.toLowerCase().trim();
        entities = entities.filter((entity: any) => {
          const entityId = entity.entity_id.toLowerCase();
          const friendlyName = (entity.attributes?.friendly_name || "").toLowerCase();
          const state = (entity.state || "").toLowerCase();
          
          return entityId.includes(searchTerm) || 
                 friendlyName.includes(searchTerm) || 
                 state.includes(searchTerm) ||
                 JSON.stringify(entity.attributes || {}).toLowerCase().includes(searchTerm);
        });
      }
      
      // Apply limit
      if (limit > 0 && entities.length > limit) {
        entities = entities.slice(0, limit);
      }
      
      if (entities.length === 0) {
        const message = domain ? `No entities found for domain: ${domain}` : 
                       search_query ? `No entities found matching: ${search_query}` : 
                       "No entities found";
        return formatSuccessResponse(message);
      }
      
      // Apply field filtering or lean formatting
      const processedEntities = entities.map((entity: any) => {
        if (fields && fields.length > 0) {
          const filtered: any = { entity_id: entity.entity_id };
          fields.forEach((field: string) => {
            if (field === "state") {
              filtered.state = entity.state;
            } else if (field === "attributes") {
              filtered.attributes = entity.attributes;
            } else if (field.startsWith("attr.") && field.length > 5) {
              const attrName = field.substring(5);
              if (entity.attributes?.[attrName] !== undefined) {
                if (!filtered.attributes) filtered.attributes = {};
                filtered.attributes[attrName] = entity.attributes[attrName];
              }
            } else if (["last_updated", "last_changed", "context"].includes(field)) {
              filtered[field] = entity[field];
            }
          });
          return filtered;
        } else if (!detailed) {
          // Apply lean formatting similar to Python version
          const domain = entity.entity_id.split('.')[0];
          const lean: any = {
            entity_id: entity.entity_id,
            state: entity.state,
            friendly_name: entity.attributes?.friendly_name
          };
          
          // Add domain-specific important attributes
          const domainAttributes: { [key: string]: string[] } = {
            "light": ["brightness", "color_temp", "rgb_color", "supported_color_modes"],
            "switch": ["device_class"],
            "binary_sensor": ["device_class"],
            "sensor": ["device_class", "unit_of_measurement", "state_class"],
            "climate": ["hvac_mode", "current_temperature", "temperature", "hvac_action"],
            "media_player": ["media_title", "media_artist", "source", "volume_level"],
            "cover": ["current_position", "current_tilt_position"],
            "fan": ["percentage", "preset_mode"],
            "camera": ["entity_picture"],
            "automation": ["last_triggered"],
            "scene": [],
            "script": ["last_triggered"],
          };
          
          const importantAttrs = domainAttributes[domain] || [];
          importantAttrs.forEach(attr => {
            if (entity.attributes?.[attr] !== undefined) {
              lean[attr] = entity.attributes[attr];
            }
          });
          
          return lean;
        } else {
          return entity;
        }
      });

      // Group entities by domain for better organization
      const entitiesByDomain: { [key: string]: any[] } = {};
      processedEntities.forEach((entity: any) => {
        const entityDomain = entity.entity_id.split('.')[0];
        if (!entitiesByDomain[entityDomain]) {
          entitiesByDomain[entityDomain] = [];
        }
        entitiesByDomain[entityDomain].push(entity);
      });

      const summary = [
        `Total entities: ${processedEntities.length}`,
        `Domains found: ${Object.keys(entitiesByDomain).length}`,
        `\nEntities by domain:`
      ];

      Object.entries(entitiesByDomain).forEach(([domainName, domainEntities]) => {
        summary.push(`\n${domainName.toUpperCase()} (${domainEntities.length} entities):`);
        domainEntities.slice(0, 10).forEach(entity => {
          const name = entity.friendly_name || entity.entity_id;
          summary.push(`  - ${entity.entity_id}: ${entity.state} (${name})`);
        });
        if (domainEntities.length > 10) {
          summary.push(`  ... and ${domainEntities.length - 10} more`);
        }
      });

      return formatSuccessResponse(summary.join('\n'));
    }
  );

  // Tool to get Home Assistant version
  server.tool(
    "homeassistant_get_version",
    "Get the Home Assistant version",
    {},
    async () => {
      const result = await getConfig();
      
      if (!result.success) {
        return formatErrorResponse(`Failed to get Home Assistant config: ${result.message}`);
      }
      
      const version = result.data?.version || "unknown";
      return formatSuccessResponse(`Home Assistant version: ${version}`);
    }
  );

  // Tool to call any Home Assistant service (low-level API access)
  server.tool(
    "homeassistant_call_service",
    "Call any Home Assistant service (low-level API access)",
    {
      domain: z.string().describe("The service domain (e.g., 'light', 'switch', 'homeassistant')"),
      service: z.string().describe("The service name (e.g., 'turn_on', 'turn_off', 'restart')"),
      data: z.record(z.any()).optional().describe("Optional service data/parameters")
    },
    async ({ domain, service, data = {} }: {
      domain: string;
      service: string;
      data?: Record<string, any>;
    }) => {
      console.error(`Calling Home Assistant service: ${domain}.${service} with data: ${JSON.stringify(data)}`);
      
      const result = await callHomeAssistantService(domain, service, data);
      
      if (!result.success) {
        return formatErrorResponse(`Failed to call service: ${result.message}`);
      }
      
      return formatSuccessResponse(`Successfully called service ${domain}.${service}`);
    }
  );
}