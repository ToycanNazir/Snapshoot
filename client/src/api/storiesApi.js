// src/api/storiesApi.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_STORIES_KEY = 'user_stories_';
const ALL_STORIES_KEY = 'all_stories';

// Fonction pour récupérer toutes les stories
export const getAllStories = async () => {
  try {
    const storiesJSON = await AsyncStorage.getItem(ALL_STORIES_KEY);
    const allStories = storiesJSON ? JSON.parse(storiesJSON) : [];
    
    // Filtrer les stories des dernières 24h
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentStories = allStories.filter(story => 
      new Date(story.timestamp) > oneDayAgo
    );
    
    // Grouper les stories par utilisateur
    const groupedStories = {};
    recentStories.forEach(story => {
      if (!groupedStories[story.userId]) {
        groupedStories[story.userId] = {
          id: story.userId,
          user: {
            id: story.userId,
            name: story.userName,
            avatar: story.userAvatar,
          },
          items: []
        };
      }
      groupedStories[story.userId].items.push(story);
    });
    
    // Convertir en tableau et trier par timestamp le plus récent
    const storiesArray = Object.values(groupedStories).map(group => ({
      ...group,
      items: group.items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    }));
    
    return storiesArray.sort((a, b) => 
      new Date(b.items[0].timestamp) - new Date(a.items[0].timestamp)
    );
  } catch (error) {
    console.error('Erreur lors de la récupération des stories:', error);
    return [];
  }
};

// Fonction pour récupérer les stories d'un utilisateur spécifique
export const getUserStories = async (userId) => {
  try {
    const userStoriesJSON = await AsyncStorage.getItem(`${USER_STORIES_KEY}${userId}`);
    const userStories = userStoriesJSON ? JSON.parse(userStoriesJSON) : [];
    
    // Filtrer les stories des dernières 24h
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentStories = userStories.filter(story => 
      new Date(story.timestamp) > oneDayAgo
    );
    
    return recentStories.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  } catch (error) {
    console.error('Erreur lors de la récupération des stories utilisateur:', error);
    return [];
  }
};

// Fonction pour publier une nouvelle story
export const publishStory = async (userId, userName, userAvatar, mediaUri, mediaType, caption = '') => {
  try {
    const newStory = {
      id: Date.now().toString(),
      type: mediaType,
      url: mediaUri,
      caption: caption,
      timestamp: new Date(),
      userId: userId,
      userName: userName,
      userAvatar: userAvatar,
      views: [],
      likes: []
    };
    
    // Sauvegarder dans les stories de l'utilisateur
    const userStoriesJSON = await AsyncStorage.getItem(`${USER_STORIES_KEY}${userId}`);
    const userStories = userStoriesJSON ? JSON.parse(userStoriesJSON) : [];
    const updatedUserStories = [newStory, ...userStories];
    
    // Garder seulement les stories des dernières 24h
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentUserStories = updatedUserStories.filter(story => 
      new Date(story.timestamp) > oneDayAgo
    );
    
    await AsyncStorage.setItem(`${USER_STORIES_KEY}${userId}`, JSON.stringify(recentUserStories));
    
    // Ajouter aussi à la liste globale
    const allStoriesJSON = await AsyncStorage.getItem(ALL_STORIES_KEY);
    const allStories = allStoriesJSON ? JSON.parse(allStoriesJSON) : [];
    const updatedAllStories = [newStory, ...allStories];
    
    // Garder seulement les stories des dernières 24h pour toutes les stories
    const recentAllStories = updatedAllStories.filter(story => 
      new Date(story.timestamp) > oneDayAgo
    );
    
    await AsyncStorage.setItem(ALL_STORIES_KEY, JSON.stringify(recentAllStories));
    
    console.log('Story publiée avec succès');
    return newStory;
  } catch (error) {
    console.error('Erreur lors de la publication de la story:', error);
    throw error;
  }
};

// Fonction pour marquer une story comme vue
export const markStoryAsViewed = async (storyId, viewerId) => {
  try {
    // Récupérer toutes les stories
    const allStoriesJSON = await AsyncStorage.getItem(ALL_STORIES_KEY);
    const allStories = allStoriesJSON ? JSON.parse(allStoriesJSON) : [];
    
    // Trouver et mettre à jour la story
    const updatedStories = allStories.map(story => {
      if (story.id === storyId) {
        if (!story.views.includes(viewerId)) {
          story.views.push(viewerId);
        }
      }
      return story;
    });
    
    await AsyncStorage.setItem(ALL_STORIES_KEY, JSON.stringify(updatedStories));
    
    // Mettre à jour aussi dans les stories de l'utilisateur propriétaire
    const storyToUpdate = updatedStories.find(s => s.id === storyId);
    if (storyToUpdate) {
      const userStoriesJSON = await AsyncStorage.getItem(`${USER_STORIES_KEY}${storyToUpdate.userId}`);
      const userStories = userStoriesJSON ? JSON.parse(userStoriesJSON) : [];
      
      const updatedUserStories = userStories.map(story => {
        if (story.id === storyId) {
          if (!story.views.includes(viewerId)) {
            story.views.push(viewerId);
          }
        }
        return story;
      });
      
      await AsyncStorage.setItem(`${USER_STORIES_KEY}${storyToUpdate.userId}`, JSON.stringify(updatedUserStories));
    }
    
    console.log('Story marquée comme vue');
  } catch (error) {
    console.error('Erreur lors du marquage de la story comme vue:', error);
  }
};

// Fonction pour liker une story
export const likeStory = async (storyId, likerId) => {
  try {
    // Récupérer toutes les stories
    const allStoriesJSON = await AsyncStorage.getItem(ALL_STORIES_KEY);
    const allStories = allStoriesJSON ? JSON.parse(allStoriesJSON) : [];
    
    // Trouver et mettre à jour la story
    const updatedStories = allStories.map(story => {
      if (story.id === storyId) {
        if (!story.likes.includes(likerId)) {
          story.likes.push(likerId);
        } else {
          // Si déjà liké, enlever le like
          story.likes = story.likes.filter(id => id !== likerId);
        }
      }
      return story;
    });
    
    await AsyncStorage.setItem(ALL_STORIES_KEY, JSON.stringify(updatedStories));
    
    // Mettre à jour aussi dans les stories de l'utilisateur propriétaire
    const storyToUpdate = updatedStories.find(s => s.id === storyId);
    if (storyToUpdate) {
      const userStoriesJSON = await AsyncStorage.getItem(`${USER_STORIES_KEY}${storyToUpdate.userId}`);
      const userStories = userStoriesJSON ? JSON.parse(userStoriesJSON) : [];
      
      const updatedUserStories = userStories.map(story => {
        if (story.id === storyId) {
          if (!story.likes.includes(likerId)) {
            story.likes.push(likerId);
          } else {
            story.likes = story.likes.filter(id => id !== likerId);
          }
        }
        return story;
      });
      
      await AsyncStorage.setItem(`${USER_STORIES_KEY}${storyToUpdate.userId}`, JSON.stringify(updatedUserStories));
    }
    
    console.log('Story likée/unlikée');
  } catch (error) {
    console.error('Erreur lors du like de la story:', error);
  }
};

// Fonction pour supprimer une story
export const deleteStory = async (storyId, userId) => {
  try {
    // Supprimer des stories de l'utilisateur
    const userStoriesJSON = await AsyncStorage.getItem(`${USER_STORIES_KEY}${userId}`);
    const userStories = userStoriesJSON ? JSON.parse(userStoriesJSON) : [];
    const updatedUserStories = userStories.filter(story => story.id !== storyId);
    await AsyncStorage.setItem(`${USER_STORIES_KEY}${userId}`, JSON.stringify(updatedUserStories));
    
    // Supprimer de toutes les stories
    const allStoriesJSON = await AsyncStorage.getItem(ALL_STORIES_KEY);
    const allStories = allStoriesJSON ? JSON.parse(allStoriesJSON) : [];
    const updatedAllStories = allStories.filter(story => story.id !== storyId);
    await AsyncStorage.setItem(ALL_STORIES_KEY, JSON.stringify(updatedAllStories));
    
    console.log('Story supprimée avec succès');
  } catch (error) {
    console.error('Erreur lors de la suppression de la story:', error);
    throw error;
  }
};

// Fonction pour nettoyer les anciennes stories (appelée périodiquement)
export const cleanupOldStories = async () => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Nettoyer toutes les stories
    const allStoriesJSON = await AsyncStorage.getItem(ALL_STORIES_KEY);
    const allStories = allStoriesJSON ? JSON.parse(allStoriesJSON) : [];
    const recentAllStories = allStories.filter(story => 
      new Date(story.timestamp) > oneDayAgo
    );
    await AsyncStorage.setItem(ALL_STORIES_KEY, JSON.stringify(recentAllStories));
    
    // Nettoyer les stories de chaque utilisateur
    const allKeys = await AsyncStorage.getAllKeys();
    const userStoryKeys = allKeys.filter(key => key.startsWith(USER_STORIES_KEY));
    
    for (const key of userStoryKeys) {
      const userStoriesJSON = await AsyncStorage.getItem(key);
      const userStories = userStoriesJSON ? JSON.parse(userStoriesJSON) : [];
      const recentUserStories = userStories.filter(story => 
        new Date(story.timestamp) > oneDayAgo
      );
      await AsyncStorage.setItem(key, JSON.stringify(recentUserStories));
    }
    
    console.log('Nettoyage des anciennes stories terminé');
  } catch (error) {
    console.error('Erreur lors du nettoyage des stories:', error);
  }
};