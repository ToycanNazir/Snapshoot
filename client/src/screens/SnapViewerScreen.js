// src/screens/SnapViewerScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const SnapViewerScreen = ({ route, navigation }) => {
  const { mediaUrl, messageId, otherUserId, chatName } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [remainingTime, setRemainingTime] = useState(10); // 10 secondes par défaut
  const [error, setError] = useState(null);

  // Démarrer le compte à rebours lorsque l'image est chargée
  useEffect(() => {
    let timer = null;
    
    if (!loading && remainingTime > 0) {
      timer = setInterval(() => {
        setRemainingTime(prev => {
          const newTime = prev - 1;
          if (newTime <= 0) {
            // Fermer l'écran quand le temps est écoulé
            setTimeout(() => {
              navigation.goBack();
            }, 500);
            clearInterval(timer);
          }
          return newTime;
        });
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [loading, remainingTime, navigation]);

  // Gérer le chargement de l'image
  const handleImageLoad = () => {
    setLoading(false);
  };

  // Gérer l'erreur de chargement de l'image
  const handleImageError = () => {
    setLoading(false);
    setError('Impossible de charger l\'image');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={28} color="white" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>
          {chatName || 'Snap'}
        </Text>
        
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{remainingTime}s</Text>
        </View>
      </View>
      
      {/* Contenu */}
      <View style={styles.content}>
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFFC00" />
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        )}
        
        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={50} color="#FFFC00" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <Image 
            source={{ uri: mediaUrl }}
            style={styles.snapImage}
            onLoad={handleImageLoad}
            onError={handleImageError}
            resizeMode="contain"
          />
        )}
      </View>
      
      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Ce Snap disparaîtra dans {remainingTime} secondes
        </Text>
      </View>
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
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  timerContainer: {
    backgroundColor: '#FFFC00',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  timerText: {
    color: 'black',
    fontSize: 14,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  snapImage: {
    width: width,
    height: height * 0.7,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 15,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'white',
    fontSize: 16,
    marginTop: 15,
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    color: '#FFFC00',
    fontSize: 14,
  },
});

export default SnapViewerScreen;