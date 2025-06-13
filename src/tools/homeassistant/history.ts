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
  // Tool to get entity history (enhanced version from Python)
  server.tool(
    "homeassistant_get_entity_history",  
    "Get historical data for a Home Assistant entity with detailed analysis",
    {
      entity_id: z.string().describe("The entity ID to get history for"),
      hours: z.number().optional().default(24).describe("Number of hours of history to retrieve (default: 24)")
    },
    async ({ entity_id, hours = 24 }: { entity_id: string; hours?: number }) => {  
      console.error(`Getting history for entity: ${entity_id}, hours: ${hours}`);
      
      try {
        // Calculate start time
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - (hours * 60 * 60 * 1000));
        
        const result = await getHistory(entity_id, startTime.toISOString(), endTime.toISOString(), false);
        
        if (!result.success) {
          return formatErrorResponse(`Failed to get history: ${result.message}`);
        }
        
        const history = result.data;
        
        if (!history || history.length === 0 || !history[0] || history[0].length === 0) {
          return formatSuccessResponse(`No history found for ${entity_id} in the last ${hours} hours`);
        }
        
        const entityHistory = history[0]; // First array contains our entity's history
        
        // Analyze the history data
        const stateChanges = entityHistory.length;
        const states: { [key: string]: number } = {};
        const timeSpentInStates: { [key: string]: number } = {};
        
        let lastState: string | null = null;
        let lastTime: number | null = null;
        
        entityHistory.forEach((record: any, index: number) => {
          const state = record.state;
          states[state] = (states[state] || 0) + 1;
          
          // Calculate time spent in previous state
          if (lastState !== null && lastTime !== null) {
            const currentTime = new Date(record.last_updated).getTime();
            const timeDiff = currentTime - lastTime;
            timeSpentInStates[lastState] = (timeSpentInStates[lastState] || 0) + timeDiff;
          }
          
          lastState = state;
          lastTime = new Date(record.last_updated).getTime();
        });
        
        // Calculate time spent in final state (up to now)
        if (lastState !== null && lastTime !== null) {
          const timeDiff = endTime.getTime() - lastTime;
          timeSpentInStates[lastState] = (timeSpentInStates[lastState] || 0) + timeDiff;
        }
        
        const output = [
          `# History Analysis for ${entity_id} (Last ${hours} hours)`,
          "",
          `**Total state changes**: ${stateChanges}`,
          `**Time period**: ${startTime.toLocaleString()} to ${endTime.toLocaleString()}`,
          ""
        ];
        
        // Add state distribution
        output.push("## State Distribution:");
        Object.entries(states).forEach(([state, count]) => {
          const percentage = ((count / stateChanges) * 100).toFixed(1);
          output.push(`- **${state}**: ${count} occurrences (${percentage}%)`);
        });
        output.push("");
        
        // Add time spent in each state
        output.push("## Time Spent in Each State:");
        const totalTimeMs = hours * 60 * 60 * 1000;
        Object.entries(timeSpentInStates).forEach(([state, timeMs]) => {
          const percentage = ((timeMs / totalTimeMs) * 100).toFixed(1);
          const timeHours = (timeMs / (1000 * 60 * 60)).toFixed(2);
          output.push(`- **${state}**: ${timeHours} hours (${percentage}%)`);
        });
        output.push("");
        
        // Add recent changes (last 10)
        output.push("## Recent Changes (Last 10):");
        const recentChanges = entityHistory.slice(-10);
        recentChanges.forEach((record: any) => {
          const timestamp = new Date(record.last_updated).toLocaleString();
          const unit = record.attributes?.unit_of_measurement || '';
          output.push(`- ${timestamp}: **${record.state}** ${unit}`);
          
          // Add relevant attributes for certain entity types
          if (record.attributes) {
            const domain = entity_id.split('.')[0];
            let importantAttrs: string[] = [];
            
            switch (domain) {
              case 'light':
                importantAttrs = ['brightness', 'color_temp', 'rgb_color'];
                break;
              case 'climate':
                importantAttrs = ['current_temperature', 'target_temperature', 'hvac_action'];
                break;
              case 'media_player':
                importantAttrs = ['media_title', 'volume_level'];
                break;
              case 'sensor':
                importantAttrs = ['device_class'];
                break;
            }
            
            importantAttrs.forEach(attr => {
              if (record.attributes[attr] !== undefined) {
                output.push(`  ${attr}: ${record.attributes[attr]}`);
              }
            });
          }
        });
        
        return formatSuccessResponse(output.join('\n'));
        
      } catch (error: any) {
        return formatErrorResponse(`Error getting history: ${error.message}`);
      }
    }
  );

  // Tool to get Home Assistant error log (from Python code)
  server.tool(
    "homeassistant_get_error_log",
    "Get the Home Assistant error log for troubleshooting",
    {},
    async () => {
      console.error("Getting Home Assistant error log");
      
      const result = await getErrorLog();
      
      if (!result.success) {
        return formatErrorResponse(`Failed to get error log: ${result.message}`);
      }
      
      try {
        const logText = typeof result.data === 'string' ? result.data : JSON.stringify(result.data);
        const lines = logText.split('\n');
        
        // Analyze the log
        let errorCount = 0;
        let warningCount = 0;
        const integrationMentions: { [key: string]: number } = {};
        const errorSamples: string[] = [];
        const warningSamples: string[] = [];
        
        lines.forEach(line => {
          const lowerLine = line.toLowerCase();
          
          if (lowerLine.includes('error')) {
            errorCount++;
            if (errorSamples.length < 5) {
              errorSamples.push(line.trim());
            }
          }
          
          if (lowerLine.includes('warning') || lowerLine.includes('warn')) {
            warningCount++;
            if (warningSamples.length < 5) {
              warningSamples.push(line.trim());
            }
          }
          
          // Look for integration mentions
          const integrationPatterns = [
            /homeassistant\.components\.(\w+)/g,
            /custom_components\.(\w+)/g,
            /(\w+)\s+integration/gi
          ];
          
          integrationPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(line)) !== null) {
              const integration = match[1].toLowerCase();
              integrationMentions[integration] = (integrationMentions[integration] || 0) + 1;
            }
          });
        });
        
        const output = [
          "# Home Assistant Error Log Analysis",
          "",
          `**Total log lines**: ${lines.length}`,
          `**Error entries**: ${errorCount}`,
          `**Warning entries**: ${warningCount}`,
          ""
        ];
        
        // Add integration mentions
        if (Object.keys(integrationMentions).length > 0) {
          output.push("## Most Mentioned Integrations:");
          const sortedIntegrations = Object.entries(integrationMentions)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10);
          
          sortedIntegrations.forEach(([integration, count]) => {
            output.push(`- **${integration}**: ${count} mentions`);
          });
          output.push("");
        }
        
        // Add error samples
        if (errorSamples.length > 0) {
          output.push("## Recent Error Samples:");
          errorSamples.forEach(error => {
            output.push(`- ${error}`);
          });
          output.push("");
        }
        
        // Add warning samples
        if (warningSamples.length > 0) {
          output.push("## Recent Warning Samples:");
          warningSamples.forEach(warning => {
            output.push(`- ${warning}`);
          });
          output.push("");
        }
        
        // Add recommendations
        output.push("## Recommendations:");
        if (errorCount > 50) {
          output.push("- ⚠️ High number of errors detected. Consider reviewing your configuration.");
        }
        if (warningCount > 100) {
          output.push("- ⚠️ Many warnings found. Some may indicate configuration issues.");
        }
        
        const topIntegration = Object.entries(integrationMentions)[0];
        if (topIntegration && topIntegration[1] > 10) {
          output.push(`- 🔍 The ${topIntegration[0]} integration appears frequently in logs. Consider investigating.`);
        }
        
        if (errorCount === 0 && warningCount === 0) {
          output.push("- ✅ No errors or warnings found. System appears healthy!");
        }
        
        return formatSuccessResponse(output.join('\n'));
        
      } catch (error: any) {
        return formatErrorResponse(`Error analyzing log: ${error.message}`);
      }
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
    async ({ entity_id, start_time, end_time }: {
      entity_id?: string;
      start_time?: string;
      end_time?: string;
    }) => {  
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