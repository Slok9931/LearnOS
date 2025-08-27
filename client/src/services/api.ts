import axios, { AxiosResponse } from "axios";
import { API_CONFIG, DEFAULT_HEADERS } from "@/config/api";
import { Process, SchedulingRequest, SchedulingResult } from "@/types/scheduling";

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: DEFAULT_HEADERS,
  withCredentials: false,
});

// Request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    console.log(
      `Making ${config.method?.toUpperCase()} request to ${config.baseURL}${config.url}`
    );
    console.log('Request data:', config.data);
    return config;
  },
  (error) => {
    console.error("Request error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log(`Response received:`, response.status, response.data);
    return response;
  },
  (error) => {
    console.error("Response error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Convert frontend process format to what backend expects
const prepareRequestData = (request: SchedulingRequest) => {
  return {
    processes: request.processes.map(p => ({
      id: p.id,  // Keep as 'id' - backend will handle conversion
      arrival_time: p.arrival_time,
      burst_time: p.burst_time,
      priority: p.priority || 0,
    })),
    context_switch_cost: request.context_switch_cost || 0.5,
    time_quantum: request.time_quantum,
    preemptive: request.preemptive,
    mlfq_config: request.mlfq_config,
  };
};

// CPU Scheduling API functions
export const schedulingApi = {
  // Health check
  healthCheck: async (): Promise<{ status: string; message?: string }> => {
    try {
      const response: AxiosResponse<any> = await apiClient.get('/health');
      return { 
        status: response.data.status === 'healthy' ? 'healthy' : 'unhealthy',
        message: response.data.message 
      };
    } catch (error) {
      console.error('Health check failed:', error);
      return { 
        status: 'unhealthy', 
        message: 'Server is not responding' 
      };
    }
  },

  // Test connection
  testConnection: async (): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await apiClient.get('/api/info');
      return { 
        success: true, 
        message: response.data.name || 'Connection successful' 
      };
    } catch (error: any) {
      return { 
        success: false, 
        message: handleApiError(error) 
      };
    }
  },

  // First Come First Serve
  fcfs: async (data: SchedulingRequest): Promise<SchedulingResult> => {
    const requestData = prepareRequestData(data);
    console.log('FCFS Request data being sent:', requestData);
    
    const response: AxiosResponse<any> = await apiClient.post(
      API_CONFIG.ENDPOINTS.CPU_SCHEDULING.FCFS,
      requestData
    );
    return response.data;
  },

  // Shortest Job First
  sjf: async (data: SchedulingRequest): Promise<SchedulingResult> => {
    const requestData = prepareRequestData(data);
    console.log('SJF Request data being sent:', requestData);
    
    const response: AxiosResponse<any> = await apiClient.post(
      API_CONFIG.ENDPOINTS.CPU_SCHEDULING.SJF,
      requestData
    );
    return response.data;
  },

  // Priority Scheduling
  priority: async (data: SchedulingRequest): Promise<SchedulingResult> => {
    const requestData = prepareRequestData(data);
    console.log('Priority Request data being sent:', requestData);
    
    const response: AxiosResponse<any> = await apiClient.post(
      API_CONFIG.ENDPOINTS.CPU_SCHEDULING.PRIORITY,
      requestData
    );
    return response.data;
  },

  // Round Robin
  roundRobin: async (data: SchedulingRequest): Promise<SchedulingResult> => {
    const requestData = prepareRequestData(data);
    console.log('Round Robin Request data being sent:', requestData);
    
    // Validate time quantum for Round Robin
    if (!requestData.time_quantum || requestData.time_quantum <= 0) {
      throw new Error("Time quantum must be specified and greater than 0 for Round Robin scheduling");
    }
    
    const response: AxiosResponse<any> = await apiClient.post(
      API_CONFIG.ENDPOINTS.CPU_SCHEDULING.ROUND_ROBIN,
      requestData
    );
    return response.data;
  },

  // Multi-Level Feedback Queue
  mlfq: async (data: SchedulingRequest): Promise<SchedulingResult> => {
    const requestData = prepareRequestData(data);
    console.log('MLFQ Request data being sent:', requestData);
    
    // Ensure MLFQ config exists
    if (!requestData.mlfq_config) {
      requestData.mlfq_config = {
        num_queues: 3,
        time_quantums: [2.0, 4.0, 8.0],
        aging_threshold: 10,
        boost_interval: 100
      };
    }
    
    const response: AxiosResponse<any> = await apiClient.post(
      API_CONFIG.ENDPOINTS.CPU_SCHEDULING.MLFQ,
      requestData
    );
    return response.data;
  },

  // Get supported algorithms
  getAlgorithms: async (): Promise<any> => {
    const response: AxiosResponse<any> = await apiClient.get('/api/cpu/algorithms');
    return response.data;
  },
};

// Generic API error handler
export const handleApiError = (error: any): string => {
  if (error.response) {
    // Server responded with error status
    const status = error.response.status;
    const detail = error.response.data?.detail || error.response.data?.message || "Unknown error";
    
    switch (status) {
      case 400:
        return `Bad Request: ${detail}`;
      case 404:
        return "API endpoint not found";
      case 422:
        return `Validation Error: ${detail}`;
      case 500:
        return `Internal server error: ${detail}`;
      default:
        return `Server error (${status}): ${detail}`;
    }
  } else if (error.request) {
    // Network error
    return "Network error. Please check your connection and server status.";
  } else if (error.code === 'ERR_NETWORK') {
    return "Cannot connect to server. Make sure the server is running on http://localhost:5000";
  } else {
    // Other error
    return error.message || "An unexpected error occurred";
  }
};

// Default export
export default schedulingApi;
