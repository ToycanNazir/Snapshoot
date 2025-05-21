// src/screens/ChatInfoScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  Alert,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ChatInfoScreen = ({ route, navigation }) => {
  // Récupérer TOUS les paramètres passés depuis ChatScreen
  const { 
    chatId, 
    chatName, 
    chatAvatar, 
    isGroup, 
    otherUserId 
  } = route.params || {};
  
  const { user } = useAuth();
  const [chatInfo, setChatInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    loadChatInfo();
  }, [chatId]);

  const loadChatInfo = async () => {
    try {
      setLoading(true);
      
      // Utiliser d'abord les données passées en paramètres
      let chatData = {
        id: chatId,
        name: chatName || 'Discussion',
        avatar: chatAvatar || 'https://randomuser.me/api/portraits/lego/1.jpg',
        isGroup: isGroup || false,
        otherUserId: otherUserId,
        participantsCount: isGroup ? 2 : 2, // Valeur par défaut
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };

      // Essayer de charger des informations supplémentaires depuis l'API
      try {
        const token = await AsyncStorage.getItem('auth_token');
        
        // Pour les conversations individuelles, essayer de charger le profil de l'autre utilisateur
        if (!isGroup && otherUserId) {
          const userResponse = await fetch(`${API_BASE_URL}/users/profile/${otherUserId}`, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });

          if (userResponse.ok) {
            const userData = await userResponse.json();
            chatData = {
              ...chatData,
              name: userData.display_name || userData.username || chatName,
              avatar: userData.profile_image || userData.avatar_url || chatAvatar,
              otherUserData: userData
            };
          }
        }

        // Charger les informations générales du chat
        const chatResponse = await fetch(`${API_BASE_URL}/chat/info/${chatId}`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (chatResponse.ok) {
          const chatApiData = await chatResponse.json();
          // Fusionner avec les données existantes en gardant les informations utilisateur
          chatData = {
            ...chatData,
            ...chatApiData,
            // Garder les informations utilisateur si elles existent déjà
            name: chatData.name || chatApiData.name,
            avatar: chatData.avatar || chatApiData.avatar
          };
        }

        // Vérifier le statut de blocage pour les conversations individuelles
        if (!isGroup && otherUserId) {
          const blockResponse = await fetch(`${API_BASE_URL}/users/blocked/${otherUserId}`, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });

          if (blockResponse.ok) {
            const blockData = await blockResponse.json();
            setIsBlocked(blockData.isBlocked || false);
          }
        }

      } catch (apiError) {
        console.log('API non disponible, utilisation des données de navigation:', apiError.message);
        // Les données de base sont déjà définies, continuer avec celles-ci
      }

      setChatInfo(chatData);
      
    } catch (error) {
      console.error('Erreur lors du chargement des informations du chat:', error);
      
      // En cas d'erreur totale, utiliser au minimum les données de navigation
      setChatInfo({
        id: chatId,
        name: chatName || 'Discussion',
        avatar: chatAvatar || 'https://randomuser.me/api/portraits/lego/1.jpg',
        isGroup: isGroup || false,
        otherUserId: otherUserId,
        participantsCount: 2,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBlock = async () => {
    if (isGroup) {
      Alert.alert('Action non disponible', 'Vous ne pouvez pas bloquer un groupe.');
      return;
    }

    Alert.alert(
      isBlocked ? 'Débloquer ce contact' : 'Bloquer ce contact',
      isBlocked 
        ? 'Voulez-vous débloquer ce contact ? Vous pourrez à nouveau recevoir ses messages.'
        : 'Êtes-vous sûr de vouloir bloquer ce contact ? Vous ne recevrez plus ses messages.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: isBlocked ? 'Débloquer' : 'Bloquer',
          style: isBlocked ? 'default' : 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('auth_token');
              const endpoint = isBlocked ? 'unblock' : 'block';
              const userId = otherUserId || chatInfo?.otherUserId;
              
              if (!userId) {
                Alert.alert('Erreur', 'Impossible de identifier l\'utilisateur');
                return;
              }

              const response = await fetch(`${API_BASE_URL}/users/${endpoint}/${userId}`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                }
              });

              if (response.ok) {
                setIsBlocked(!isBlocked);
                Alert.alert('Succès', `Contact ${isBlocked ? 'débloqué' : 'bloqué'} avec succès`);
              } else {
                const errorData = await response.json();
                Alert.alert('Erreur', errorData.message || 'Impossible de modifier le statut de blocage');
              }
            } catch (error) {
              console.error('Erreur lors du blocage/déblocage:', error);
              Alert.alert('Erreur', 'Une erreur est survenue');
            }
          }
        }
      ]
    );
  };

  const handleDeleteChat = async () => {
    Alert.alert(
      'Supprimer la conversation',
      'Êtes-vous sûr de vouloir supprimer cette conversation ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('auth_token');
              const response = await fetch(`${API_BASE_URL}/chat/delete/${chatId}`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                }
              });

              if (response.ok) {
                // Nettoyer AsyncStorage
                const keys = await AsyncStorage.getAllKeys();
                const keysToRemove = keys.filter(key => 
                  (key.includes('friend_conversation_') || key.includes('group_conversation_')) &&
                  AsyncStorage.getItem(key) === chatId
                );
                
                if (keysToRemove.length > 0) {
                  await AsyncStorage.multiRemove(keysToRemove);
                }

                Alert.alert('Succès', 'Conversation supprimée', [
                  { text: 'OK', onPress: () => navigation.navigate('Chat') }
                ]);
              } else {
                const errorData = await response.json();
                Alert.alert('Erreur', errorData.message || 'Impossible de supprimer la conversation');
              }
            } catch (error) {
              console.error('Erreur lors de la suppression:', error);
              Alert.alert('Erreur', 'Une erreur est survenue');
            }
          }
        }
      ]
    );
  };

  const handleViewProfile = () => {
    if (chatInfo && !chatInfo.isGroup) {
      const userId = otherUserId || chatInfo.otherUserId;
      if (userId) {
        navigation.navigate('ProfileScreen', { 
          userId: userId,
          userInfo: chatInfo.otherUserData // Passer les données utilisateur si disponibles
        });
      } else {
        Alert.alert('Erreur', 'Impossible d\'accéder au profil de cet utilisateur');
      }
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Date inconnue';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Informations</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C13B3" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Informations</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Profil */}
        <View style={styles.profileSection}>
          <TouchableOpacity 
            style={styles.profileContainer}
            onPress={handleViewProfile}
            disabled={chatInfo?.isGroup}
          >
            <Image 
              source={{ uri: chatInfo?.avatar || 'https://randomuser.me/api/portraits/lego/1.jpg' }}
              style={styles.avatar}
            />
            <View style={styles.profileInfo}>
              <Text style={styles.name}>{chatInfo?.name || 'Nom inconnu'}</Text>
              {chatInfo?.isGroup ? (
                <Text style={styles.subtitle}>
                  {chatInfo.participantsCount || 0} participants
                </Text>
              ) : (
                <Text style={styles.subtitle}>
                  {chatInfo?.otherUserData?.status || 'Appuyez pour voir le profil'}
                </Text>
              )}
            </View>
            {!chatInfo?.isGroup && (
              <Ionicons name="chevron-forward" size={20} color="#999" />
            )}
          </TouchableOpacity>
        </View>

        {/* Actions rapides - Masquer pour les groupes si nécessaire */}
        {!chatInfo?.isGroup && (
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickAction}>
              <View style={styles.quickActionIcon}>
                <Ionicons name="call" size={20} color="#6C13B3" />
              </View>
              <Text style={styles.quickActionText}>Appeler</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickAction}>
              <View style={styles.quickActionIcon}>
                <Ionicons name="videocam" size={20} color="#6C13B3" />
              </View>
              <Text style={styles.quickActionText}>Vidéo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickAction}>
              <View style={styles.quickActionIcon}>
                <Ionicons name="search" size={20} color="#6C13B3" />
              </View>
              <Text style={styles.quickActionText}>Rechercher</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Paramètres */}
        <View style={styles.settingsSection}>
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="notifications" size={20} color="#333" />
              <Text style={styles.settingText}>Notifications</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#d3d3d3', true: '#6C13B3' }}
              thumbColor={notifications ? '#fff' : '#f4f3f4'}
            />
          </View>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="image" size={20} color="#333" />
              <Text style={styles.settingText}>Photos et vidéos</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="link" size={20} color="#333" />
              <Text style={styles.settingText}>Liens partagés</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Informations de la conversation */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Informations</Text>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Conversation créée</Text>
            <Text style={styles.infoValue}>
              {formatDate(chatInfo?.createdAt)}
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Dernière activité</Text>
            <Text style={styles.infoValue}>
              {formatDate(chatInfo?.lastActivity)}
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>ID de la conversation</Text>
            <Text style={styles.infoValue}>{chatId}</Text>
          </View>

          {/* Informations supplémentaires pour les utilisateurs */}
          {!chatInfo?.isGroup && chatInfo?.otherUserData && (
            <>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Nom d'utilisateur</Text>
                <Text style={styles.infoValue}>{chatInfo.otherUserData.username}</Text>
              </View>
              
              {chatInfo.otherUserData.email && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{chatInfo.otherUserData.email}</Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Actions dangereuses */}
        <View style={styles.dangerSection}>
          {!chatInfo?.isGroup && (
            <TouchableOpacity 
              style={styles.dangerAction}
              onPress={handleBlock}
            >
              <Ionicons 
                name={isBlocked ? "person-add" : "person-remove"} 
                size={20} 
                color="#e74c3c" 
              />
              <Text style={styles.dangerText}>
                {isBlocked ? 'Débloquer ce contact' : 'Bloquer ce contact'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={styles.dangerAction}
            onPress={handleDeleteChat}
          >
            <Ionicons name="trash" size={20} color="#e74c3c" />
            <Text style={styles.dangerText}>Supprimer la conversation</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  profileSection: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  quickAction: {
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: '#333',
  },
  settingsSection: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
  },
  infoSection: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    maxWidth: '60%',
    textAlign: 'right',
  },
  dangerSection: {
    paddingVertical: 10,
  },
  dangerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  dangerText: {
    fontSize: 16,
    color: '#e74c3c',
    marginLeft: 15,
  },
});

export default ChatInfoScreen;