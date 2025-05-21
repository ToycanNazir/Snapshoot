import AsyncStorage from '@react-native-async-storage/async-storage';
import { SERVER_IP } from '../config/api'; // Import de la configuration

let socket = null;
let reconnectTimer = null;
let eventListeners = {};

// Initialiser la connexion WebSocket
export const initWebSocket = async () => {
  try {
    // Fermer la connexion existante si elle existe
    if (socket) {
      socket.close();
    }
    
    // Récupérer le token d'authentification
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) {
      console.error('Token d\'authentification non disponible');
      return false;
    }
    
    // URL du serveur WebSocket utilisant la configuration centralisée
    const wsUrl = `ws://${SERVER_IP}/api/ws?token=${token}`;
    
    // Créer une nouvelle connexion WebSocket
    socket = new WebSocket(wsUrl);
    
    // Événement d'ouverture de connexion
    socket.onopen = () => {
      console.log('WebSocket connecté');
      
      // Envoyer un ping périodique pour maintenir la connexion
      setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000); // Toutes les 30 secondes
      
      // Effacer le timer de reconnexion si la connexion est réussie
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };
    
    // Événement de réception de message
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Distribuer le message aux écouteurs appropriés
        if (data.type && eventListeners[data.type]) {
          eventListeners[data.type].forEach(listener => {
            listener(data);
          });
        }
        
        // Distribuer aux écouteurs de tous les messages
        if (eventListeners['all']) {
          eventListeners['all'].forEach(listener => {
            listener(data);
          });
        }
      } catch (error) {
        console.error('Erreur lors du traitement du message WebSocket:', error);
      }
    };
    
    // Événement de fermeture de connexion
    socket.onclose = (event) => {
      console.log(`WebSocket déconnecté: ${event.code} ${event.reason}`);
      
      // Tenter de se reconnecter après un délai
      if (!reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          initWebSocket();
        }, 5000); // Reconnecter après 5 secondes
      }
    };
    
    // Événement d'erreur
    socket.onerror = (error) => {
      console.error('Erreur WebSocket:', error);
    };
    
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'initialisation du WebSocket:', error);
    return false;
  }
};

// Fermer la connexion WebSocket
export const closeWebSocket = () => {
  if (socket) {
    socket.close();
    socket = null;
  }
  
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  
  eventListeners = {};
};

// Ajouter un écouteur d'événement
export const addEventListener = (type, callback) => {
  if (!eventListeners[type]) {
    eventListeners[type] = [];
  }
  
  eventListeners[type].push(callback);
};

// Supprimer un écouteur d'événement
export const removeEventListener = (type, callback) => {
  if (eventListeners[type]) {
    eventListeners[type] = eventListeners[type].filter(listener => listener !== callback);
  }
};

// Envoyer un message
export const sendMessage = (message) => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
    return true;
  }
  
  return false;
};