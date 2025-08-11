import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EmptyState from '../components/EmptyState';
import { icons } from '../constants';
import { useGlobalContext } from '../context/GlobalProvider';
import { getUserPosts } from '../lib/firebase';
import useFirebaseData from '../lib/useFirebaseData';

const EcgSentList = () => {
  const { user } = useGlobalContext();
  const [refreshing, setRefreshing] = useState(false);

  const fetchSentEcgs = useCallback(() => {
    if (!user?.uid || user?.role !== 'enfermeiro') return Promise.resolve([]);
    return getUserPosts(user.uid);
  }, [user?.uid, user?.role]);

  const { data: sentEcgs, isLoading, refetch } = useFirebaseData(
    fetchSentEcgs,
    [user?.uid, user?.role]
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleNavigateToEcg = (ecgId) => {
    router.push(`/ecg/${ecgId}`);
  };

  if (isLoading) {
    return (
      <SafeAreaView className="bg-primary h-full justify-center items-center">
        <ActivityIndicator size="large" color="#FFA001" />
        <Text className="text-white text-lg mt-4">Carregando ECGs enviados...</Text>
      </SafeAreaView>
    );
  }

  if (!user || user.role !== 'enfermeiro') {
    return (
      <SafeAreaView className="bg-primary h-full justify-center items-center">
        <Text className="text-white text-lg text-center">Acesso restrito a enfermeiros</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="bg-primary h-full">
      {/* Botão de voltar - implementação igual à tela create */}
      <TouchableOpacity
        onPress={() => router.back()}
        style={{
          position: 'absolute',
          top: 80,
          left: 36,
          zIndex: 30,
          backgroundColor: 'rgba(0,0,0,0.4)',
          padding: 8,
          borderRadius: 20
        }}
      >
        <Image source={icons.leftArrow} style={{ width: 30, height: 23, tintColor: 'white' }} />
      </TouchableOpacity>

      <FlatList
        data={sentEcgs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            onPress={() => handleNavigateToEcg(item.id)}
            className="bg-white/10 mx-4 mb-3 p-4 rounded-lg border border-white/20"
          >
            <View className="flex-row justify-between items-center">
              <View className="flex-1">
                <Text className="text-white font-pmedium text-lg">
                  {item.patientName || 'Paciente não identificado'}
                </Text>
                <Text className="text-white/70 font-pregular text-sm mt-1">
                  {item.patientAge ? `${item.patientAge} anos` : 'Idade não informada'}
                </Text>
                <Text className="text-white/60 font-pregular text-xs mt-1">
                  {item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleDateString('pt-BR') : 'Data não informada'}
                </Text>
              </View>
              <View className="items-end">
                <View className={`px-3 py-1 rounded-full ${
                  item.status === 'lauded' ? 'bg-green-500/20' : 'bg-yellow-500/20'
                }`}>
                  <Text className={`text-xs font-pmedium ${
                    item.status === 'lauded' ? 'text-green-400' : 'text-yellow-400'
                  }`}>
                    {item.status === 'lauded' ? 'Laudado' : 'Pendente'}
                  </Text>
                </View>
                <Text className="text-white/50 text-xs mt-2">
                  {item.notes ? `${item.notes.substring(0, 30)}...` : 'Sem observações'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListHeaderComponent={() => (
          <View className="w-full justify-center items-center mt-6 mb-8 px-4">
            <Text className="text-2xl text-white font-pbold text-center mt-8">
              ECGs Enviados
            </Text>
            
            <Text className="text-white/80 text-base text-center mt-2">
              Total: {sentEcgs.length} ECG{sentEcgs.length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
        ListEmptyComponent={() => (
          <EmptyState
            title="Nenhum ECG Enviado"
            subtitle="Você ainda não enviou nenhum eletrocardiograma."
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
      />
    </SafeAreaView>
  );
};

export default EcgSentList;
