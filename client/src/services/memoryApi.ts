import axios from 'axios'
import { MemoryRequest, MemoryApiResponse } from '@/types/memory'
import { API_CONFIG, DEFAULT_HEADERS } from '@/config/api'

const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: 30000,
  headers: DEFAULT_HEADERS,
})

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`)
    return config
  },
  (error) => {
    console.error('Request error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    console.log('Response received:', response.status)
    return response
  },
  (error) => {
    console.error('Response error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

export const memoryApi = {
  healthCheck: async (): Promise<{ data: { status: string }, message?: string }> => {
    try {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.MEMORY.HEALTH)
      return response.data
    } catch (error) {
      throw error
    }
  },

  linearAllocation: async (request: MemoryRequest): Promise<MemoryApiResponse> => {
    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.MEMORY.LINEAR, request)
      return response.data
    } catch (error) {
      throw error
    }
  },

  segmentation: async (request: MemoryRequest): Promise<MemoryApiResponse> => {
    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.MEMORY.SEGMENTATION, request)
      return response.data
    } catch (error) {
      throw error
    }
  },

  paging: async (request: MemoryRequest): Promise<MemoryApiResponse> => {
    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.MEMORY.PAGING, request)
      return response.data
    } catch (error) {
      throw error
    }
  },

  multiLevelPaging: async (request: MemoryRequest): Promise<MemoryApiResponse> => {
    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.MEMORY.MULTI_LEVEL_PAGING, request)
      return response.data
    } catch (error) {
      throw error
    }
  },

  getAlgorithms: async () => {
    try {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.MEMORY.ALGORITHMS)
      return response.data
    } catch (error) {
      throw error
    }
  }
}

export const handleApiError = (error: any): string => {
  if (error.response) {
    return error.response.data?.detail || error.response.data?.message || 'Server error occurred'
  } else if (error.request) {
    return 'Unable to connect to server. Please check if the server is running.'
  } else {
    return error.message || 'An unexpected error occurred'
  }
}

export default memoryApi