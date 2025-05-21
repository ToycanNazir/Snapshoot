import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  SafeAreaView,
  Alert,
  Platform,
  FlatList,
  ActivityIndicator,
  TextInput,
  Modal
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import { useAuth } from '../context/AuthContext';
import { getFriends } from '../api/friendsApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { publishStory } from '../api/storiesApi';
// Clé pour stocker les médias envoyés
const SENT_MEDIA_KEY = 'sent_media_';
const USER_STORIES_KEY = 'user_stories_';

const CameraScreen = ({ route, navigation }) => {
  const { user } = useAuth();
  const [capturedImage, setCapturedImage] = useState(null);
  const [hasPermissions, setHasPermissions] = useState(null);
  const [friends, setFriends] = useState([]);
  const [showFriendSelector, setShowFriendSelector] = useState(false);
  const [showStoryEditor, setShowStoryEditor] = useState(false);
  const [storyCaption, setStoryCaption] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [savingStory, setSavingStory] = useState(false);
  
  // Vérifier si l'écran est appelé depuis ConversationScreen ou comme tab
  const isModal = route?.params?.fromConversation;
  const conversationId = route?.params?.conversationId;
  const fromStories = route?.params?.fromStories; // Nouveau paramètre pour les stories

  // Charger la liste des amis
  const loadFriends = useCallback(async () => {
    if (!user) return;
    
    setLoadingFriends(true);
    try {
      const friendsList = await getFriends();
      console.log('Amis chargés:', friendsList?.length || 0);
      
      // Ajouter une propriété selected à chaque ami
      const friendsWithSelection = friendsList.map(friend => ({
        ...friend,
        selected: false
      }));
      
      setFriends(friendsWithSelection || []);
    } catch (error) {
      console.error('Erreur lors du chargement des amis:', error);
      // Fallback avec une liste vide
      setFriends([]);
    } finally {
      setLoadingFriends(false);
    }
  }, [user]);

  useEffect(() => {
    // Vérifier les permissions immédiatement au chargement
    checkPermissions();
    
    // Si on est sur l'écran principal (tab caméra) ou depuis stories, ouvrir directement la caméra
    if (!isModal) {
      setTimeout(() => {
        openCamera();
      }, 500);
    }
    
    // Charger la liste des amis
    loadFriends();
    
    // Nettoyage lors du démontage du composant
    return () => {
      // Réinitialiser l'état si nécessaire
    };
  }, [isModal, loadFriends]);

  const checkPermissions = async () => {
    try {
      const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
      const mediaStatus = await MediaLibrary.requestPermissionsAsync();
      
      const allGranted = cameraStatus.status === 'granted' && mediaStatus.status === 'granted';
      setHasPermissions(allGranted);
      
      if (!allGranted) {
        Alert.alert(
          'Permissions requises',
          'Nous avons besoin des permissions caméra et galerie pour prendre des photos.',
          [{ text: 'OK' }]
        );
      }
      
      return allGranted;
    } catch (error) {
      console.error('Erreur lors de la vérification des permissions:', error);
      return false;
    }
  };

  const openCamera = async () => {
    // Vérifier d'abord les permissions
    const hasAllPermissions = await checkPermissions();
    if (!hasAllPermissions) return;
    
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All, // Permet images et vidéos
        allowsEditing: true,
        aspect: [9, 16], // Format portrait pour stories
        quality: 0.8,
        videoMaxDuration: 30, // Limite vidéo à 30 secondes pour stories
        // Présentation personnalisée pour ressembler davantage à Snapchat
        presentationStyle: Platform.OS === 'ios' ? 'fullScreen' : undefined,
      });
      
      console.log('Résultat ImagePicker:', result);
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const mediaUri = result.assets[0].uri;
        const mediaType = result.assets[0].type;
        
        setCapturedImage({ uri: mediaUri, type: mediaType });
        
        // Si appelé depuis Stories, ouvrir directement l'éditeur de story
        if (fromStories) {
          setShowStoryEditor(true);
        }
      } else if (!isModal && !fromStories) {
        // Si annulé depuis l'onglet, retourner à l'onglet principal
        navigation.navigate('Main');
      } else if (fromStories) {
        // Si annulé depuis stories, retourner aux stories
        navigation.navigate('Stories');
      }
    } catch (error) {
      console.error('Erreur lors de l\'ouverture de la caméra:', error);
      Alert.alert("Erreur", "Impossible d'ouvrir la caméra: " + error.message);
    }
  };

  const openGallery = async () => {
    // Vérifier d'abord les permissions
    const hasAllPermissions = await checkPermissions();
    if (!hasAllPermissions) return;
    
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All, // Permet images et vidéos
        allowsEditing: true,
        aspect: [9, 16], // Format portrait pour stories
        quality: 0.8,
        videoMaxDuration: 30,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const mediaUri = result.assets[0].uri;
        const mediaType = result.assets[0].type;
        
        setCapturedImage({ uri: mediaUri, type: mediaType });
        
        // Si appelé depuis Stories, ouvrir directement l'éditeur de story
        if (fromStories) {
          setShowStoryEditor(true);
        }
      }
    } catch (error) {
      console.error('Erreur lors de l\'ouverture de la galerie:', error);
      Alert.alert("Erreur", "Impossible d'accéder à la galerie");
    }
  };

  const saveToGallery = async () => {
    if (!capturedImage) return;
    
    try {
      await MediaLibrary.createAssetAsync(capturedImage.uri);
      Alert.alert("Succès", "Média enregistré dans la galerie");
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      Alert.alert("Erreur", "Impossible d'enregistrer le média");
    }
  };

  // Importer la fonction publishStory de l'API


  // Fonction pour publier une story
  const publishStoryHandler = async () => {
    if (!capturedImage) return;
    
    setSavingStory(true);
    
    try {
      // Utiliser l'API pour publier la story
      const newStory = await publishStory(
        user.id,
        user.username || user.email,
        user.avatar_url || 'https://randomuser.me/api/portraits/lego/1.jpg',
        capturedImage.uri, 
        capturedImage.type,
        storyCaption
      );
      
      if (newStory) {
        Alert.alert("Succès", "Votre story a été publiée !");
        
        // Réinitialiser l'état
        setCapturedImage(null);
        setStoryCaption('');
        setShowStoryEditor(false);
        
        // Retourner aux stories pour voir la nouvelle story
        navigation.navigate('Stories');
      } else {
        throw new Error('Échec de la publication');
      }
    } catch (error) {
      console.error("Erreur lors de la publication de la story:", error);
      Alert.alert("Erreur", "Impossible de publier votre story");
    } finally {
      setSavingStory(false);
    }
  };

  const toggleFriendSelection = (friendId) => {
    const updatedFriends = friends.map(friend => 
      friend.id === friendId ? { ...friend, selected: !friend.selected } : friend
    );
    setFriends(updatedFriends);
  };

  const getSelectedFriends = () => {
    return friends.filter(friend => friend.selected);
  };

  const showFriendList = () => {
    // Réinitialiser les sélections précédentes
    const resetFriends = friends.map(friend => ({ ...friend, selected: false }));
    setFriends(resetFriends);
    setShowFriendSelector(true);
  };

  // Fonction pour enregistrer un média envoyé dans l'historique
  const saveSentMedia = async (imageUri, recipients) => {
    try {
      // Récupérer l'historique existant
      const sentMediaJSON = await AsyncStorage.getItem(`${SENT_MEDIA_KEY}${user.id}`);
      const sentMedia = sentMediaJSON ? JSON.parse(sentMediaJSON) : [];
      
      // Ajouter le nouveau média
      const newEntry = {
        id: Date.now().toString(),
        uri: imageUri,
        recipients: recipients.map(r => ({ id: r.id, name: r.username || r.display_name })),
        timestamp: new Date().toISOString()
      };
      
      // Mettre à jour l'historique
      const updatedHistory = [newEntry, ...sentMedia].slice(0, 50); // Garder seulement les 50 derniers
      await AsyncStorage.setItem(`${SENT_MEDIA_KEY}${user.id}`, JSON.stringify(updatedHistory));
      
      console.log('Média enregistré dans l\'historique');
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du média:', error);
    }
  };

  const sendToFriends = async () => {
    if (!capturedImage) return;
    
    const selectedFriends = getSelectedFriends();
    if (selectedFriends.length === 0) {
      Alert.alert("Sélection requise", "Veuillez sélectionner au moins un ami.");
      return;
    }
    
    setSending(true);
    
    // Envoyer la photo aux amis sélectionnés
    try {
      // Dans une vraie application, vous enverriez la photo via votre API
      // Exemple fictif : uploadAndSendMedia(capturedImage, selectedFriends.map(f => f.id));
      
      // Simuler un délai d'envoi pour la démo
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Enregistrer dans l'historique des médias envoyés
      await saveSentMedia(capturedImage.uri, selectedFriends);
      
      const friendNames = selectedFriends.map(f => f.username || f.display_name).join(', ');
      Alert.alert("Succès", `Média envoyé à ${friendNames}`);
      
      // Réinitialiser l'état
      setCapturedImage(null);
      setShowFriendSelector(false);
      
      if (!isModal) {
        // Si c'est l'onglet caméra, ouvrir la caméra à nouveau
        setTimeout(() => {
          openCamera();
        }, 500);
      } else {
        // Si c'est appelé depuis une conversation, retourner
        navigation.goBack();
      }
    } catch (error) {
      console.error("Erreur lors de l'envoi:", error);
      Alert.alert("Erreur", "Impossible d'envoyer le média");
    } finally {
      setSending(false);
    }
  };

  const sendToConversation = () => {
    if (capturedImage && isModal) {
      // Naviguer en arrière avec l'URI de l'image
      navigation.navigate({
        name: 'ConversationScreen',
        params: { 
          capturedImage: capturedImage.uri,
          conversationId: conversationId
        },
        merge: true
      });
    }
  };

  const retakePicture = () => {
    setCapturedImage(null);
    setShowFriendSelector(false);
    setShowStoryEditor(false);
    setStoryCaption('');
    openCamera();
  };

  // Rendu d'un ami dans la liste
  const renderFriend = ({ item }) => (
    <TouchableOpacity 
      style={[styles.friendItem, item.selected && styles.friendItemSelected]}
      onPress={() => toggleFriendSelection(item.id)}
    >
      <Image 
        source={{ uri: item.avatar_url || item.profile_image || 'https://randomuser.me/api/portraits/lego/1.jpg' }} 
        style={styles.friendAvatar} 
        defaultSource={require('../../assets/default-avatar.png')}
      />
      <Text style={styles.friendName}>{item.username || item.display_name || 'Utilisateur'}</Text>
      
      {item.selected && (
        <View style={styles.checkmark}>
          <Ionicons name="checkmark" size={16} color="white" />
        </View>
      )}
    </TouchableOpacity>
  );

  // Modal pour l'éditeur de story
  const renderStoryEditor = () => (
    <Modal
      visible={showStoryEditor}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <SafeAreaView style={styles.storyEditorContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        
        {/* Header de l'éditeur */}
        <View style={styles.storyEditorHeader}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              setShowStoryEditor(false);
              setStoryCaption('');
            }}
          >
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Votre Story</Text>
          <TouchableOpacity 
            style={styles.publishButton}
            onPress={publishStoryHandler}
            disabled={savingStory}
          >
            {savingStory ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.publishButtonText}>Publier</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Prévisualisation du média */}
        <View style={styles.storyPreviewContainer}>
          {capturedImage?.type === 'video' ? (
            <View style={styles.videoPreview}>
              <Ionicons name="play-circle" size={60} color="white" />
              <Text style={styles.videoText}>Vidéo prête</Text>
            </View>
          ) : (
            <Image 
              source={{ uri: capturedImage?.uri }} 
              style={styles.storyPreview}
              resizeMode="cover"
            />
          )}
          
          {/* Zone de saisie de texte par-dessus l'image */}
          <View style={styles.captionOverlay}>
            <TextInput
              style={styles.captionInput}
              placeholder="Ajoutez un texte à votre story..."
              placeholderTextColor="rgba(255, 255, 255, 0.7)"
              value={storyCaption}
              onChangeText={setStoryCaption}
              multiline
              maxLength={200}
              textAlignVertical="center"
            />
          </View>
        </View>

        {/* Options en bas */}
        <View style={styles.storyEditorActions}>
          <TouchableOpacity 
            style={styles.editorActionButton}
            onPress={saveToGallery}
          >
            <Ionicons name="download" size={24} color="white" />
            <Text style={styles.actionButtonText}>Sauvegarder</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.editorActionButton}
            onPress={retakePicture}
          >
            <Ionicons name="refresh" size={24} color="white" />
            <Text style={styles.actionButtonText}>Reprendre</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );

  // Si on montre le sélecteur d'amis
  if (showFriendSelector && capturedImage) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setShowFriendSelector(false)}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Envoyer à</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <Image 
          source={{ uri: capturedImage.uri }} 
          style={styles.thumbnailPreview}
        />
        
        {loadingFriends ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6C13B3" />
            <Text style={styles.loadingText}>Chargement de vos amis...</Text>
          </View>
        ) : friends.length === 0 ? (
          <View style={styles.emptyFriendsContainer}>
            <Ionicons name="people" size={50} color="#666" />
            <Text style={styles.emptyFriendsText}>
              Vous n'avez pas encore d'amis. Ajoutez des amis pour leur envoyer des photos.
            </Text>
            <TouchableOpacity 
              style={styles.findFriendsButton}
              onPress={() => {
                navigation.navigate('FindFriendsScreen');
                setCapturedImage(null);
                setShowFriendSelector(false);
              }}
            >
              <Text style={styles.findFriendsButtonText}>Trouver des amis</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={friends}
            renderItem={renderFriend}
            keyExtractor={item => item.id}
            style={styles.friendsList}
            contentContainerStyle={styles.friendsListContent}
          />
        )}
        
        <View style={styles.sendContainer}>
          <TouchableOpacity 
            style={[
              styles.sendToFriendsButton, 
              (getSelectedFriends().length === 0 || sending) && styles.disabledButton
            ]}
            onPress={sendToFriends}
            disabled={getSelectedFriends().length === 0 || sending}
          >
            {sending ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Ionicons name="paper-plane" size={20} color="white" />
                <Text style={styles.sendButtonText}>
                  Envoyer ({getSelectedFriends().length})
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Si on a capturé une image, afficher la prévisualisation
  if (capturedImage && !showStoryEditor) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <Image 
          source={{ uri: capturedImage.uri }} 
          style={styles.preview}
          resizeMode="contain"
        />
        <View style={styles.previewActions}>
          <TouchableOpacity 
            style={styles.previewButton}
            onPress={retakePicture}
          >
            <Ionicons name="refresh" size={24} color="white" />
            <Text style={styles.previewButtonText}>Reprendre</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.previewButton}
            onPress={saveToGallery}
          >
            <Ionicons name="save" size={24} color="white" />
            <Text style={styles.previewButtonText}>Sauver</Text>
          </TouchableOpacity>
          
          {fromStories ? (
            // Si appelé depuis Stories, bouton pour créer une story
            <TouchableOpacity 
              style={[styles.previewButton, styles.storyButton]}
              onPress={() => setShowStoryEditor(true)}
            >
              <Ionicons name="add-circle" size={24} color="white" />
              <Text style={styles.previewButtonText}>Story</Text>
            </TouchableOpacity>
          ) : isModal ? (
            // Si appelé depuis la conversation, bouton pour envoyer directement à cette conversation
            <TouchableOpacity 
              style={[styles.previewButton, styles.sendButton]}
              onPress={sendToConversation}
            >
              <Ionicons name="send" size={24} color="white" />
              <Text style={styles.previewButtonText}>Envoyer</Text>
            </TouchableOpacity>
          ) : (
            // Sinon, bouton pour ouvrir le sélecteur d'amis
            <TouchableOpacity 
              style={[styles.previewButton, styles.sendButton]}
              onPress={showFriendList}
            >
              <Ionicons name="people" size={24} color="white" />
              <Text style={styles.previewButtonText}>Amis</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Ajouter un bouton Story si pas déjà depuis Stories */}
        {!fromStories && !isModal && (
          <TouchableOpacity 
            style={styles.floatingStoryButton}
            onPress={() => setShowStoryEditor(true)}
          >
            <Ionicons name="add" size={24} color="white" />
            <Text style={styles.floatingStoryText}>Ma Story</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    );
  }

  // Écran de sélection d'options pour l'écran modal
  if (isModal || fromStories) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {fromStories ? 'Créer une Story' : 'Capture d\'image'}
          </Text>
          <View style={{ width: 28 }} />
        </View>
        
        <View style={styles.optionsContainer}>
          <TouchableOpacity 
            style={styles.optionButton}
            onPress={openCamera}
          >
            <Ionicons name="camera" size={40} color="white" />
            <Text style={styles.optionText}>
              {fromStories ? 'Prendre une photo/vidéo' : 'Prendre une photo'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.optionButton}
            onPress={openGallery}
          >
            <Ionicons name="images" size={40} color="white" />
            <Text style={styles.optionText}>Choisir depuis la galerie</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  // Pour l'onglet caméra, afficher un écran de chargement simple
  // ou ouvrir la caméra immédiatement
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Ouverture de la caméra...</Text>
        
        {/* Bouton pour ouvrir manuellement la caméra si elle ne s'ouvre pas automatiquement */}
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={openCamera}
        >
          <Text style={styles.retryButtonText}>Appuyez pour ouvrir la caméra</Text>
        </TouchableOpacity>
      </View>
      
      {/* Rendu de l'éditeur de story */}
      {renderStoryEditor()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    paddingTop: Platform.OS === 'android' ? 40 : 15,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  optionsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  optionButton: {
    backgroundColor: 'rgba(108, 19, 179, 0.6)',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  optionText: {
    color: 'white',
    fontSize: 16,
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#6C13B3',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
  },
  preview: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  previewActions: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 10,
  },
  previewButton: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    flexDirection: 'row',
    marginHorizontal: 5,
    flex: 1,
    justifyContent: 'center',
    maxWidth: '30%',
  },
  previewButtonText: {
    color: 'white',
    marginLeft: 5,
    fontSize: 14,
  },
  sendButton: {
    backgroundColor: '#6C13B3',
  },
  storyButton: {
    backgroundColor: '#FF6B35',
  },
  floatingStoryButton: {
    position: 'absolute',
    top: 80,
    right: 20,
    backgroundColor: '#FF6B35',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  floatingStoryText: {
    color: 'white',
    marginLeft: 5,
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Styles pour la liste d'amis
  thumbnailPreview: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  friendsList: {
    flex: 1,
    width: '100%',
  },
  friendsListContent: {
    padding: 15,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
  },
  friendItemSelected: {
    backgroundColor: 'rgba(108, 19, 179, 0.3)',
    borderColor: '#6C13B3',
    borderWidth: 1,
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  friendName: {
    color: 'white',
    fontSize: 16,
  },
  checkmark: {
    position: 'absolute',
    right: 15,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6C13B3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendContainer: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  sendToFriendsButton: {
    backgroundColor: '#6C13B3',
    padding: 15,
    borderRadius: 30,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: 'rgba(108, 19, 179, 0.5)',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  // Styles pour l'état vide
  emptyFriendsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyFriendsText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 20,
  },
  findFriendsButton: {
    backgroundColor: '#6C13B3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  findFriendsButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  // Styles pour l'éditeur de story
  storyEditorContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  storyEditorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    paddingTop: Platform.OS === 'android' ? 40 : 15,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  publishButton: {
    backgroundColor: '#6C13B3',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    minWidth: 60,
    alignItems: 'center',
  },
  publishButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  storyPreviewContainer: {
    flex: 1,
    position: 'relative',
  },
  storyPreview: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  videoPreview: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  videoText: {
    color: 'white',
    marginTop: 10,
    fontSize: 16,
  },
  captionOverlay: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 10,
    padding: 15,
  },
  captionInput: {
    color: 'white',
    fontSize: 16,
    minHeight: 50,
    maxHeight: 100,
    textAlign: 'center',
  },
  storyEditorActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  editorActionButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    minWidth: 80,
  },
  actionButtonText: {
    color: 'white',
    marginTop: 5,
    fontSize: 12,
  },
});

export default CameraScreen;