import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { LogBox, StatusBar, View, TouchableOpacity, Platform } from 'react-native';

// Importer le AuthProvider
import { AuthProvider, useAuth } from './src/context/AuthContext';

// Écrans
import AuthScreen from './src/screens/AuthScreen';
import CameraScreen from './src/screens/CameraScreen';
import ChatScreen from './src/screens/ChatScreen';
import ConversationScreen from './src/screens/ConversationScreen';
import MapScreen from './src/screens/MapScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import StoriesScreen from './src/screens/StoriesScreen';
import FindFriendsScreen from './src/screens/FindFriendsScreen';
import FriendsListScreen from './src/screens/FriendsListScreen';
import { Camera } from 'expo-camera';
import SnapViewerScreen from './src/screens/SnapViewerScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import PasswordResetScreen from './src/screens/PasswordResetScreen';
import ChatInfoScreen from './src/screens/ChatInfoScreen';
// Ajouter l'import pour SelectFriendsScreen
import SelectFriendsScreen from './src/screens/SelectFriendsScreen';

// Ignorer certains avertissements non critiques
LogBox.ignoreLogs([
  'AsyncStorage has been extracted from react-native core',
  'Possible Unhandled Promise Rejection',
  'Setting a timer'
]);

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Stack pour le profil avec ses sous-écrans
const ProfileStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
      <Stack.Screen name="PasswordReset" component={PasswordResetScreen} />
    </Stack.Navigator>
  );
};

// Stack pour le chat avec ses sous-écrans
const ChatStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ChatMain" component={ChatScreen} />
      <Stack.Screen name="ConversationScreen" component={ConversationScreen} />
      <Stack.Screen name="ChatInfoScreen" component={ChatInfoScreen} />
      <Stack.Screen name="SelectFriendsScreen" component={SelectFriendsScreen} />
    </Stack.Navigator>
  );
};

// Tabs de navigation principale
const MainTabs = () => {
  return (
    <Tab.Navigator
      initialRouteName="Profile"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          
          if (route.name === 'Camera') {
            iconName = focused ? 'camera' : 'camera-outline';
          } else if (route.name === 'Stories') {
            iconName = focused ? 'play-circle' : 'play-circle-outline';
          } else if (route.name === 'Chat') {
            iconName = focused ? 'chatbubble' : 'chatbubble-outline';
          } else if (route.name === 'Map') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }
          
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6C13B3',
        tabBarInactiveTintColor: 'gray',
        tabBarShowLabel: false,
        tabBarStyle: {
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          height: 60,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Profile" component={ProfileStack} />
      <Tab.Screen name="Camera" component={CameraScreen} />
      <Tab.Screen name="Stories" component={StoriesScreen} />
      <Tab.Screen name="Chat" component={ChatStack} />
      <Tab.Screen name="Map" component={MapScreen} />
    </Tab.Navigator>
  );
};

// Configuration des stacks de navigation principale
const MainStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen name="FindFriendsScreen" component={FindFriendsScreen} />
      <Stack.Screen name="FriendsListScreen" component={FriendsListScreen} />
      <Stack.Screen name="CameraScreen" component={CameraScreen} />
      <Stack.Screen name="StoriesScreen" component={StoriesScreen} />
      <Stack.Screen 
        name="SnapViewerScreen" 
        component={SnapViewerScreen}
        options={{
          presentation: 'fullScreenModal',
          animationEnabled: true,
          cardStyle: { backgroundColor: 'black' }
        }}
      />
    </Stack.Navigator>
  );
};

// Composant qui détermine quelle stack afficher en fonction de l'état d'authentification
const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <NavigationContainer>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {user ? <MainStack /> : <AuthScreen />}
    </NavigationContainer>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;