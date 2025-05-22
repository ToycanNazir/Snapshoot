# 📸 Snapshoot - Guide de Démarrage

Assurez-vous d'avoir Docker, Docker Compose et Node.js installés, ainsi que l'application mobile Expo Go sur votre téléphone.

---

## Lancement complet de l'application

1. **Cloner le projet et se placer dans le dossier :**

```bash
cd Snapshoot
Lancer l’environnement Docker :

docker-compose build --no-cache
docker-compose up
Configurer l’adresse IP pour l’application mobile :

Ouvrez le fichier suivant :

client/src/config/api.js
Remplacez l'adresse IP par celle de votre machine locale (ex : 192.168.1.42) :

export const SERVER_IP = '192.168.1.X:8080';
Lancer l’application mobile avec Expo Go :

cd client
npm install -g expo-cli
npx expo start
Scannez le QRCODE avec l'appareil photo de votre telephone qui vous redirigera vers l'application expo go.
