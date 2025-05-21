// src/services/storage.js
import supabase from './apiClient';

/**
 * Upload d'une image de profil
 * @param {string} uri - URI locale de l'image
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<string>} - URL publique de l'image uploadée
 */
export const uploadProfileImage = async (imageUri, userId) => {
  try {
    // Créer un FormData pour l'upload
    const formData = new FormData();
    
    // Ajouter l'image au FormData
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: `profile_${userId}.jpg`,
    });
    
    // Faire l'upload vers votre serveur
    const response = await fetch('http://192.168.1.88:8080/api/upload/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data',
        // Ajouter l'autorisation si nécessaire
        // 'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Erreur d'upload: ${response.status}`);
    }
    
    const result = await response.json();
    return result.imageUrl || result.url;
    
  } catch (error) {
    console.error('Erreur lors de l\'upload:', error);
    throw new Error('Impossible d\'uploader l\'image');
  }
};

// Alternative temporaire si votre serveur n'est pas encore configuré
export const uploadProfileImageMock = async (imageUri, userId) => {
  // Simuler un délai d'upload
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Retourner l'URI locale comme URL temporaire
  // En production, vous devriez remplacer cela par un vrai service
  return imageUri;
};

/**
 * Upload d'un média (image ou vidéo) pour un message ou une story
 * @param {string} uri - URI locale du média
 * @param {string} type - Type de média ('message' ou 'story')
 * @param {string} userId - ID de l'utilisateur
 * @param {string} [chatId] - ID de la conversation (optionnel)
 * @returns {Promise<string>} - URL publique du média uploadé
 */
export const uploadMedia = async (uri, type, userId, chatId = null) => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    
    const fileExt = uri.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    
    // Définir le chemin selon le type de média
    let filePath;
    if (type === 'message' && chatId) {
      filePath = `messages/${chatId}/${userId}/${fileName}`;
    } else if (type === 'story') {
      filePath = `stories/${userId}/${fileName}`;
    } else {
      filePath = `other/${userId}/${fileName}`;
    }
    
    // Upload vers le bucket "media"
    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(filePath, blob);
    
    if (uploadError) throw uploadError;
    
    // Récupérer l'URL publique
    const { data } = supabase.storage
      .from('media')
      .getPublicUrl(filePath);
    
    return data.publicUrl;
  } catch (error) {
    console.error('Erreur lors de l\'upload du média:', error);
    throw error;
  }
};