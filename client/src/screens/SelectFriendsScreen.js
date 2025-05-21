// src/screens/SelectFriendsScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  TextInput,
  SafeAreaView,
  Platform // Ajout de Platform pour éviter l'erreur
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { getFriends } from '../api/friendsApi';
import { createConversation } from '../services/chat';

// Clé pour stocker les associations ami-conversation dans AsyncStorage
const FRIEND_CONVERSATION_KEY = 'friend_conversation_';
const GROUP_CONVERSATION_KEY = 'group_conversation_';

const SelectFriendsScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [showGroupNameInput, setShowGroupNameInput] = useState(false);
  
  // Le mode groupe est activé par défaut si spécifié dans les paramètres de route
  const isGroupMode = route.params?.groupMode || false;
  
  // Chargement initial des amis
  useEffect(() => {
    const loadFriends = async () => {
      try {
        setLoading(true);
        const friendsList = await getFriends();
        console.log('Amis chargés:', friendsList?.length || 0);
        
        if (Array.isArray(friendsList)) {
          setFriends(friendsList);
        } else {
          setFriends([]);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des amis:', error);
        Alert.alert('Erreur', 'Impossible de charger vos amis');
        setFriends([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadFriends();
  }, [user]);
  
  // Filtrer les amis en fonction de la recherche
  const filteredFriends = friends.filter(friend => {
    const name = friend.display_name || friend.username || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });
  
  // Sélectionner ou désélectionner un ami
  const toggleFriendSelection = (friend) => {
    if (isAlreadySelected(friend.id)) {
      setSelectedFriends(prev => prev.filter(f => f.id !== friend.id));
    } else {
      setSelectedFriends(prev => [...prev, friend]);
    }
  };
  
  // Vérifier si un ami est déjà sélectionné
  const isAlreadySelected = (friendId) => {
    return selectedFriends.some(f => f.id === friendId);
  };
  
  // Créer une conversation avec les amis sélectionnés
  const handleCreateConversation = async () => {
    if (selectedFriends.length === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner au moins un ami');
      return;
    }
    
    try {
      setCreatingGroup(true);
      
      // Si c'est un groupe et qu'il y a plus d'un ami
      if (isGroupMode && selectedFriends.length > 1) {
        if (!groupName.trim()) {
          setShowGroupNameInput(true);
          setCreatingGroup(false);
          return;
        }
        
        // Créer une conversation de groupe
        const friendIds = selectedFriends.map(friend => friend.id);
        const groupConversation = await createConversation(friendIds, true, groupName.trim());
        
        if (groupConversation && groupConversation.id) {
          // Sauvegarder l'association groupe-conversation
          const groupId = `group_${Date.now()}`;
          await AsyncStorage.setItem(`${GROUP_CONVERSATION_KEY}${groupId}`, groupConversation.id);
          
          // Naviguer vers la conversation
          navigation.navigate('ConversationScreen', {
            chatId: groupConversation.id,
            chatName: groupName.trim(),
            isGroup: true
          });
        } else {
          throw new Error('Impossible de créer la conversation de groupe');
        }
      } 
      // Si un seul ami est sélectionné, créer une conversation normale
      else if (selectedFriends.length === 1) {
        const friend = selectedFriends[0];
        
        // Vérifier si une conversation existe déjà
        const existingConvId = await AsyncStorage.getItem(`${FRIEND_CONVERSATION_KEY}${friend.id}`);
        
        let conversationId = existingConvId;
        
        // Si aucune conversation n'existe, en créer une nouvelle
        if (!existingConvId) {
          const conversation = await createConversation([friend.id], false);
          conversationId = conversation.id;
          
          // Sauvegarder l'association
          await AsyncStorage.setItem(`${FRIEND_CONVERSATION_KEY}${friend.id}`, conversationId);
        }
        
        // Naviguer vers la conversation
        navigation.navigate('ConversationScreen', {
          chatId: conversationId,
          chatName: friend.display_name || friend.username || 'Ami',
          chatAvatar: friend.profile_image || friend.avatar_url,
          otherUserId: friend.id
        });
      }
    } catch (error) {
      console.error('Erreur lors de la création de la conversation:', error);
      Alert.alert('Erreur', 'Impossible de créer la conversation');
    } finally {
      setCreatingGroup(false);
    }
  };
  
  // Rendu d'un ami dans la liste
  const renderFriendItem = ({ item }) => {
    const isSelected = isAlreadySelected(item.id);
    
    return (
      <TouchableOpacity
        style={[styles.friendItem, isSelected && styles.selectedFriendItem]}
        onPress={() => toggleFriendSelection(item)}
      >
        <View style={styles.checkboxContainer}>
          {isSelected ? (
            <View style={styles.checkbox}>
              <Ionicons name="checkmark" size={18} color="#fff" />
            </View>
          ) : (
            <View style={styles.checkboxEmpty} />
          )}
        </View>
        
        <Image
          source={{ uri: item.profile_image || item.avatar_url || 'https://randomuser.me/api/portraits/lego/1.jpg' }}
          style={styles.avatar}
          defaultSource={require('../../assets/default-avatar.png')}
        />
        
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>{item.display_name || item.username || 'Utilisateur'}</Text>
          <Text style={styles.friendStatus}>
            {item.status || 'En ligne'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color="#333" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>
          {isGroupMode 
            ? 'Créer un groupe' 
            : 'Nouvelle conversation'}
        </Text>
        
        <TouchableOpacity 
          onPress={handleCreateConversation}
          disabled={selectedFriends.length === 0 || creatingGroup}
          style={[
            styles.createButton, 
            (selectedFriends.length === 0 || creatingGroup) && styles.disabledButton
          ]}
        >
          {creatingGroup ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>Suivant</Text>
          )}
        </TouchableOpacity>
      </View>
      
      {/* Affichage du champ pour le nom du groupe */}
      {showGroupNameInput && (
        <View style={styles.groupNameContainer}>
          <TextInput
            style={styles.groupNameInput}
            placeholder="Nom du groupe"
            value={groupName}
            onChangeText={setGroupName}
            autoFocus
          />
          <TouchableOpacity 
            style={[
              styles.createGroupButton, 
              !groupName.trim() && styles.disabledButton
            ]}
            onPress={handleCreateConversation}
            disabled={!groupName.trim()}
          >
            <Text style={styles.createButtonText}>Créer</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Compteur de sélection */}
      <View style={styles.selectionInfo}>
        <Text style={styles.selectionText}>
          {selectedFriends.length === 0 
            ? 'Sélectionnez des amis' 
            : `${selectedFriends.length} ami${selectedFriends.length > 1 ? 's' : ''} sélectionné${selectedFriends.length > 1 ? 's' : ''}`}
        </Text>
      </View>
      
      {/* Barre de recherche */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
      {/* Liste des amis */}
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#6C13B3" />
        </View>
      ) : (
        <FlatList
          data={filteredFriends}
          renderItem={renderFriendItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people" size={50} color="#ccc" />
              <Text style={styles.emptyText}>Aucun ami trouvé</Text>
              <TouchableOpacity 
                style={styles.findFriendsButton}
                onPress={() => navigation.navigate('FindFriendsScreen')}
              >
                <Text style={styles.findFriendsText}>Trouver des amis</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
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
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  createButton: {
    backgroundColor: '#6C13B3',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  disabledButton: {
    backgroundColor: '#d8d8d8',
  },
  createButtonText: {
    color: '#fff',
    fontWeight: 'bold',
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
  listContainer: {
    flexGrow: 1,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedFriendItem: {
    backgroundColor: '#f0e6f7',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  friendInfo: {
    flex: 1,
    marginLeft: 15,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
  },
  friendStatus: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  checkboxContainer: {
    marginRight: 15,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6C13B3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxEmpty: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  selectionInfo: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectionText: {
    fontSize: 15,
    color: '#6C13B3',
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
    paddingTop: 50,
  },
  emptyText: {
    marginTop: 10,
    marginBottom: 20,
    color: '#999',
    fontSize: 16,
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
  groupNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  groupNameInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginRight: 10,
  },
  createGroupButton: {
    backgroundColor: '#6C13B3',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
});

export default SelectFriendsScreen;