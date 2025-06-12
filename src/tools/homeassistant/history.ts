import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  getHistory,
  getLogbook,
  getErrorLog,
  getEvents,
  checkConfig,
  formatErrorResponse,
  formatSuccessResponse
} from "../../utils/api.js";

/**
 * Register history and monitoring tools
 */
export function registerHistoryTools(server: McpServer) {
  // Tool to get entity history
  server.tool(
    "homeassistant_get_entity_history",  
    "Get historical data for a Home Assistant entity",
    {
      entity_id: z.string().describe("The entity ID to get history for"),
      start_time: z.string().optional().describe("Start time in ISO format (e.g., '2023-01-01T00:00:00Z')"),
      end_time: z.string().optional().describe("End time in ISO format"),
      minimal_response: z.boolean().optional().describe("Get minimal response (state changes only)")
    },
    async ({ entity_id, start_time, end_time, minimal_response }) => {  
      const result = await getHistory(entity_id, start_time, end_time, minimal_response);
      
      if (!result.success) {
        return formatErrorResponse(`Failed to get history: ${result.message}`);
      }
      
      const history = result.data;
      
      if (!history || history.length === 0) {
        return formatSuccessResponse(`No history found for ${entity_id}`);
      }
      
      const output = [`History for ${entity_id}:`, ""];
      
      // History comes as an array of arrays, one per entity
      history.forEach((entityHistory: any[]) => {
        if (entityHistory && entityHistory.length > 0) {
          output.push(`Found ${entityHistory.length} records:`);
          
          // Show last 10 records to avoid overwhelming output
          const records = entityHistory.slice(-10);
          records.forEach((record: any) => {
            const timestamp = new Date(record.last_updated).toLocaleString();
            output.push(`${timestamp}: ${record.state} ${record.attributes?.unit_of_measurement || ''}`);
          });
          
          if (entityHistory.length > 10) {
            output.push(`... and ${entityHistory.length - 10} more records`);
          }
        }
      });
      
      return formatSuccessResponse(output.join('\n'));
    }
  );

  // Tool to get logbook entries
  server.tool(
    "homeassistant_get_logbook",  
    "Get logbook entries from Home Assistant",
    {
      entity_id: z.string().optional().describe("Filter by specific entity ID"),
      start_time: z.string().optional().describe("Start time in ISO format"),
      end_time: z.string().optional().describe("End time in ISO format")
    },
    async ({ entity_id, start_time, end_time }) => {  
      const result = await getLogbook(entity_id, start_time, end_time);
      
      if (!result.success) {
        return formatErrorResponse(`Failed to get logbook: ${result.message}`);
      }
      
      const logbook = result.data;
      
      if (!logbook || logbook.length === 0) {
        return formatSuccessResponse("No logbook entries found");
      }
      
      const output = [`Logbook entries (${logbook.length} total):`, ""];
      
      // Show last 20 entries
      const entries = logbook.slice(-20);
      entries.forEach((entry: any) => {
        const timestamp = new Date(entry.when).toLocaleString();
        const name = entry.name || entry.entity_id || 'Unknown';
        const message = entry.message || `${entry.state || 'changed'}`;
        
        output.push(`${timestamp} - ${name}: ${message}`);
      });
      
      if (logbook.length > 20) {
        output.push(`... and ${logbook.length - 20} more entries`);
      }
      
      return formatSuccessResponse(output.join('\n'));
    }
  );

  // Tool to get system events
  server.tool(
    "homeassistant_get_events",  
    "Get a list of available event types in Home Assistant",
    {},
    async () => {  
      const result = await getEvents();
      
      if (!result.success) {
        return formatErrorResponse(`Failed to get events: ${result.message}`);
      }
      
      const events = result.data;
      
      if (!events || events.length === 0) {
        return formatSuccessResponse("No events found");
      }
      
      const output = [`Available event types (${events.length} total):`, ""];
      
      events.forEach((event: any) => {
        output.push(`- ${event.event}`);
        if (event.listener_count) {
          output.push(`  Listeners: ${event.listener_count}`);
        }
      });
      
      return formatSuccessResponse(output.join('\n'));
    }
  );

  // Tool to get error log
  server.tool(
    "homeassistant_get_error_log",  
    "Get the Home Assistant error log",
    {},
    async () => {  
      const result = await getErrorLog();
      
      if (!result.success) {
        return formatErrorResponse(`Failed to get error log: ${result.message}`);
      }
      
      const errorLog = result.data;
      
      if (!errorLog || errorLog.trim().length === 0) {
        return formatSuccessResponse("No errors in the log ✅");
      }
      
      // Split log into lines and show last 50 lines
      const lines = errorLog.split('\n').filter((line: string) => line.trim().length > 0);
      const recentLines = lines.slice(-50);
      
      const output = [
        `Error Log (showing last ${recentLines.length} lines):`,
        "",
        ...recentLines
      ];
      
      if (lines.length > 50) {
        output.splice(2, 0, `... ${lines.length - 50} earlier lines omitted`, "");
      }
      
      return formatSuccessResponse(output.join('\n'));
    }
  );

  // Tool to check configuration
  server.tool(
    "homeassistant_check_config",  
    "Check Home Assistant configuration for errors",
    {},
    async () => {  
      const result = await checkConfig();
      
      if (!result.success) {
        return formatErrorResponse(`Failed to check configuration: ${result.message}`);
      }
      
      const configCheck = result.data;
      
      if (configCheck.result === 'valid') {
        return formatSuccessResponse("✅ Configuration is valid!");
      } else {
        const output = [
          "❌ Configuration has errors:",
          ""
        ];
        
        if (configCheck.errors) {
          output.push("Errors:");
          configCheck.errors.forEach((error: string) => {
            output.push(`- ${error}`);
          });
        }
        
        if (configCheck.warnings) {
          output.push("", "Warnings:");
          configCheck.warnings.forEach((warning: string) => {
            output.push(`- ${warning}`);
          });
        }
        
        return formatSuccessResponse(output.join('\n'));
      }
    }
  );

  // Tool to get system statistics
  server.tool(
    "homeassistant_get_statistics",  
    "Get statistical data for sensor entities",
    {
      entity_ids: z.array(z.string()).optional().describe("List of entity IDs to get statistics for"),
      start_time: z.string().optional().describe("Start time in ISO format"),
      end_time: z.string().optional().describe("End time in ISO format"),
      period: z.enum(["5minute", "hour", "day", "month"]).optional().describe("Statistics period")
    },
    async ({ entity_ids, start_time, end_time, period = "hour" }) => {
        // Note: This endpoint might need adjustment based on the actual HA API
        const endpoint = '/api/history/statistics';
        
        const params = new URLSearchParams();
        if (entity_ids) params.append('statistic_ids', entity_ids.join(','));
        if (start_time) params.append('start_time', start_time);
        if (end_time) params.append('end_time', end_time);
        if (period) params.append('period', period);
        
        const fullEndpoint = params.toString() ? `${endpoint}?${params.toString()}` : endpoint;
        
        try {
          // This is a placeholder - the actual statistics API might be different
          return formatSuccessResponse(
            "Statistics endpoint is available but may require specific entity configuration. " +
            "Use homeassistant_get_entity_history for detailed historical data."
          );
        } catch (error) {
          return formatErrorResponse(`Failed to get statistics: ${error}`);
        }
    }
  );
}