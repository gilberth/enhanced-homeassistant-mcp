import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  getAllStates,
  callHomeAssistantService,
  formatErrorResponse,
  formatSuccessResponse
} from "../../utils/api.js";

/**
 * Register automation and scene management tools
 */
export function registerAutomationTools(server: McpServer) {
  // Tool to list all automations (enhanced version from Python)
  server.tool(
    "homeassistant_list_automations",  
    "Get a list of all automations in Home Assistant with detailed information",
    {},
    async () => {  
      const result = await getAllStates();
      
      if (!result.success) {
        return formatErrorResponse(`Failed to get automations: ${result.message}`);
      }
      
      const automations = result.data.filter((entity: any) => 
        entity.entity_id.startsWith('automation.')
      );
      
      if (automations.length === 0) {
        return formatSuccessResponse("No automations found");
      }
      
      const processedAutomations = automations.map((entity: any) => {
        return {
          entity_id: entity.entity_id,
          friendly_name: entity.attributes?.friendly_name || entity.entity_id,
          state: entity.state,
          last_triggered: entity.attributes?.last_triggered || "Never",
          unique_id: entity.attributes?.unique_id,
          mode: entity.attributes?.mode || "single",
          current: entity.attributes?.current || 0,
          max: entity.attributes?.max || 1
        };
      });

      const output = [`Found ${automations.length} automations:`, ""];
      
      processedAutomations.forEach((automation: any) => {
        const status = automation.state === 'on' ? '✅ Enabled' : '❌ Disabled';
        output.push(`${status} ${automation.entity_id}`);
        output.push(`   Name: ${automation.friendly_name}`);
        output.push(`   Last Triggered: ${automation.last_triggered}`);
        output.push(`   Mode: ${automation.mode}`);
        if (automation.mode !== 'single') {
          output.push(`   Current executions: ${automation.current}/${automation.max}`);
        }
        output.push("");
      });
      
      return formatSuccessResponse(output.join('\n'));
    }
  );

  // Tool to enable/disable automation
  server.tool(
    "homeassistant_toggle_automation",  
    "Enable or disable a Home Assistant automation",
    {
      entity_id: z.string().describe("The automation entity ID (e.g., 'automation.living_room_lights')"),
      action: z.enum(["turn_on", "turn_off", "toggle"]).describe("Action to perform: turn_on, turn_off, or toggle")
    },
    async ({ entity_id, action }) => {  
      // Verify it's an automation entity
      if (!entity_id.startsWith('automation.')) {
        return formatErrorResponse("Entity ID must be an automation (start with 'automation.')");
      }
      
      const result = await callHomeAssistantService('automation', action, { entity_id });
      
      if (!result.success) {
        return formatErrorResponse(`Failed to ${action} automation: ${result.message}`);
      }
      
      const actionText = action === 'turn_on' ? 'enabled' : action === 'turn_off' ? 'disabled' : 'toggled';
      return formatSuccessResponse(`Automation ${entity_id} has been ${actionText}`);
    }
  );

  // Tool to trigger automation
  server.tool(
    "homeassistant_trigger_automation",  
    "Manually trigger a Home Assistant automation",
    {
      entity_id: z.string().describe("The automation entity ID to trigger")
    },
    async ({ entity_id }) => {  
      if (!entity_id.startsWith('automation.')) {
        return formatErrorResponse("Entity ID must be an automation (start with 'automation.')");
      }
      
      const result = await callHomeAssistantService('automation', 'trigger', { entity_id });
      
      if (!result.success) {
        return formatErrorResponse(`Failed to trigger automation: ${result.message}`);
      }
      
      return formatSuccessResponse(`Automation ${entity_id} has been triggered`);
    }
  );

  // Tool to list all scenes
  server.tool(
    "homeassistant_list_scenes",  
    "Get a list of all scenes in Home Assistant",
    {},
    async () => {  
      const result = await getAllStates();
      
      if (!result.success) {
        return formatErrorResponse(`Failed to get scenes: ${result.message}`);
      }
      
      const scenes = result.data.filter((entity: any) => 
        entity.entity_id.startsWith('scene.')
      );
      
      if (scenes.length === 0) {
        return formatSuccessResponse("No scenes found");
      }
      
      const output = [`Found ${scenes.length} scenes:`, ""];
      
      scenes.forEach((scene: any) => {
        output.push(`🎬 ${scene.entity_id}`);
        if (scene.attributes?.friendly_name) {
          output.push(`   Name: ${scene.attributes.friendly_name}`);
        }
        if (scene.attributes?.entity_id) {
          const entityCount = Array.isArray(scene.attributes.entity_id) 
            ? scene.attributes.entity_id.length 
            : 1;
          output.push(`   Entities: ${entityCount}`);
        }
        output.push("");
      });
      
      return formatSuccessResponse(output.join('\n'));
    }
  );

  // Tool to activate scene
  server.tool(
    "homeassistant_activate_scene",  
    "Activate a Home Assistant scene",
    {
      entity_id: z.string().describe("The scene entity ID to activate (e.g., 'scene.movie_time')")
    },
    async ({ entity_id }) => {  
      if (!entity_id.startsWith('scene.')) {
        return formatErrorResponse("Entity ID must be a scene (start with 'scene.')");
      }
      
      const result = await callHomeAssistantService('scene', 'turn_on', { entity_id });
      
      if (!result.success) {
        return formatErrorResponse(`Failed to activate scene: ${result.message}`);
      }
      
      return formatSuccessResponse(`Scene ${entity_id} has been activated`);
    }
  );

  // Tool to list all scripts
  server.tool(
    "homeassistant_list_scripts",  
    "Get a list of all scripts in Home Assistant",
    {},
    async () => {  
      const result = await getAllStates();
      
      if (!result.success) {
        return formatErrorResponse(`Failed to get scripts: ${result.message}`);
      }
      
      const scripts = result.data.filter((entity: any) => 
        entity.entity_id.startsWith('script.')
      );
      
      if (scripts.length === 0) {
        return formatSuccessResponse("No scripts found");
      }
      
      const output = [`Found ${scripts.length} scripts:`, ""];
      
      scripts.forEach((script: any) => {
        const status = script.state === 'on' ? '▶️ Running' : '⏹️ Idle';
        output.push(`${status} ${script.entity_id}`);
        if (script.attributes?.friendly_name) {
          output.push(`   Name: ${script.attributes.friendly_name}`);
        }
        if (script.attributes?.last_triggered) {
          output.push(`   Last Run: ${script.attributes.last_triggered}`);
        }
        output.push("");
      });
      
      return formatSuccessResponse(output.join('\n'));
    }
  );

  // Tool to run script
  server.tool(
    "homeassistant_run_script",  
    "Run a Home Assistant script",
    {
      entity_id: z.string().describe("The script entity ID to run (e.g., 'script.morning_routine')")
    },
    async ({ entity_id }) => {  
      if (!entity_id.startsWith('script.')) {
        return formatErrorResponse("Entity ID must be a script (start with 'script.')");
      }
      
      const result = await callHomeAssistantService('script', 'turn_on', { entity_id });
      
      if (!result.success) {
        return formatErrorResponse(`Failed to run script: ${result.message}`);
      }
      
      return formatSuccessResponse(`Script ${entity_id} has been executed`);
    }
  );

  // Tool to list input_booleans (useful for automation conditions)
  server.tool(
    "homeassistant_list_input_booleans",  
    "Get a list of all input booleans (toggles) in Home Assistant",
    {},
    async () => {  
      const result = await getAllStates();
      
      if (!result.success) {
        return formatErrorResponse(`Failed to get input booleans: ${result.message}`);
      }
      
      const inputBooleans = result.data.filter((entity: any) => 
        entity.entity_id.startsWith('input_boolean.')
      );
      
      if (inputBooleans.length === 0) {
        return formatSuccessResponse("No input booleans found");
      }
      
      const output = [`Found ${inputBooleans.length} input booleans:`, ""];
      
      inputBooleans.forEach((inputBoolean: any) => {
        const status = inputBoolean.state === 'on' ? '✅ On' : '❌ Off';
        output.push(`${status} ${inputBoolean.entity_id}`);
        if (inputBoolean.attributes?.friendly_name) {
          output.push(`   Name: ${inputBoolean.attributes.friendly_name}`);
        }
        output.push("");
      });
      
      return formatSuccessResponse(output.join('\n'));
    }
  );

  // Tool to toggle input_boolean
  server.tool(
    "homeassistant_toggle_input_boolean",  
    "Toggle an input boolean in Home Assistant",
    {
      entity_id: z.string().describe("The input boolean entity ID (e.g., 'input_boolean.guest_mode')"),
      action: z.enum(["turn_on", "turn_off", "toggle"]).describe("Action to perform")
    },
    async ({ entity_id, action }) => {  
      if (!entity_id.startsWith('input_boolean.')) {
        return formatErrorResponse("Entity ID must be an input boolean (start with 'input_boolean.')");
      }
      
      const result = await callHomeAssistantService('input_boolean', action, { entity_id });
      
      if (!result.success) {
        return formatErrorResponse(`Failed to ${action} input boolean: ${result.message}`);
      }
      
      const actionText = action === 'turn_on' ? 'turned on' : action === 'turn_off' ? 'turned off' : 'toggled';
      return formatSuccessResponse(`Input boolean ${entity_id} has been ${actionText}`);
    }
  );

  // Tool to reload automations (from Python code)
  server.tool(
    "homeassistant_reload_automations",
    "Reload all automations in Home Assistant",
    {},
    async () => {
      const result = await callHomeAssistantService("automation", "reload", {});
      
      if (!result.success) {
        return formatErrorResponse(`Failed to reload automations: ${result.message}`);
      }
      
      return formatSuccessResponse("Successfully reloaded all automations");
    }
  );

  // Tool to restart Home Assistant (from Python code)
  server.tool(
    "homeassistant_restart",
    "Restart Home Assistant - ⚠️ WARNING: Temporarily disrupts all Home Assistant operations",
    {},
    async () => {
      const result = await callHomeAssistantService("homeassistant", "restart", {});
      
      if (!result.success) {
        return formatErrorResponse(`Failed to restart Home Assistant: ${result.message}`);
      }
      
      return formatSuccessResponse("Home Assistant restart initiated");
    }
  );

  // Tool to search entities (from Python search_entities_tool)
  server.tool(
    "homeassistant_search_entities",
    "Search for entities matching a query string",
    {
      query: z.string().describe("Search query to match against entity IDs, friendly names, and attributes"),
      limit: z.number().optional().default(20).describe("Maximum number of results to return (default: 20)")
    },
    async ({ query, limit = 20 }: { query: string; limit?: number }) => {
      console.error(`Searching for entities matching: '${query}' with limit: ${limit}`);
      
      // Handle special cases
      if (query === "*" || !query.trim()) {
        return formatErrorResponse("Please provide a specific search query");
      }
      
      const result = await getAllStates();
      
      if (!result.success) {
        return formatErrorResponse(`Failed to search entities: ${result.message}`);
      }
      
      const searchTerm = query.toLowerCase().trim();
      const matchingEntities = result.data.filter((entity: any) => {
        const entityId = entity.entity_id.toLowerCase();
        const friendlyName = (entity.attributes?.friendly_name || "").toLowerCase();
        const state = (entity.state || "").toLowerCase();
        
        return entityId.includes(searchTerm) || 
               friendlyName.includes(searchTerm) || 
               state.includes(searchTerm) ||
               JSON.stringify(entity.attributes || {}).toLowerCase().includes(searchTerm);
      }).slice(0, limit);
      
      if (matchingEntities.length === 0) {
        return formatSuccessResponse(`No entities found matching: '${query}'`);
      }
      
      // Group by domain
      const domainsCount: { [key: string]: number } = {};
      const simplifiedEntities = matchingEntities.map((entity: any) => {
        const domain = entity.entity_id.split('.')[0];
        domainsCount[domain] = (domainsCount[domain] || 0) + 1;
        
        return {
          entity_id: entity.entity_id,
          friendly_name: entity.attributes?.friendly_name || entity.entity_id,
          state: entity.state,
          domain
        };
      });
      
      const output = [
        `# Entity Search Results for '${query}' (Limit: ${limit})`,
        "",
        `Found ${matchingEntities.length} matching entities:`,
        ""
      ];
      
      // Add domain summary
      output.push("## Domains found:");
      Object.entries(domainsCount).forEach(([domain, count]) => {
        output.push(`- ${domain}: ${count} entities`);
      });
      output.push("");
      
      // Add entities by domain
      const entitiesByDomain: { [key: string]: any[] } = {};
      simplifiedEntities.forEach((entity: any) => {
        if (!entitiesByDomain[entity.domain]) {
          entitiesByDomain[entity.domain] = [];
        }
        entitiesByDomain[entity.domain].push(entity);
      });
      
      Object.entries(entitiesByDomain).forEach(([domain, entities]) => {
        output.push(`## ${domain.toUpperCase()} (${entities.length}):`);
        entities.forEach(entity => {
          output.push(`- **${entity.entity_id}**: ${entity.state}`);
          if (entity.friendly_name !== entity.entity_id) {
            output.push(`  Name: ${entity.friendly_name}`);
          }
        });
        output.push("");
      });
      
      return formatSuccessResponse(output.join('\n'));
    }
  );

  // Tool to get domain summary (from Python code)
  server.tool(
    "homeassistant_domain_summary",
    "Get a summary of entities in a specific domain",
    {
      domain: z.string().describe("The domain to summarize (e.g., 'light', 'switch', 'sensor')"),
      example_limit: z.number().optional().default(3).describe("Maximum number of examples to include for each state")
    },
    async ({ domain, example_limit = 3 }: { domain: string; example_limit?: number }) => {
      console.error(`Getting domain summary for: ${domain}`);
      
      const result = await getAllStates();
      
      if (!result.success) {
        return formatErrorResponse(`Failed to get domain summary: ${result.message}`);
      }
      
      const entities = result.data.filter((entity: any) => 
        entity.entity_id.startsWith(`${domain}.`)
      );
      
      if (entities.length === 0) {
        return formatSuccessResponse(`No entities found for domain: ${domain}`);
      }
      
      // Analyze the domain
      const stateCounts: { [key: string]: number } = {};
      const stateExamples: { [key: string]: any[] } = {};
      const attributesSummary: { [key: string]: Set<any> } = {};
      
      entities.forEach((entity: any) => {
        const state = entity.state || "unknown";
        stateCounts[state] = (stateCounts[state] || 0) + 1;
        
        if (!stateExamples[state]) {
          stateExamples[state] = [];
        }
        if (stateExamples[state].length < example_limit) {
          stateExamples[state].push({
            entity_id: entity.entity_id,
            friendly_name: entity.attributes?.friendly_name || entity.entity_id
          });
        }
        
        // Collect attribute information
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
      
      const output = [
        `# Domain Summary: ${domain}`,
        "",
        `**Total entities**: ${entities.length}`,
        ""
      ];
      
      // Add state distribution
      output.push("## State Distribution:");
      Object.entries(stateCounts).forEach(([state, count]) => {
        const percentage = ((count / entities.length) * 100).toFixed(1);
        output.push(`- **${state}**: ${count} entities (${percentage}%)`);
        
        if (stateExamples[state] && stateExamples[state].length > 0) {
          output.push("  Examples:");
          stateExamples[state].forEach(example => {
            output.push(`    - ${example.entity_id} (${example.friendly_name})`);
          });
        }
      });
      output.push("");
      
      // Add common attributes
      output.push("## Common Attributes:");
      const sortedAttributes = Object.entries(attributesSummary)
        .sort(([, a], [, b]) => b.size - a.size)
        .slice(0, 10);
        
      sortedAttributes.forEach(([attr, values]) => {
        const valueCount = values.size;
        const coverage = ((entities.length / entities.length) * 100).toFixed(1);
        output.push(`- **${attr}**: ${valueCount} unique values`);
        
        if (valueCount <= 5) {
          const valuesList = Array.from(values).slice(0, 5);
          output.push(`  Values: ${valuesList.join(', ')}`);
        }
      });
      
      return formatSuccessResponse(output.join('\n'));
    }
  );

  // Tool to get system overview (from Python code)
  server.tool(
    "homeassistant_system_overview",
    "Get a comprehensive overview of the entire Home Assistant system",
    {},
    async () => {
      console.error("Generating complete system overview");
      
      const result = await getAllStates();
      
      if (!result.success) {
        return formatErrorResponse(`Failed to get system overview: ${result.message}`);
      }
      
      const allEntities = result.data;
      
      // Group entities by domain
      const domainEntities: { [key: string]: any[] } = {};
      allEntities.forEach((entity: any) => {
        const domain = entity.entity_id.split('.')[0];
        if (!domainEntities[domain]) {
          domainEntities[domain] = [];
        }
        domainEntities[domain].push(entity);
      });
      
      const overview = {
        total_entities: allEntities.length,
        domain_count: Object.keys(domainEntities).length,
        domains: {} as { [key: string]: any },
        domain_samples: {} as { [key: string]: any[] },
        most_common_domains: [] as Array<{ domain: string; count: number }>
      };
      
      // Process each domain
      Object.entries(domainEntities).forEach(([domain, entities]) => {
        const stateCounts: { [key: string]: number } = {};
        
        entities.forEach(entity => {
          const state = entity.state || "unknown";
          stateCounts[state] = (stateCounts[state] || 0) + 1;
        });
        
        overview.domains[domain] = {
          count: entities.length,
          states: stateCounts
        };
        
        // Add samples (2-3 entities per domain)
        overview.domain_samples[domain] = entities.slice(0, 3).map(entity => ({
          entity_id: entity.entity_id,
          friendly_name: entity.attributes?.friendly_name || entity.entity_id,
          state: entity.state
        }));
      });
      
      // Find most common domains
      overview.most_common_domains = Object.entries(domainEntities)
        .map(([domain, entities]) => ({ domain, count: entities.length }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      const output = [
        "# Home Assistant System Overview",
        "",
        `**Total Entities**: ${overview.total_entities}`,
        `**Total Domains**: ${overview.domain_count}`,
        ""
      ];
      
      // Add most common domains
      output.push("## Most Common Domains:");
      overview.most_common_domains.forEach(({ domain, count }) => {
        const percentage = ((count / overview.total_entities) * 100).toFixed(1);
        output.push(`1. **${domain}**: ${count} entities (${percentage}%)`);
      });
      output.push("");
      
      // Add domain details
      output.push("## Domain Details:");
      Object.entries(overview.domains).forEach(([domain, info]) => {
        output.push(`### ${domain.toUpperCase()} (${info.count} entities)`);
        
        // State distribution
        if (Object.keys(info.states).length > 1) {
          output.push("States:");
          Object.entries(info.states).forEach(([state, count]) => {
            output.push(`  - ${state}: ${count}`);
          });
        }
        
        // Sample entities
        if (overview.domain_samples[domain]) {
          output.push("Sample entities:");
          overview.domain_samples[domain].forEach((sample: any) => {
            output.push(`  - ${sample.entity_id}: ${sample.state}`);
          });
        }
        output.push("");
      });
      
      return formatSuccessResponse(output.join('\n'));
    }
  );
}