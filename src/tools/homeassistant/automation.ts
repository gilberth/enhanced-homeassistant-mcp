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
  // Tool to list all automations
  server.tool(
    "homeassistant_list_automations",  
    "Get a list of all automations in Home Assistant",
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
      
      const output = [`Found ${automations.length} automations:`, ""];
      
      automations.forEach((automation: any) => {
        const status = automation.state === 'on' ? '✅ Enabled' : '❌ Disabled';
        output.push(`${status} ${automation.entity_id}`);
        if (automation.attributes?.friendly_name) {
          output.push(`   Name: ${automation.attributes.friendly_name}`);
        }
        if (automation.attributes?.last_triggered) {
          output.push(`   Last Triggered: ${automation.attributes.last_triggered}`);
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
}