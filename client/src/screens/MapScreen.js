import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions
} from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import { getAllStories } from '../api/storiesApi';
import { useFocusEffect } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const MapScreen = ({ navigation }) => {
  const { user } = useAuth();
  const mapRef = useRef(null);
  
  const [userLocation, setUserLocation] = useState(null);
  const [storiesWithLocation, setStoriesWithLocation] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStory, setSelectedStory] = useState(null);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [locationPermission, setLocationPermission] = useState(null);

  // Charger les données à chaque focus de l'écran
  useFocusEffect(
    React.useCallback(() => {
      loadMapData();
    }, [])
  );

  const loadMapData = async () => {
    setLoading(true);
    try {
      // Demander les permissions de localisation
      await requestLocationPermission();
      
      // Charger les stories avec localisation
      await loadStoriesWithLocation();
    } catch (error) {
      console.error('Erreur lors du chargement des données de la carte:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      } else {
        Alert.alert(
          'Permission requise',
          'Nous avons besoin de votre localisation pour afficher les stories à proximité.',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Paramètres', onPress: () => Linking.openSettings() }
          ]
        );
        
        // Position par défaut (Paris)
        setUserLocation({
          latitude: 48.8566,
          longitude: 2.3522,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      }
    } catch (error) {
      console.error('Erreur lors de la demande de permission:', error);
      // Position par défaut en cas d'erreur
      setUserLocation({
        latitude: 48.8566,
        longitude: 2.3522,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    }
  };

  const loadStoriesWithLocation = async () => {
    try {
      const allStories = await getAllStories();
      
      // Filtrer les stories qui ont une localisation et créer des coordonnées
      const storiesWithCoords = allStories
        .map((storyGroup) => {
          // Chercher la story la plus récente avec localisation
          const storyWithLocation = storyGroup.items.find(story => story.location);
          
          if (storyWithLocation && storyWithLocation.location) {
            return {
              id: storyGroup.id,
              user: storyGroup.user,
              stories: storyGroup.items,
              coordinate: {
                latitude: storyWithLocation.location.latitude,
                longitude: storyWithLocation.location.longitude,
              },
              location: {
                name: 'Story géolocalisée',
                address: `${storyWithLocation.location.latitude.toFixed(4)}, ${storyWithLocation.location.longitude.toFixed(4)}`
              }
            };
          }
          
          // Si pas de localisation réelle, générer une position aléatoire autour de Paris (pour les stories de démo)
          const baseLatitude = 48.8566;
          const baseLongitude = 2.3522;
          const randomLatOffset = (Math.random() - 0.5) * 0.02;
          const randomLngOffset = (Math.random() - 0.5) * 0.02;
          
          return {
            id: storyGroup.id,
            user: storyGroup.user,
            stories: storyGroup.items,
            coordinate: {
              latitude: baseLatitude + randomLatOffset,
              longitude: baseLongitude + randomLngOffset,
            },
            location: {
              name: getRandomLocationName(),
              address: 'Paris, France (simulé)'
            }
          };
        })
        .filter(Boolean); // Supprimer les valeurs null/undefined
      
      console.log('Stories avec localisation chargées:', storiesWithCoords.length);
      setStoriesWithLocation(storiesWithCoords);
    } catch (error) {
      console.error('Erreur lors du chargement des stories:', error);
      // Données de démonstration en cas d'erreur
      setStoriesWithLocation(getDemoStoriesWithLocation());
    }
  };

  const getRandomLocationName = () => {
    const locations = [
      'Tour Eiffel', 'Louvre', 'Notre-Dame', 'Champs-Élysées', 
      'Montmartre', 'Marais', 'Saint-Germain', 'Bastille',
      'République', 'Opéra', 'Châtelet', 'Trocadéro'
    ];
    return locations[Math.floor(Math.random() * locations.length)];
  };

  const getDemoStoriesWithLocation = () => {
    return [
      {
        id: 'demo1',
        user: {
          id: 'user1',
          name: 'Marie Dupont',
          avatar: 'https://randomuser.me/api/portraits/women/32.jpg',
        },
        stories: [
          {
            id: 'story1',
            type: 'image',
            url: 'https://source.unsplash.com/random/800x1200/?paris',
            caption: 'Belle soirée à Paris ! 🗼',
            timestamp: new Date(Date.now() - 1000 * 60 * 30),
          }
        ],
        coordinate: {
          latitude: 48.8584,
          longitude: 2.2945,
        },
        location: {
          name: 'Tour Eiffel',
          address: 'Paris, France'
        }
      },
      {
        id: 'demo2',
        user: {
          id: 'user2',
          name: 'Lucas Martin',
          avatar: 'https://randomuser.me/api/portraits/men/43.jpg',
        },
        stories: [
          {
            id: 'story2',
            type: 'image',
            url: 'https://source.unsplash.com/random/800x1200/?louvre',
            caption: 'Au Louvre aujourd\'hui 🎨',
            timestamp: new Date(Date.now() - 1000 * 60 * 60),
          }
        ],
        coordinate: {
          latitude: 48.8606,
          longitude: 2.3376,
        },
        location: {
          name: 'Musée du Louvre',
          address: 'Paris, France'
        }
      }
    ];
  };

  const handleMarkerPress = (storyData) => {
    setSelectedStory(storyData);
    setShowStoryModal(true);
  };

  const viewStory = (storyData) => {
    setShowStoryModal(false);
    // Naviguer vers l'écran de stories avec focus sur cette story
    navigation.navigate('Stories', { 
      focusOnUser: storyData.user.id,
      storyData: storyData 
    });
  };

  const centerMapOnUser = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion(userLocation, 1000);
    }
  };

  const addStoryAtLocation = async () => {
    if (!locationPermission) {
      Alert.alert(
        'Permission requise',
        'Nous avons besoin de votre localisation pour ajouter une story géolocalisée.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Continuer sans localisation', onPress: () => navigation.navigate('CameraScreen', { fromStories: true }) }
        ]
      );
      return;
    }

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      navigation.navigate('CameraScreen', { 
        fromStories: true,
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        }
      });
    } catch (error) {
      console.error('Erreur lors de la récupération de la localisation:', error);
      navigation.navigate('CameraScreen', { fromStories: true });
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C13B3" />
        <Text style={styles.loadingText}>Chargement de la carte...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Stories à proximité</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="options-outline" size={20} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.centerButton}
            onPress={centerMapOnUser}
          >
            <Ionicons name="locate-outline" size={20} color="#6C13B3" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Map */}
      {userLocation && (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={userLocation}
          showsUserLocation={locationPermission}
          showsMyLocationButton={false}
          showsCompass={true}
          mapType="standard"
        >
          {/* Marqueurs pour les stories */}
          {storiesWithLocation.map((storyData) => (
            <Marker
              key={storyData.id}
              coordinate={storyData.coordinate}
              onPress={() => handleMarkerPress(storyData)}
            >
              <View style={styles.markerContainer}>
                <View style={styles.storyMarker}>
                  <Image 
                    source={{ uri: storyData.user.avatar }} 
                    style={styles.markerAvatar}
                  />
                </View>
                <View style={styles.markerTriangle} />
              </View>
              
              <Callout tooltip={true} onPress={() => handleMarkerPress(storyData)}>
                <View style={styles.calloutContainer}>
                  <Text style={styles.calloutTitle}>{storyData.user.name}</Text>
                  <Text style={styles.calloutSubtitle}>{storyData.location.name}</Text>
                  <Text style={styles.calloutStoryCount}>
                    {storyData.stories.length} story{storyData.stories.length > 1 ? 's' : ''}
                  </Text>
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>
      )}

      {/* Bouton pour ajouter une story */}
      <TouchableOpacity 
        style={styles.addButton}
        onPress={addStoryAtLocation}
      >
        <Ionicons name="camera" size={24} color="white" />
      </TouchableOpacity>

      {/* Compteur de stories */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          {storiesWithLocation.length} stories à proximité
        </Text>
      </View>

      {/* Modal pour afficher les détails d'une story */}
      <Modal
        visible={showStoryModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowStoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedStory && (
              <>
                <View style={styles.modalHeader}>
                  <Image 
                    source={{ uri: selectedStory.user.avatar }} 
                    style={styles.modalAvatar}
                  />
                  <View style={styles.modalUserInfo}>
                    <Text style={styles.modalUserName}>{selectedStory.user.name}</Text>
                    <Text style={styles.modalLocation}>📍 {selectedStory.location.name}</Text>
                  </View>
                  <TouchableOpacity 
                    onPress={() => setShowStoryModal(false)}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalStoryInfo}>
                  <Text style={styles.modalStoryCount}>
                    {selectedStory.stories.length} story{selectedStory.stories.length > 1 ? 's' : ''} disponible{selectedStory.stories.length > 1 ? 's' : ''}
                  </Text>
                  
                  {selectedStory.stories[0] && (
                    <View style={styles.storyPreview}>
                      <Image 
                        source={{ uri: selectedStory.stories[0].url }} 
                        style={styles.storyPreviewImage}
                      />
                      {selectedStory.stories[0].caption && (
                        <Text style={styles.storyPreviewCaption} numberOfLines={2}>
                          {selectedStory.stories[0].caption}
                        </Text>
                      )}
                    </View>
                  )}
                </View>

                <TouchableOpacity 
                  style={styles.viewStoryButton}
                  onPress={() => viewStory(selectedStory)}
                >
                  <Ionicons name="play-circle" size={20} color="white" />
                  <Text style={styles.viewStoryButtonText}>Voir les stories</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterButton: {
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    marginRight: 10,
  },
  centerButton: {
    padding: 8,
    backgroundColor: '#f0f0ff',
    borderRadius: 20,
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    alignItems: 'center',
  },
  storyMarker: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: '#6C13B3',
    backgroundColor: 'white',
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  markerTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 0,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#6C13B3',
    marginTop: -1,
  },
  calloutContainer: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    minWidth: 120,
    alignItems: 'center',
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 2,
  },
  calloutSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  calloutStoryCount: {
    fontSize: 11,
    color: '#6C13B3',
    fontWeight: '500',
  },
  addButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: '#6C13B3',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  statsContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statsText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: height * 0.7,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  modalUserInfo: {
    flex: 1,
  },
  modalUserName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modalLocation: {
    fontSize: 14,
    color: '#666',
  },
  closeButton: {
    padding: 5,
  },
  modalStoryInfo: {
    marginBottom: 20,
  },
  modalStoryCount: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 15,
    textAlign: 'center',
    color: '#6C13B3',
  },
  storyPreview: {
    alignItems: 'center',
  },
  storyPreviewImage: {
    width: 200,
    height: 300,
    borderRadius: 10,
    marginBottom: 10,
  },
  storyPreviewCaption: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  viewStoryButton: {
    backgroundColor: '#6C13B3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 25,
  },
  viewStoryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default MapScreen;