import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  getHomeAssistantApi,
  getHomeAssistantState,
  getAllStates,
  formatErrorResponse,
  formatSuccessResponse
} from "../../utils/api.js";

/**
 * Register minimal essential Home Assistant tools for Smithery scanning
 * This prevents timeout during tool discovery while still providing core functionality
 */
export function registerMinimalTools(server: McpServer) {
  // Essential tool: API status check
  server.tool(
    "homeassistant_api",
    "Verify if the Home Assistant API is online and accessible",
    {},
    async () => {
      const result = await getHomeAssistantApi();
      
      if (!result.success) {
        return formatErrorResponse(`Failed to connect to Home Assistant: ${result.message}`);
      }
      
      return formatSuccessResponse(`Home Assistant API is online and accessible!`);
    }
  );

  // Essential tool: Get entity state
  server.tool(
    "homeassistant_get_state",
    "Get the current state of a Home Assistant entity",
    {
      entity_id: z.string().describe("The entity ID (e.g., 'light.living_room', 'sensor.temperature')")
    },
    async ({ entity_id }: { entity_id: string }) => {
      const result = await getHomeAssistantState(entity_id);
      
      if (!result.success) {
        return formatErrorResponse(`Failed to get entity state: ${result.message}`);
      }
      
      const entity = result.data;
      return formatSuccessResponse(
        `Entity: ${entity.entity_id}\n` +
        `State: ${entity.state}\n` +
        `Last Updated: ${entity.last_updated}\n` +
        `Attributes: ${JSON.stringify(entity.attributes, null, 2)}`
      );
    }
  );

  // Essential tool: List entities
  server.tool(
    "homeassistant_list_entities",
    "List all available Home Assistant entities",
    {
      limit: z.number().optional().describe("Maximum number of entities to return (default: 20)")
    },
    async ({ limit = 20 }: { limit?: number }) => {
      const result = await getAllStates();
      
      if (!result.success) {
        return formatErrorResponse(`Failed to get entities: ${result.message}`);
      }
      
      const entities = result.data.slice(0, limit);
      const entityList = entities.map((entity: any) => 
        `${entity.entity_id} (${entity.state})`
      ).join('\n');
      
      return formatSuccessResponse(
        `Found ${entities.length} entities (showing first ${limit}):\n\n${entityList}`
      );
    }
  );
}
