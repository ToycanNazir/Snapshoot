// src/services/userService.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://192.168.1.88:8080';

/**
 * Récupère tous les utilisateurs (pour trouver des amis)
 * @param {string} searchTerm - Terme de recherche optionnel pour filtrer les utilisateurs
 * @returns {Promise<Array>} - Liste des utilisateurs
 */
export const getUsers = async (searchTerm = '') => {
  try {
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Non authentifié');
    }

    let url = `${API_BASE_URL}/api/users`;
    if (searchTerm) {
      url += `?search=${encodeURIComponent(searchTerm)}`;
    }

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Erreur ${response.status}`);
    }

    return data.users || [];
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    throw error;
  }
};

/**
 * Récupère les détails d'un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Object>} - Détails de l'utilisateur
 */
export const getUserById = async (userId) => {
  try {
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Non authentifié');
    }

    const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Erreur ${response.status}`);
    }

    return data.user || null;
  } catch (error) {
    console.error(`Erreur lors de la récupération de l'utilisateur ${userId}:`, error);
    throw error;
  }
};

/**
 * Récupère le profil de l'utilisateur actuel
 * @returns {Promise<Object>} - Profil de l'utilisateur
 */
export const getCurrentUserProfile = async () => {
  try {
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Non authentifié');
    }

    const response = await fetch(`${API_BASE_URL}/api/users/me`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Erreur ${response.status}`);
    }

    // Mettre à jour le cache local
    if (data.user || data.profile) {
      const profile = data.user?.profile || data.profile;
      if (profile) {
        await AsyncStorage.setItem('user_profile', JSON.stringify(profile));
      }
    }

    return data.user?.profile || data.profile || null;
  } catch (error) {
    console.error('Erreur lors de la récupération du profil utilisateur:', error);
    throw error;
  }
};

/**
 * Met à jour le profil de l'utilisateur actuel
 * @param {Object} profileData - Données du profil à mettre à jour
 * @returns {Promise<Object>} - Profil mis à jour
 */
export const updateUserProfile = async (profileData) => {
  try {
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Non authentifié');
    }

    const response = await fetch(`${API_BASE_URL}/api/users/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(profileData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Erreur ${response.status}`);
    }

    // Mettre à jour le cache local
    if (data.profile) {
      await AsyncStorage.setItem('user_profile', JSON.stringify(data.profile));
    }

    return data.profile || null;
  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil:', error);
    throw error;
  }
};

/**
 * Supprime le compte de l'utilisateur actuel
 * @returns {Promise<boolean>} - Succès ou échec
 */
export const deleteUserAccount = async () => {
  try {
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Non authentifié');
    }

    const response = await fetch(`${API_BASE_URL}/api/users/me`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || `Erreur ${response.status}`);
    }

    // Nettoyer le stockage local
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('user_profile');

    return true;
  } catch (error) {
    console.error('Erreur lors de la suppression du compte:', error);
    throw error;
  }
};

/**
 * Met à jour le mot de passe de l'utilisateur
 * @param {string} currentPassword - Mot de passe actuel
 * @param {string} newPassword - Nouveau mot de passe
 * @returns {Promise<boolean>} - Succès ou échec
 */
export const updatePassword = async (currentPassword, newPassword) => {
  try {
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Non authentifié');
    }

    const response = await fetch(`${API_BASE_URL}/api/users/password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        currentPassword,
        newPassword
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Erreur ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error('Erreur lors de la mise à jour du mot de passe:', error);
    throw error;
  }
};

/**
 * Met à jour l'email de l'utilisateur
 * @param {string} newEmail - Nouvel email
 * @param {string} password - Mot de passe actuel pour confirmer
 * @returns {Promise<Object>} - Résultat de l'opération
 */
export const updateEmail = async (newEmail, password) => {
  try {
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Non authentifié');
    }

    const response = await fetch(`${API_BASE_URL}/api/users/email`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        email: newEmail,
        password
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Erreur ${response.status}`);
    }

    // Mettre à jour l'utilisateur local si nécessaire
    const userJson = await AsyncStorage.getItem('user');
    if (userJson) {
      const user = JSON.parse(userJson);
      user.email = newEmail;
      await AsyncStorage.setItem('user', JSON.stringify(user));
    }

    return data;
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'email:', error);
    throw error;
  }
};

/**
 * Vérifie si un utilisateur existe avec l'email donné
 * @param {string} email - Email à vérifier
 * @returns {Promise<boolean>} - True si l'email existe déjà, false sinon
 */
export const checkEmailExists = async (email) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/check-email?email=${encodeURIComponent(email)}`);
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || `Erreur ${response.status}`);
    }
    
    return data.exists || false;
  } catch (error) {
    console.error('Erreur lors de la vérification de l\'email:', error);
    throw error;
  }
};

/**
 * Demande une réinitialisation de mot de passe
 * @param {string} email - Email de l'utilisateur
 * @returns {Promise<boolean>} - Succès ou échec
 */
export const requestPasswordReset = async (email) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || `Erreur ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error('Erreur lors de la demande de réinitialisation de mot de passe:', error);
    throw error;
  }
};

/**
 * Réinitialise le mot de passe avec un token
 * @param {string} token - Token de réinitialisation
 * @param {string} newPassword - Nouveau mot de passe
 * @returns {Promise<boolean>} - Succès ou échec
 */
export const resetPassword = async (token, newPassword) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token,
        password: newPassword
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || `Erreur ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error('Erreur lors de la réinitialisation du mot de passe:', error);
    throw error;
  }
};