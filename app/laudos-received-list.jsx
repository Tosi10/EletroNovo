import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EmptyState from '../components/EmptyState';
import { icons } from '../constants';
import { useGlobalContext } from '../context/GlobalProvider';
import { getUserPosts } from '../lib/firebase';
import useFirebaseData from '../lib/useFirebaseData';

const LaudosReceivedList = () => {
  const { user } = useGlobalContext();
  const [refreshing, setRefreshing] = useState(false);

  const fetchReceivedLaudos = useCallback(() => {
    if (!user?.uid || user?.role !== 'enfermeiro') return Promise.resolve([]);
    return getUserPosts(user.uid);
  }, [user?.uid, user?.role]);

  const { data: allEcgs, isLoading, refetch } = useFirebaseData(
    fetchReceivedLaudos,
    [user?.uid, user?.role]
  );

  // Filtrar apenas ECGs que já foram laudados
  const receivedLaudos = allEcgs.filter(ecg => ecg.status === 'lauded');

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
        <Text className="text-white text-lg mt-4">Carregando laudos recebidos...</Text>
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
        data={receivedLaudos}
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
                {item.laudoDate && (
                  <Text className="text-green-400 font-pregular text-xs mt-1">
                    Laudo: {new Date(item.laudoDate.seconds * 1000).toLocaleDateString('pt-BR')}
                  </Text>
                )}
              </View>
              <View className="items-end">
                <View className="bg-green-500/20 px-3 py-1 rounded-full">
                  <Text className="text-green-400 text-xs font-pmedium">
                    Laudado
                  </Text>
                </View>
                {item.doctorName && (
                  <Text className="text-white/50 text-xs mt-2 text-right">
                    Dr. {item.doctorName}
                  </Text>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListHeaderComponent={() => (
          <View className="w-full justify-center items-center mt-6 mb-8 px-4">
            <Text className="text-2xl text-white font-pbold text-center mt-8">
              Laudos Recebidos
            </Text>
            
            <Text className="text-white/80 text-base text-center mt-2">
              Total: {receivedLaudos.length} laudo{receivedLaudos.length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
        ListEmptyComponent={() => (
          <EmptyState
            title="Nenhum Laudo Recebido"
            subtitle="Você ainda não recebeu nenhum laudo de eletrocardiograma."
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
      />
    </SafeAreaView>
  );
};

export default LaudosReceivedList;
