// src/screens/ConversationScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StatusBar,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import chatService, { getChatMessages, sendMessage, uploadMedia, ensureCurrentUserId } from '../services/chat';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Clés AsyncStorage
const MESSAGES_KEY_PREFIX = 'local_messages_';
const USER_ID_KEY = 'local_user_id';

const ConversationScreen = ({ route, navigation }) => {
  const { chatId, chatName, chatAvatar, otherUserId } = route.params || {};
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [media, setMedia] = useState(null);
  const flatListRef = useRef(null);
  const messagePollingInterval = useRef(null);
  const [lastMessageId, setLastMessageId] = useState(null);
  const conversationIdRef = useRef(chatId);
  const [contactStatus, setContactStatus] = useState('En ligne');
  const SNAP_MESSAGE_PREFIX = 'snap_';
  const OPENED_SNAPS_KEY = 'opened_snaps_';
  // Débogage de l'ID utilisateur
  useEffect(() => {
    const checkUserIds = async () => {
      try {
        const localChatUserId = await AsyncStorage.getItem(USER_ID_KEY);
        console.log('ID utilisateur stocké:', localChatUserId);
        console.log('ID utilisateur auth:', user?.id);
        
        // Si l'ID utilisateur n'est pas synchronisé, le mettre à jour
        if (user?.id && localChatUserId !== user.id) {
          await AsyncStorage.setItem(USER_ID_KEY, user.id);
          console.log('ID utilisateur mis à jour:', user.id);
        }
      } catch (error) {
        console.error('Erreur lors de la vérification des IDs:', error);
      }
    };
    
    checkUserIds();
  }, [user]);

  useEffect(() => {
    // Vérifier si chatId est défini et valide
    if (!chatId) {
      console.error("ID de conversation manquant");
      
      // Essayer de récupérer l'ID depuis le paramètre conversationId (pour les retours de CameraScreen)
      if (route.params?.conversationId) {
        console.log("Utilisation de conversationId en fallback:", route.params.conversationId);
        conversationIdRef.current = route.params.conversationId;
      } else {
        console.error("Aucun ID de conversation trouvé, retour à l'écran précédent");
        navigation.goBack();
        return;
      }
    } else {
      // Si chatId est valide, l'utiliser
      console.log("Utilisation de chatId:", chatId);
      conversationIdRef.current = chatId;
    }
    
    // Simuler un statut du contact qui change
    const statusTimer = setTimeout(() => {
      const statuses = ['En ligne', 'Vu à 12:34', 'En train d\'écrire...'];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      setContactStatus(randomStatus);
    }, 3000);
    
    return () => clearTimeout(statusTimer);
  }, [navigation, chatId, route.params?.conversationId, chatName, chatAvatar]);
  
  // Charger les messages
  const loadMessages = async () => {
    try {
      const currentChatId = conversationIdRef.current;
      if (!currentChatId) {
        console.error("ID de conversation manquant lors du chargement");
        return;
      }
      
      // Forcer la synchronisation de l'ID utilisateur
      if (user?.id) {
        await AsyncStorage.setItem(USER_ID_KEY, user.id);
      }
      
      console.log(`Chargement des messages pour la conversation: ${currentChatId}`);
      
      // 1. Essayer d'abord de charger à partir du service
      let chatMessages = await getChatMessages(currentChatId);
      
      // 2. Essayer de charger directement depuis AsyncStorage si le service échoue
      if (!chatMessages || chatMessages.length === 0) {
        try {
          const messagesKey = `${MESSAGES_KEY_PREFIX}${currentChatId}`;
          const storedMessagesStr = await AsyncStorage.getItem(messagesKey);
          
          if (storedMessagesStr) {
            const storedMessages = JSON.parse(storedMessagesStr);
            console.log(`Récupéré ${storedMessages.length} messages depuis AsyncStorage`);
            chatMessages = storedMessages;
          }
        } catch (storageError) {
          console.error('Erreur lors du chargement depuis AsyncStorage:', storageError);
        }
      }
      
      if (chatMessages && chatMessages.length > 0) {
        console.log(`Total: ${chatMessages.length} messages pour la conversation ${currentChatId}`);
        
        // Tri des messages par date
        chatMessages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        
        // Enregistrer les messages pour assurer la persistance
        try {
          const messagesKey = `${MESSAGES_KEY_PREFIX}${currentChatId}`;
          await AsyncStorage.setItem(messagesKey, JSON.stringify(chatMessages));
        } catch (saveError) {
          console.error('Erreur lors de la sauvegarde des messages:', saveError);
        }
        
        setMessages(chatMessages);
        
        // Mémoriser l'ID du dernier message
        if (chatMessages.length > 0) {
          const newestMessageId = chatMessages[chatMessages.length - 1].id;
          setLastMessageId(newestMessageId);
        }
      } else {
        console.log('Aucun message trouvé pour cette conversation');
        setMessages([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error);
      Alert.alert('Erreur', 'Impossible de charger les messages');
    } finally {
      setLoading(false);
    }
  };

  // Configuration du polling pour les messages
  useEffect(() => {
    const currentChatId = conversationIdRef.current;
    
    if (!currentChatId) {
      console.error("ID de conversation manquant pour le polling");
      return;
    }
    
    console.log('Initialisation du polling pour:', currentChatId);
    
    // Charger les messages immédiatement
    loadMessages();
    
    // Configurer un intervalle de polling
    messagePollingInterval.current = setInterval(() => {
      loadMessages();
    }, 3000);
    
    // Nettoyage à la sortie
    return () => {
      console.log('Nettoyage de l\'intervalle de polling');
      if (messagePollingInterval.current) {
        clearInterval(messagePollingInterval.current);
      }
    };
  }, []);
  // Option pour prendre une photo avec la caméra
// Assurez-vous que cette importation est présente en haut de votre fichier
const openSnap = async (messageId, mediaUrl) => {
  try {
    // Marquer le snap comme ouvert dans l'état local
    setMessages(prevMessages => 
      prevMessages.map(msg => 
        msg.id === messageId 
          ? { ...msg, is_opened: true } 
          : msg
      )
    );
    
    // Enregistrer dans AsyncStorage que ce snap a été ouvert
    const openedSnapsKey = `${OPENED_SNAPS_KEY}${user.id}`;
    const openedSnapsJSON = await AsyncStorage.getItem(openedSnapsKey);
    const openedSnaps = openedSnapsJSON ? JSON.parse(openedSnapsJSON) : [];
    
    if (!openedSnaps.includes(messageId)) {
      openedSnaps.push(messageId);
      await AsyncStorage.setItem(openedSnapsKey, JSON.stringify(openedSnaps));
    }
    
    // Naviguer vers l'écran de visualisation du snap
    navigation.navigate('SnapViewerScreen', {
      mediaUrl,
      messageId,
      otherUserId,
      chatName
    });
  } catch (error) {
    console.error('Erreur lors de l\'ouverture du snap:', error);
    Alert.alert('Erreur', 'Impossible d\'ouvrir ce message');
  }
};
// Remplacez votre fonction takePhoto existante par celle-ci
const takePhoto = async () => {
  try {
    // Naviguer vers l'écran de caméra personnalisé
    // Passer un flag pour indiquer que l'appel vient de la conversation
    navigation.navigate('CameraScreen', {
      fromConversation: true,
      conversationId: chatId // Passer l'ID de la conversation actuelle
    });
  } catch (error) {
    console.error('Erreur lors de la navigation vers la caméra:', error);
    Alert.alert('Erreur', 'Impossible d\'accéder à la caméra');
  }
};
const simulateReceivedSnap = async () => {
  // Utiliser une image test
  const testImageUrl = 'https://source.unsplash.com/random/800x600/?nature';
  
  try {
    const currentChatId = conversationIdRef.current;
    
    if (!currentChatId) {
      Alert.alert('Erreur', 'ID de conversation manquant');
      return;
    }
    
    // Créer un message Snap simulé
    const simulatedSnap = {
      id: 'simulated_' + Date.now(),
      conversation_id: currentChatId,
      user_id: otherUserId || 'test_user', // Utiliser otherUserId ou une valeur par défaut
      content: `${SNAP_MESSAGE_PREFIX}${Date.now()}`,
      media_url: testImageUrl,
      media_type: 'image',
      created_at: new Date().toISOString(),
      is_temp: false
    };
    
    // Ajouter le message simulé à l'état local
    setMessages(prevMessages => [...prevMessages, simulatedSnap]);
    
    // Sauvegarder dans AsyncStorage
    try {
      const messagesKey = `${MESSAGES_KEY_PREFIX}${currentChatId}`;
      const messagesStr = await AsyncStorage.getItem(messagesKey);
      const existingMessages = messagesStr ? JSON.parse(messagesStr) : [];
      
      if (!existingMessages.some(m => m.id === simulatedSnap.id)) {
        const updatedMessages = [...existingMessages, simulatedSnap];
        await AsyncStorage.setItem(messagesKey, JSON.stringify(updatedMessages));
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du Snap simulé:', error);
    }
    
    // Scroll vers le bas pour montrer le nouveau message
    if (flatListRef.current) {
      setTimeout(() => {
        flatListRef.current.scrollToEnd({ animated: true });
      }, 100);
    }
    
    Alert.alert('Test', 'Vous avez reçu un Snap de test! Cliquez dessus pour le voir.');
  } catch (error) {
    console.error('Erreur lors de la simulation du Snap:', error);
    Alert.alert('Erreur', 'Impossible de simuler la réception d\'un Snap');
  }
};
// Ajoutez cette fonction useEffect après les autres useEffect dans votre composant
// pour traiter l'image capturée quand l'utilisateur revient de l'écran caméra

useEffect(() => {
  // Vérifie si route.params contient une image capturée et si on est dans la bonne conversation
  if (route.params?.capturedImage && route.params?.conversationId === chatId) {
    const photoUri = route.params.capturedImage;
    console.log('Photo reçue dans ConversationScreen:', photoUri);
    
    // Définir le média avec l'URI de la photo prise
    setMedia({
      uri: photoUri,
      type: 'image'
    });
    
    // Effacer le paramètre pour éviter de réutiliser la même image
    // si l'utilisateur navigue ailleurs puis revient
    navigation.setParams({ capturedImage: undefined });
  }
}, [route.params?.capturedImage, route.params?.conversationId]);
  // Sélectionner une image à envoyer
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Nous avons besoin de votre permission pour accéder à votre galerie.');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setMedia({
          uri: asset.uri,
          type: asset.type === 'video' ? 'video' : 'image'
        });
      }
    } catch (error) {
      console.error('Erreur lors de la sélection du média:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner le média');
    }
  };

  // Afficher les options médias
  const showMediaOptions = () => {
    Alert.alert(
      'Envoyer un média',
      'Choisissez une option',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Prendre une photo', onPress: takePhoto },
        { text: 'Choisir depuis la galerie', onPress: pickImage }
      ]
    );
  };

  // Envoyer un message
  const handleSend = async () => {
    if ((!inputText || inputText.trim() === '') && !media) {
      return;
    }

    setSending(true);

    try {
      const currentChatId = conversationIdRef.current;
      // Forcer la synchronisation de l'ID utilisateur
      if (user?.id) {
        await AsyncStorage.setItem(USER_ID_KEY, user.id);
      }
      
      let mediaUrl = null;
      let mediaType = null;

      // Si on a un média, on l'upload
      if (media) {
        try {
          mediaUrl = await uploadMedia(media.uri, media.type);
          mediaType = media.type;
        } catch (mediaError) {
          console.error('Erreur lors de l\'upload du média:', mediaError);
        }
      }

      // Ajouter un message temporaire pour une meilleure UX
      const tempMessage = {
        id: 'temp_' + Date.now(),
        conversation_id: currentChatId,
        user_id: user?.id,
        content: inputText.trim(),
        media_url: mediaUrl,
        media_type: mediaType,
        created_at: new Date().toISOString(),
        is_temp: true
      };
      
      // Ajouter le message temporaire à l'état local
      setMessages(prevMessages => [...prevMessages, tempMessage]);
      
      // Réinitialiser les champs
      setInputText('');
      setMedia(null);
      
      // Scroll en bas automatiquement
      if (flatListRef.current) {
        setTimeout(() => {
          flatListRef.current.scrollToEnd({ animated: true });
        }, 100);
      }

      // Envoyer le message via le service
      console.log(`Envoi du message: "${inputText.trim()}" pour la conversation: ${currentChatId}`);
      const sentMessage = await sendMessage(
        currentChatId,
        inputText.trim(),
        mediaUrl,
        mediaType
      );
      
      if (sentMessage && sentMessage.id) {
        console.log('Message envoyé avec succès, ID:', sentMessage.id);
        
        // Sauvegarder directement dans AsyncStorage pour garantir la persistance
        try {
          const messagesKey = `${MESSAGES_KEY_PREFIX}${currentChatId}`;
          const messagesStr = await AsyncStorage.getItem(messagesKey);
          const existingMessages = messagesStr ? JSON.parse(messagesStr) : [];
          
          // Vérifier si le message n'existe pas déjà
          if (!existingMessages.some(m => m.id === sentMessage.id)) {
            const updatedMessages = [...existingMessages, sentMessage];
            await AsyncStorage.setItem(messagesKey, JSON.stringify(updatedMessages));
            console.log('Message sauvegardé dans AsyncStorage avec succès');
          }
        } catch (saveError) {
          console.error('Erreur lors de la sauvegarde du message:', saveError);
        }
      }
      
      // Recharger les messages pour avoir la version finale
      setTimeout(() => {
        loadMessages();
      }, 500);
      
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer le message');
    } finally {
      setSending(false);
    }
  };

  // Formatter la date
  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      return format(date, 'HH:mm', { locale: fr });
    } catch (error) {
      console.error('Erreur lors du formatage de la date:', error);
      return '';
    }
  };

  // Rendre un message
  const renderMessage = ({ item }) => {
    // Vérifier si l'utilisateur actuel est l'expéditeur
    const isCurrentUser = user && String(item.user_id) === String(user.id);
    
    // Vérifier si c'est un message snap
    const isSnapMessage = item.media_url && item.content && item.content.startsWith(SNAP_MESSAGE_PREFIX);
    
    // Si c'est un snap et qu'il n'a pas été ouvert
    if (isSnapMessage && !item.is_opened && !isCurrentUser) {
      return (
        <View style={[
          styles.messageContainer,
          isCurrentUser ? styles.currentUserMessageContainer : styles.otherUserMessageContainer
        ]}>
          {!isCurrentUser && (
            <Image 
              source={{ uri: chatAvatar || 'https://randomuser.me/api/portraits/lego/1.jpg' }} 
              style={styles.messageAvatar} 
            />
          )}
          
          <TouchableOpacity 
            style={[
              styles.messageBubble,
              isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
              styles.snapBubble
            ]}
            onPress={() => openSnap(item.id, item.media_url)}
          >
            <View style={styles.snapIconContainer}>
              <Ionicons name="camera" size={24} color={isCurrentUser ? 'white' : '#6C13B3'} />
            </View>
            <Text style={[
              styles.snapText,
              isCurrentUser ? styles.currentUserText : styles.otherUserText
            ]}>
              Appuyez pour voir la photo
            </Text>
            <Text style={[
              styles.messageTime,
              isCurrentUser ? styles.currentUserTime : styles.otherUserTime
            ]}>
              {item.is_temp ? "Envoi..." : formatMessageTime(item.created_at)}
            </Text>
          </TouchableOpacity>
          
          {isCurrentUser && (
            <View style={styles.emptyAvatar} />
          )}
        </View>
      );
    }
    
    // Pour les snaps déjà ouverts ou autres messages normaux
    return (
      <View style={[
        styles.messageContainer,
        isCurrentUser ? styles.currentUserMessageContainer : styles.otherUserMessageContainer
      ]}>
        {!isCurrentUser && (
          <Image 
            source={{ uri: chatAvatar || 'https://randomuser.me/api/portraits/lego/1.jpg' }} 
            style={styles.messageAvatar} 
          />
        )}
        
        <View style={[
          styles.messageBubble,
          isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
          item.media_url ? styles.mediaBubble : null,
          item.is_temp ? styles.tempMessage : null,
          isSnapMessage && item.is_opened ? styles.openedSnapBubble : null
        ]}>
          {item.media_url && (
            isSnapMessage && item.is_opened ? (
              <View style={styles.openedSnapContainer}>
                <Ionicons name="checkmark-circle" size={28} color={isCurrentUser ? 'white' : '#6C13B3'} />
                <Text style={[
                  styles.openedSnapText,
                  isCurrentUser ? styles.currentUserText : styles.otherUserText
                ]}>
                  Snap ouvert
                </Text>
              </View>
            ) : (
              <View style={styles.mediaContainer}>
                <Image 
                  source={{ uri: item.media_url }} 
                  style={styles.mediaImage}
                  resizeMode="cover"
                />
              </View>
            )
          )}
          
          {item.content && !isSnapMessage && (
            <Text style={[
              styles.messageText,
              isCurrentUser ? styles.currentUserText : styles.otherUserText
            ]}>
              {item.content}
            </Text>
          )}
          
          <Text style={[
            styles.messageTime,
            isCurrentUser ? styles.currentUserTime : styles.otherUserTime
          ]}>
            {item.is_temp ? "Envoi..." : formatMessageTime(item.created_at)}
          </Text>
        </View>
        
        {isCurrentUser && (
          <View style={styles.emptyAvatar} />
        )}
      </View>
    );
  };
  const handleSendSnap = async () => {
    if (!media) {
      Alert.alert('Erreur', 'Veuillez sélectionner une image à envoyer');
      return;
    }
  
    setSending(true);
  
    try {
      const currentChatId = conversationIdRef.current;
      // Forcer la synchronisation de l'ID utilisateur
      if (user?.id) {
        await AsyncStorage.setItem(USER_ID_KEY, user.id);
      }
      
      let mediaUrl = null;
      let mediaType = null;
  
      // Upload du média
      try {
        mediaUrl = await uploadMedia(media.uri, media.type);
        mediaType = media.type;
      } catch (mediaError) {
        console.error('Erreur lors de l\'upload du média:', mediaError);
        Alert.alert('Erreur', 'Impossible d\'uploader l\'image');
        setSending(false);
        return;
      }
  
      // Créer un contenu spécial pour les snaps
      const snapContent = `${SNAP_MESSAGE_PREFIX}${Date.now()}`;
  
      // Ajouter un message temporaire pour une meilleure UX
      const tempMessage = {
        id: 'temp_' + Date.now(),
        conversation_id: currentChatId,
        user_id: user?.id,
        content: snapContent,
        media_url: mediaUrl,
        media_type: mediaType,
        created_at: new Date().toISOString(),
        is_temp: true
      };
      
      // Ajouter le message temporaire à l'état local
      setMessages(prevMessages => [...prevMessages, tempMessage]);
      
      // Réinitialiser les champs
      setInputText('');
      setMedia(null);
      
      // Scroll en bas automatiquement
      if (flatListRef.current) {
        setTimeout(() => {
          flatListRef.current.scrollToEnd({ animated: true });
        }, 100);
      }
  
      // Envoyer le message via le service
      console.log(`Envoi d'un snap pour la conversation: ${currentChatId}`);
      const sentMessage = await sendMessage(
        currentChatId,
        snapContent,
        mediaUrl,
        mediaType
      );
      
      if (sentMessage && sentMessage.id) {
        console.log('Snap envoyé avec succès, ID:', sentMessage.id);
        
        // Sauvegarder directement dans AsyncStorage pour garantir la persistance
        try {
          const messagesKey = `${MESSAGES_KEY_PREFIX}${currentChatId}`;
          const messagesStr = await AsyncStorage.getItem(messagesKey);
          const existingMessages = messagesStr ? JSON.parse(messagesStr) : [];
          
          // Vérifier si le message n'existe pas déjà
          if (!existingMessages.some(m => m.id === sentMessage.id)) {
            const updatedMessages = [...existingMessages, sentMessage];
            await AsyncStorage.setItem(messagesKey, JSON.stringify(updatedMessages));
            console.log('Snap sauvegardé dans AsyncStorage avec succès');
          }
        } catch (saveError) {
          console.error('Erreur lors de la sauvegarde du snap:', saveError);
        }
      }
      
      // Recharger les messages pour avoir la version finale
      setTimeout(() => {
        loadMessages();
      }, 500);
      
    } catch (error) {
      console.error('Erreur lors de l\'envoi du snap:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer la photo');
    } finally {
      setSending(false);
    }
  };
  // Header personnalisé
  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="#6C13B3" />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.profileContainer}
        onPress={() => navigation.navigate('ProfileScreen', { userId: otherUserId })}
      >
        <Image 
          source={{ uri: chatAvatar || 'https://randomuser.me/api/portraits/lego/1.jpg' }} 
          style={styles.headerAvatar} 
        />
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>{chatName || 'Discussion'}</Text>
          <Text style={styles.headerSubtitle}>{contactStatus}</Text>
        </View>
      </TouchableOpacity>
      
      <View style={styles.headerActions}>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={takePhoto}
        >
          <Ionicons name="camera" size={24} color="#6C13B3" />
        </TouchableOpacity>
        
        {/* Bouton de test pour simuler un Snap reçu */}
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={simulateReceivedSnap}
        >
          <Ionicons name="gift" size={24} color="#FFFC00" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => navigation.navigate('ChatInfoScreen', { chatId: conversationIdRef.current })}
        >
          <Ionicons name="ellipsis-vertical" size={24} color="#6C13B3" />
        </TouchableOpacity>
      </View>
    </View>
  );
  // Afficher un indicateur de chargement
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        {renderHeader()}
        <ActivityIndicator size="large" color="#6C13B3" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#FFF" barStyle="dark-content" />
      {renderHeader()}
      
      <KeyboardAvoidingView
        style={styles.flexContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContainer}
          onContentSizeChange={() => {
            if (flatListRef.current && messages.length > 0) {
              flatListRef.current.scrollToEnd({ animated: false });
            }
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucun message</Text>
              <Text style={styles.emptySubtext}>Envoyez votre premier message pour démarrer la conversation!</Text>
            </View>
          }
        />
        {media && (
  <View style={styles.mediaPreviewContainer}>
    <Image 
      source={{ uri: media.uri }} 
      style={styles.mediaPreview}
    />
    <TouchableOpacity 
      style={styles.removeMediaButton}
      onPress={() => setMedia(null)}
    >
      <Ionicons name="close-circle" size={24} color="white" />
    </TouchableOpacity>
    
    {/* Bouton pour envoyer comme snap */}
    <TouchableOpacity 
      style={styles.sendAsSnapButton}
      onPress={handleSendSnap}
      disabled={sending}
    >
      {sending ? (
        <ActivityIndicator size="small" color="white" />
      ) : (
        <>
          <Ionicons name="flash" size={16} color="white" />
          <Text style={styles.sendAsSnapText}>Envoyer comme Snap</Text>
        </>
      )}
    </TouchableOpacity>
  </View>
)}
        <View style={styles.inputContainer}>
          <TouchableOpacity 
            style={styles.attachButton}
            onPress={showMediaOptions}
          >
            <Ionicons name="add-circle" size={28} color="#6C13B3" />
          </TouchableOpacity>
          
          <TextInput
            style={styles.input}
            placeholder="Message..."
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
          />
          
          {inputText.trim() || media ? (
            <TouchableOpacity 
              style={[
                styles.sendButton,
                sending ? styles.sendButtonDisabled : null
              ]}
              onPress={handleSend}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="send" size={20} color="white" />
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.micButton}
              onPress={() => Alert.alert('Info', 'Fonction vocale non disponible')}
            >
              <Ionicons name="mic" size={24} color="#6C13B3" />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  flexContainer: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Styles du header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    padding: 5,
  },
  profileContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerTextContainer: {
    marginLeft: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
    marginLeft: 5,
  },
  // Messages
  messagesList: {
    flex: 1,
    paddingHorizontal: 10,
  },
  messagesContainer: {
    paddingTop: 10,
    paddingBottom: 10,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-end',
  },
  currentUserMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherUserMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  emptyAvatar: {
    width: 30,
    marginLeft: 10,
  },
  messageBubble: {
    maxWidth: '70%',
    padding: 10,
    borderRadius: 18,
  },
  currentUserBubble: {
    backgroundColor: '#6C13B3',
    borderBottomRightRadius: 5,
  },
  otherUserBubble: {
    backgroundColor: '#F0F0F0',
    borderBottomLeftRadius: 5,
  },
  mediaBubble: {
    padding: 3,
    height:200,
    width:250,
    overflow: 'hidden',
  },
  tempMessage: {
    opacity: 0.7,
  },
  messageText: {
    fontSize: 16,
  },
  currentUserText: {
    color: 'white',
  },
  otherUserText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 3,
    alignSelf: 'flex-end',
  },
  currentUserTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherUserTime: {
    color: '#999',
  },
  // Média
  mediaContainer: {
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 5,
  },
  mediaImage: {
    width: '100%',
    height: 200,
    borderRadius: 15,
  },
  mediaPreviewContainer: {
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    position: 'relative',
  },
  mediaPreview: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  removeMediaButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 15,
  },
  // Saisie
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  attachButton: {
    padding: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginHorizontal: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6C13B3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButton: {
    padding: 5,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  // Aucun message
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#999',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  snapBubble: {
    backgroundColor: '#FFFC00', // Couleur jaune de Snapchat
    borderColor: '#FFED4A',
    borderWidth: 1,
    paddingVertical: 15,
  },
  snapIconContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  snapText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#333',
    marginBottom: 5,
  },
  openedSnapBubble: {
    height: 'auto',
    width: 'auto',
  },
  openedSnapContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  openedSnapText: {
    fontSize: 14,
    marginTop: 5,
  },
  sendAsSnapButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: '#6C13B3',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  sendAsSnapText: {
    color: 'white',
    fontSize: 12,
    marginLeft: 5,
  },
});

export default ConversationScreen;