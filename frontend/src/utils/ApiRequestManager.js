// frontend/src/utils/ApiRequestManager.js
import axios from 'axios';

class ApiRequestManager {
  constructor(baseURL, options = {}) {
    this.baseURL = baseURL;
    this.timeout = options.timeout || 10000; // 10 seconds default
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.queue = [];
    this.processing = false;
    this.maxConcurrent = options.maxConcurrent || 2;
    this.activeRequests = 0;
    
    // Create axios instance with defaults
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
      }
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      config => {
        console.log(`API Request: ${config.method.toUpperCase()} ${config.url}`);
        return config;
      },
      error => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      response => response,
      async error => {
        const { config, response } = error;
        
        if (!config || !config.retry) {
          return Promise.reject(error);
        }

        config.retryCount = config.retryCount || 0;

        if (config.retryCount >= this.retryAttempts) {
          return Promise.reject(error);
        }

        config.retryCount++;
        
        // Exponential backoff
        const delay = this.retryDelay * Math.pow(2, config.retryCount - 1);
        
        console.log(`Retrying request (${config.retryCount}/${this.retryAttempts}) after ${delay}ms`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return this.client(config);
      }
    );
  }

  async request(method, url, data = null, options = {}) {
    return new Promise((resolve, reject) => {
      const request = async () => {
        if (this.activeRequests >= this.maxConcurrent) {
          // Queue the request
          this.queue.push({ method, url, data, options, resolve, reject });
          return;
        }

        this.activeRequests++;

        try {
          const config = {
            method,
            url,
            ...options,
            retry: options.retry !== false, // Enable retry by default
          };

          if (data) {
            config.data = data;
          }

          const response = await this.client(config);
          resolve(response.data);
        } catch (error) {
          // Enhanced error handling
          if (error.code === 'ECONNABORTED') {
            reject(new Error('Request timeout - API is taking too long to respond'));
          } else if (error.response) {
            // Server responded with error
            reject({
              status: error.response.status,
              message: error.response.data?.detail || error.message,
              data: error.response.data
            });
          } else if (error.request) {
            // No response received
            reject(new Error('No response from server - please check if backend is running'));
          } else {
            reject(error);
          }
        } finally {
          this.activeRequests--;
          this.processQueue();
        }
      };

      request();
    });
  }

  processQueue() {
    if (this.queue.length > 0 && this.activeRequests < this.maxConcurrent) {
      const { method, url, data, options, resolve, reject } = this.queue.shift();
      this.request(method, url, data, options).then(resolve).catch(reject);
    }
  }

  // Convenience methods
  get(url, options) {
    return this.request('GET', url, null, options);
  }

  post(url, data, options) {
    return this.request('POST', url, data, options);
  }

  put(url, data, options) {
    return this.request('PUT', url, data, options);
  }

  delete(url, options) {
    return this.request('DELETE', url, null, options);
  }

  // Cancel all pending requests
  cancelAll() {
    this.queue = [];
    console.log('All queued requests cancelled');
  }
}

export default ApiRequestManager;