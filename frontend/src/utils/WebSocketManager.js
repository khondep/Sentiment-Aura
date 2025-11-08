// frontend/src/utils/WebSocketManager.js
// This is optional - only if you want to replace Deepgram's WebSocket handling
class WebSocketManager {
    constructor(url, options = {}) {
      this.url = url;
      this.options = options;
      this.ws = null;
      this.reconnectAttempts = 0;
      this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
      this.reconnectInterval = options.reconnectInterval || 1000;
      this.listeners = {};
      this.isIntentionallyClosed = false;
    }
  
    connect() {
      return new Promise((resolve, reject) => {
        try {
          this.ws = new WebSocket(this.url);
          
          this.ws.onopen = (event) => {
            console.log('WebSocket connected');
            this.reconnectAttempts = 0;
            this.emit('open', event);
            resolve(this.ws);
          };
  
          this.ws.onmessage = (event) => {
            this.emit('message', event);
          };
  
          this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.emit('error', error);
            reject(error);
          };
  
          this.ws.onclose = (event) => {
            console.log('WebSocket closed');
            this.emit('close', event);
            
            if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
              this.reconnect();
            }
          };
        } catch (error) {
          reject(error);
        }
      });
    }
  
    reconnect() {
      this.reconnectAttempts++;
      const delay = Math.min(
        this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
        30000
      );
      
      console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.emit('reconnecting', { attempt: this.reconnectAttempts, delay });
      
      setTimeout(() => {
        this.connect().catch(err => {
          console.error('Reconnection failed:', err);
        });
      }, delay);
    }
  
    send(data) {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(data);
        return true;
      }
      return false;
    }
  
    close() {
      this.isIntentionallyClosed = true;
      if (this.ws) {
        this.ws.close();
      }
    }
  
    on(event, callback) {
      if (!this.listeners[event]) {
        this.listeners[event] = [];
      }
      this.listeners[event].push(callback);
    }
  
    emit(event, data) {
      if (this.listeners[event]) {
        this.listeners[event].forEach(callback => callback(data));
      }
    }
  
    getReadyState() {
      return this.ws ? this.ws.readyState : WebSocket.CLOSED;
    }
  }
  
  export default WebSocketManager;