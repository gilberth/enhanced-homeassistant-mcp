import axios, { AxiosResponse } from "axios";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  statusCode?: number;
  message?: string;
  error?: any;
}

/**
 * Helper function to format error responses for tools
 */
export function formatErrorResponse(message: string) {
  return {
    content: [{ 
      type: "text" as const, 
      text: message 
    }],
    isError: true
  };
}

/**
 * Helper function to format success responses for tools
 */
export function formatSuccessResponse(text: string) {
  return {
    content: [{ 
      type: "text" as const, 
      text: text 
    }]
  };
}

/**
 * Get axios configuration with Home Assistant authentication
 */
function getAxiosConfig() {
  const bearerToken = process.env.HOME_ASSISTANT_TOKEN;
  const timeout = parseInt(process.env.REQUEST_TIMEOUT || '10000');

  if (!bearerToken) {
    throw new Error('HOME_ASSISTANT_TOKEN environment variable is not set');
  }

  return {
    headers: {
      'Authorization': `Bearer ${bearerToken}`,
      'Content-Type': 'application/json'
    },
    timeout
  };
}

/**
 * Generic function to make GET requests to Home Assistant API
 */
export async function makeGetRequest<T = any>(endpoint: string): Promise<ApiResponse<T>> {
  try {
    const url = `${process.env.HOME_ASSISTANT_URL}${endpoint}`;
    console.error(`Making GET request to: ${url}`);
    
    const config = getAxiosConfig();
    const response: AxiosResponse<T> = await axios.get(url, config);
    
    return { 
      data: response.data,
      success: true,
      statusCode: response.status
    };
  } catch (error: any) {
    console.error(`Failed to make GET request to ${endpoint}: ${error.message}`);
    return handleApiError(error);
  }
}

/**
 * Generic function to make POST requests to Home Assistant API
 */
export async function makePostRequest<T = any>(endpoint: string, data: any = {}): Promise<ApiResponse<T>> {
  try {
    const url = `${process.env.HOME_ASSISTANT_URL}${endpoint}`;
    console.error(`Making POST request to: ${url}`);
    
    const config = getAxiosConfig();
    const response: AxiosResponse<T> = await axios.post(url, data, config);
    
    return { 
      data: response.data,
      success: true,
      statusCode: response.status
    };
  } catch (error: any) {
    console.error(`Failed to make POST request to ${endpoint}: ${error.message}`);
    return handleApiError(error);
  }
}

/**
 * Handle API errors in a consistent way
 */
function handleApiError(error: any): ApiResponse {
  if (error.response) {
    return {
      success: false,
      statusCode: error.response.status,
      message: error.response.data?.message || error.message,
      error: error.response.data
    };
  }
  
  return {
    success: false,
    message: error.message,
    error
  };
}

// Specific API functions

/**
 * Verify if Home Assistant API is online
 */
export async function getHomeAssistantApi(): Promise<ApiResponse> {
  return makeGetRequest('/api/');
}

/**
 * Get the state of a Home Assistant entity
 */
export async function getHomeAssistantState(entity_id: string): Promise<ApiResponse> {
  return makeGetRequest(`/api/states/${entity_id}`);
}

/**
 * Get all states from Home Assistant
 */
export async function getAllStates(): Promise<ApiResponse> {
  return makeGetRequest('/api/states');
}

/**
 * Call a Home Assistant service
 */
export async function callHomeAssistantService(
  domain: string, 
  service: string, 
  serviceData: any = {}
): Promise<ApiResponse> {
  return makePostRequest(`/api/services/${domain}/${service}`, serviceData);
}

/**
 * Get all available services
 */
export async function getServices(): Promise<ApiResponse> {
  return makeGetRequest('/api/services');
}

/**
 * Get Home Assistant configuration
 */
export async function getConfig(): Promise<ApiResponse> {
  return makeGetRequest('/api/config');
}

/**
 * Get events from Home Assistant
 */
export async function getEvents(): Promise<ApiResponse> {
  return makeGetRequest('/api/events');
}

/**
 * Get error log
 */
export async function getErrorLog(): Promise<ApiResponse> {
  return makeGetRequest('/api/error_log');
}

/**
 * Get logbook entries
 */
export async function getLogbook(entity?: string, start_time?: string, end_time?: string): Promise<ApiResponse> {
  let endpoint = '/api/logbook';
  const params = new URLSearchParams();
  
  if (entity) params.append('entity', entity);
  if (start_time) params.append('start_time', start_time);
  if (end_time) params.append('end_time', end_time);
  
  if (params.toString()) {
    endpoint += `?${params.toString()}`;
  }
  
  return makeGetRequest(endpoint);
}

/**
 * Get history for entities
 */
export async function getHistory(
  filter_entity_id?: string,
  start_time?: string,
  end_time?: string,
  minimal_response?: boolean
): Promise<ApiResponse> {
  let endpoint = '/api/history/period';
  if (start_time) {
    endpoint += `/${start_time}`;
  }
  
  const params = new URLSearchParams();
  if (filter_entity_id) params.append('filter_entity_id', filter_entity_id);
  if (end_time) params.append('end_time', end_time);
  if (minimal_response) params.append('minimal_response', 'true');
  
  if (params.toString()) {
    endpoint += `?${params.toString()}`;
  }
  
  return makeGetRequest(endpoint);
}

/**
 * Check Home Assistant configuration
 */
export async function checkConfig(): Promise<ApiResponse> {
  return makePostRequest('/api/config/core/check_config');
}

/**
 * Restart Home Assistant
 */
export async function restartHomeAssistant(): Promise<ApiResponse> {
  return makePostRequest('/api/services/homeassistant/restart');
}

/**
 * Stop Home Assistant
 */
export async function stopHomeAssistant(): Promise<ApiResponse> {
  return makePostRequest('/api/services/homeassistant/stop');
}

/**
 * Get template result
 */
export async function renderTemplate(template: string): Promise<ApiResponse> {
  return makePostRequest('/api/template', { template });
}