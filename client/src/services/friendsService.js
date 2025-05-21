// src/services/friendsService.js
import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_BASE_URL } from '../config/api';

/**
 * Récupère la liste d'amis de l'utilisateur
 * @returns {Promise<Array>} - Liste des amis
 */
export const getFriends = async () => {
  try {
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Non authentifié');
    }

    const response = await fetch(`${API_BASE_URL}/api/friends`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Erreur ${response.status}`);
    }

    return data.friends || [];
  } catch (error) {
    console.error('Erreur lors de la récupération des amis:', error);
    throw error;
  }
};

/**
 * Récupère les demandes d'amis en attente
 * @returns {Promise<Object>} - Demandes reçues et envoyées
 */
export const getFriendRequests = async () => {
  try {
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Non authentifié');
    }

    const response = await fetch(`${API_BASE_URL}/api/friends/requests`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Erreur ${response.status}`);
    }

    return {
      received: data.received || [],
      sent: data.sent || []
    };
  } catch (error) {
    console.error('Erreur lors de la récupération des demandes d\'amis:', error);
    throw error;
  }
};

/**
 * Envoie une demande d'ami
 * @param {string} userId - ID de l'utilisateur à ajouter
 * @returns {Promise<Object>} - Résultat de l'opération
 */
export const sendFriendRequest = async (userId) => {
  try {
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Non authentifié');
    }

    const response = await fetch(`${API_BASE_URL}/api/friends/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ userId })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Erreur ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('Erreur lors de l\'envoi de la demande d\'ami:', error);
    throw error;
  }
};

/**
 * Accepte une demande d'ami
 * @param {string} requestId - ID de la demande d'ami
 * @returns {Promise<Object>} - Résultat de l'opération
 */
export const acceptFriendRequest = async (requestId) => {
  try {
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Non authentifié');
    }

    const response = await fetch(`${API_BASE_URL}/api/friends/accept/${requestId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Erreur ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('Erreur lors de l\'acceptation de la demande d\'ami:', error);
    throw error;
  }
};

/**
 * Refuse une demande d'ami
 * @param {string} requestId - ID de la demande d'ami
 * @returns {Promise<Object>} - Résultat de l'opération
 */
export const rejectFriendRequest = async (requestId) => {
  try {
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Non authentifié');
    }

    const response = await fetch(`${API_BASE_URL}/api/friends/reject/${requestId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Erreur ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('Erreur lors du refus de la demande d\'ami:', error);
    throw error;
  }
};

/**
 * Supprime un ami
 * @param {string} friendId - ID de l'ami à supprimer
 * @returns {Promise<Object>} - Résultat de l'opération
 */
export const removeFriend = async (friendId) => {
  try {
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Non authentifié');
    }

    const response = await fetch(`${API_BASE_URL}/api/friends/${friendId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Erreur ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'ami:', error);
    throw error;
  }
};

/**
 * Annule une demande d'ami envoyée
 * @param {string} requestId - ID de la demande d'ami
 * @returns {Promise<Object>} - Résultat de l'opération
 */
export const cancelFriendRequest = async (requestId) => {
  try {
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Non authentifié');
    }

    const response = await fetch(`${API_BASE_URL}/api/friends/cancel/${requestId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Erreur ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('Erreur lors de l\'annulation de la demande d\'ami:', error);
    throw error;
  }
};