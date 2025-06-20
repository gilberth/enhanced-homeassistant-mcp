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
    "Get a list of Home Assistant entities with advanced filtering and search capabilities",
    {
      domain: z.string().optional().describe("Optional: Filter by domain (e.g., 'light', 'sensor', 'switch')"),
      search_query: z.string().optional().describe("Optional: Search term to filter by entity_id, friendly_name or other attributes"),
      limit: z.number().optional().default(100).describe("Maximum number of entities to return (default: 100)"),
      fields: z.array(z.string()).optional().describe("Optional: Specific fields to include for each entity"),
      detailed: z.boolean().optional().default(false).describe("If true, returns full entity data. If false, returns lean format for token efficiency"),
      state_filter: z.string().optional().describe("Filter by entity state (e.g., 'on', 'off', 'unavailable')"),
      area_filter: z.string().optional().describe("Filter by area name"),
      device_class_filter: z.string().optional().describe("Filter by device class"),
      has_attributes: z.array(z.string()).optional().describe("Filter entities that have specific attributes"),
      attribute_filters: z.record(z.any()).optional().describe("Filter by specific attribute values (e.g., {'brightness': 255})"),
      sort_by: z.enum(["entity_id", "friendly_name", "state", "last_updated", "domain"]).optional().describe("Sort results by field"),
      sort_order: z.enum(["asc", "desc"]).optional().default("asc").describe("Sort order")
    },
    async ({ domain, search_query, limit = 100, fields, detailed = false, state_filter, area_filter, device_class_filter, has_attributes, attribute_filters, sort_by, sort_order = "asc" }: {
      domain?: string;
      search_query?: string;
      limit?: number;
      fields?: string[];
      detailed?: boolean;
      state_filter?: string;
      area_filter?: string;
      device_class_filter?: string;
      has_attributes?: string[];
      attribute_filters?: Record<string, any>;
      sort_by?: "entity_id" | "friendly_name" | "state" | "last_updated" | "domain";
      sort_order?: "asc" | "desc";
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

      // Apply advanced filters
      if (state_filter) {
        entities = entities.filter((entity: any) => 
          entity.state?.toLowerCase() === state_filter.toLowerCase()
        );
      }

      if (area_filter) {
        entities = entities.filter((entity: any) => 
          entity.attributes?.area?.toLowerCase() === area_filter.toLowerCase() ||
          entity.attributes?.area_id?.toLowerCase() === area_filter.toLowerCase()
        );
      }

      if (device_class_filter) {
        entities = entities.filter((entity: any) => 
          entity.attributes?.device_class?.toLowerCase() === device_class_filter.toLowerCase()
        );
      }

      if (has_attributes && has_attributes.length > 0) {
        entities = entities.filter((entity: any) => 
          has_attributes.every(attr => entity.attributes?.[attr] !== undefined)
        );
      }

      if (attribute_filters && Object.keys(attribute_filters).length > 0) {
        entities = entities.filter((entity: any) => {
          return Object.entries(attribute_filters).every(([key, value]) => {
            const entityValue = entity.attributes?.[key];
            if (typeof value === 'string' && typeof entityValue === 'string') {
              return entityValue.toLowerCase().includes(value.toLowerCase());
            }
            return entityValue === value;
          });
        });
      }

      // Apply sorting
      if (sort_by) {
        entities.sort((a: any, b: any) => {
          let aValue: any, bValue: any;
          
          switch (sort_by) {
            case 'entity_id':
              aValue = a.entity_id;
              bValue = b.entity_id;
              break;
            case 'friendly_name':
              aValue = a.attributes?.friendly_name || a.entity_id;
              bValue = b.attributes?.friendly_name || b.entity_id;
              break;
            case 'state':
              aValue = a.state || '';
              bValue = b.state || '';
              break;
            case 'last_updated':
              aValue = new Date(a.last_updated || 0);
              bValue = new Date(b.last_updated || 0);
              break;
            case 'domain':
              aValue = a.entity_id.split('.')[0];
              bValue = b.entity_id.split('.')[0];
              break;
            default:
              aValue = a.entity_id;
              bValue = b.entity_id;
          }

          if (typeof aValue === 'string' && typeof bValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
          }

          let comparison = 0;
          if (aValue < bValue) comparison = -1;
          else if (aValue > bValue) comparison = 1;

          return sort_order === 'desc' ? -comparison : comparison;
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

  // Tool for bulk operations on multiple entities
  server.tool(
    "homeassistant_bulk_operations",
    "Perform bulk operations on multiple entities simultaneously",
    {
      entity_ids: z.array(z.string()).describe("Array of entity IDs to operate on"),
      action: z.enum(["on", "off", "toggle"]).describe("The action to perform on all entities"),
      service_data: z.record(z.any()).optional().describe("Optional service data to apply to all entities"),
      parallel: z.boolean().optional().default(true).describe("If true, executes operations in parallel. If false, executes sequentially")
    },
    async ({ entity_ids, action, service_data = {}, parallel = true }: {
      entity_ids: string[];
      action: 'on' | 'off' | 'toggle';
      service_data?: Record<string, any>;
      parallel?: boolean;
    }) => {
      if (entity_ids.length === 0) {
        return formatErrorResponse("No entity IDs provided");
      }

      if (entity_ids.length > 50) {
        return formatErrorResponse("Too many entities (max 50 allowed for bulk operations)");
      }

      const results: Array<{entity_id: string, success: boolean, message: string}> = [];
      
      const performOperation = async (entity_id: string) => {
        try {
          const domain = entity_id.split(".")[0];
          const service = action === "toggle" ? "toggle" : `turn_${action}`;
          
          const data = { entity_id, ...service_data };
          
          const result = await callHomeAssistantService(domain, service, data);
          
          return {
            entity_id,
            success: result.success,
            message: result.success ? "Success" : result.message
          };
        } catch (error) {
          return {
            entity_id,
            success: false,
            message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          };
        }
      };

      if (parallel) {
        const promises = entity_ids.map(performOperation);
        results.push(...await Promise.all(promises));
      } else {
        for (const entity_id of entity_ids) {
          const result = await performOperation(entity_id);
          results.push(result);
        }
      }

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      let summary = `Bulk operation completed: ${successful} successful, ${failed} failed\n\n`;
      
      if (failed > 0) {
        summary += "Failed operations:\n";
        results.filter(r => !r.success).forEach(r => {
          summary += `  - ${r.entity_id}: ${r.message}\n`;
        });
      }

      if (successful > 0) {
        summary += `\nSuccessful operations:\n`;
        results.filter(r => r.success).forEach(r => {
          summary += `  - ${r.entity_id}: ${action}\n`;
        });
      }

      return formatSuccessResponse(summary);
    }
  );

  // Tool to manage entity favorites/bookmarks
  server.tool(
    "homeassistant_manage_favorites",
    "Manage entity favorites/bookmarks for quick access",
    {
      operation: z.enum(["add", "remove", "list", "clear"]).describe("Operation to perform"),
      entity_id: z.string().optional().describe("Entity ID (required for add/remove operations)"),
      alias: z.string().optional().describe("Optional alias/nickname for the favorite")
    },
    async ({ operation, entity_id, alias }: {
      operation: 'add' | 'remove' | 'list' | 'clear';
      entity_id?: string;
      alias?: string;
    }) => {
      // Simple in-memory storage (in production, this would be persisted)
      if (!global.hasOwnProperty('haFavorites')) {
        (global as any).haFavorites = new Map<string, {entity_id: string, alias?: string, added_at: string}>();
      }
      
      const favorites = (global as any).haFavorites as Map<string, {entity_id: string, alias?: string, added_at: string}>;

      switch (operation) {
        case 'add':
          if (!entity_id) {
            return formatErrorResponse("entity_id is required for add operation");
          }
          
          // Verify entity exists
          const entityResult = await getHomeAssistantState(entity_id);
          if (!entityResult.success) {
            return formatErrorResponse(`Entity ${entity_id} not found or inaccessible`);
          }

          favorites.set(entity_id, {
            entity_id,
            alias,
            added_at: new Date().toISOString()
          });
          
          return formatSuccessResponse(`Added ${entity_id} to favorites${alias ? ` with alias "${alias}"` : ''}`);

        case 'remove':
          if (!entity_id) {
            return formatErrorResponse("entity_id is required for remove operation");
          }
          
          if (favorites.has(entity_id)) {
            favorites.delete(entity_id);
            return formatSuccessResponse(`Removed ${entity_id} from favorites`);
          } else {
            return formatErrorResponse(`${entity_id} is not in favorites`);
          }

        case 'list':
          if (favorites.size === 0) {
            return formatSuccessResponse("No favorites saved");
          }

          let favoritesList = `Favorite entities (${favorites.size}):\n\n`;
          
          for (const [entityId, info] of favorites.entries()) {
            try {
              const stateResult = await getHomeAssistantState(entityId);
              const state = stateResult.success ? stateResult.data.state : 'unknown';
              const friendlyName = stateResult.success ? stateResult.data.attributes?.friendly_name : 'Unknown';
              
              favoritesList += `• ${entityId}\n`;
              favoritesList += `  Name: ${friendlyName}\n`;
              favoritesList += `  State: ${state}\n`;
              if (info.alias) {
                favoritesList += `  Alias: ${info.alias}\n`;
              }
              favoritesList += `  Added: ${new Date(info.added_at).toLocaleDateString()}\n\n`;
            } catch (error) {
              favoritesList += `• ${entityId} (Error retrieving current state)\n\n`;
            }
          }

          return formatSuccessResponse(favoritesList);

        case 'clear':
          const count = favorites.size;
          favorites.clear();
          return formatSuccessResponse(`Cleared ${count} favorites`);

        default:
          return formatErrorResponse("Invalid operation");
      }
    }
  );

  // Tool for quick actions on favorite entities
  server.tool(
    "homeassistant_favorite_actions",
    "Perform quick actions on favorite entities",
    {
      action: z.enum(["status", "toggle_all", "turn_on_all", "turn_off_all", "list_by_domain"]).describe("Action to perform on favorites"),
      domain: z.string().optional().describe("Filter by domain for list_by_domain action")
    },
    async ({ action, domain }: {
      action: 'status' | 'toggle_all' | 'turn_on_all' | 'turn_off_all' | 'list_by_domain';
      domain?: string;
    }) => {
      if (!global.hasOwnProperty('haFavorites')) {
        return formatErrorResponse("No favorites saved");
      }
      
      const favorites = (global as any).haFavorites as Map<string, {entity_id: string, alias?: string, added_at: string}>;
      
      if (favorites.size === 0) {
        return formatErrorResponse("No favorites saved");
      }

      const favoriteEntities = Array.from(favorites.keys());

      switch (action) {
        case 'status':
          let statusReport = `Favorite entities status (${favoriteEntities.length}):\n\n`;
          
          for (const entityId of favoriteEntities) {
            try {
              const result = await getHomeAssistantState(entityId);
              if (result.success) {
                const entity = result.data;
                statusReport += `• ${entityId}: ${entity.state}\n`;
                statusReport += `  ${entity.attributes?.friendly_name || 'Unknown'}\n\n`;
              } else {
                statusReport += `• ${entityId}: Error - ${result.message}\n\n`;
              }
            } catch (error) {
              statusReport += `• ${entityId}: Error retrieving state\n\n`;
            }
          }
          
          return formatSuccessResponse(statusReport);

        case 'toggle_all':
        case 'turn_on_all':
        case 'turn_off_all':
          const bulkAction = action === 'toggle_all' ? 'toggle' : 
                           action === 'turn_on_all' ? 'on' : 'off';
          
          // Use the bulk operations function
          const results: Array<{entity_id: string, success: boolean, message: string}> = [];
          
          for (const entity_id of favoriteEntities) {
            try {
              const entityDomain = entity_id.split(".")[0];
              const service = bulkAction === "toggle" ? "toggle" : `turn_${bulkAction}`;
              
              const result = await callHomeAssistantService(entityDomain, service, { entity_id });
              
              results.push({
                entity_id,
                success: result.success,
                message: result.success ? "Success" : result.message
              });
            } catch (error) {
              results.push({
                entity_id,
                success: false,
                message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
              });
            }
          }

          const successful = results.filter(r => r.success).length;
          const failed = results.filter(r => !r.success).length;

          let summary = `Bulk action "${bulkAction}" on favorites: ${successful} successful, ${failed} failed\n\n`;
          
          if (failed > 0) {
            summary += "Failed operations:\n";
            results.filter(r => !r.success).forEach(r => {
              summary += `  - ${r.entity_id}: ${r.message}\n`;
            });
          }

          return formatSuccessResponse(summary);

        case 'list_by_domain':
          const entitiesByDomain: { [key: string]: string[] } = {};
          
          favoriteEntities.forEach(entityId => {
            const entityDomain = entityId.split('.')[0];
            if (!domain || entityDomain === domain) {
              if (!entitiesByDomain[entityDomain]) {
                entitiesByDomain[entityDomain] = [];
              }
              entitiesByDomain[entityDomain].push(entityId);
            }
          });

          if (Object.keys(entitiesByDomain).length === 0) {
            return formatSuccessResponse(domain ? 
              `No favorite entities found for domain: ${domain}` : 
              "No favorite entities found");
          }

          let domainList = domain ? 
            `Favorite entities in domain "${domain}":\n\n` : 
            "Favorite entities by domain:\n\n";

          Object.entries(entitiesByDomain).forEach(([domainName, entities]) => {
            domainList += `${domainName.toUpperCase()} (${entities.length}):\n`;
            entities.forEach(entityId => {
              const info = favorites.get(entityId);
              domainList += `  • ${entityId}${info?.alias ? ` (${info.alias})` : ''}\n`;
            });
            domainList += '\n';
          });

          return formatSuccessResponse(domainList);

        default:
          return formatErrorResponse("Invalid action");
      }
    }
  );

  // Tool for advanced configuration validation
  server.tool(
    "homeassistant_validate_config",
    "Validate Home Assistant configuration files and check for errors",
    {
      check_type: z.enum(["all", "config", "automations", "scripts", "scenes"]).optional().default("all").describe("Type of validation to perform"),
      detailed: z.boolean().optional().default(false).describe("Return detailed validation results")
    },
    async ({ check_type = "all", detailed = false }: {
      check_type?: "all" | "config" | "automations" | "scripts" | "scenes";
      detailed?: boolean;
    }) => {
      try {
        // Call the config check service
        const result = await callHomeAssistantService("homeassistant", "check_config", {});
        
        if (!result.success) {
          return formatErrorResponse(`Failed to validate configuration: ${result.message}`);
        }

        // Get configuration info
        const configResult = await getConfig();
        if (!configResult.success) {
          return formatErrorResponse(`Failed to get configuration: ${configResult.message}`);
        }

        const config = configResult.data;
        
        let validationReport = "Configuration Validation Results:\n\n";
        
        // Basic configuration info
        validationReport += `Home Assistant Version: ${config.version}\n`;
        validationReport += `Configuration Source: ${config.config_source || 'Unknown'}\n`;
        validationReport += `Safe Mode: ${config.safe_mode ? 'Yes' : 'No'}\n`;
        validationReport += `Unit System: ${config.unit_system?.name || 'Unknown'}\n`;
        validationReport += `Time Zone: ${config.time_zone || 'Unknown'}\n\n`;

        // Check for common configuration issues
        const issues: string[] = [];
        
        if (config.safe_mode) {
          issues.push("Home Assistant is running in Safe Mode - some integrations may be disabled");
        }

        if (!config.external_url && !config.internal_url) {
          issues.push("No external or internal URL configured - may affect certain integrations");
        }

        // Component and integration info
        if (detailed) {
          validationReport += "Configuration Components:\n";
          if (config.components && Array.isArray(config.components)) {
            const componentGroups: { [key: string]: string[] } = {};
            
            config.components.forEach((component: string) => {
              const category = component.includes('.') ? component.split('.')[0] : 'core';
              if (!componentGroups[category]) {
                componentGroups[category] = [];
              }
              componentGroups[category].push(component);
            });

            Object.entries(componentGroups).forEach(([category, components]) => {
              validationReport += `  ${category.toUpperCase()}: ${components.length} components\n`;
              if (components.length <= 10) {
                components.forEach(comp => {
                  validationReport += `    - ${comp}\n`;
                });
              } else {
                components.slice(0, 5).forEach(comp => {
                  validationReport += `    - ${comp}\n`;
                });
                validationReport += `    ... and ${components.length - 5} more\n`;
              }
            });
          }
          validationReport += "\n";
        }

        // Validation summary
        if (issues.length > 0) {
          validationReport += "⚠️  Configuration Issues Found:\n";
          issues.forEach(issue => {
            validationReport += `  - ${issue}\n`;
          });
        } else {
          validationReport += "✅ No major configuration issues detected\n";
        }

        validationReport += `\nTotal Components Loaded: ${config.components?.length || 0}\n`;
        validationReport += `Configuration Directory: ${config.config_dir || 'Unknown'}\n`;

        return formatSuccessResponse(validationReport);

      } catch (error) {
        return formatErrorResponse(`Configuration validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  );

  // Tool for system health dashboard
  server.tool(
    "homeassistant_system_health",
    "Get comprehensive system health and performance dashboard",
    {
      include_integrations: z.boolean().optional().default(false).describe("Include integration-specific health checks"),
      detailed: z.boolean().optional().default(false).describe("Return detailed health information")
    },
    async ({ include_integrations = false, detailed = false }: {
      include_integrations?: boolean;
      detailed?: boolean;
    }) => {
      try {
        // Get system info and configuration
        const [configResult, apiResult] = await Promise.all([
          getConfig(),
          getHomeAssistantApi()
        ]);

        if (!configResult.success) {
          return formatErrorResponse(`Failed to get configuration: ${configResult.message}`);
        }

        if (!apiResult.success) {
          return formatErrorResponse(`Failed to get API status: ${apiResult.message}`);
        }

        const config = configResult.data;
        let healthReport = "🏠 Home Assistant System Health Dashboard\n";
        healthReport += "=" .repeat(50) + "\n\n";

        // System Status
        healthReport += "📊 SYSTEM STATUS\n";
        healthReport += `-`.repeat(20) + "\n";
        healthReport += `Status: ✅ Online\n`;
        healthReport += `Version: ${config.version}\n`;
        healthReport += `Safe Mode: ${config.safe_mode ? '⚠️  Yes' : '✅ No'}\n`;
        healthReport += `Config Source: ${config.config_source || 'Unknown'}\n`;
        healthReport += `Installation Type: ${config.installation_type || 'Unknown'}\n\n`;

        // Configuration Health
        healthReport += "⚙️  CONFIGURATION\n";
        healthReport += `-`.repeat(20) + "\n";
        healthReport += `Unit System: ${config.unit_system?.name || 'Unknown'}\n`;
        healthReport += `Time Zone: ${config.time_zone || 'Unknown'}\n`;
        healthReport += `Latitude: ${config.latitude !== undefined ? '✅ Set' : '⚠️  Not set'}\n`;
        healthReport += `Longitude: ${config.longitude !== undefined ? '✅ Set' : '⚠️  Not set'}\n`;
        healthReport += `External URL: ${config.external_url ? '✅ Set' : '⚠️  Not set'}\n`;
        healthReport += `Internal URL: ${config.internal_url ? '✅ Set' : '⚠️  Not set'}\n\n`;

        // Components and Integrations
        healthReport += "🔧 COMPONENTS & INTEGRATIONS\n";
        healthReport += `-`.repeat(30) + "\n";
        const totalComponents = config.components?.length || 0;
        healthReport += `Total Components: ${totalComponents}\n`;

        if (config.components && Array.isArray(config.components)) {
          // Group components by category
          const coreComponents = config.components.filter((c: string) => !c.includes('.')).length;
          const integrations = config.components.filter((c: string) => c.includes('.')).length;
          
          healthReport += `Core Components: ${coreComponents}\n`;
          healthReport += `Integrations: ${integrations}\n`;

          if (detailed) {
            // Show top domains
            const domains: { [key: string]: number } = {};
            config.components.forEach((component: string) => {
              const domain = component.includes('.') ? component.split('.')[0] : 'core';
              domains[domain] = (domains[domain] || 0) + 1;
            });

            const topDomains = Object.entries(domains)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 10);

            healthReport += `\nTop Integration Domains:\n`;
            topDomains.forEach(([domain, count]) => {
              healthReport += `  ${domain}: ${count} components\n`;
            });
          }
        }

        // Get entity counts by domain
        try {
          const statesResult = await getAllStates();
          if (statesResult.success) {
            const entities = statesResult.data;
            const entityDomains: { [key: string]: number } = {};
            
            entities.forEach((entity: any) => {
              const domain = entity.entity_id.split('.')[0];
              entityDomains[domain] = (entityDomains[domain] || 0) + 1;
            });

            healthReport += `\n📱 ENTITIES\n`;
            healthReport += `-`.repeat(12) + "\n";
            healthReport += `Total Entities: ${entities.length}\n`;
            healthReport += `Active Domains: ${Object.keys(entityDomains).length}\n`;

            if (detailed) {
              const topEntityDomains = Object.entries(entityDomains)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 8);

              healthReport += `\nEntities by Domain:\n`;
              topEntityDomains.forEach(([domain, count]) => {
                healthReport += `  ${domain}: ${count} entities\n`;
              });

              // Check for common issues
              const unavailableEntities = entities.filter((e: any) => e.state === 'unavailable').length;
              const unknownEntities = entities.filter((e: any) => e.state === 'unknown').length;
              
              if (unavailableEntities > 0 || unknownEntities > 0) {
                healthReport += `\n⚠️  Entity Issues:\n`;
                if (unavailableEntities > 0) {
                  healthReport += `  Unavailable entities: ${unavailableEntities}\n`;
                }
                if (unknownEntities > 0) {
                  healthReport += `  Unknown state entities: ${unknownEntities}\n`;
                }
              }
            }
          }
        } catch (error) {
          healthReport += `\n⚠️  Could not retrieve entity statistics\n`;
        }

        // Overall Health Score
        let healthScore = 100;
        const issues: string[] = [];

        if (config.safe_mode) {
          healthScore -= 20;
          issues.push("Running in Safe Mode");
        }

        if (!config.external_url && !config.internal_url) {
          healthScore -= 10;
          issues.push("No URLs configured");
        }

        if (config.latitude === undefined || config.longitude === undefined) {
          healthScore -= 5;
          issues.push("Location not configured");
        }

        healthReport += `\n🎯 OVERALL HEALTH SCORE\n`;
        healthReport += `-`.repeat(25) + "\n";
        
        let scoreEmoji = "🟢";
        if (healthScore < 70) scoreEmoji = "🔴";
        else if (healthScore < 85) scoreEmoji = "🟡";

        healthReport += `Score: ${scoreEmoji} ${healthScore}/100\n`;

        if (issues.length > 0) {
          healthReport += `\nIssues to Address:\n`;
          issues.forEach(issue => {
            healthReport += `  • ${issue}\n`;
          });
        } else {
          healthReport += `Status: Excellent! No issues detected.\n`;
        }

        return formatSuccessResponse(healthReport);

      } catch (error) {
        return formatErrorResponse(`System health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  );
}