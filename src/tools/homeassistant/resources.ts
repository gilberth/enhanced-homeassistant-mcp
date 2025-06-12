import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  getAllStates,
  getHomeAssistantState,
  makeGetRequest,
  formatErrorResponse,
  formatSuccessResponse
} from "../../utils/api.js";

// Domain-specific important attributes for lean responses
const DOMAIN_IMPORTANT_ATTRIBUTES: { [key: string]: string[] } = {
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
  "script": ["last_triggered"]
};

/**
 * Filter entity data to only include requested fields
 */
function filterFields(data: any, fields: string[]): any {
  if (!fields || fields.length === 0) {
    return data;
  }

  const result: any = { entity_id: data.entity_id };

  for (const field of fields) {
    if (field === "state") {
      result.state = data.state;
    } else if (field === "attributes") {
      result.attributes = data.attributes || {};
    } else if (field.startsWith("attr.") && field.length > 5) {
      const attrName = field.substring(5);
      const attributes = data.attributes || {};
      if (attrName in attributes) {
        if (!result.attributes) {
          result.attributes = {};
        }
        result.attributes[attrName] = attributes[attrName];
      }
    } else if (field === "context") {
      if (data.context) {
        result.context = data.context;
      }
    } else if (["last_updated", "last_changed"].includes(field)) {
      if (data[field]) {
        result[field] = data[field];
      }
    }
  }

  return result;
}

/**
 * Get lean fields for a specific domain
 */
function getLeanFields(domain: string): string[] {
  const leanFields = ["entity_id", "state", "attr.friendly_name"];
  
  if (DOMAIN_IMPORTANT_ATTRIBUTES[domain]) {
    for (const attr of DOMAIN_IMPORTANT_ATTRIBUTES[domain]) {
      leanFields.push(`attr.${attr}`);
    }
  }
  
  return leanFields;
}

/**
 * Register MCP resources for Home Assistant data
 */
export function registerResources(server: McpServer) {
  // Resource for individual entity information
  server.resource(
    "hass://entities/{entity_id}",
    "Get the state of a Home Assistant entity as a resource",
    async ({ entity_id }) => {
      const result = await getHomeAssistantState(entity_id);
      
      if (!result.success) {
        return {
          contents: [{
            type: "text",
            text: `# Entity: ${entity_id}\n\nError retrieving entity: ${result.message}`
          }]
        };
      }

      const entity = result.data;
      const domain = entity_id.split('.')[0];
      
      // Apply lean filtering
      const leanFields = getLeanFields(domain);
      const filteredEntity = filterFields(entity, leanFields);
      
      let content = `# Entity: ${entity_id}\n\n`;
      
      // Get friendly name if available
      const friendlyName = filteredEntity.attributes?.friendly_name;
      if (friendlyName && friendlyName !== entity_id) {
        content += `**Name**: ${friendlyName}\n\n`;
      }
      
      // Add state
      content += `**State**: ${filteredEntity.state}\n\n`;
      
      // Add domain info
      content += `**Domain**: ${domain}\n\n`;
      
      // Add key attributes
      if (filteredEntity.attributes && Object.keys(filteredEntity.attributes).length > 0) {
        content += "## Key Attributes\n\n";
        
        Object.entries(filteredEntity.attributes).forEach(([key, value]) => {
          if (key !== 'friendly_name') {
            if (typeof value === 'object' && value !== null) {
              content += `- **${key}**: *[Complex data]*\n`;
            } else {
              content += `- **${key}**: ${value}\n`;
            }
          }
        });
        content += "\n";
      }
      
      // Add last updated time if available
      if (entity.last_updated) {
        content += `**Last Updated**: ${entity.last_updated}\n`;
      }
      
      return {
        contents: [{
          type: "text",
          text: content
        }]
      };
    }
  );

  // Resource for detailed entity information
  server.resource(
    "hass://entities/{entity_id}/detailed",
    "Get detailed information about a Home Assistant entity with all attributes",
    async ({ entity_id }) => {
      const result = await getHomeAssistantState(entity_id);
      
      if (!result.success) {
        return {
          contents: [{
            type: "text",
            text: `# Entity: ${entity_id} (Detailed)\n\nError retrieving entity: ${result.message}`
          }]
        };
      }

      const entity = result.data;
      const domain = entity_id.split('.')[0];
      
      let content = `# Entity: ${entity_id} (Detailed)\n\n`;
      
      // Get friendly name if available
      const friendlyName = entity.attributes?.friendly_name;
      if (friendlyName && friendlyName !== entity_id) {
        content += `**Name**: ${friendlyName}\n\n`;
      }
      
      // Add state
      content += `**State**: ${entity.state}\n\n`;
      
      // Add domain info
      content += `**Domain**: ${domain}\n\n`;
      
      // Add all attributes
      if (entity.attributes && Object.keys(entity.attributes).length > 0) {
        content += "## All Attributes\n\n";
        
        // Sort attributes for better organization
        const sortedAttrs = Object.entries(entity.attributes).sort(([a], [b]) => a.localeCompare(b));
        
        sortedAttrs.forEach(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            content += `- **${key}**:\n\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\`\n`;
          } else {
            content += `- **${key}**: ${value}\n`;
          }
        });
        content += "\n";
      }
      
      // Add context data section
      content += "## Context Data\n\n";
      
      if (entity.last_updated) {
        content += `**Last Updated**: ${entity.last_updated}\n`;
      }
      
      if (entity.last_changed) {
        content += `**Last Changed**: ${entity.last_changed}\n`;
      }
      
      if (entity.context) {
        content += `**Context ID**: ${entity.context.id}\n`;
        if (entity.context.user_id) {
          content += `**User ID**: ${entity.context.user_id}\n`;
        }
      }
      
      return {
        contents: [{
          type: "text",
          text: content
        }]
      };
    }
  );

  // Resource for all entities
  server.resource(
    "hass://entities",
    "Get a list of all Home Assistant entities grouped by domain",
    async () => {
      const result = await getAllStates();
      
      if (!result.success) {
        return {
          contents: [{
            type: "text",
            text: `Error retrieving entities: ${result.message}`
          }]
        };
      }

      const entities = result.data;
      
      let content = "# Home Assistant Entities\n\n";
      content += `Total entities: ${entities.length}\n\n`;
      content += "⚠️ **Note**: For better performance and token efficiency, consider using:\n";
      content += "- Domain filtering: `hass://entities/domain/{domain}`\n";
      content += "- Entity search: `hass://search/{query}`\n\n";
      
      // Group entities by domain
      const domains: { [key: string]: any[] } = {};
      entities.forEach((entity: any) => {
        const domain = entity.entity_id.split('.')[0];
        if (!domains[domain]) {
          domains[domain] = [];
        }
        domains[domain].push(entity);
      });
      
      // Build the string with entities grouped by domain
      Object.keys(domains).sort().forEach(domain => {
        const domainEntities = domains[domain];
        content += `## ${domain.charAt(0).toUpperCase() + domain.slice(1)} (${domainEntities.length})\n\n`;
        
        domainEntities.sort((a, b) => a.entity_id.localeCompare(b.entity_id)).forEach(entity => {
          const friendlyName = entity.attributes?.friendly_name;
          content += `- **${entity.entity_id}**: ${entity.state}`;
          if (friendlyName && friendlyName !== entity.entity_id) {
            content += ` (${friendlyName})`;
          }
          content += "\n";
        });
        content += "\n";
      });
      
      return {
        contents: [{
          type: "text",
          text: content
        }]
      };
    }
  );

  // Resource for domain-specific entities
  server.resource(
    "hass://entities/domain/{domain}",
    "Get a list of entities for a specific domain",
    async ({ domain }) => {
      const result = await getAllStates();
      
      if (!result.success) {
        return {
          contents: [{
            type: "text",
            text: `Error retrieving entities: ${result.message}`
          }]
        };
      }

      const allEntities = result.data;
      const entities = allEntities.filter((entity: any) => 
        entity.entity_id.startsWith(`${domain}.`)
      );
      
      if (entities.length === 0) {
        return {
          contents: [{
            type: "text",
            text: `# ${domain.charAt(0).toUpperCase() + domain.slice(1)} Entities\n\nNo entities found for domain: ${domain}`
          }]
        };
      }
      
      // Apply lean filtering
      const leanFields = getLeanFields(domain);
      const filteredEntities = entities.map((entity: any) => filterFields(entity, leanFields));
      
      let content = `# ${domain.charAt(0).toUpperCase() + domain.slice(1)} Entities\n\n`;
      content += `Found ${entities.length} entities:\n\n`;
      
      filteredEntities.sort((a, b) => a.entity_id.localeCompare(b.entity_id)).forEach(entity => {
        const friendlyName = entity.attributes?.friendly_name;
        content += `- **${entity.entity_id}**: ${entity.state}`;
        if (friendlyName && friendlyName !== entity.entity_id) {
          content += ` (${friendlyName})`;
        }
        content += "\n";
      });
      
      content += `\n## Related Resources\n\n`;
      content += `- [View domain summary](hass://domain/${domain}/summary)\n`;
      
      return {
        contents: [{
          type: "text",
          text: content
        }]
      };
    }
  );

  // Resource for entity search
  server.resource(
    "hass://search/{query}",
    "Search for entities matching a query string",
    async ({ query }) => {
      if (!query || query.trim() === '') {
        return {
          contents: [{
            type: "text",
            text: "# Entity Search\n\nError: No search query provided"
          }]
        };
      }

      const result = await getAllStates();
      
      if (!result.success) {
        return {
          contents: [{
            type: "text",
            text: `Error retrieving entities: ${result.message}`
          }]
        };
      }

      const allEntities = result.data;
      const searchTerm = query.toLowerCase();
      
      // Search entities
      const matchingEntities = allEntities.filter((entity: any) => {
        const entityIdMatch = entity.entity_id.toLowerCase().includes(searchTerm);
        const nameMatch = entity.attributes?.friendly_name?.toLowerCase().includes(searchTerm);
        const stateMatch = entity.state?.toLowerCase().includes(searchTerm);
        
        return entityIdMatch || nameMatch || stateMatch;
      });
      
      if (matchingEntities.length === 0) {
        return {
          contents: [{
            type: "text",
            text: `# Entity Search Results for '${query}'\n\nNo entities found matching "${query}"`
          }]
        };
      }
      
      // Apply lean filtering and group by domain
      const domains: { [key: string]: any[] } = {};
      matchingEntities.forEach((entity: any) => {
        const domain = entity.entity_id.split('.')[0];
        const leanFields = getLeanFields(domain);
        const filteredEntity = filterFields(entity, leanFields);
        
        if (!domains[domain]) {
          domains[domain] = [];
        }
        domains[domain].push(filteredEntity);
      });
      
      let content = `# Entity Search Results for '${query}'\n\n`;
      content += `Found ${matchingEntities.length} matching entities:\n\n`;
      
      // Build results grouped by domain
      Object.keys(domains).sort().forEach(domain => {
        const domainEntities = domains[domain];
        content += `## ${domain.charAt(0).toUpperCase() + domain.slice(1)} (${domainEntities.length})\n\n`;
        
        domainEntities.sort((a, b) => a.entity_id.localeCompare(b.entity_id)).forEach(entity => {
          const friendlyName = entity.attributes?.friendly_name;
          content += `- **${entity.entity_id}**: ${entity.state}`;
          if (friendlyName && friendlyName !== entity.entity_id) {
            content += ` (${friendlyName})`;
          }
          content += "\n";
        });
        content += "\n";
      });
      
      return {
        contents: [{
          type: "text",
          text: content
        }]
      };
    }
  );

  // Resource for domain summary
  server.resource(
    "hass://domain/{domain}/summary",
    "Get a summary of entities in a domain",
    async ({ domain }) => {
      const result = await getAllStates();
      
      if (!result.success) {
        return {
          contents: [{
            type: "text",
            text: `Error retrieving entities: ${result.message}`
          }]
        };
      }

      const allEntities = result.data;
      const entities = allEntities.filter((entity: any) => 
        entity.entity_id.startsWith(`${domain}.`)
      );
      
      if (entities.length === 0) {
        return {
          contents: [{
            type: "text",
            text: `# ${domain.charAt(0).toUpperCase() + domain.slice(1)} Domain Summary\n\nNo entities found for domain: ${domain}`
          }]
        };
      }
      
      // Generate summary statistics
      const totalCount = entities.length;
      const stateCounts: { [key: string]: number } = {};
      const stateExamples: { [key: string]: any[] } = {};
      const attributesSummary: { [key: string]: number } = {};
      
      entities.forEach(entity => {
        const state = entity.state || 'unknown';
        
        // Count states
        if (!stateCounts[state]) {
          stateCounts[state] = 0;
          stateExamples[state] = [];
        }
        stateCounts[state]++;
        
        // Add examples (up to 3 per state)
        if (stateExamples[state].length < 3) {
          stateExamples[state].push({
            entity_id: entity.entity_id,
            friendly_name: entity.attributes?.friendly_name || entity.entity_id
          });
        }
        
        // Collect attribute keys for summary
        Object.keys(entity.attributes || {}).forEach(attrKey => {
          if (!attributesSummary[attrKey]) {
            attributesSummary[attrKey] = 0;
          }
          attributesSummary[attrKey]++;
        });
      });
      
      let content = `# ${domain.charAt(0).toUpperCase() + domain.slice(1)} Domain Summary\n\n`;
      content += `**Total Entities**: ${totalCount}\n\n`;
      
      // State distribution
      content += "## State Distribution\n\n";
      Object.entries(stateCounts).sort(([,a], [,b]) => b - a).forEach(([state, count]) => {
        content += `- **${state}**: ${count} entities\n`;
        
        // Show examples
        const examples = stateExamples[state];
        if (examples.length > 0) {
          examples.forEach(example => {
            content += `  - ${example.entity_id}`;
            if (example.friendly_name !== example.entity_id) {
              content += ` (${example.friendly_name})`;
            }
            content += "\n";
          });
        }
        content += "\n";
      });
      
      // Common attributes
      const commonAttributes = Object.entries(attributesSummary)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);
      
      if (commonAttributes.length > 0) {
        content += "## Common Attributes\n\n";
        commonAttributes.forEach(([attr, count]) => {
          const percentage = Math.round((count / totalCount) * 100);
          content += `- **${attr}**: ${count}/${totalCount} entities (${percentage}%)\n`;
        });
      }
      
      return {
        contents: [{
          type: "text",
          text: content
        }]
      };
    }
  );
}