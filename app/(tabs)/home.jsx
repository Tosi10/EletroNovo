import React, { useState } from 'react';
import { ActivityIndicator, ImageBackground, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { images } from '../../constants';

import { useGlobalContext } from '../../context/GlobalProvider';

const Home = () => {
  // Obtém o usuário e o estado de carregamento do contexto global (Firebase)
  const { user, isLoading: isGlobalLoading } = useGlobalContext();

  const [refreshing, setRefreshing] = useState(false);

  // Simula o refresh, já que esta Home não faz busca de dados de posts
  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000)); 
    setRefreshing(false);
  };

  // Mostra um indicador de carregamento enquanto os dados do usuário estão sendo obtidos
  if (isGlobalLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#161622' }}>
        <ActivityIndicator size="large" color="#FFA001" />
        <Text style={{ color: 'white', fontSize: 18, marginTop: 16 }}>Carregando dados de usuário...</Text>
      </View>
    );
  }

  return (
    //ImageBackground agora fora da SafeAreaView e cobrindo toda a tela
    <ImageBackground
      source={images.cardio2}
      resizeMode="cover"
      style={StyleSheet.absoluteFillObject} //Isso fará com que a imagem preencha a tela inteira
    >
      
      <View
        pointerEvents="none"
        style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: 'rgba(250,250,250,0.09)', // Mais escuro para contraste
          zIndex: 1,
        }}
      />

      
      <SafeAreaView className="h-full flex-1" style={{ zIndex:2, backgroundColor: 'transparent'}}>
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#fff"
            />
          }
        >
          {/* Conteúdo principal da Home, adaptado do seu ListHeaderComponent */}
          <View className="my-6 px-4 space-y-6 flex-1 justify-center items-center">
            <View className="justify-center mt-20 items-center">
              <Text className="font-psemibold  text-md text-gray-200" style={{ textShadowColor: '#000', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 3 }}>
                Bem-vindo de volta,
              </Text>
              <Text className="text-3xl font-psemibold text-white mt-1" style={{ textShadowColor: '#000', textShadowOffset: {width: 0, height: 2}, textShadowRadius: 6 }}>
                {user?.username || 'Usuário'}
              </Text>
            </View>

            {/* Seções de texto informativas */}
            <View className="w-full  pt-7 pb-8 items-center">
              <View style={{ backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 18, padding: 16, width: '90%', alignItems: 'center' }}>
                <Text className="text-3xl font-pbold text-white mb-3 text-center" style={{ textShadowColor: '#000', textShadowOffset: {width: 0, height: 2}, textShadowRadius: 8 }}>
                  V6 Core
                </Text>
                <Text className="text-xl font-psemibold text-white mb-2 text-center" style={{ textShadowColor: '#000', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 4 }}>
                  Sua Plataforma para Gestão de ECGs
                </Text>
                <Text className="text-lg text-white mt-6 text-center leading-relaxed" style={{ textShadowColor: '#000', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 3 }}>
                  Conectando você com Cardiologistas experientes para facilitar a análise e o laudo de exames de Eletrocardiograma.
                </Text>
                <Text className="text-base mt-6 text-white text-center leading-relaxed" style={{ textShadowColor: '#000', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 3 }}>
                  Explore as abas para enviar novos exames, visualizar laudos e gerenciar seu perfil. 
                </Text><Text className="text-base  text-white text-center leading-relaxed" style={{ textShadowColor: '#000', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 3 }}>
                  Se necessário, você pode entrar em contato direto com um dos nossos especialistas através do chat.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
};

export default Home;
