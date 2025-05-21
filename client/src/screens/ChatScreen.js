// src/screens/ChatScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getUserConversations } from '../services/chat';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFriends } from '../api/friendsApi';

// Clé pour stocker les associations ami-conversation dans AsyncStorage
const FRIEND_CONVERSATION_KEY = 'friend_conversation_';
const GROUP_CONVERSATION_KEY = 'group_conversation_';

const ChatScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState([]);
  const [showNewChatOptions, setShowNewChatOptions] = useState(false);

  // Charger les amis et leurs conversations
  useEffect(() => {
    const loadFriendsAndConversations = async () => {
      try {
        setLoading(true);
        if (!user) return;
        
        console.log("Chargement des amis et conversations pour l'utilisateur:", user.id);
        
        // 1. Charger la liste des amis
        const friendsList = await getFriends();
        console.log("Amis chargés:", friendsList?.length || 0);
        
        // Créer un Map pour accéder facilement aux données des amis
        const friendsMap = {};
        if (Array.isArray(friendsList)) {
          friendsList.forEach(friend => {
            friendsMap[friend.id] = friend;
          });
        }
        setFriends(friendsMap);
        
        // 2. Charger toutes les conversations
        const allConversations = await getUserConversations(user.id);
        console.log("Toutes conversations chargées:", allConversations?.length || 0);
        
        // 3. Récupérer les conversations associées aux amis depuis AsyncStorage
        const friendConversations = [];
        
        // Récupérer toutes les clés d'AsyncStorage qui correspondent aux conversations d'amis
        const keys = await AsyncStorage.getAllKeys();
        const friendConvKeys = keys.filter(key => key.startsWith(FRIEND_CONVERSATION_KEY));
        const groupConvKeys = keys.filter(key => key.startsWith(GROUP_CONVERSATION_KEY));
        
        // Map pour stocker les associations ami-conversation
        const friendConvMap = {};
        for (const key of friendConvKeys) {
          const friendId = key.replace(FRIEND_CONVERSATION_KEY, '');
          const conversationId = await AsyncStorage.getItem(key);
          friendConvMap[conversationId] = friendId;
        }
        
        // Ajouter les conversations de groupe
        if (Array.isArray(allConversations)) {
          // D'abord, ajouter les conversations de groupe
          for (const conversation of allConversations) {
            if (conversation.is_group) {
              friendConversations.push(conversation);
              
              // Sauvegarder le groupe si ce n'est pas déjà fait
              const groupExists = groupConvKeys.some(key => {
                return AsyncStorage.getItem(key) === conversation.id;
              });
              
              if (!groupExists) {
                const groupId = `group_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
                await AsyncStorage.setItem(`${GROUP_CONVERSATION_KEY}${groupId}`, conversation.id);
              }
            }
          }
          
          // Ensuite, ajouter les conversations individuelles avec les amis
          for (const conversation of allConversations) {
            // Vérifier si cette conversation est associée à un ami
            if (friendConvMap[conversation.id]) {
              const friendId = friendConvMap[conversation.id];
              const friendData = friendsMap[friendId];
              
              // Si nous avons les données de l'ami, enrichir la conversation avec ces informations
              if (friendData) {
                // Créer une nouvelle conversation enrichie
                const enrichedConversation = {
                  ...conversation,
                  otherParticipant: {
                    id: friendData.id,
                    display_name: friendData.display_name || friendData.username || 'Ami',
                    profile_image: friendData.profile_image || friendData.avatar_url
                  }
                };
                friendConversations.push(enrichedConversation);
              } else {
                // Si nous n'avons pas les données de l'ami mais que la conversation lui est associée
                friendConversations.push(conversation);
              }
            } 
            // Pour les conversations non-groupe, vérifier si l'autre participant est un ami
            else if (!conversation.is_group && conversation.otherParticipant && conversation.otherParticipant.id) {
              const otherUserId = conversation.otherParticipant.id;
              
              if (friendsMap[otherUserId]) {
                // Enrichir avec les données de l'ami
                const friendData = friendsMap[otherUserId];
                conversation.otherParticipant = {
                  ...conversation.otherParticipant,
                  display_name: friendData.display_name || friendData.username || conversation.otherParticipant.display_name,
                  profile_image: friendData.profile_image || friendData.avatar_url || conversation.otherParticipant.profile_image
                };
                
                // Sauvegarder l'association pour la prochaine fois
                await AsyncStorage.setItem(`${FRIEND_CONVERSATION_KEY}${otherUserId}`, conversation.id);
                
                friendConversations.push(conversation);
              }
            }
          }
          
          console.log("Conversations filtrées:", friendConversations.length);
          setChats(friendConversations);
        } else {
          console.warn("Format de réponse inattendu:", allConversations);
          setChats([]);
        }
        
        // En mode dev, ajouter des données fictives si aucune conversation n'est trouvée
        if (__DEV__ && (friendConversations.length === 0)) {
          const mockChats = [
            {
              id: '1',
              is_group: false,
              otherParticipant: {
                id: 'friend1',
                display_name: 'Alice Martin',
                profile_image: 'https://randomuser.me/api/portraits/women/44.jpg'
              },
              lastMessage: {
                content: 'Bonjour, comment ça va ?',
                created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString() // 5 min ago
              },
              unreadCount: 2
            },
            {
              id: '2',
              is_group: true,
              name: "Groupe des amis",
              lastMessage: {
                content: 'On se retrouve demain ?',
                created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString() // 30 min ago
              },
              unreadCount: 0
            }
          ];
          console.log("Ajout de conversations fictives pour le développement");
          setChats(mockChats);
          
          // Stocker ces conversations fictives dans AsyncStorage
          await AsyncStorage.setItem(`${FRIEND_CONVERSATION_KEY}friend1`, '1');
          await AsyncStorage.setItem(`${GROUP_CONVERSATION_KEY}group1`, '2');
        }
      } catch (error) {
        console.error('Erreur lors du chargement des conversations:', error);
        Alert.alert(
          'Erreur',
          'Impossible de charger vos conversations. Veuillez réessayer.'
        );
        setChats([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadFriendsAndConversations();
    
    // Charger les chats à chaque fois que l'écran est focalisé
    const unsubscribe = navigation.addListener('focus', loadFriendsAndConversations);
    return unsubscribe;
  }, [user, navigation]);
  
  const formatTime = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true, locale: fr });
    } catch (error) {
      console.error('Erreur lors du formatage de la date:', error);
      return '';
    }
  };
  
  const getLastMessagePreview = (chat) => {
    if (!chat.lastMessage) return 'Aucun message';
    
    if (chat.lastMessage.media_url) {
      if (chat.lastMessage.media_type === 'image') {
        return '📷 Photo';
      } else if (chat.lastMessage.media_type === 'video') {
        return '📹 Vidéo';
      }
    }
    
    return chat.lastMessage.content || '';
  };
  
  const getChatName = (chat) => {
    if (chat.is_group) return chat.name || 'Groupe sans nom';
    return chat.otherParticipant?.display_name || chat.otherParticipant?.username || 'Utilisateur inconnu';
  };
  
  const getChatAvatar = (chat) => {
    if (chat.is_group) {
      // Retourner un avatar de groupe
      return 'https://via.placeholder.com/150/6C13B3/FFFFFF?text=G';
    }
    
    return chat.otherParticipant?.profile_image || chat.otherParticipant?.avatar_url || 'https://randomuser.me/api/portraits/lego/1.jpg';
  };
  
  const filteredChats = chats.filter(chat => {
    if (!searchQuery) return true;
    
    const chatName = getChatName(chat).toLowerCase();
    return chatName.includes(searchQuery.toLowerCase());
  });
  
  // Gérer le clic sur le bouton "+"
  const handleNewChat = () => {
    setShowNewChatOptions(true);
  };

  // Créer une nouvelle conversation individuelle
  const startIndividualChat = () => {
    setShowNewChatOptions(false);
    navigation.navigate('SelectFriendsScreen');
  };

  // Créer une nouvelle conversation de groupe
  const startGroupChat = () => {
    setShowNewChatOptions(false);
    navigation.navigate('SelectFriendsScreen', { groupMode: true });
  };

  // Fonction pour déboguer AsyncStorage - Retirer dans la version production
  const debugAsyncStorage = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const friendKeys = keys.filter(key => key.startsWith(FRIEND_CONVERSATION_KEY));
      const groupKeys = keys.filter(key => key.startsWith(GROUP_CONVERSATION_KEY));
      
      console.log("Clés d'amis dans AsyncStorage:", friendKeys);
      for (const key of friendKeys) {
        const value = await AsyncStorage.getItem(key);
        console.log(`${key}: ${value}`);
      }
      
      console.log("Clés de groupes dans AsyncStorage:", groupKeys);
      for (const key of groupKeys) {
        const value = await AsyncStorage.getItem(key);
        console.log(`${key}: ${value}`);
      }
    } catch (error) {
      console.error("Erreur de débogage:", error);
    }
  };

  const renderChatItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.chatItem}
      onPress={() => navigation.navigate('ConversationScreen', { 
        chatId: item.id,
        chatName: getChatName(item),
        chatAvatar: getChatAvatar(item),
        isGroup: item.is_group,
        otherUserId: item.is_group ? null : item.otherParticipant?.id
      })}
    >
      <Image 
        source={{ uri: getChatAvatar(item) }} 
        style={[styles.avatar, item.is_group && styles.groupAvatar]}
        defaultSource={require('../../assets/default-avatar.png')} // Assurez-vous d'avoir cette image
      />
      
      <View style={styles.chatInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{getChatName(item)}</Text>
          <Text style={styles.time}>{item.lastMessage ? formatTime(item.lastMessage.created_at) : ''}</Text>
        </View>
        
        <View style={styles.messageRow}>
          <Text 
            style={[styles.message, item.unreadCount > 0 && styles.unreadMessage]} 
            numberOfLines={1}
          >
            {getLastMessagePreview(item)}
          </Text>
          
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
  
  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubble-ellipses-outline" size={80} color="#ddd" />
      <Text style={styles.emptyText}>Aucune conversation</Text>
      <Text style={styles.emptySubtext}>Démarrez une conversation avec vos amis</Text>
      <View style={styles.emptyButtonsContainer}>
        <TouchableOpacity 
          style={styles.emptyButton}
          onPress={startIndividualChat}
        >
          <Ionicons name="person" size={24} color="#fff" style={styles.emptyButtonIcon} />
          <Text style={styles.emptyButtonText}>Conversation</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.emptyButton}
          onPress={startGroupChat}
        >
          <Ionicons name="people" size={24} color="#fff" style={styles.emptyButtonIcon} />
          <Text style={styles.emptyButtonText}>Groupe</Text>
        </TouchableOpacity>
      </View>
      
      {/* Bouton pour déboguer - À retirer en production */}
      {__DEV__ && (
        <TouchableOpacity 
          style={[styles.findFriendsButton, { marginTop: 20, backgroundColor: '#333' }]}
          onPress={debugAsyncStorage}
        >
          <Text style={styles.findFriendsText}>Debug Storage</Text>
        </TouchableOpacity>
      )}
    </View>
  );
  
 return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity 
          style={styles.newChatButton}
          onPress={handleNewChat}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#6C13B3" />
        </View>
      ) : (
        <FlatList
          data={filteredChats}
          renderItem={renderChatItem}
          keyExtractor={item => item.id}
          ListEmptyComponent={renderEmptyComponent}
          contentContainerStyle={chats.length === 0 ? { flex: 1 } : null}
        />
      )}
      
      {/* Modal pour sélectionner le type de conversation */}
      <Modal
        visible={showNewChatOptions}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowNewChatOptions(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowNewChatOptions(false)}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={startIndividualChat}
            >
              <Ionicons name="person" size={24} color="#6C13B3" style={styles.modalOptionIcon} />
              <Text style={styles.modalOptionText}>Nouvelle conversation</Text>
            </TouchableOpacity>
            
            <View style={styles.modalDivider} />
            
            <TouchableOpacity
              style={styles.modalOption}
              onPress={startGroupChat}
            >
              <Ionicons name="people" size={24} color="#6C13B3" style={styles.modalOptionIcon} />
              <Text style={styles.modalOptionText}>Nouveau groupe</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  newChatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6C13B3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    margin: 15,
    paddingHorizontal: 15,
    height: 45,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
  },
  chatItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  groupAvatar: {
    backgroundColor: '#6C13B3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  time: {
    fontSize: 14,
    color: '#999',
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  message: {
    fontSize: 15,
    color: '#666',
    flex: 1,
  },
  unreadMessage: {
    fontWeight: '600',
    color: '#333',
  },
  unreadBadge: {
    backgroundColor: '#6C13B3',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  unreadCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    color: '#333',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  emptyButtonsContainer: {
    flexDirection: 'row',
    marginTop: 10,
  },
  emptyButton: {
    backgroundColor: '#6C13B3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  emptyButtonIcon: {
    marginRight: 8,
  },
  emptyButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  findFriendsButton: {
    backgroundColor: '#6C13B3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  findFriendsText: {
    color: 'white',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 20,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  modalOptionIcon: {
    marginRight: 15,
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 15,
  },
});

export default ChatScreen;