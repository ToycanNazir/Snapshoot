import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { uuidv4 } from '../utils/uuid';
// URL de base de l'API Gateway
// Modifiez cette URL pour correspondre à votre API Gateway
// const API_BASE_URL = 'http://10.0.2.2:3000'; // Pour l'émulateur Android
// const API_BASE_URL = 'http://localhost:3000'; // Pour iOS simulator
import { API_BASE_URL } from '../config/api';

class ApiClient {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 60000, // Augmentation du timeout à 15 secondes
    });
    
    // Intercepteur pour ajouter le token à chaque requête
    this.client.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
    
    // Intercepteur pour gérer les erreurs globalement
    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      async (error) => {
        // Gérer les erreurs 401 (non autorisé)
        if (error.response && error.response.status === 401) {
          // Supprimer le token et rediriger vers la page de connexion
          await AsyncStorage.removeItem('auth_token');
          await AsyncStorage.removeItem('user');
          
          // Vous devriez implémenter un mécanisme pour notifier l'application
          // de rediriger vers l'écran de connexion
        }
        
        return Promise.reject(error);
      }
    );
  }
  
  // Méthode pour vérifier la connexion à l'API
  async checkApiConnection() {
    try {
      const response = await this.client.get('/health');
      console.log('API Gateway status:', response.data);
      return true;
    } catch (error) {
      console.error('Impossible de se connecter à l\'API Gateway:', error);
      Alert.alert(
        'Erreur de connexion',
        'Impossible de se connecter au serveur. Vérifiez votre connexion réseau ou réessayez plus tard.',
        [{ text: 'OK' }]
      );
      return false;
    }
  }
  
  // Méthodes HTTP
  async get(url, config = {}) {
    try {
      const response = await this.client.get(url, config);
      return response.data;
    } catch (error) {
      this._handleError(error);
      throw error;
    }
  }
  
  async post(url, data = {}, config = {}) {
    try {
      console.log(`POST request to ${url} with data:`, data);
      const response = await this.client.post(url, data, config);
      console.log(`Response from ${url}:`, response.data);
      return response.data;
    } catch (error) {
      this._handleError(error);
      throw error;
    }
  }
  
  async put(url, data = {}, config = {}) {
    try {
      const response = await this.client.put(url, data, config);
      return response.data;
    } catch (error) {
      this._handleError(error);
      throw error;
    }
  }
  
  async delete(url, config = {}) {
    try {
      const response = await this.client.delete(url, config);
      return response.data;
    } catch (error) {
      this._handleError(error);
      throw error;
    }
  }
  
  // Upload de fichiers
  async uploadFile(url, file, onProgress, additionalData = {}) {
    try {
      const formData = new FormData();
      
      // Ajouter le fichier
      formData.append('file', {
        uri: file.uri,
        name: file.name || `file-${Date.now()}${file.uri.substring(file.uri.lastIndexOf('.'))}`,
        type: file.type || 'application/octet-stream'
      });
      
      // Ajouter les données supplémentaires
      Object.keys(additionalData).forEach(key => {
        formData.append(key, additionalData[key]);
      });
      
      const response = await this.client.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percentCompleted);
          }
        }
      });
      
      return response.data;
    } catch (error) {
      this._handleError(error);
      throw error;
    }
  }
  
  // Gestion d'erreur
  _handleError(error) {
    // Journalisation de l'erreur
    if (error.response) {
      // La requête a été faite et le serveur a répondu avec un code d'état
      console.error('API Error Response:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
    } else if (error.request) {
      // La requête a été faite mais pas de réponse
      console.error('API Error Request:', error.request);
    } else {
      // Une erreur s'est produite lors de la configuration de la requête
      console.error('API Error Setup:', error.message);
    }
  }
  
  // Fonctions d'authentification
  async login(email, password) {
    try {
      const response = await this.post('/api/auth/login', { email, password });
      
      if (response.token && response.user) {
        await AsyncStorage.setItem('auth_token', response.token);
        await AsyncStorage.setItem('user', JSON.stringify(response.user));
        
        // Stocker le profil s'il existe
        if (response.profile) {
          await AsyncStorage.setItem('user_profile', JSON.stringify(response.profile));
        }
      }
      
      return response;
    } catch (error) {
      this._handleError(error);
      throw error;
    }
  }
  
  async register(email, password, displayName) {
    try {
      // Alignement avec le backend: le contrôleur attend email, password, displayName
      const response = await this.post('/api/auth/register', { 
        email, 
        password, 
        displayName 
      });
      
      if (response.token && response.user) {
        await AsyncStorage.setItem('auth_token', response.token);
        await AsyncStorage.setItem('user', JSON.stringify(response.user));
      }
      
      return response;
    } catch (error) {
      this._handleError(error);
      throw error;
    }
  }
  
  async logout() {
    try {
      await this.post('/api/auth/logout');
      
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('user_profile');
      
      return { success: true };
    } catch (error) {
      // Même en cas d'erreur, on supprime les données locales
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('user_profile');
      
      this._handleError(error);
      throw error;
    }
  }
  
  // Récupération du profil utilisateur
  async getUserProfile() {
    try {
      const response = await this.get('/api/users/me');
      
      if (response.user && (response.user.profile || response.profile)) {
        const profileData = response.user.profile || response.profile;
        await AsyncStorage.setItem('user_profile', JSON.stringify(profileData));
        return profileData;
      }
      
      return null;
    } catch (error) {
      this._handleError(error);
      throw error;
    }
  }
  
  // Mise à jour du profil utilisateur
  async updateUserProfile(profileData) {
    try {
      const response = await this.put('/api/users/me', profileData);
      
      if (response.profile) {
        await AsyncStorage.setItem('user_profile', JSON.stringify(response.profile));
        return response.profile;
      }
      
      return null;
    } catch (error) {
      this._handleError(error);
      throw error;
    }
  }



async isOfflineMode() {
  try {
    const value = await AsyncStorage.getItem('offline_mode');
    return value === 'true';
  } catch (error) {
    console.error('Erreur lors de la vérification du mode hors ligne:', error);
    return false;
  }
}

// Activer/désactiver le mode hors ligne
async setOfflineMode(enabled) {
  try {
    await AsyncStorage.setItem('offline_mode', enabled ? 'true' : 'false');
    console.log(`Mode hors ligne ${enabled ? 'activé' : 'désactivé'}`);
    return true;
  } catch (error) {
    console.error('Erreur lors de la configuration du mode hors ligne:', error);
    return false;
  }
}

// Récupérer l'utilisateur courant
async getCurrentUser() {
  try {
    const userData = await AsyncStorage.getItem('user');
    if (!userData) {
      throw new Error('Utilisateur non connecté');
    }
    return JSON.parse(userData);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    throw error;
  }
}

// Mettre en cache une conversation
async _cacheConversation(conversation) {
  try {
    // Récupérer le cache existant
    const cachedConversationsData = await AsyncStorage.getItem('cached_conversations');
    let cachedConversations = cachedConversationsData ? JSON.parse(cachedConversationsData) : [];
    
    // Vérifier si la conversation existe déjà
    const existingIndex = cachedConversations.findIndex(c => c.id === conversation.id);
    
    if (existingIndex !== -1) {
      // Mettre à jour la conversation existante
      cachedConversations[existingIndex] = {
        ...cachedConversations[existingIndex],
        ...conversation
      };
    } else {
      // Ajouter la nouvelle conversation
      cachedConversations.push(conversation);
    }
    
    // Sauvegarder le cache mis à jour
    await AsyncStorage.setItem('cached_conversations', JSON.stringify(cachedConversations));
  } catch (error) {
    console.error('Erreur lors de la mise en cache de la conversation:', error);
  }
}












  
}

export const apiClient = new ApiClient();