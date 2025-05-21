import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { 
  searchUsers, 
  getProfile 
} from '../api/userApi';
import { 
  sendFriendRequest, 
  getReceivedRequests, 
  acceptFriendRequest,
  rejectFriendRequest,
  getFriends 
} from '../api/friendsApi';

// Importer apiClient pour les appels directs à l'API
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Créer un client API pour la fonction de recherche
import { API_BASE_URL } from '../config/api';
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 secondes
});

// Intercepteur pour ajouter le token d'authentification
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`API Request: ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const FindFriendsScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [suggestedFriends, setSuggestedFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [apiAccessible, setApiAccessible] = useState(true);

  // Vérifier l'accessibilité de l'API lors du montage initial
  useEffect(() => {
    const checkApiConnection = async () => {
      try {
        // Tenter de charger le profil utilisateur actuel comme test de connexion
        await getProfile('me');
        console.log('API accessible');
        setApiAccessible(true);
        return true;
      } catch (error) {
        console.error('API non accessible:', error);
        setApiAccessible(false);
        
        // Si l'API n'est pas accessible, utiliser des données factices
        Alert.alert(
          'Mode hors connexion',
          'Impossible de se connecter au serveur. Utilisation du mode hors ligne.',
          [{ text: 'OK' }]
        );
        useMockData();
        return false;
      }
    };
    
    checkApiConnection();
  }, []);

  // Fonction pour rafraîchir les données
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadFriendsData();
      if (searchQuery.trim()) {
        await searchFriends();
      }
    } catch (error) {
      console.error('Erreur lors du rafraîchissement:', error);
    } finally {
      setRefreshing(false);
    }
  }, [searchQuery]);

  // Chargement des données amis
  const loadFriendsData = useCallback(async () => {
    if (!user || !user.id) return;
    
    setLoading(true);
    
    try {
      // Récupérer les amis existants
      let friendsList = [];
      try {
        friendsList = await getFriends(user.id);
        console.log('Amis chargés:', friendsList);
        setFriends(friendsList || []);
      } catch (friendError) {
        console.error('Erreur de chargement des amis:', friendError);
      }
      
      // Récupérer les demandes d'amis reçues
      let requests = [];
      try {
        requests = await getReceivedRequests(user.id);
        console.log('Demandes d\'amis reçues:', requests);
      } catch (requestError) {
        console.error('Erreur de chargement des demandes:', requestError);
      }
      
      // Adapter le format en fonction de la structure réelle des données
      const formattedRequests = requests.map(request => {
        // Examiner la structure pour extraire correctement les données
        const userId = request.profiles?.id || request.requester?.id || 'unknown';
        const name = request.profiles?.username || request.requester?.profile?.display_name || 'Utilisateur';
        const username = `@${request.profiles?.username || (request.requester?.email ? request.requester.email.split('@')[0] : 'user')}`;
        const avatar = request.profiles?.avatar_url || request.requester?.profile?.profile_image || 'https://randomuser.me/api/portraits/lego/1.jpg';
        
        return {
          id: request.id,
          userId,
          name,
          username,
          avatar,
          requestTime: new Date(request.created_at || request.createdAt || Date.now())
        };
      });
      
      setPendingRequests(formattedRequests);
      
      // Pour les suggestions, dans un environnement de développement, 
      // on utilise directement des données fictives pour l'instant
      // Cela sera remplacé par une recherche réelle plus tard
      try {
        // Utiliser un terme de recherche qui répond aux critères, 
        // mais avec peu de chances de trouver des résultats inutiles
        // On pourrait utiliser, par exemple, le début du nom d'utilisateur actuel
        const searchTerm = user.email?.substring(0, 3) || "use";
        console.log(`Recherche de suggestions avec le terme: ${searchTerm}`);
        
        const suggestedUsers = await searchUsers(searchTerm);
        console.log('Suggestions d\'utilisateurs:', suggestedUsers);
        
        // Filtrer les utilisateurs déjà amis et soi-même
        const friendIds = new Set(friendsList.map(friend => friend.id));
        const pendingIds = new Set(formattedRequests.map(req => req.userId));
        
        const filteredSuggestions = suggestedUsers
          .filter(u => {
            // Vérifier que l'utilisateur n'est pas nous-même
            const isCurrentUser = u.id === user.id;
            // Vérifier qu'il n'est pas déjà ami
            const isAlreadyFriend = friendIds.has(u.id);
            // Vérifier qu'une demande n'est pas déjà en cours
            const isPending = pendingIds.has(u.id);
            
            return !isCurrentUser && !isAlreadyFriend && !isPending;
          })
          .map(user => ({
            id: user.id,
            name: user.display_name || user.profile?.display_name || user.username || (user.email ? user.email.split('@')[0] : 'Utilisateur'),
            username: `@${user.username || user.profile?.username || (user.email ? user.email.split('@')[0] : 'user')}`,
            avatar: user.avatar_url || user.profile_image || user.profile?.profile_image || 'https://randomuser.me/api/portraits/lego/1.jpg',
            mutualFriends: Math.floor(Math.random() * 10) // Simuler des amis en commun
          }));
        
        console.log('Suggestions filtrées:', filteredSuggestions);
        
        if (filteredSuggestions.length > 0) {
          setSuggestedFriends(filteredSuggestions);
          setApiAccessible(true);
        } else {
          console.log('Aucune suggestion après filtrage, utilisation de données fictives');
          useMockData();
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des suggestions:', error);
        useMockData();
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      useMockData();
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Charger les données au démarrage
  useEffect(() => {
    loadFriendsData();
  }, [loadFriendsData]);

  // Fonction pour utiliser des données factices
  const useMockData = () => {
    console.log('Utilisation de données factices');
    
    const dummySuggestions = [
      {
        id: 'mock-user1',
        name: 'Thomas Martin',
        username: '@tmartin',
        avatar: 'https://randomuser.me/api/portraits/men/22.jpg',
        mutualFriends: 5,
      },
      {
        id: 'mock-user2',
        name: 'Sophie Dupont',
        username: '@sdupont',
        avatar: 'https://randomuser.me/api/portraits/women/33.jpg',
        mutualFriends: 2,
      },
      {
        id: 'mock-user3',
        name: 'Lucas Bernard',
        username: '@lbernard',
        avatar: 'https://randomuser.me/api/portraits/men/45.jpg',
        mutualFriends: 8,
      },
    ];
    
    setSuggestedFriends(dummySuggestions);
    
    const dummyPendingRequests = [
      {
        id: 'mock-req1',
        userId: 'mock-user4',
        name: 'Emma Rousseau',
        username: '@erousseau',
        avatar: 'https://randomuser.me/api/portraits/women/55.jpg',
        requestTime: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 heures avant
      },
      {
        id: 'mock-req2',
        userId: 'mock-user5',
        name: 'Julien Petit',
        username: '@jpetit',
        avatar: 'https://randomuser.me/api/portraits/men/67.jpg',
        requestTime: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 jour avant
      },
    ];
    
    setPendingRequests(dummyPendingRequests);
  };
  
  // Fonction de recherche d'amis (appelée quand l'utilisateur soumet la recherche)
  const searchFriends = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un terme de recherche');
      return;
    }
    
    if (searchQuery.trim().length < 3) {
      Alert.alert('Erreur', 'Le terme de recherche doit contenir au moins 3 caractères');
      return;
    }
    
    setLoading(true);
    
    try {
      console.log(`Recherche de "${searchQuery}" en cours...`);
      
      // Appel direct à l'API de recherche
      const response = await apiClient.get('/api/users/search', {
        params: { query: searchQuery.trim() }
      });
      
      console.log('Réponse de la recherche:', response.data);
      
      // Extraire les utilisateurs trouvés
      let results = [];
      if (response.data && response.data.users) {
        results = response.data.users;
      } else if (Array.isArray(response.data)) {
        results = response.data;
      }
      
      console.log(`Trouvé ${results.length} utilisateurs pour "${searchQuery}"`);
      
      // Si aucun résultat, afficher un message
      if (results.length === 0) {
        Alert.alert('Information', 'Aucun utilisateur trouvé avec ce terme de recherche');
        setSearchResults([]);
        return;
      }
      
      // Filtrer les utilisateurs déjà amis et soi-même
      const friendIds = new Set(friends.map(friend => friend.id));
      const pendingIds = new Set(pendingRequests.map(req => req.userId));
      
      const formattedResults = results
        .filter(u => {
          const isCurrentUser = u.id === user.id;
          const isAlreadyFriend = friendIds.has(u.id);
          const isPending = pendingIds.has(u.id);
          
          return !isCurrentUser && !isAlreadyFriend && !isPending;
        })
        .map(u => ({
          id: u.id,
          name: u.display_name || u.profile?.display_name || u.username || u.email?.split('@')[0] || 'Utilisateur',
          username: `@${u.username || u.profile?.username || u.email?.split('@')[0] || 'user'}`,
          avatar: u.avatar_url || u.profile_image || u.profile?.profile_image || 'https://randomuser.me/api/portraits/lego/1.jpg',
          email: u.email
        }));
      
      // Mettre à jour les résultats
      setSearchResults(formattedResults);
      
      // Si après filtrage il n'y a plus de résultats
      if (formattedResults.length === 0) {
        Alert.alert('Information', 'Les utilisateurs trouvés sont déjà vos amis ou ont déjà des demandes en attente');
      }
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      Alert.alert('Erreur', 'Impossible de compléter la recherche. Vérifiez votre connexion.');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Fonction pour envoyer une demande d'ami
  const handleSendFriendRequest = async (userId) => {
    if (!user || !user.id) {
      Alert.alert('Erreur', 'Vous devez être connecté pour envoyer une demande d\'ami');
      return;
    }
    
    try {
      setLoading(true);
      
      // Si l'ID commence par "mock", c'est un utilisateur fictif
      // On simule seulement l'envoi pour une meilleure UX
      const isMockUser = userId.startsWith('mock-');
      
      if (isMockUser) {
        console.log(`Simulation d'envoi d'une demande d'ami à un utilisateur fictif: ${userId}`);
        
        // Attendre un peu pour simuler un appel réseau
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Mise à jour UI immédiate
        setSearchResults(prev => prev.filter(result => result.id !== userId));
        setSuggestedFriends(prev => prev.filter(suggestion => suggestion.id !== userId));
        
        Alert.alert('Succès', 'Demande d\'ami envoyée ! (Mode démonstration)');
        return;
      }
      
      // Cas d'un vrai utilisateur
      const response = await sendFriendRequest(user.id, userId);
      console.log('Réponse d\'envoi de demande d\'ami:', response);
      
      // Vérifier si c'est une erreur simulée
      if (response.error) {
        throw new Error(response.message || 'Erreur lors de l\'envoi de la demande');
      }
      
      // Mettre à jour l'interface utilisateur
      setSearchResults(prev => prev.filter(result => result.id !== userId));
      setSuggestedFriends(prev => prev.filter(suggestion => suggestion.id !== userId));
      
      Alert.alert('Succès', 'Demande d\'ami envoyée !');
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la demande:', error);
      Alert.alert('Erreur', error.message || 'Impossible d\'envoyer la demande d\'ami');
    } finally {
      setLoading(false);
    }
  };
  
  // Fonction pour accepter une demande d'ami
  const handleAcceptFriendRequest = async (requestId, userId) => {
    try {
      await acceptFriendRequest(requestId);
      
      // Supprimer de la liste des demandes en attente
      setPendingRequests(prev => prev.filter(request => request.id !== requestId));
      
      // Ajouter à la liste des amis - idéalement, récupérer la liste d'amis mise à jour
      // mais pour simplifier, nous utilisons les données de la demande
      const acceptedRequest = pendingRequests.find(req => req.id === requestId);
      if (acceptedRequest) {
        setFriends(prev => [
          ...prev, 
          {
            id: acceptedRequest.userId,
            username: acceptedRequest.name,
            avatar_url: acceptedRequest.avatar
          }
        ]);
      }
      
      Alert.alert('Succès', 'Demande d\'ami acceptée !');
      
      // Si l'écran a été ouvert avec l'intention de démarrer un chat
      if (route.params?.startChat) {
        // Naviguer vers la conversation avec le nouvel ami
        navigation.navigate('ConversationScreen', {
          chatId: `direct-${userId}`,
          chatName: acceptedRequest?.name || 'Nouvel ami',
          chatAvatar: acceptedRequest?.avatar
        });
      }
    } catch (error) {
      console.error('Erreur lors de l\'acceptation de la demande:', error);
      Alert.alert('Erreur', 'Impossible d\'accepter la demande d\'ami');
    }
  };
  
  // Fonction pour refuser une demande d'ami
  const handleRejectFriendRequest = async (requestId) => {
    try {
      await rejectFriendRequest(requestId);
      
      // Mettre à jour l'interface utilisateur
      setPendingRequests(prev => prev.filter(request => request.id !== requestId));
      
      Alert.alert('Succès', 'Demande d\'ami refusée');
    } catch (error) {
      console.error('Erreur lors du rejet de la demande:', error);
      Alert.alert('Erreur', 'Impossible de refuser la demande d\'ami');
    }
  };
  
  // Formater le temps écoulé
  const getElapsedTime = (timestamp) => {
    const now = new Date();
    const elapsed = now - timestamp;
    
    if (elapsed < 60000) {
      return 'À l\'instant';
    } else if (elapsed < 3600000) {
      return `Il y a ${Math.floor(elapsed / 60000)}m`;
    } else if (elapsed < 86400000) {
      return `Il y a ${Math.floor(elapsed / 3600000)}h`;
    } else {
      return `Il y a ${Math.floor(elapsed / 86400000)}j`;
    }
  };
  
  // Rendu d'un résultat de recherche
  const renderSearchResult = ({ item }) => (
    <View style={styles.userItem}>
      <Image 
        source={{ uri: item.avatar }} 
        style={styles.avatar}
        defaultSource={require('../../assets/default-avatar.png')} // Assurez-vous d'avoir cette image
      />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userUsername}>{item.username}</Text>
      </View>
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => handleSendFriendRequest(item.id)}
      >
        <Text style={styles.addButtonText}>Ajouter</Text>
      </TouchableOpacity>
    </View>
  );
  
  // Rendu d'une suggestion d'ami
  const renderSuggestedFriend = ({ item }) => (
    <View style={styles.userItem}>
      <Image 
        source={{ uri: item.avatar }} 
        style={styles.avatar}
        defaultSource={require('../../assets/default-avatar.png')} // Assurez-vous d'avoir cette image
      />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userUsername}>{item.username}</Text>
        <Text style={styles.mutualFriends}>
          {item.mutualFriends} ami{item.mutualFriends > 1 ? 's' : ''} en commun
        </Text>
      </View>
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => handleSendFriendRequest(item.id)}
      >
        <Text style={styles.addButtonText}>Ajouter</Text>
      </TouchableOpacity>
    </View>
  );
  
  // Rendu d'une demande d'ami en attente
  const renderPendingRequest = ({ item }) => (
    <View style={styles.userItem}>
      <Image 
        source={{ uri: item.avatar }} 
        style={styles.avatar}
        defaultSource={require('../../assets/default-avatar.png')} // Assurez-vous d'avoir cette image
      />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userUsername}>{item.username}</Text>
        <Text style={styles.requestTime}>
          {getElapsedTime(item.requestTime)}
        </Text>
      </View>
      <View style={styles.requestButtons}>
        <TouchableOpacity 
          style={[styles.requestButton, styles.acceptButton]}
          onPress={() => handleAcceptFriendRequest(item.id, item.userId)}
        >
          <Ionicons name="checkmark" size={20} color="white" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.requestButton, styles.rejectButton]}
          onPress={() => handleRejectFriendRequest(item.id)}
        >
          <Ionicons name="close" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trouver des amis</Text>
      </View>
      
      {!apiAccessible && (
        <View style={styles.offlineBar}>
          <Ionicons name="cloud-offline" size={16} color="white" />
          <Text style={styles.offlineText}>Mode hors connexion - Données fictives</Text>
        </View>
      )}
      
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par email ou identifiant"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={searchFriends}
          autoCapitalize="none"
        />
      </View>
      
      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#6C13B3" style={styles.loader} />
      ) : (
        <FlatList
          contentContainerStyle={styles.listContainer}
          ListHeaderComponent={
            <>
              {searchResults.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Résultats de recherche</Text>
                  <FlatList
                    data={searchResults}
                    renderItem={renderSearchResult}
                    keyExtractor={item => item.id}
                    showsVerticalScrollIndicator={false}
                    scrollEnabled={false}
                  />
                </View>
              )}
              
              {pendingRequests.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Demandes d'amis</Text>
                  <FlatList
                    data={pendingRequests}
                    renderItem={renderPendingRequest}
                    keyExtractor={item => item.id}
                    showsVerticalScrollIndicator={false}
                    scrollEnabled={false}
                  />
                </View>
              )}
              
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Suggestions</Text>
              </View>
            </>
          }
          data={suggestedFriends}
          renderItem={renderSuggestedFriend}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#6C13B3']}
            />
          }
          ListEmptyComponent={
            !loading && (
              <View style={styles.emptyContainer}>
                <Ionicons name="people" size={50} color="#ccc" />
                <Text style={styles.emptyText}>Aucune suggestion trouvée</Text>
              </View>
            )
          }
        />
      )}
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
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 10,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 15,
  },
  offlineBar: {
    backgroundColor: '#FF5252',
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  offlineText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: '500',
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
  loader: {
    marginTop: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 15,
    marginBottom: 10,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userInfo: {
    flex: 1,
    marginLeft: 15,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  userUsername: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  mutualFriends: {
    fontSize: 12,
    color: '#6C13B3',
    marginTop: 5,
  },
  requestTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  addButton: {
    backgroundColor: '#6C13B3',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  requestButtons: {
    flexDirection: 'row',
  },
  requestButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 10,
    color: '#999',
    fontSize: 16,
  },
});

export default FindFriendsScreen;