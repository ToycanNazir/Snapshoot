// src/context/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Alert } from 'react-native';

// Créer le contexte
const AuthContext = createContext();

// URL de base de l'API
import { API_BASE_URL } from '../config/api';

// Client axios
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Ajouter le token à toutes les requêtes
apiClient.interceptors.request.use(
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

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Charger l'utilisateur depuis le stockage local au démarrage
  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        const token = await AsyncStorage.getItem('auth_token');
        const userJson = await AsyncStorage.getItem('user');
        const profileJson = await AsyncStorage.getItem('user_profile');
        
        if (token && userJson) {
          const parsedUser = JSON.parse(userJson);
          setUser(parsedUser);
          
          if (profileJson) {
            setUserProfile(JSON.parse(profileJson));
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données utilisateur:', error);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    loadUser();
  }, []);

  // Vérifier la connexion à l'API
  const checkApiConnection = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return response.ok;
    } catch (error) {
      console.error('Erreur de connexion au serveur:', error);
      return false;
    }
  };

  // Connexion
const signIn = async (email, password) => {
  setLoading(true);
  try {
    console.log('Tentative de connexion avec:', email);
    
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password })
    });
    
    // Obtenez la réponse sous forme de texte pour déboguer
    const responseText = await response.text();
    console.log('Réponse brute du serveur:', responseText);
    
    // Parser la réponse
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('Données parsées:', data);
    } catch (parseError) {
      console.error('Erreur de parsing JSON:', parseError);
      throw new Error('Le serveur a renvoyé une réponse non-JSON. Vérifiez l\'URL et l\'état du serveur.');
    }
    
    if (!response.ok) {
      throw new Error(data.message || `Erreur ${response.status}`);
    }
    
    // AJOUTER CETTE PARTIE POUR SAUVEGARDER LE TOKEN ET METTRE À JOUR L'ÉTAT
    if (data.token) {
      console.log('Token trouvé, sauvegarde...');
      await AsyncStorage.setItem('auth_token', data.token);
      
      if (data.user) {
        console.log('Utilisateur trouvé, mise à jour de l\'état:', data.user);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user); // CETTE LIGNE EST CRITIQUE
      }
      
      return data;
    } else {
      throw new Error('Réponse invalide du serveur: token manquant');
    }
  } catch (error) {
    console.error('Erreur de connexion:', error);
    throw error;
  } finally {
    setLoading(false);
  }
};
  // Inscription
  const signUp = async (email, password, displayName) => {
    setLoading(true);
    try {
      console.log('Données d\'inscription:', { email, displayName });
      
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password,
          displayName: displayName
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `Erreur ${response.status}`);
      }
      
      if (data.token) {
        await AsyncStorage.setItem('auth_token', data.token);
        
        if (data.user) {
          await AsyncStorage.setItem('user', JSON.stringify(data.user));
          setUser(data.user);
        }
        
        // Créer un profil par défaut
        const defaultProfile = {
          display_name: displayName || email.split('@')[0],
          bio: '',
          profile_image: null,
          location: ''
        };
        setUserProfile(defaultProfile);
        
        return data.user;
      } else {
        throw new Error('Réponse invalide du serveur');
      }
    } catch (error) {
      console.error('Erreur d\'inscription:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Déconnexion
  const signOut = async () => {
    setLoading(true);
    try {
      // Appel optionnel à l'API pour invalider le token
      try {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await AsyncStorage.getItem('auth_token')}`
          }
        });
      } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
      }
      
      // Réinitialiser l'état
      setUser(null);
      setUserProfile(null);
      
      // Supprimer les données stockées
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('user_profile');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      Alert.alert('Erreur', 'Problème lors de la déconnexion');
    } finally {
      setLoading(false);
    }
  };

  // Rafraîchir le profil
  const refreshProfile = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/me`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await AsyncStorage.getItem('auth_token')}`
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `Erreur ${response.status}`);
      }
      
      if (data.user && data.user.profile) {
        setUserProfile(data.user.profile);
        return data.user.profile;
      } else if (data.profile) {
        setUserProfile(data.profile);
        return data.profile;
      }
      
      return null;
    } catch (error) {
      console.error('Erreur lors du rafraîchissement du profil:', error);
      return null;
    }
  };

  // Mettre à jour le profil
  const updateProfile = async (profileData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await AsyncStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(profileData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `Erreur ${response.status}`);
      }
      
      if (data.profile) {
        setUserProfile(data.profile);
        return data.profile;
      }
      
      return null;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      throw error;
    }
  };

  // Exposer les valeurs et fonctions via le contexte
  const value = {
    user,
    userProfile,
    loading,
    initialized,
    checkApiConnection,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    updateProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook pour utiliser le contexte d'authentification
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
  }
  return context;
};