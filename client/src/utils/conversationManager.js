// src/utils/conversationManager.js
import AsyncStorage from '@react-native-async-storage/async-storage';

// Clé pour stocker les associations ami-conversation dans AsyncStorage
export const FRIEND_CONVERSATION_KEY = 'friend_conversation_';

/**
 * Gère la persistance et la récupération des conversations associées aux amis
 */
export const conversationManager = {
  /**
   * Sauvegarde l'association entre un ami et sa conversation
   * @param {string} friendId - ID de l'ami
   * @param {string} conversationId - ID de la conversation
   * @returns {Promise<void>}
   */
  saveFriendConversation: async (friendId, conversationId) => {
    if (!friendId || !conversationId) {
      console.warn('Impossible de sauvegarder sans ID d\'ami ou de conversation');
      return;
    }
    
    try {
      await AsyncStorage.setItem(`${FRIEND_CONVERSATION_KEY}${friendId}`, conversationId);
      console.log(`Association enregistrée: Ami ${friendId} -> Conversation ${conversationId}`);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'association ami-conversation:', error);
    }
  },
  
  /**
   * Récupère l'ID de conversation pour un ami spécifique
   * @param {string} friendId - ID de l'ami
   * @returns {Promise<string|null>} - ID de la conversation ou null si non trouvé
   */
  getFriendConversation: async (friendId) => {
    if (!friendId) return null;
    
    try {
      const conversationId = await AsyncStorage.getItem(`${FRIEND_CONVERSATION_KEY}${friendId}`);
      return conversationId;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'association ami-conversation:', error);
      return null;
    }
  },
  
  /**
   * Récupère toutes les associations ami-conversation
   * @returns {Promise<Object>} - Objet avec friendId comme clé et conversationId comme valeur
   */
  getAllFriendConversations: async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const friendConvKeys = keys.filter(key => key.startsWith(FRIEND_CONVERSATION_KEY));
      
      const result = {};
      await Promise.all(friendConvKeys.map(async (key) => {
        const friendId = key.replace(FRIEND_CONVERSATION_KEY, '');
        const conversationId = await AsyncStorage.getItem(key);
        result[friendId] = conversationId;
      }));
      
      return result;
    } catch (error) {
      console.error('Erreur lors de la récupération de toutes les associations:', error);
      return {};
    }
  },
  
  /**
   * Supprime l'association entre un ami et sa conversation
   * @param {string} friendId - ID de l'ami
   * @returns {Promise<void>}
   */
  removeFriendConversation: async (friendId) => {
    if (!friendId) return;
    
    try {
      await AsyncStorage.removeItem(`${FRIEND_CONVERSATION_KEY}${friendId}`);
      console.log(`Association supprimée pour l'ami ${friendId}`);
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'association:', error);
    }
  },
  
  /**
   * Vérifie si une conversation est associée à un ami
   * @param {string} conversationId - ID de la conversation
   * @returns {Promise<boolean>} - true si la conversation est associée à un ami
   */
  isConversationWithFriend: async (conversationId) => {
    try {
      const allAssociations = await conversationManager.getAllFriendConversations();
      return Object.values(allAssociations).includes(conversationId);
    } catch (error) {
      console.error('Erreur lors de la vérification de la conversation:', error);
      return false;
    }
  },
  
  /**
   * Trouve l'ami associé à une conversation
   * @param {string} conversationId - ID de la conversation
   * @returns {Promise<string|null>} - ID de l'ami ou null si non trouvé
   */
  findFriendByConversation: async (conversationId) => {
    try {
      const allAssociations = await conversationManager.getAllFriendConversations();
      const friendId = Object.keys(allAssociations).find(
        friendId => allAssociations[friendId] === conversationId
      );
      return friendId || null;
    } catch (error) {
      console.error('Erreur lors de la recherche d\'ami par conversation:', error);
      return null;
    }
  }
};

export default conversationManager;