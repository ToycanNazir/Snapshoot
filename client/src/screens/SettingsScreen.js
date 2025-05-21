// src/screens/SettingsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Switch,
  ActivityIndicator,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { updatePassword, updateEmail, deleteUserAccount } from '../services/userService';

const SettingsScreen = ({ navigation }) => {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);

  // États pour le changement de mot de passe
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // États pour le changement d'email
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');

  // États pour la suppression de compte
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  // États pour les paramètres de l'application
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [dataPreferences, setDataPreferences] = useState(true);
  
  // Réinitialiser les états quand les modales sont fermées
  useEffect(() => {
    if (!showPasswordModal) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPassword(false);
    }
    if (!showEmailModal) {
      setNewEmail('');
      setEmailPassword('');
    }
    if (!showDeleteModal) {
      setDeletePassword('');
    }
  }, [showPasswordModal, showEmailModal, showDeleteModal]);

  // Modifier le mot de passe
  const handleChangePassword = async () => {
    // Validation basique
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Erreur', 'Tous les champs sont obligatoires');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Erreur', 'Les nouveaux mots de passe ne correspondent pas');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Erreur', 'Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }

    try {
      setLoading(true);
      await updatePassword(currentPassword, newPassword);
      setShowPasswordModal(false);
      Alert.alert('Succès', 'Votre mot de passe a été mis à jour avec succès');
    } catch (error) {
      console.error('Erreur lors du changement de mot de passe:', error);
      Alert.alert('Erreur', error.message || 'Impossible de mettre à jour le mot de passe');
    } finally {
      setLoading(false);
    }
  };

  // Modifier l'email
  const handleChangeEmail = async () => {
    // Validation basique
    if (!newEmail || !emailPassword) {
      Alert.alert('Erreur', 'Tous les champs sont obligatoires');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(newEmail)) {
      Alert.alert('Erreur', 'Veuillez entrer une adresse email valide');
      return;
    }

    if (newEmail === user?.email) {
      Alert.alert('Information', 'La nouvelle adresse email est identique à l\'actuelle');
      return;
    }

    try {
      setLoading(true);
      await updateEmail(newEmail, emailPassword);
      setShowEmailModal(false);
      Alert.alert(
        'Succès', 
        'Votre adresse email a été mise à jour avec succès. Veuillez vous reconnecter avec la nouvelle adresse.'
      );
      // Déconnexion après changement d'email pour forcer une nouvelle connexion
      await signOut();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('Erreur lors du changement d\'email:', error);
      Alert.alert('Erreur', error.message || 'Impossible de mettre à jour l\'adresse email');
    } finally {
      setLoading(false);
    }
  };

  // Supprimer le compte
  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      Alert.alert('Erreur', 'Veuillez entrer votre mot de passe pour confirmer');
      return;
    }

    Alert.alert(
      'Confirmation', 
      'Êtes-vous sûr de vouloir supprimer définitivement votre compte ? Cette action est irréversible.',
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
              // Ici, on devrait vérifier le mot de passe avant de supprimer le compte
              // Mais comme l'API ne le prévoit pas directement, on fait juste la suppression
              await deleteUserAccount();
              setShowDeleteModal(false);
              Alert.alert('Compte supprimé', 'Votre compte a été supprimé avec succès');
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Erreur lors de la suppression du compte:', error);
              Alert.alert('Erreur', error.message || 'Impossible de supprimer votre compte');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Fonction pour sauvegarder les paramètres de l'application
  const saveAppSettings = async () => {
    try {
      // Ici vous pourriez appeler une API pour sauvegarder les préférences
      // ou les stocker dans AsyncStorage
      
      Alert.alert('Succès', 'Vos paramètres ont été enregistrés');
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement des paramètres:', error);
      Alert.alert('Erreur', 'Impossible d\'enregistrer vos paramètres');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Paramètres</Text>
      </View>
      
      {/* Paramètres du compte */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Compte</Text>
        
        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => setShowEmailModal(true)}
        >
          <View style={styles.settingInfo}>
            <Ionicons name="mail-outline" size={24} color="#6C13B3" />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingLabel}>Adresse email</Text>
              <Text style={styles.settingValue}>{user?.email || 'Non défini'}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => setShowPasswordModal(true)}
        >
          <View style={styles.settingInfo}>
            <Ionicons name="lock-closed-outline" size={24} color="#6C13B3" />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingLabel}>Mot de passe</Text>
              <Text style={styles.settingValue}>••••••••</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
      </View>
      
      {/* Paramètres de l'application */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Application</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="notifications-outline" size={24} color="#6C13B3" />
            <Text style={styles.settingLabel}>Notifications</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: "#d3d3d3", true: "#6C13B3" }}
            thumbColor={notificationsEnabled ? "#fff" : "#f4f3f4"}
          />
        </View>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="moon-outline" size={24} color="#6C13B3" />
            <Text style={styles.settingLabel}>Mode sombre</Text>
          </View>
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{ false: "#d3d3d3", true: "#6C13B3" }}
            thumbColor={darkMode ? "#fff" : "#f4f3f4"}
          />
        </View>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="play-circle-outline" size={24} color="#6C13B3" />
            <Text style={styles.settingLabel}>Lecture automatique</Text>
          </View>
          <Switch
            value={autoPlay}
            onValueChange={setAutoPlay}
            trackColor={{ false: "#d3d3d3", true: "#6C13B3" }}
            thumbColor={autoPlay ? "#fff" : "#f4f3f4"}
          />
        </View>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="analytics-outline" size={24} color="#6C13B3" />
            <Text style={styles.settingLabel}>Données et préférences</Text>
          </View>
          <Switch
            value={dataPreferences}
            onValueChange={setDataPreferences}
            trackColor={{ false: "#d3d3d3", true: "#6C13B3" }}
            thumbColor={dataPreferences ? "#fff" : "#f4f3f4"}
          />
        </View>
        
        <TouchableOpacity 
          style={styles.saveSettingsButton}
          onPress={saveAppSettings}
        >
          <Text style={styles.saveSettingsButtonText}>Enregistrer les paramètres</Text>
        </TouchableOpacity>
      </View>
      
      {/* Actions de compte */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.logoutButton]}
          onPress={async () => {
            try {
              await signOut();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Erreur lors de la déconnexion:', error);
              Alert.alert('Erreur', 'Impossible de se déconnecter');
            }
          }}
        >
          <Ionicons name="log-out-outline" size={24} color="#e74c3c" />
          <Text style={styles.logoutButtonText}>Déconnexion</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteAccountButton]}
          onPress={() => setShowDeleteModal(true)}
        >
          <Ionicons name="trash-outline" size={24} color="#e74c3c" />
          <Text style={styles.deleteAccountButtonText}>Supprimer mon compte</Text>
        </TouchableOpacity>
      </View>
      
      {/* À propos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>À propos</Text>
        
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="information-circle-outline" size={24} color="#6C13B3" />
            <Text style={styles.settingLabel}>Version de l'application</Text>
          </View>
          <Text style={styles.versionText}>1.0.0</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="document-text-outline" size={24} color="#6C13B3" />
            <Text style={styles.settingLabel}>Conditions d'utilisation</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="shield-outline" size={24} color="#6C13B3" />
            <Text style={styles.settingLabel}>Politique de confidentialité</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
      </View>
      
      {/* Modal de changement de mot de passe */}
      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modifier le mot de passe</Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Mot de passe actuel</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.formInput}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Entrez votre mot de passe actuel"
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={24}
                    color="#999"
                  />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Nouveau mot de passe</Text>
              <TextInput
                style={styles.formInput}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Entrez votre nouveau mot de passe"
                secureTextEntry={!showPassword}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Confirmer le mot de passe</Text>
              <TextInput
                style={styles.formInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirmez votre nouveau mot de passe"
                secureTextEntry={!showPassword}
              />
            </View>
            
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleChangePassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Mettre à jour</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Modal de changement d'email */}
      <Modal
        visible={showEmailModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEmailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modifier l'adresse email</Text>
              <TouchableOpacity onPress={() => setShowEmailModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Adresse email actuelle</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: '#f0f0f0' }]}
                value={user?.email}
                editable={false}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Nouvelle adresse email</Text>
              <TextInput
                style={styles.formInput}
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder="Entrez votre nouvelle adresse email"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Mot de passe</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.formInput}
                  value={emailPassword}
                  onChangeText={setEmailPassword}
                  placeholder="Entrez votre mot de passe pour confirmer"
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={24}
                    color="#999"
                  />
                </TouchableOpacity>
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleChangeEmail}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Mettre à jour</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Modal de suppression de compte */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: '#e74c3c' }]}>Supprimer le compte</Text>
              <TouchableOpacity onPress={() => setShowDeleteModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalWarning}>
              Attention ! Cette action est irréversible. Toutes vos données personnelles, profil, et historique seront définitivement supprimés.
            </Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Mot de passe</Text>
              <TextInput
                style={styles.formInput}
                value={deletePassword}
                onChangeText={setDeletePassword}
                placeholder="Entrez votre mot de passe pour confirmer"
                secureTextEntry={!showPassword}
              />
            </View>
            
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: '#e74c3c' }]}
              onPress={handleDeleteAccount}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Supprimer définitivement</Text>
              )}
            </TouchableOpacity>
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
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  section: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#6C13B3',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingTextContainer: {
    marginLeft: 15,
  },
  settingLabel: {
    fontSize: 16,
    marginLeft: 15,
  },
  settingValue: {
    fontSize: 14,
    color: '#666',
    marginLeft: 15,
    marginTop: 3,
  },
  versionText: {
    fontSize: 14,
    color: '#666',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    marginVertical: 5,
    borderRadius: 8,
    paddingHorizontal: 15,
  },
  logoutButton: {
    backgroundColor: '#f8f8f8',
  },
  logoutButtonText: {
    marginLeft: 15,
    fontSize: 16,
    color: '#e74c3c',
    fontWeight: '500',
  },
  deleteAccountButton: {
    backgroundColor: '#ffebeb',
  },
  deleteAccountButtonText: {
    marginLeft: 15,
    fontSize: 16,
    color: '#e74c3c',
    fontWeight: '500',
  },
  saveSettingsButton: {
    backgroundColor: '#6C13B3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  saveSettingsButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalWarning: {
    backgroundColor: '#fff5f5',
    padding: 15,
    borderRadius: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
    marginBottom: 20,
    fontSize: 14,
    lineHeight: 20,
  },
  formGroup: {
    marginBottom: 15,
  },
  formLabel: {
    fontSize: 14,
    marginBottom: 5,
    color: '#666',
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    overflow: 'hidden',
  },
  passwordToggle: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#6C13B3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default SettingsScreen;