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
    "Get the current state of a specific Home Assistant entity",
    {
      entity_id: z.string().describe("The entity ID (e.g., 'light.living_room', 'sensor.temperature')")
    },
    async ({ entity_id }) => {  
      const result = await getHomeAssistantState(entity_id);
      
      if (!result.success) {
        return formatErrorResponse(`Failed to get entity state: ${result.message}`);
      }
      
      const entity = result.data;
      
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

  // Tool to list all entities and their states
  server.tool(
    "homeassistant_list_all_entities",  
    "Get a list of all entities and their current states in Home Assistant",
    {
      domain: z.string().optional().describe("Optional: Filter by domain (e.g., 'light', 'sensor', 'switch')")
    },
    async ({ domain }) => {  
      const result = await getAllStates();
      
      if (!result.success) {
        return formatErrorResponse(`Failed to get all states: ${result.message}`);
      }
      
      let entities = result.data;
      
      // Filter by domain if specified
      if (domain) {
        entities = entities.filter((entity: any) => entity.entity_id.startsWith(`${domain}.`));
      }
      
      if (entities.length === 0) {
        return formatSuccessResponse(domain ? `No entities found for domain: ${domain}` : "No entities found");
      }
      
      // Group entities by domain
      const entitiesByDomain: { [key: string]: any[] } = {};
      entities.forEach((entity: any) => {
        const entityDomain = entity.entity_id.split('.')[0];
        if (!entitiesByDomain[entityDomain]) {
          entitiesByDomain[entityDomain] = [];
        }
        entitiesByDomain[entityDomain].push(entity);
      });
      
      const output = [`Found ${entities.length} entities:`, ""];
      
      Object.entries(entitiesByDomain).forEach(([domainName, domainEntities]) => {
        output.push(`## ${domainName.toUpperCase()} (${domainEntities.length} entities)`);
        domainEntities.forEach((entity: any) => {
          output.push(`- ${entity.entity_id}: ${entity.state} (${entity.attributes?.friendly_name || 'No name'})`);
        });
        output.push("");
      });
      
      return formatSuccessResponse(output.join('\n'));
    }
  );

  // Enhanced tool to call Home Assistant services
  server.tool(
    "homeassistant_call_service",  
    "Call a Home Assistant service with support for multiple entities and custom parameters",
    {
      domain: z.string().describe("The service domain (e.g., 'light', 'switch', 'climate')"),
      service: z.string().describe("The service to call (e.g., 'turn_on', 'turn_off', 'set_temperature')"),
      entity_id: z.union([
        z.string(), 
        z.array(z.string())
      ]).optional().describe("The entity ID(s) to target (optional for some services)"),
      service_data: z.record(z.any()).optional().describe("Additional service parameters (e.g., brightness, temperature, color)")
    },
    async ({ domain, service, entity_id, service_data = {} }) => {  
      // Prepare service data
      const requestData: any = { ...service_data };
      
      if (entity_id) {
        requestData.entity_id = entity_id;
      }
      
      const result = await callHomeAssistantService(domain, service, requestData);
      
      if (!result.success) {
        return formatErrorResponse(`Failed to call service ${domain}.${service}: ${result.message}`);
      }
      
      const response = result.data;
      
      // Format response based on what we get back
      if (Array.isArray(response) && response.length > 0) {
        const entityInfo = response.map((entity: any) => 
          `${entity.entity_id}: ${entity.state} (${entity.attributes?.friendly_name || 'Unknown'})`
        ).join('\n');
        
        return formatSuccessResponse(
          `Service ${domain}.${service} called successfully!\n\nUpdated entities:\n${entityInfo}`
        );
      } else {
        return formatSuccessResponse(
          `Service ${domain}.${service} called successfully!${entity_id ? ` Target: ${Array.isArray(entity_id) ? entity_id.join(', ') : entity_id}` : ''}`
        );
      }
    }
  );

  // Tool to get available services
  server.tool(
    "homeassistant_list_services",  
    "Get a list of all available services in Home Assistant",
    {
      domain: z.string().optional().describe("Optional: Filter by specific domain")
    },
    async ({ domain }) => {  
      const result = await getServices();
      
      if (!result.success) {
        return formatErrorResponse(`Failed to get services: ${result.message}`);
      }
      
      const services = result.data;
      let output = ["Available Services:", ""];
      
      if (domain && services[domain]) {
        output.push(`## ${domain.toUpperCase()}`);
        Object.entries(services[domain]).forEach(([serviceName, serviceInfo]: [string, any]) => {
          output.push(`### ${serviceName}`);
          if (serviceInfo.description) {
            output.push(`  Description: ${serviceInfo.description}`);
          }
          if (serviceInfo.fields && Object.keys(serviceInfo.fields).length > 0) {
            output.push(`  Parameters:`);
            Object.entries(serviceInfo.fields).forEach(([fieldName, fieldInfo]: [string, any]) => {
              output.push(`    - ${fieldName}: ${fieldInfo.description || 'No description'}`);
            });
          }
          output.push("");
        });
      } else {
        Object.entries(services).forEach(([domainName, domainServices]: [string, any]) => {
          output.push(`## ${domainName.toUpperCase()}`);
          Object.keys(domainServices).forEach((serviceName: string) => {
            output.push(`- ${serviceName}`);
          });
          output.push("");
        });
      }
      
      return formatSuccessResponse(output.join('\n'));
    }
  );

  // Tool to get Home Assistant configuration
  server.tool(
    "homeassistant_get_config",  
    "Get Home Assistant configuration information",
    {},
    async () => {  
      const result = await getConfig();
      
      if (!result.success) {
        return formatErrorResponse(`Failed to get configuration: ${result.message}`);
      }
      
      const config = result.data;
      
      const configInfo = [
        "Home Assistant Configuration:",
        "",
        `Version: ${config.version}`,
        `Location: ${config.location_name}`,
        `Latitude: ${config.latitude}`,
        `Longitude: ${config.longitude}`,
        `Elevation: ${config.elevation}m`,
        `Unit System: ${config.unit_system?.length || 'metric'} / ${config.unit_system?.temperature || 'celsius'}`,
        `Time Zone: ${config.time_zone}`,
        `Currency: ${config.currency}`,
        `Country: ${config.country}`,
        `Language: ${config.language}`,
        "",
        "Components:",
        config.components ? config.components.slice(0, 20).join(', ') + (config.components.length > 20 ? '...' : '') : 'None listed'
      ];
      
      return formatSuccessResponse(configInfo.join('\n'));
    }
  );
}