// API Configuration
// Edit this file to change API endpoints and configuration

export const API_CONFIG = {
  BASE_URL: "https://learnos-server.onrender.com", // Change this to your backend URL
  ENDPOINTS: {
    CPU_SCHEDULING: {
      FCFS: "/api/cpu/fcfs",
      SJF: "/api/cpu/sjf",
      PRIORITY: "/api/cpu/priority",
      ROUND_ROBIN: "/api/cpu/round-robin",
      MLFQ: "/api/cpu/mlfq",
    },
    // Future OS endpoints can be added here
    MEMORY: {
      // PAGINATION: '/api/memory/pagination',
      // SEGMENTATION: '/api/memory/segmentation',
    },
    DISK: {
      // FCFS: '/api/disk/fcfs',
      // SSTF: '/api/disk/sstf',
    },
  },
  TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 3,
};

// Request headers
export const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json",
};

// API Response status codes
export const API_STATUS = {
  SUCCESS: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
} as const;
