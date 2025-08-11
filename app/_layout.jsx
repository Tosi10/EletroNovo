import { useFonts } from 'expo-font';
import { SplashScreen, Stack } from 'expo-router';
import { useEffect } from 'react';
import GlobalProvider from '../context/GlobalProvider';
import "../global.css"; // Importa o CSS global para o projeto

// Previne que a SplashScreen seja escondida automaticamente até as fontes carregarem
SplashScreen.preventAutoHideAsync();

const RootLayout = () => {
  // Carrega as fontes personalizadas
  const [fontsLoaded, error] = useFonts({
    "Poppins-Black": require("../assets/fonts/Poppins-Black.ttf"),
    "Poppins-Bold": require("../assets/fonts/Poppins-Bold.ttf"),
    "Poppins-ExtraBold": require("../assets/fonts/Poppins-ExtraBold.ttf"),
    "Poppins-ExtraLight": require("../assets/fonts/Poppins-ExtraLight.ttf"),
    "Poppins-Light": require("../assets/fonts/Poppins-Light.ttf"),
    "Poppins-Medium": require("../assets/fonts/Poppins-Medium.ttf"),
    "Poppins-Regular": require("../assets/fonts/Poppins-Regular.ttf"),
    "Poppins-SemiBold": require("../assets/fonts/Poppins-SemiBold.ttf"),
    "Poppins-Thin": require("../assets/fonts/Poppins-Thin.ttf"),
  });

  // Efeito para esconder a SplashScreen ou lançar erro se as fontes não carregarem
  useEffect(() => {
    if (error) throw error;
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, error]);

  // Não renderiza nada enquanto as fontes não estiverem carregadas ou houver erro
  if (!fontsLoaded && !error) {
    return null;
  }

  return (
    <GlobalProvider>
      {/* O Stack principal. screenOptions={{ headerShown: false }} esconde os cabeçalhos padrão. */}
      <Stack screenOptions={{ headerShown: false }}>
        {/* Rota inicial que pode redirecionar. */}
        <Stack.Screen name="index" /> 
        {/*
          As pastas (auth) e (tabs) contêm seus próprios _layout.jsx.
          Expo Router as reconhece automaticamente como rotas de grupo.
          Não as liste como Stack.Screen diretamente aqui.
          O Expo Router as gerenciará com base nos seus arquivos _layout.jsx internos.
        */}
        {/* Exemplo de outras telas que não são grupos */}
        <Stack.Screen name="chat/[ecgId]" /> 
        <Stack.Screen name="enfermeiro/create" />
        <Stack.Screen name="medico/laudo" />
        <Stack.Screen name="search/[query]" />
        <Stack.Screen name="ecg/[ecgId]" />
        <Stack.Screen name="ecg-lauded-list" />
        <Stack.Screen name="ecg-pending-list" />
        <Stack.Screen name="ecg-sent-list" />
        <Stack.Screen name="laudos-received-list" />
        {/* Se você tiver rotas diretas (fora de (auth) ou (tabs)), elas iriam aqui. */}
      </Stack>
    </GlobalProvider>
  );
};

export default RootLayout;
