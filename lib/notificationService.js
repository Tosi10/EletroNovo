import { Audio } from 'expo-av';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configuração de notificações
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Função para reproduzir som de alerta urgente
export const playUrgentSound = async () => {
  try {
    const { sound } = await Audio.Sound.createAsync(
      require('../assets/sounds/new_notification_026_380249.mp3')
    );
    await sound.playAsync();
  } catch (error) {
    console.log('Erro ao reproduzir som:', error);
  }
};

// Função para registrar token de push notifications
export const registerForPushNotificationsAsync = async () => {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }
    token = (await Notifications.getExpoPushTokenAsync()).data;
  } else {
    alert('Must use physical device for Push Notifications');
  }

  return token;
};

// Função para monitorar ECGs urgentes
export const startUrgentEcgMonitoring = (onUrgentEcgReceived) => {
  // Implementação básica - pode ser expandida
  console.log('Monitoramento de ECGs urgentes iniciado');
};

// Função para adicionar listener de notificações
export const addNotificationReceivedListener = (callback) => {
  return Notifications.addNotificationReceivedListener(callback);
};

// Função para adicionar listener de resposta a notificações
export const addNotificationResponseReceivedListener = (callback) => {
  return Notifications.addNotificationResponseReceivedListener(callback);
};
