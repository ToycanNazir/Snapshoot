// src/screens/ProfileScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Switch,
  ActivityIndicator,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { uploadProfileImage } from '../services/storage';
import { useNavigation, CommonActions, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFriends } from '../api/friendsApi';
import { getUserStories } from '../api/storiesApi';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const { user, userProfile, signOut, updateProfile, refreshProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profileImage, setProfileImage] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [notifications, setNotifications] = useState(false);
  const [locationSharing, setLocationSharing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadAttempts, setLoadAttempts] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Nouveaux états pour les compteurs
  const [friendsCount, setFriendsCount] = useState(0);
  const [storiesCount, setStoriesCount] = useState(0);
  const [userStories, setUserStories] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  
  // Un chargement général court (2 secondes max) au lieu d'attendre indéfiniment
  const [initialLoading, setInitialLoading] = useState(true);

  // Charger les statistiques à chaque fois que l'écran reçoit le focus
  useFocusEffect(
    React.useCallback(() => {
      loadUserStats();
    }, [user])
  );
  
  // Utiliser les infos de l'utilisateur même sans profil complet
  useEffect(() => {
    // Si userProfile existe, l'utiliser
    if (userProfile) {
      setProfileImage(userProfile.profile_image || '');
      setUsername(userProfile.display_name || (user?.email?.split('@')[0] || 'Utilisateur'));
      setBio(userProfile.bio || '');
      setLocation(userProfile.location || '');
      setNotifications(userProfile.notifications || false);
      setLocationSharing(userProfile.location_sharing || false);
    } 
    // Sinon, utiliser les informations de base de l'utilisateur
    else if (user) {
      setUsername(user.email?.split('@')[0] || 'Utilisateur');
      setBio('');
      setLocation('');
      
      // Tenter de récupérer le profil à nouveau, maximum 3 fois
      if (loadAttempts < 3) {
        setLoadAttempts(prev => prev + 1);
        refreshProfile().catch(err => console.error('Erreur lors du rafraîchissement:', err));
      }
    }
    
    // Dans tous les cas, arrêter le chargement initial après 2 secondes max
    const timeout = setTimeout(() => {
      setInitialLoading(false);
    }, 2000);
    
    return () => clearTimeout(timeout);
  }, [userProfile, user, loadAttempts]);

  // Fonction pour charger les statistiques utilisateur
  const loadUserStats = async () => {
    if (!user) return;
    
    setLoadingStats(true);
    try {
      // Charger le nombre d'amis
      const friends = await getFriends();
      setFriendsCount(friends?.length || 0);
      
      // Charger les stories de l'utilisateur
      const stories = await getUserStories(user.id);
      setUserStories(stories || []);
      setStoriesCount(stories?.length || 0);
      
      console.log('Stats chargées:', { amis: friends?.length || 0, stories: stories?.length || 0 });
    } catch (error) {
      console.error('Erreur lors du chargement des stats:', error);
      // En cas d'erreur, garder les valeurs par défaut
      setFriendsCount(0);
      setStoriesCount(0);
      setUserStories([]);
    } finally {
      setLoadingStats(false);
    }
  };
  
  // Afficher un loader court au démarrage, mais ne pas attendre userProfile indéfiniment
  if (initialLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#6C13B3" />
      </View>
    );
  }

  const navigateToSettings = () => {
    // Navigation directe vers SettingsScreen
    navigation.navigate('SettingsScreen');
  };

  // Fonction pour voir ses propres stories
  const viewMyStories = () => {
    if (storiesCount > 0) {
      // Naviguer vers l'écran stories avec focus sur les stories de l'utilisateur
      navigation.navigate('Stories', { focusOnUser: user.id });
    } else {
      // Proposer de créer une story
      Alert.alert(
        'Aucune story',
        'Vous n\'avez pas encore de story. Voulez-vous en créer une ?',
        [
          { text: 'Plus tard', style: 'cancel' },
          { 
            text: 'Créer', 
            onPress: () => navigation.navigate('CameraScreen', { fromStories: true })
          }
        ]
      );
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Nous avons besoin de votre permission pour accéder à votre galerie.');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets && result.assets.length > 0) {
      try {
        setLoading(true);
        const imageUrl = await uploadProfileImage(result.assets[0].uri, user.id);
        setProfileImage(imageUrl);
      } catch (error) {
        console.error('Erreur lors de l\'upload de l\'image:', error);
        Alert.alert('Erreur', 'Impossible de mettre à jour votre photo de profil');
      } finally {
        setLoading(false);
      }
    }
  };
  
  const removeProfileImage = async () => {
    if (!profileImage) return;
    
    Alert.alert(
      'Supprimer la photo',
      'Êtes-vous sûr de vouloir supprimer votre photo de profil ?',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              // Mettre à jour le profil sans image
              await updateProfile({ profile_image: null });
              
              setProfileImage('');
              Alert.alert('Succès', 'Photo de profil supprimée');
            } catch (error) {
              console.error('Erreur lors de la suppression de l\'image:', error);
              Alert.alert('Erreur', 'Impossible de supprimer votre photo de profil');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };
  
  const saveProfile = async () => {
    try {
      setLoading(true);
      
      const profileData = {
        display_name: username,
        bio,
        profile_image: profileImage,
        location,
        notifications,
        location_sharing: locationSharing
      };
      
      const updatedProfile = await updateProfile(profileData);
      
      if (updatedProfile) {
        setIsEditing(false);
        Alert.alert('Succès', 'Profil mis à jour avec succès');
      } else {
        Alert.alert('Erreur', 'Impossible de mettre à jour votre profil');
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      Alert.alert('Erreur', error.message || 'Impossible de mettre à jour votre profil');
    } finally {
      setLoading(false);
    }
  };
  
  const handleLogout = async () => {
    try {
      await signOut();
      // Naviguer vers l'écran de connexion si ce n'est pas géré automatiquement
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      Alert.alert('Erreur', 'Impossible de se déconnecter');
    }
  };
  
  const confirmDeleteAccount = () => {
    setShowDeleteConfirm(true);
  };
  
  const handleDeleteAccount = async () => {
    try {
      setLoading(true);
      
      // Appel à l'API pour supprimer le compte
      const response = await fetch('http://192.168.1.88:8080/api/users/me', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await AsyncStorage.getItem('auth_token')}`
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `Erreur ${response.status}`);
      }
      
      // Déconnexion
      await signOut();
      
      // Navigation vers l'écran de connexion
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
      
      Alert.alert('Compte supprimé', 'Votre compte a été supprimé avec succès');
    } catch (error) {
      console.error('Erreur lors de la suppression du compte:', error);
      Alert.alert('Erreur', error.message || 'Impossible de supprimer votre compte');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        {isEditing ? (
          <View style={styles.editHeaderButtons}>
            <TouchableOpacity onPress={() => setIsEditing(false)}>
              <Text style={styles.cancelButton}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={saveProfile} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#6C13B3" size="small" />
              ) : (
                <Text style={styles.saveButton}>Enregistrer</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.settingsButton}
              onPress={navigateToSettings}
            >
              <Ionicons name="settings-outline" size={24} color="#333" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => setIsEditing(true)}
            >
              <Text style={styles.editButtonText}>Modifier</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      <View style={styles.profileHeader}>
        <TouchableOpacity 
          style={styles.profileImageContainer} 
          onPress={isEditing ? pickImage : viewMyStories}
          disabled={loading}
          onLongPress={isEditing && profileImage ? removeProfileImage : null}
        >
          {/* Bandeau Story autour de la photo de profil */}
          <View style={[
            styles.storyRing, 
            storiesCount > 0 ? styles.hasStoryRing : styles.noStoryRing
          ]}>
            {profileImage ? (
              <Image 
                source={{ uri: profileImage }} 
                style={styles.profileImage} 
              />
            ) : (
              <View style={[styles.profileImage, { backgroundColor: '#e1e1e1', justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="person" size={50} color="#aaa" />
              </View>
            )}
          </View>
          
          {isEditing && (
            <View style={styles.editImageOverlay}>
              <Ionicons name="camera" size={24} color="white" />
            </View>
          )}
          
          {!isEditing && storiesCount > 0 && (
            <View style={styles.storyIndicator}>
              <Ionicons name="play-circle" size={20} color="#6C13B3" />
            </View>
          )}
          
          {isEditing && profileImage && (
            <View style={styles.removeImageOverlay}>
              <TouchableOpacity onPress={removeProfileImage}>
                <Ionicons name="trash-outline" size={18} color="white" />
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
        
        <View style={styles.profileInfo}>
          {isEditing ? (
            <TextInput
              style={styles.usernameInput}
              value={username}
              onChangeText={setUsername}
              placeholder="Nom d'utilisateur"
            />
          ) : (
            <Text style={styles.username}>{username}</Text>
          )}
          
          <View style={styles.statsContainer}>
            <TouchableOpacity 
              style={styles.stat}
              onPress={() => navigation.navigate('FriendsListScreen')}
            >
              {loadingStats ? (
                <ActivityIndicator size="small" color="#6C13B3" />
              ) : (
                <Text style={styles.statNumber}>{friendsCount}</Text>
              )}
              <Text style={styles.statLabel}>Amis</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.stat}
              onPress={viewMyStories}
            >
              {loadingStats ? (
                <ActivityIndicator size="small" color="#6C13B3" />
              ) : (
                <Text style={styles.statNumber}>{storiesCount}</Text>
              )}
              <Text style={styles.statLabel}>Stories</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
      <View style={styles.bioSection}>
        {isEditing ? (
          <TextInput
            style={styles.bioInput}
            value={bio}
            onChangeText={setBio}
            placeholder="À propos de vous"
            multiline
            maxLength={150}
          />
        ) : (
          <Text style={styles.bioText}>{bio || "Aucune bio"}</Text>
        )}
        
        <View style={styles.locationContainer}>
          <Ionicons name="location-outline" size={16} color="#666" />
          {isEditing ? (
            <TextInput
              style={styles.locationInput}
              value={location}
              onChangeText={setLocation}
              placeholder="Votre localisation"
            />
          ) : (
            <Text style={styles.locationText}>{location || "Non spécifié"}</Text>
          )}
        </View>
      </View>
      
      {isEditing && (
        <View style={styles.settingsSection}>
          <Text style={styles.settingsTitle}>Paramètres de confidentialité</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLabelContainer}>
              <Ionicons name="notifications-outline" size={24} color="#333" />
              <Text style={styles.settingLabel}>Notifications</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: "#d3d3d3", true: "#6C13B3" }}
              thumbColor={notifications ? "#fff" : "#f4f3f4"}
            />
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLabelContainer}>
              <Ionicons name="location-outline" size={24} color="#333" />
              <Text style={styles.settingLabel}>Partage de localisation</Text>
            </View>
            <Switch
              value={locationSharing}
              onValueChange={setLocationSharing}
              trackColor={{ false: "#d3d3d3", true: "#6C13B3" }}
              thumbColor={locationSharing ? "#fff" : "#f4f3f4"}
            />
          </View>
        </View>
      )}
      
      <View style={styles.actionsSection}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('FriendsListScreen')}
        >
          <Ionicons name="people" size={24} color="#6C13B3" />
          <Text style={styles.actionButtonText}>Mes amis ({friendsCount})</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('FindFriendsScreen')}
        >
          <Ionicons name="people-outline" size={24} color="#6C13B3" />
          <Text style={styles.actionButtonText}>Trouver des amis</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('CameraScreen', { fromStories: true })}
        >
          <Ionicons name="camera-outline" size={24} color="#6C13B3" />
          <Text style={styles.actionButtonText}>Créer une story</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('Stories')}
        >
          <Ionicons name="play-circle-outline" size={24} color="#6C13B3" />
          <Text style={styles.actionButtonText}>Voir les stories</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.accountActions}>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>Déconnexion</Text>
        </TouchableOpacity>
        
        {isEditing && (
          <TouchableOpacity 
            style={styles.deleteAccountButton}
            onPress={confirmDeleteAccount}
          >
            <Text style={styles.deleteAccountButtonText}>Supprimer mon compte</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Modal de confirmation pour la suppression du compte */}
      <Modal
        visible={showDeleteConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Supprimer votre compte ?</Text>
            <Text style={styles.modalMessage}>
              Cette action est irréversible. Toutes vos données personnelles, photos et contenus seront définitivement supprimés.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Text style={styles.cancelModalButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.deleteModalButton]}
                onPress={handleDeleteAccount}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.deleteModalButtonText}>Supprimer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 50,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsButton: {
    marginRight: 15,
  },
  editButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  editHeaderButtons: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  cancelButton: {
    color: '#666',
    fontSize: 16,
  },
  saveButton: {
    color: '#6C13B3',
    fontWeight: 'bold',
    fontSize: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  profileImageContainer: {
    position: 'relative',
  },
  storyRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
  },
  hasStoryRing: {
    borderColor: '#6C13B3',
  },
  noStoryRing: {
    borderColor: '#e0e0e0',
  },
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: '#fff',
  },
  editImageOverlay: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: 'rgba(108, 19, 179, 0.8)',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyIndicator: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: 'white',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  removeImageOverlay: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(231, 76, 60, 0.8)',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    marginLeft: 20,
    flex: 1,
  },
  username: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  usernameInput: {
    fontSize: 20,
    fontWeight: '500',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    marginBottom: 10,
  },
  statsContainer: {
    flexDirection: 'row',
  },
  stat: {
    marginRight: 20,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6C13B3',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  bioSection: {
    padding: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  bioText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 10,
  },
  bioInput: {
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
    height: 80,
    textAlignVertical: 'top',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    marginLeft: 5,
    color: '#666',
  },
  locationInput: {
    flex: 1,
    marginLeft: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  actionsSection: {
    padding: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionButtonText: {
    marginLeft: 15,
    fontSize: 16,
    color: '#333',
  },
  settingsSection: {
    padding: 20,
    backgroundColor: '#f9f9f9',
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    marginLeft: 15,
    fontSize: 16,
  },
  accountActions: {
    padding: 20,
  },
  logoutButton: {
    marginBottom: 15,
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#e74c3c',
    fontWeight: 'bold',
    fontSize: 16,
  },
  deleteAccountButton: {
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e74c3c',
    alignItems: 'center',
  },
  deleteAccountButtonText: {
    color: '#e74c3c',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#e74c3c',
  },
  modalMessage: {
    fontSize: 16,
    marginBottom: 20,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    padding: 15,
    borderRadius: 8,
    width: '48%',
    alignItems: 'center',
  },
  cancelModalButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelModalButtonText: {
    color: '#333',
    fontWeight: 'bold',
  },
  deleteModalButton: {
    backgroundColor: '#e74c3c',
  },
  deleteModalButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default ProfileScreen;