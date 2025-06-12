import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  getAllStates,
  makeGetRequest,
  formatErrorResponse,
  formatSuccessResponse
} from "../../utils/api.js";

/**
 * Register MCP prompts for guided conversations
 */
export function registerPrompts(server: McpServer) {
  // Prompt for creating automations
  server.prompt(
    "create_automation",
    "Guide for creating Home Assistant automations based on trigger type",
    {
      trigger_type: z.enum(["time", "state", "motion", "device", "webhook"]).describe("Type of automation trigger")
    },
    async ({ trigger_type }) => {
      const systemMessage = `You are a Home Assistant automation expert specializing in ${trigger_type} automations.

You'll help the user create effective automations by:
1. Understanding their specific use case and requirements
2. Suggesting appropriate triggers, conditions, and actions
3. Providing YAML configuration examples
4. Explaining best practices for ${trigger_type}-based automations
5. Helping with testing and troubleshooting
6. Recommending complementary automations that work well together`;

      const userMessage = `I want to create a ${trigger_type}-based automation in Home Assistant. Can you help me design and implement it?`;

      return {
        messages: [
          {
            role: "system",
            content: {
              type: "text",
              text: systemMessage
            }
          },
          {
            role: "user",
            content: {
              type: "text",
              text: userMessage
            }
          }
        ]
      };
    }
  );

  // Prompt for debugging automations
  server.prompt(
    "debug_automation",
    "Troubleshooting help for automations that aren't working",
    {
      automation_id: z.string().describe("The automation entity ID to debug")
    },
    async ({ automation_id }) => {
      const systemMessage = `You are a Home Assistant automation troubleshooting expert.

You'll help diagnose problems with automations by:
1. Checking automation status and configuration
2. Analyzing trigger conditions and their current states
3. Reviewing action sequences and potential issues
4. Examining logs and traces for errors
5. Testing individual components
6. Suggesting fixes and optimizations
7. Preventing similar issues in the future`;

      const userMessage = `My automation "${automation_id}" isn't working properly. Can you help me troubleshoot and fix it?`;

      return {
        messages: [
          {
            role: "system",
            content: {
              type: "text",
              text: systemMessage
            }
          },
          {
            role: "user",
            content: {
              type: "text",
              text: userMessage
            }
          }
        ]
      };
    }
  );

  // Prompt for entity troubleshooting
  server.prompt(
    "troubleshoot_entity",
    "Diagnose issues with Home Assistant entities",
    {
      entity_id: z.string().describe("The entity ID to troubleshoot")
    },
    async ({ entity_id }) => {
      const systemMessage = `You are a Home Assistant entity troubleshooting expert.

You'll help the user diagnose problems with their entity by checking:
1. Entity status and availability
2. Integration status
3. Device connectivity
4. Recent state changes and error patterns
5. Configuration issues
6. Common problems with this entity type`;

      const userMessage = `My entity ${entity_id} isn't working properly. Can you help me troubleshoot it?`;

      return {
        messages: [
          {
            role: "system",
            content: {
              type: "text",
              text: systemMessage
            }
          },
          {
            role: "user",
            content: {
              type: "text",
              text: userMessage
            }
          }
        ]
      };
    }
  );

  // Prompt for routine optimization
  server.prompt(
    "routine_optimizer",
    "Analyze usage patterns and suggest optimized routines based on actual behavior",
    {},
    async () => {
      const systemMessage = `You are a Home Assistant optimization expert specializing in routine analysis.

You'll help the user analyze their usage patterns and create optimized routines by:
1. Reviewing entity state histories to identify patterns
2. Analyzing when lights, climate controls, and other devices are used
3. Finding correlations between different device usages
4. Suggesting automations based on detected routines
5. Optimizing existing automations to better match actual usage
6. Creating schedules that adapt to the user's lifestyle
7. Identifying energy-saving opportunities based on usage patterns`;

      const userMessage = "I'd like to optimize my home automations based on my actual usage patterns. Can you help analyze how I use my smart home and suggest better routines?";

      return {
        messages: [
          {
            role: "system",
            content: {
              type: "text",
              text: systemMessage
            }
          },
          {
            role: "user",
            content: {
              type: "text",
              text: userMessage
            }
          }
        ]
      };
    }
  );

  // Prompt for automation health check
  server.prompt(
    "automation_health_check",
    "Review all automations, find conflicts, redundancies, or improvement opportunities",
    {},
    async () => {
      const systemMessage = `You are a Home Assistant automation auditing expert.

You'll help the user review their entire automation setup by:
1. Analyzing all automations for conflicts and redundancies
2. Identifying automations that may interfere with each other
3. Finding unused or rarely triggered automations
4. Suggesting consolidation opportunities
5. Recommending performance improvements
6. Checking for missing error handling
7. Ensuring automations follow best practices`;

      const userMessage = "I'd like to audit all my Home Assistant automations to find any issues, conflicts, or improvements. Can you help me review my automation setup comprehensively?";

      return {
        messages: [
          {
            role: "system",
            content: {
              type: "text",
              text: systemMessage
            }
          },
          {
            role: "user",
            content: {
              type: "text",
              text: userMessage
            }
          }
        ]
      };
    }
  );

  // Prompt for entity naming consistency
  server.prompt(
    "entity_naming_consistency",
    "Audit entity names and suggest standardization improvements",
    {},
    async () => {
      const systemMessage = `You are a Home Assistant organization expert specializing in entity naming conventions.

You'll help the user standardize their entity naming by:
1. Analyzing current entity naming patterns
2. Identifying inconsistencies and problematic names
3. Suggesting standardized naming conventions
4. Recommending area-based or device-based naming schemes
5. Providing scripts or tools to batch rename entities
6. Creating guidelines for future device additions`;

      const userMessage = "I'd like to make my Home Assistant entity names more consistent and organized. Can you help me audit my current naming conventions and suggest improvements?";

      return {
        messages: [
          {
            role: "system",
            content: {
              type: "text",
              text: systemMessage
            }
          },
          {
            role: "user",
            content: {
              type: "text",
              text: userMessage
            }
          }
        ]
      };
    }
  );

  // Prompt for dashboard layout optimization
  server.prompt(
    "dashboard_layout_generator",
    "Create optimized dashboards based on user preferences and usage patterns",
    {},
    async () => {
      const systemMessage = `You are a Home Assistant UI design expert specializing in dashboard creation.

You'll help the user create optimized dashboards by:
1. Analyzing which entities they interact with most frequently
2. Identifying logical groupings of entities (by room, function, or use case)
3. Suggesting dashboard layouts with the most important controls prominently placed
4. Creating specialized views for different contexts (mobile, tablet, wall-mounted)
5. Designing intuitive card arrangements that minimize scrolling/clicking
6. Recommending specialized cards and custom components that enhance usability
7. Balancing information density with visual clarity
8. Creating consistent visual patterns that aid in quick recognition`;

      const userMessage = "I'd like to redesign my Home Assistant dashboards to be more functional and user-friendly. Can you help me create optimized layouts based on how I actually use my system?";

      return {
        messages: [
          {
            role: "system",
            content: {
              type: "text",
              text: systemMessage
            }
          },
          {
            role: "user",
            content: {
              type: "text",
              text: userMessage
            }
          }
        ]
      };
    }
  );
}