import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { doc, setDoc } from 'firebase/firestore';
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { db, getCurrentUser } from "../lib/firebase";

const GlobalContext = createContext();
export const useGlobalContext = () => useContext(GlobalContext);

const registerForPushNotificationsAsync = async (userId) => {
  let token;
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      alert('Permissão para notificações não concedida!');
      return;
    }
    token = (await Notifications.getExpoPushTokenAsync()).data;
    // Salva o token no Firestore, associado ao usuário logado
    await setDoc(doc(db, 'users', userId), { expoPushToken: token }, { merge: true });
  } else {
    alert('Notificações push só funcionam em dispositivo físico!');
  }
  return token;
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const GlobalProvider = ({ children }) => {
  const [isLogged, setIsLogged] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Listener para abrir chat ao clicar na notificação push
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data && data.ecgId) {
        // Abre o chat do ECG correspondente
        router.push(`/chat/${data.ecgId}`);
      }
    });
    return () => subscription.remove();
  }, []);

  const fetchUser = useCallback(async () => {
    setLoading(true);
    let fetchedUser = null;
    try {
      const currentUserProfile = await getCurrentUser();
      if (currentUserProfile) {
        fetchedUser = currentUserProfile;
        setIsLogged(true);
        // Registra o push token ao logar
        await registerForPushNotificationsAsync(currentUserProfile.uid);
        console.log('Usuário autenticado:', currentUserProfile);
      } else {
        setIsLogged(false);
        console.log('Nenhum usuário logado.');
      }
    } catch (error) {
      setIsLogged(false);
      console.error('Erro ao buscar usuário:', error);
    } finally {
      setUser(fetchedUser);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return (
    <GlobalContext.Provider value={{ isLogged, setIsLogged, user, setUser, isLoading: loading, refetchUser: fetchUser }}>
      {children}
    </GlobalContext.Provider>
  );
};

export default GlobalProvider;