// src/config/config.js

// Configuration de l'API
export const API_CONFIG = {
  // URL de base de l'API qui peut être facilement changée à un seul endroit
  BASE_URL: "http://192.168.1.88:8080", // Remplacez par votre IP réelle ou une variable d'environnement
  TIMEOUT: 15000, // 15 secondes
  
  // Points de terminaison de l'API
  ENDPOINTS: {
    // Auth
    AUTH: {
      LOGIN: "/api/auth/login",
      REGISTER: "/api/auth/register",
      LOGOUT: "/api/auth/logout",
      VALIDATE_TOKEN: "/api/auth/validate"
    },
    
    // Users
    USERS: {
      ME: "/api/users/me",
      SEARCH: "/api/users/search",
      BY_ID: (id) => `/api/users/${id}`,
      PROFILE: (id) => `/api/users/${id}/profile`
    },
    
    // Friends
    FRIENDS: {
      LIST: "/api/friends",
      PENDING: "/api/friends/pending",
      REQUEST: (userId) => `/api/friends/request/${userId}`,
      ACCEPT: (requestId) => `/api/friends/accept/${requestId}`,
      REJECT: (requestId) => `/api/friends/reject/${requestId}`,
      REMOVE: (friendId) => `/api/friends/${friendId}`
    },
    
    // Messages
    MESSAGES: {
      LIST: "/api/messages",
      SEND: "/api/messages",
      BY_CONVERSATION: (conversationId) => `/api/messages/${conversationId}`
    },
    
    // Health
    HEALTH: "/health"
  }
};

// Fonction utilitaire pour construire des URLs complètes
export const buildUrl = (endpoint) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Exportez d'autres configurations au besoin
export default API_CONFIG;