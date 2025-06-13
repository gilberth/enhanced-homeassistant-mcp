import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  getAllStates,
  getHomeAssistantState,
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
 * Register resource-related tools for Home Assistant
 */
export function registerResourceTools(server: McpServer) {
  // Tool to get specific resource by URI
  server.tool(
    "homeassistant_get_resource",
    "Get a specific Home Assistant resource by URI",
    {
      uri: z.string().describe("The resource URI (e.g., 'hass://entities/light.living_room', 'hass://entities/domain/light')")
    },
    async ({ uri }: { uri: string }) => {
      console.error(`Getting resource: ${uri}`);
      
      try {
        // Parse the URI to determine resource type
        const url = new URL(uri);
        const pathParts = url.pathname.split('/').filter(p => p);
        
        if (url.protocol !== 'hass:') {
          return formatErrorResponse(`Invalid protocol. Must use 'hass:' protocol`);
        }
        
        // Handle different resource types
        if (pathParts[0] === 'entities') {
          if (pathParts.length === 1) {
            // hass://entities - all entities overview
            return await handleAllEntitiesResource();
          } else if (pathParts.length === 2) {
            // hass://entities/{entity_id} - specific entity
            const entityId = pathParts[1];
            return await handleEntityResource(entityId, false);
          } else if (pathParts.length === 3 && pathParts[2] === 'detailed') {
            // hass://entities/{entity_id}/detailed - detailed entity view
            const entityId = pathParts[1];
            return await handleEntityResource(entityId, true);
          } else if (pathParts.length === 3 && pathParts[1] === 'domain') {
            // hass://entities/domain/{domain} - domain entities
            const domain = pathParts[2];
            return await handleDomainResource(domain);
          } else if (pathParts.length === 4 && pathParts[1] === 'domain' && pathParts[3] === 'summary') {
            // hass://entities/domain/{domain}/summary - domain summary
            const domain = pathParts[2];
            return await handleDomainSummaryResource(domain);
          }
        } else if (pathParts[0] === 'search') {
          if (pathParts.length >= 2) {
            // hass://search/{query}/{limit?} - entity search
            const query = decodeURIComponent(pathParts[1]);
            const limit = pathParts.length > 2 ? parseInt(pathParts[2]) || 20 : 20;
            return await handleSearchResource(query, limit);
          }
        }
        
        return formatErrorResponse(`Unknown resource URI pattern: ${uri}`);
        
      } catch (error: any) {
        return formatErrorResponse(`Error processing resource URI: ${error.message}`);
      }
    }
  );

  // Tool to list available resources
  server.tool(
    "homeassistant_list_resources",
    "List all available Home Assistant resources with their URIs",
    {},
    async () => {
      const resources = [
        {
          uri: "hass://entities",
          description: "All entities overview with domain grouping",
          note: "Large response - consider using domain-specific or search resources"
        },
        {
          uri: "hass://entities/{entity_id}",
          description: "Individual entity state and key attributes",
          example: "hass://entities/light.living_room"
        },
        {
          uri: "hass://entities/{entity_id}/detailed",
          description: "Complete entity information including all attributes",
          example: "hass://entities/light.living_room/detailed"
        },
        {
          uri: "hass://entities/domain/{domain}",
          description: "All entities in a specific domain",
          example: "hass://entities/domain/light"
        },
        {
          uri: "hass://entities/domain/{domain}/summary",
          description: "Statistical summary of entities in a domain",
          example: "hass://entities/domain/sensor/summary"
        },
        {
          uri: "hass://search/{query}/{limit}",
          description: "Search entities by ID, name, or state (limit optional, default 20)",
          example: "hass://search/living%20room/10"
        }
      ];
      
      let content = "# Available Home Assistant Resources\n\n";
      
      resources.forEach((resource, index) => {
        content += `## ${index + 1}. ${resource.uri}\n\n`;
        content += `**Description**: ${resource.description}\n\n`;
        
        if ((resource as any).example) {
          content += `**Example**: \`${(resource as any).example}\`\n\n`;
        }
        
        if ((resource as any).note) {
          content += `**Note**: ${(resource as any).note}\n\n`;
        }
      });
      
      content += "## Usage Tips\n\n";
      content += "- Use specific entity URIs for best performance\n";
      content += "- Domain resources are efficient for exploring entity types\n";
      content += "- Search resources support URL encoding for special characters\n";
      content += "- Detailed views provide complete information but use more tokens\n";
      
      return formatSuccessResponse(content);
    }
  );

  // Helper functions for resource handling
  async function handleAllEntitiesResource() {
    const result = await getAllStates();
    
    if (!result.success) {
      return formatErrorResponse(`Error retrieving entities: ${result.message}`);
    }
    
    const entities = result.data;
    
    let content = "# Home Assistant Entities Overview\n\n";
    content += `Total entities: ${entities.length}\n\n`;
    content += "⚠️ **Performance Note**: This is a complete entity list. For better performance, consider:\n";
    content += "- Domain filtering: `hass://entities/domain/{domain}`\n";
    content += "- Entity search: `hass://search/{query}`\n";
    content += "- Specific entities: `hass://entities/{entity_id}`\n\n";
    
    // Group entities by domain
    const domains: { [key: string]: any[] } = {};
    entities.forEach((entity: any) => {
      const domain = entity.entity_id.split('.')[0];
      if (!domains[domain]) {
        domains[domain] = [];
      }
      domains[domain].push(entity);
    });
    
    Object.entries(domains).sort(([a], [b]) => a.localeCompare(b)).forEach(([domain, domainEntities]) => {
      content += `## ${domain.toUpperCase()} (${domainEntities.length} entities)\n\n`;
      
      // Show first 5 entities of each domain
      domainEntities.slice(0, 5).forEach(entity => {
        const name = entity.attributes?.friendly_name || entity.entity_id;
        content += `- **${entity.entity_id}**: ${entity.state} (${name})\n`;
      });
      
      if (domainEntities.length > 5) {
        content += `- ... and ${domainEntities.length - 5} more ${domain} entities\n`;
        content += `- [View all ${domain} entities](hass://entities/domain/${domain})\n`;
      }
      content += "\n";
    });
    
    return formatSuccessResponse(content);
  }

  async function handleEntityResource(entityId: string, detailed: boolean) {
    const result = await getHomeAssistantState(entityId);
    
    if (!result.success) {
      return formatErrorResponse(`Error retrieving entity ${entityId}: ${result.message}`);
    }
    
    const entity = result.data;
    const domain = entityId.split(".")[0];
    
    let content = `# Entity: ${entityId}${detailed ? ' (Detailed)' : ''}\n\n`;
    
    const friendlyName = entity.attributes?.friendly_name;
    if (friendlyName && friendlyName !== entityId) {
      content += `**Name**: ${friendlyName}\n\n`;
    }
    
    content += `**State**: ${entity.state}\n`;
    content += `**Domain**: ${domain}\n\n`;
    
    if (detailed) {
      content += "## All Attributes\n\n";
      const attributes = entity.attributes || {};
      if (Object.keys(attributes).length > 0) {
        Object.entries(attributes).forEach(([key, value]) => {
          content += `- **${key}**: ${JSON.stringify(value)}\n`;
        });
      } else {
        content += "*No attributes available*\n";
      }
      
      content += "\n## Context Information\n\n";
      if (entity.last_updated) {
        content += `**Last Updated**: ${entity.last_updated}\n`;
      }
      if (entity.last_changed) {
        content += `**Last Changed**: ${entity.last_changed}\n`;
      }
    } else {
      content += "## Key Attributes\n\n";
      const attributes = entity.attributes || {};
      const importantAttrs = DOMAIN_IMPORTANT_ATTRIBUTES[domain] || [];
      
      let displayedAttrs = 0;
      for (const attrName of importantAttrs) {
        if (attributes[attrName] !== undefined) {
          content += `- **${attrName}**: ${JSON.stringify(attributes[attrName])}\n`;
          displayedAttrs++;
        }
      }
      
      if (displayedAttrs === 0) {
        content += "*No key attributes for this entity type*\n";
      }
      
      content += `\n[View detailed information](hass://entities/${entityId}/detailed)\n`;
    }
    
    return formatSuccessResponse(content);
  }

  async function handleDomainResource(domain: string) {
    const result = await getAllStates();
    
    if (!result.success) {
      return formatErrorResponse(`Error retrieving entities: ${result.message}`);
    }
    
    const allEntities = result.data;
    const entities = allEntities.filter((entity: any) => 
      entity.entity_id.startsWith(`${domain}.`)
    );
    
    if (entities.length === 0) {
      return formatErrorResponse(`No entities found for domain: ${domain}`);
    }
    
    let content = `# ${domain.charAt(0).toUpperCase() + domain.slice(1)} Domain Entities\n\n`;
    content += `Total entities: ${entities.length}\n\n`;
    
    entities.forEach((entity: any) => {
      const name = entity.attributes?.friendly_name || entity.entity_id;
      content += `## ${entity.entity_id}\n`;
      content += `- **Name**: ${name}\n`;
      content += `- **State**: ${entity.state}\n`;
      
      // Add important attributes for this domain
      const importantAttrs = DOMAIN_IMPORTANT_ATTRIBUTES[domain] || [];
      importantAttrs.forEach(attr => {
        if (entity.attributes?.[attr] !== undefined) {
          content += `- **${attr}**: ${entity.attributes[attr]}\n`;
        }
      });
      content += "\n";
    });
    
    content += `## Related Resources\n\n`;
    content += `- [Domain summary](hass://entities/domain/${domain}/summary)\n`;
    content += `- [Search in this domain](hass://search/${domain}/20)\n`;
    
    return formatSuccessResponse(content);
  }

  async function handleDomainSummaryResource(domain: string) {
    const result = await getAllStates();
    
    if (!result.success) {
      return formatErrorResponse(`Error retrieving entities: ${result.message}`);
    }
    
    const allEntities = result.data;
    const entities = allEntities.filter((entity: any) => 
      entity.entity_id.startsWith(`${domain}.`)
    );
    
    if (entities.length === 0) {
      return formatErrorResponse(`No entities found for domain: ${domain}`);
    }
    
    // Analyze the domain
    const stateCounts: { [key: string]: number } = {};
    const attributesSummary: { [key: string]: Set<any> } = {};
    
    entities.forEach((entity: any) => {
      const state = entity.state || "unknown";
      stateCounts[state] = (stateCounts[state] || 0) + 1;
      
      if (entity.attributes) {
        Object.entries(entity.attributes).forEach(([key, value]) => {
          if (!attributesSummary[key]) {
            attributesSummary[key] = new Set();
          }
          if (value !== null && value !== undefined) {
            attributesSummary[key].add(typeof value === 'object' ? JSON.stringify(value) : value);
          }
        });
      }
    });
    
    let content = `# ${domain.charAt(0).toUpperCase() + domain.slice(1)} Domain Summary\n\n`;
    content += `**Total entities**: ${entities.length}\n\n`;
    
    // State distribution
    content += "## State Distribution\n\n";
    Object.entries(stateCounts).forEach(([state, count]) => {
      const percentage = ((count / entities.length) * 100).toFixed(1);
      content += `- **${state}**: ${count} entities (${percentage}%)\n`;
    });
    
    // Common attributes
    content += "\n## Common Attributes\n\n";
    const sortedAttributes = Object.entries(attributesSummary)
      .sort(([, a], [, b]) => b.size - a.size)
      .slice(0, 10);
      
    sortedAttributes.forEach(([attr, values]) => {
      const valueCount = values.size;
      content += `- **${attr}**: ${valueCount} unique values\n`;
      
      if (valueCount <= 5) {
        const valuesList = Array.from(values).slice(0, 5);
        content += `  Values: ${valuesList.join(', ')}\n`;
      }
    });
    
    content += `\n## Related Resources\n\n`;
    content += `- [View all ${domain} entities](hass://entities/domain/${domain})\n`;
    content += `- [Search ${domain} entities](hass://search/${domain}/20)\n`;
    
    return formatSuccessResponse(content);
  }

  async function handleSearchResource(query: string, limit: number) {
    if (!query || query.trim() === "") {
      return formatErrorResponse("Please provide a search query");
    }
    
    const result = await getAllStates();
    
    if (!result.success) {
      return formatErrorResponse(`Error searching entities: ${result.message}`);
    }
    
    const searchTerm = query.toLowerCase().trim();
    const matchingEntities = result.data.filter((entity: any) => {
      const entityId = entity.entity_id.toLowerCase();
      const friendlyName = (entity.attributes?.friendly_name || "").toLowerCase();
      const state = (entity.state || "").toLowerCase();
      
      return entityId.includes(searchTerm) || 
             friendlyName.includes(searchTerm) || 
             state.includes(searchTerm);
    }).slice(0, limit);
    
    if (matchingEntities.length === 0) {
      return formatSuccessResponse(`No entities found matching: '${query}'`);
    }
    
    let content = `# Search Results for '${query}'\n\n`;
    content += `Found ${matchingEntities.length} matching entities (limit: ${limit}):\n\n`;
    
    // Group by domain
    const domains: { [key: string]: any[] } = {};
    matchingEntities.forEach((entity: any) => {
      const domain = entity.entity_id.split('.')[0];
      if (!domains[domain]) {
        domains[domain] = [];
      }
      domains[domain].push(entity);
    });
    
    Object.entries(domains).forEach(([domain, domainEntities]) => {
      content += `## ${domain.toUpperCase()} (${domainEntities.length})\n\n`;
      domainEntities.forEach(entity => {
        const name = entity.attributes?.friendly_name || entity.entity_id;
        content += `- [${entity.entity_id}](hass://entities/${entity.entity_id}): ${entity.state}\n`;
        if (name !== entity.entity_id) {
          content += `  Name: ${name}\n`;
        }
      });
      content += "\n";
    });
    
    return formatSuccessResponse(content);
  }
}
