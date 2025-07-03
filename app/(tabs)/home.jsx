import { StyleSheet, Text, View, Image, ImageBackground, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import React, { useState } from 'react';
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
          backgroundColor: 'rgba(0,0,0,0.2)',
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
            <View className="justify-center items-center mb-6">
              <Text className="font-pmedium text-sm text-gray-100">
                Bem-vindo de volta,
              </Text>
              <Text className="text-3xl font-psemibold text-white mt-1">
                {user?.username || 'Usuário'}
              </Text>
            </View>

            {/* Seções de texto informativas */}
            <View className="w-full pt-7 pb-8 items-center">
              <Text className="text-gray-100 text-2xl font-pregular mb-3 text-center">
                V6 Core
              </Text>
              <Text className="text-white text-xl font-psemibold mb-2 text-center">
                Sua Plataforma para Gestão de ECGs
              </Text>
              <Text className="text-gray-100 text-lg text-center leading-relaxed">
                Conectando enfermeiros e médicos para facilitar o upload, a análise e o laudo de exames de eletrocardiograma.
              </Text>
              <Text className="text-gray-100 text-base mt-2 text-center leading-relaxed">
                Explore as abas para enviar novos exames, visualizar laudos e gerenciar seu perfil.
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
};

export default Home;
