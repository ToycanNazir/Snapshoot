// src/api/userApi.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// URL de base de l'API Gateway
const API_BASE_URL = 'http://192.168.1.88:8080'; 

// Client axios avec configuration de base
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 secondes
});

// Intercepteur pour ajouter le token d'authentification
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`API Request: ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour logger les réponses
apiClient.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    if (error.response) {
      console.error(`API Error: ${error.response.status} ${error.config?.url || 'Unknown URL'}`);
    } else if (error.request) {
      console.error(`API Request Error: No response received ${error.config?.url || 'Unknown URL'}`);
    } else {
      console.error(`API Setup Error: ${error.message}`);
    }
    return Promise.reject(error);
  }
);

// Données fictives pour le mode hors-ligne ou si aucun utilisateur n'est trouvé
const MOCK_USERS = [
  {
    id: 'mock-uuid-1',
    display_name: 'Marie Dubois',
    email: 'marie.dubois@example.com',
    profile_image: 'https://randomuser.me/api/portraits/women/12.jpg'
  },
  {
    id: 'mock-uuid-2',
    display_name: 'Paul Martin',
    email: 'paul.martin@example.com',
    profile_image: 'https://randomuser.me/api/portraits/men/32.jpg'
  },
  {
    id: 'mock-uuid-3',
    display_name: 'Claire Fontaine',
    email: 'claire.fontaine@example.com',
    profile_image: 'https://randomuser.me/api/portraits/women/47.jpg'
  }
];

// Récupérer le profil utilisateur
export const getProfile = async (userId) => {
  try {
    console.log('Récupération du profil pour', userId || 'moi-même');
    
    // Si c'est pour l'utilisateur actuel, utilisez la route "me"
    if (!userId || userId === 'me') {
      const response = await apiClient.get('/api/users/me');
      console.log('Réponse du profil (me):', response.data);
      
      // Adapter selon la structure de réponse API
      if (response.data.user && response.data.user.profile) {
        return response.data.user.profile;
      } else if (response.data.user) {
        return response.data.user;
      } else if (response.data.profile) {
        return response.data.profile;
      }
      
      return response.data;
    } else {
      // Pour un utilisateur spécifique, utilisez la route avec l'ID
      const response = await apiClient.get(`/api/users/${userId}`);
      console.log('Réponse du profil (userId):', response.data);
      
      // Adapter selon la structure de réponse API
      if (response.data.user && response.data.user.profile) {
        return response.data.user.profile;
      } else if (response.data.user) {
        return response.data.user;
      } else if (response.data.profile) {
        return response.data.profile;
      }
      
      return response.data;
    }
  } catch (error) {
    console.error('Erreur dans getProfile:', error);
    
    // Profil par défaut en cas d'erreur
    return {
      id: userId || 'unknown',
      display_name: 'Utilisateur',
      bio: '',
      profile_image: null,
      location: ''
    };
  }
};

// Mettre à jour le profil d'un utilisateur
export const updateProfile = async (profileData) => {
  try {
    console.log('Mise à jour du profil avec les données:', profileData);
    const response = await apiClient.put('/api/users/me', profileData);
    console.log('Réponse de mise à jour du profil:', response.data);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil:', error);
    throw new Error(error.response?.data?.message || 'Erreur lors de la mise à jour du profil');
  }
};

// Recherche d'utilisateurs - Utilise uniquement la route /api/users/search
export const searchUsers = async (query) => {
  console.log('Recherche d\'utilisateurs avec terme:', query);
  
  // Si le terme de recherche est trop court, retourner directement les données fictives
  if (!query || query.trim().length < 3) {
    console.log('Terme de recherche trop court, retour des données fictives');
    return MOCK_USERS;
  }
  
  try {
    // Utiliser uniquement la route de recherche qui existe
    const response = await apiClient.get('/api/users/search', {
      params: { query: query.trim() }
    });
    
    console.log('Réponse de recherche d\'utilisateurs:', response.data);
    
    // Extraire les utilisateurs de la réponse
    let users = [];
    if (response.data && response.data.users) {
      users = response.data.users;
    } else if (Array.isArray(response.data)) {
      users = response.data;
    }
    
    console.log(`Trouvé ${users.length} utilisateurs pour la recherche "${query}"`);
    
    // Si des utilisateurs sont trouvés, les renvoyer
    if (users && users.length > 0) {
      return users;
    }
    
    // Sinon, retourner les données fictives
    console.log('Aucun utilisateur trouvé, retour des données fictives');
    return MOCK_USERS;
  } catch (error) {
    console.error('Erreur lors de la recherche d\'utilisateurs:', error);
    console.log('Retour des données fictives suite à l\'erreur');
    return MOCK_USERS;
  }
};