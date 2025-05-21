import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Animated,
  PanResponder,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getAllStories, getUserStories, markStoryAsViewed, likeStory, deleteStory } from '../api/storiesApi';

const { width, height } = Dimensions.get('window');

const StoriesScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [stories, setStories] = useState([]);
  const [userStories, setUserStories] = useState([]);
  const [activeStoryIndex, setActiveStoryIndex] = useState(null);
  const [progress, setProgress] = useState(new Animated.Value(0));
  const [loading, setLoading] = useState(true);
  
  const progressAnimation = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%']
  });

  // Charger les stories à chaque fois que l'écran reçoit le focus
  useFocusEffect(
    useCallback(() => {
      loadStories();
    }, [user])
  );

  const loadStories = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Charger toutes les stories
      const allStories = await getAllStories();
      console.log('Stories chargées:', allStories.length);
      
      // Charger les stories de l'utilisateur actuel
      const currentUserStories = await getUserStories(user.id);
      console.log('Stories utilisateur:', currentUserStories.length);
      
      // Ajouter les stories de l'utilisateur en première position s'il en a
      let finalStories = [...allStories];
      if (currentUserStories.length > 0) {
        // Vérifier si l'utilisateur est déjà dans la liste
        const userIndex = finalStories.findIndex(story => story.user.id === user.id);
        if (userIndex !== -1) {
          // Mettre à jour les stories existantes
          finalStories[userIndex] = {
            id: user.id,
            user: {
              id: user.id,
              name: user.username || user.email,
              avatar: user.avatar_url || 'https://randomuser.me/api/portraits/lego/1.jpg',
            },
            items: currentUserStories
          };
          // Déplacer en première position
          const userStory = finalStories.splice(userIndex, 1)[0];
          finalStories.unshift(userStory);
        } else {
          // Ajouter en première position
          finalStories.unshift({
            id: user.id,
            user: {
              id: user.id,
              name: user.username || user.email,
              avatar: user.avatar_url || 'https://randomuser.me/api/portraits/lego/1.jpg',
            },
            items: currentUserStories
          });
        }
      }
      
      setStories(finalStories);
      setUserStories(currentUserStories);
    } catch (error) {
      console.error('Erreur lors du chargement des stories:', error);
      // Fallback avec des données simulées
      loadDummyStories();
    } finally {
      setLoading(false);
    }
  };

  // Fallback avec des données simulées
  const loadDummyStories = () => {
    const dummyStories = [
      {
        id: '1',
        user: {
          id: 'user1',
          name: 'Alex Dubois',
          avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
        },
        items: [
          {
            id: 'story1',
            type: 'image',
            url: 'https://source.unsplash.com/random/800x1200/?city',
            timestamp: new Date(Date.now() - 1000 * 60 * 30),
            caption: 'Belle soirée sur Paris 🗼',
          },
        ],
      },
      {
        id: '2',
        user: {
          id: 'user2',
          name: 'Marie Laurent',
          avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
        },
        items: [
          {
            id: 'story3',
            type: 'image',
            url: 'https://source.unsplash.com/random/800x1200/?beach',
            timestamp: new Date(Date.now() - 1000 * 60 * 120),
            caption: 'Vacances au soleil 🏖️',
          }
        ],
      },
    ];
    setStories(dummyStories);
  };
  
  // Gestion du temps d'affichage d'une story
  const storyTimeout = () => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 5000, // 5 secondes par story
      useNativeDriver: false
    }).start(({ finished }) => {
      if (finished) {
        // Passer à la story suivante ou revenir à la liste
        handleNextStory();
      }
    });
  };
  
  const handleStoryPress = async (index) => {
    progress.setValue(0);
    setActiveStoryIndex(index);
    
    // Marquer la story comme vue si ce n'est pas celle de l'utilisateur actuel
    const story = stories[index];
    if (story && story.user.id !== user.id) {
      const currentItem = story.items[story.currentItem || 0];
      if (currentItem) {
        await markStoryAsViewed(currentItem.id, user.id);
      }
    }
    
    storyTimeout();
  };
  
  const handleNextStory = () => {
    if (activeStoryIndex !== null) {
      // Vérifier s'il y a d'autres stories dans le groupe actuel
      const currentStory = stories[activeStoryIndex];
      const currentItemIndex = currentStory.currentItem || 0;
      
      if (currentItemIndex + 1 < currentStory.items.length) {
        // Passer à l'item suivant dans le même groupe
        stories[activeStoryIndex].currentItem = currentItemIndex + 1;
        setStories([...stories]);
        progress.setValue(0);
        storyTimeout();
      } else {
        // Passer au groupe de stories suivant
        if (activeStoryIndex + 1 < stories.length) {
          stories[activeStoryIndex + 1].currentItem = 0;
          setStories([...stories]);
          progress.setValue(0);
          setActiveStoryIndex(activeStoryIndex + 1);
          storyTimeout();
        } else {
          // Revenir à la liste des stories
          setActiveStoryIndex(null);
        }
      }
    }
  };
  
  const handlePreviousStory = () => {
    if (activeStoryIndex !== null) {
      const currentStory = stories[activeStoryIndex];
      const currentItemIndex = currentStory.currentItem || 0;
      
      if (currentItemIndex > 0) {
        // Revenir à l'item précédent dans le même groupe
        stories[activeStoryIndex].currentItem = currentItemIndex - 1;
        setStories([...stories]);
        progress.setValue(0);
        storyTimeout();
      } else {
        // Revenir au groupe de stories précédent
        if (activeStoryIndex > 0) {
          const prevStoryIndex = activeStoryIndex - 1;
          const prevStory = stories[prevStoryIndex];
          stories[prevStoryIndex].currentItem = prevStory.items.length - 1;
          setStories([...stories]);
          progress.setValue(0);
          setActiveStoryIndex(prevStoryIndex);
          storyTimeout();
        }
      }
    }
  };

  // Fonction pour liker une story
  const handleLikeStory = async () => {
    if (activeStoryIndex !== null) {
      const story = stories[activeStoryIndex];
      const currentItem = story.items[story.currentItem || 0];
      if (currentItem && story.user.id !== user.id) {
        await likeStory(currentItem.id, user.id);
        // Recharger les stories pour refléter le changement
        loadStories();
      }
    }
  };

  // Fonction pour supprimer une story (seulement pour ses propres stories)
  const handleDeleteStory = async () => {
    if (activeStoryIndex !== null) {
      const story = stories[activeStoryIndex];
      const currentItem = story.items[story.currentItem || 0];
      
      if (currentItem && story.user.id === user.id) {
        Alert.alert(
          "Supprimer la story",
          "Êtes-vous sûr de vouloir supprimer cette story ?",
          [
            { text: "Annuler", style: "cancel" },
            { 
              text: "Supprimer", 
              style: "destructive",
              onPress: async () => {
                try {
                  await deleteStory(currentItem.id, user.id);
                  setActiveStoryIndex(null);
                  loadStories(); // Recharger les stories
                } catch (error) {
                  Alert.alert("Erreur", "Impossible de supprimer la story");
                }
              }
            }
          ]
        );
      }
    }
  };
  
  // Gestion des gestes pour naviguer entre les stories
  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderRelease: (evt, gestureState) => {
        // Si le mouvement horizontal est significatif
        if (Math.abs(gestureState.dx) > 50) {
          if (gestureState.dx > 0) {
            // Swipe vers la droite - Story précédente
            handlePreviousStory();
          } else {
            // Swipe vers la gauche - Story suivante
            handleNextStory();
          }
        } else if (Math.abs(gestureState.dy) > 100) {
          // Swipe vertical significatif - Fermer les stories
          setActiveStoryIndex(null);
        } else {
          // Tap simple
          const x = evt.nativeEvent.locationX;
          const screenWidth = Dimensions.get('window').width;
          
          if (x < screenWidth / 3) {
            // Tap sur la partie gauche - Story précédente
            handlePreviousStory();
          } else if (x > (screenWidth * 2) / 3) {
            // Tap sur la partie droite - Story suivante
            handleNextStory();
          }
        }
      },
      onPanResponderTerminate: () => {
        // Animation interrompue
        progress.stopAnimation();
      }
    })
  ).current;
  
  // Formater le temps écoulé
  const getElapsedTime = (timestamp) => {
    const now = new Date();
    const elapsed = now - new Date(timestamp);
    
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
  
  // Rendu d'un aperçu de story dans la liste
  const renderStoryPreview = ({ item, index }) => {
    const isUserStory = item.user.id === user.id;
    const hasUnseenStories = !isUserStory; // Pour simplifier, on considère que les stories des autres sont non vues
    
    return (
      <TouchableOpacity 
        style={styles.storyPreviewContainer}
        onPress={() => handleStoryPress(index)}
      >
        <View style={[styles.avatarContainer, hasUnseenStories ? styles.unseenStoryRing : null]}>
          <Image source={{ uri: item.user.avatar }} style={styles.avatar} />
          {isUserStory && (
            <TouchableOpacity 
              style={styles.addStoryButton}
              onPress={() => navigation.navigate('CameraScreen', { fromStories: true })}
            >
              <Ionicons name="add" size={16} color="white" />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.username} numberOfLines={1}>
          {isUserStory ? 'Ma Story' : item.user.name}
        </Text>
      </TouchableOpacity>
    );
  };
  
  // Rendu de la story active
  const renderActiveStory = () => {
    if (activeStoryIndex === null) return null;
    
    const story = stories[activeStoryIndex];
    const itemIndex = story.currentItem || 0;
    const storyItem = story.items[itemIndex];
    const isUserStory = story.user.id === user.id;
    
    return (
      <View style={styles.storyContainer} {...panResponder.panHandlers}>
        <StatusBar hidden />
        
        {/* Progress bar */}
        <View style={styles.progressContainer}>
          {story.items.map((item, i) => (
            <View key={i} style={styles.progressBar}>
              <Animated.View 
                style={[
                  styles.activeProgress,
                  i === itemIndex ? { width: progressAnimation } : i < itemIndex ? { width: '100%' } : { width: '0%' }
                ]}
              />
            </View>
          ))}
        </View>
        
        {/* Header */}
        <View style={styles.storyHeader}>
          <View style={styles.storyUser}>
            <Image source={{ uri: story.user.avatar }} style={styles.storyAvatar} />
            <View>
              <Text style={styles.storyUsername}>{story.user.name}</Text>
              <Text style={styles.storyTime}>
                {getElapsedTime(storyItem.timestamp)}
              </Text>
            </View>
          </View>
          
          <View style={styles.storyHeaderActions}>
            {isUserStory && (
              <TouchableOpacity 
                style={styles.storyActionButton}
                onPress={handleDeleteStory}
              >
                <Ionicons name="trash-outline" size={20} color="white" />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => setActiveStoryIndex(null)}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Content */}
        {storyItem.type === 'image' ? (
          <Image source={{ uri: storyItem.url }} style={styles.storyMedia} resizeMode="cover" />
        ) : (
          <Video
            source={{ uri: storyItem.url }}
            rate={1.0}
            volume={1.0}
            isMuted={false}
            resizeMode="cover"
            shouldPlay
            style={styles.storyMedia}
          />
        )}
        
        {/* Caption */}
        {storyItem.caption && (
          <View style={styles.captionContainer}>
            <Text style={styles.caption}>{storyItem.caption}</Text>
          </View>
        )}

        {/* Actions en bas (like, répondre, etc.) */}
        {!isUserStory && (
          <View style={styles.storyActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleLikeStory}
            >
              <Ionicons 
                name={storyItem.likes && storyItem.likes.includes(user.id) ? "heart" : "heart-outline"} 
                size={24} 
                color={storyItem.likes && storyItem.likes.includes(user.id) ? "#FF6B6B" : "white"} 
              />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => {
                // Naviguer vers la conversation avec cet utilisateur
                setActiveStoryIndex(null);
                // Ici vous pourriez naviguer vers ConversationScreen avec l'ID de l'utilisateur
              }}
            >
              <Ionicons name="paper-plane-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>
        )}

        {/* Affichage des vues pour les stories de l'utilisateur */}
        {isUserStory && storyItem.views && storyItem.views.length > 0 && (
          <View style={styles.viewsContainer}>
            <Ionicons name="eye" size={16} color="white" />
            <Text style={styles.viewsText}>{storyItem.views.length} vue{storyItem.views.length > 1 ? 's' : ''}</Text>
          </View>
        )}
        
        {/* Navigation buttons - invisible but functional */}
        <TouchableOpacity 
          style={styles.prevButton} 
          onPress={handlePreviousStory}
        />
        <TouchableOpacity 
          style={styles.nextButton} 
          onPress={handleNextStory}
        />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Chargement des stories...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      {activeStoryIndex !== null ? (
        renderActiveStory()
      ) : (
        <>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Stories</Text>
            <TouchableOpacity 
              style={styles.cameraButton}
              onPress={() => navigation.navigate('CameraScreen', { fromStories: true })}
            >
              <Ionicons name="camera-outline" size={24} color="#6C13B3" />
            </TouchableOpacity>
          </View>
          
          {/* Ma Story + Stories des amis */}
          <FlatList
            data={stories}
            renderItem={renderStoryPreview}
            keyExtractor={item => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.storiesList}
            ListEmptyComponent={() => (
              <View style={styles.emptyStoriesContainer}>
                <TouchableOpacity 
                  style={styles.createFirstStoryButton}
                  onPress={() => navigation.navigate('CameraScreen', { fromStories: true })}
                >
                  <Ionicons name="add" size={30} color="#6C13B3" />
                  <Text style={styles.createFirstStoryText}>Créer votre première story</Text>
                </TouchableOpacity>
              </View>
            )}
          />
          
          <View style={styles.divider} />
          
          {/* Section Découvrir (stories récentes) */}
          <Text style={styles.feedTitle}>Récentes</Text>
          <FlatList
            data={stories.filter(story => story.user.id !== user.id)} // Exclure ses propres stories
            keyExtractor={item => `feed-${item.id}`}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
              <View style={styles.emptyFeedContainer}>
                <Ionicons name="camera-outline" size={50} color="#ccc" />
                <Text style={styles.emptyFeedText}>
                  Aucune story à afficher.{'\n'}
                  Ajoutez des amis pour voir leurs stories !
                </Text>
                <TouchableOpacity 
                  style={styles.findFriendsButton}
                  onPress={() => navigation.navigate('FindFriendsScreen')}
                >
                  <Text style={styles.findFriendsButtonText}>Trouver des amis</Text>
                </TouchableOpacity>
              </View>
            )}
            renderItem={({ item, index }) => {
              // Prendre la première story comme aperçu
              const previewStory = item.items[0];
              
              return (
                <TouchableOpacity 
                  style={styles.feedItem}
                  onPress={() => handleStoryPress(stories.findIndex(s => s.id === item.id))}
                >
                  <Image 
                    source={{ uri: previewStory.url }} 
                    style={styles.feedImage}
                    resizeMode="cover"
                  />
                  <View style={styles.feedItemOverlay}>
                    <View style={styles.feedItemUser}>
                      <Image source={{ uri: item.user.avatar }} style={styles.feedItemAvatar} />
                      <Text style={styles.feedItemUsername}>{item.user.name}</Text>
                    </View>
                    {previewStory.caption && (
                      <Text style={styles.feedItemCaption} numberOfLines={2}>
                        {previewStory.caption}
                      </Text>
                    )}
                    <View style={styles.feedItemStats}>
                      <View style={styles.statItem}>
                        <Ionicons name="eye" size={14} color="white" />
                        <Text style={styles.statText}>
                          {previewStory.views ? previewStory.views.length : 0}
                        </Text>
                      </View>
                      <View style={styles.statItem}>
                        <Ionicons name="heart" size={14} color="white" />
                        <Text style={styles.statText}>
                          {previewStory.likes ? previewStory.likes.length : 0}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </>
      )}
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
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  cameraButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storiesList: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 15,
    minHeight: 120,
  },
  storyPreviewContainer: {
    alignItems: 'center',
    marginHorizontal: 8,
    width: 80,
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
    position: 'relative',
  },
  unseenStoryRing: {
    borderColor: '#6C13B3',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  addStoryButton: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6C13B3',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  username: {
    fontSize: 12,
    textAlign: 'center',
    color: '#333',
  },
  emptyStoriesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    width: width - 20,
  },
  createFirstStoryButton: {
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 20,
    borderRadius: 15,
    width: '100%',
  },
  createFirstStoryText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6C13B3',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 15,
    marginBottom: 15,
  },
  feedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 20,
    marginBottom: 10,
  },
  emptyFeedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  emptyFeedText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 20,
    lineHeight: 22,
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
  feedItem: {
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 10,
    overflow: 'hidden',
    height: 200,
  },
  feedImage: {
    width: '100%',
    height: '100%',
  },
  feedItemOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-end',
    padding: 15,
  },
  feedItemUser: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  feedItemAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'white',
  },
  feedItemUsername: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  feedItemCaption: {
    color: 'white',
    fontSize: 13,
    marginBottom: 8,
  },
  feedItemStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    color: 'white',
    fontSize: 12,
    marginLeft: 4,
  },
  storyContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  progressContainer: {
    flexDirection: 'row',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    zIndex: 10,
    padding: 10,
  },
  progressBar: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 2,
    borderRadius: 3,
  },
  activeProgress: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 3,
  },
  storyHeader: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    zIndex: 10,
  },
  storyUser: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storyAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'white',
  },
  storyUsername: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  storyTime: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  storyHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storyActionButton: {
    marginRight: 15,
  },
  storyMedia: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  captionContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    padding: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  caption: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
  storyActions: {
    position: 'absolute',
    bottom: 60,
    right: 15,
    alignItems: 'center',
  },
  actionButton: {
    marginBottom: 15,
    padding: 8,
  },
  viewsContainer: {
    position: 'absolute',
    bottom: 30,
    left: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  viewsText: {
    color: 'white',
    fontSize: 12,
    marginLeft: 5,
  },
  prevButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '30%',
    height: '100%',
    zIndex: 9,
  },
  nextButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '30%',
    height: '100%',
    zIndex: 9,
  },
});

export default StoriesScreen;