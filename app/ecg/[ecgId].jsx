import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { icons } from '../../constants';
import { getEcgById } from '../../lib/firebase';

const EcgDetail = () => {
  const { ecgId } = useLocalSearchParams();
  const router = useRouter();
  const [ecg, setEcg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEcg = async () => {
      setLoading(true);
      try {
        const data = await getEcgById(ecgId);
        setEcg(data);
      } catch (error) {
        Alert.alert('Erro', 'Não foi possível carregar o ECG.');
        router.back();
      } finally {
        setLoading(false);
      }
    };
    if (ecgId) fetchEcg();
  }, [ecgId]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-primary">
        <ActivityIndicator size="large" color="#FFA001" />
        <Text className="text-white text-lg mt-4">Carregando ECG...</Text>
      </SafeAreaView>
    );
  }

  if (!ecg) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-primary">
        <Text className="text-white text-lg">ECG não encontrado.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-primary">
      <TouchableOpacity
        onPress={() => router.back()}
        style={{
          position: 'absolute',
          top: 50,
          left: 36,
          zIndex: 20,
          backgroundColor: 'rgba(0,0,0,0.4)',
          padding: 8,
          borderRadius: 20
        }}
      >
        <Image source={icons.leftArrow} style={{ width: 30, height: 23, tintColor: 'white' }} />
      </TouchableOpacity>
      <ScrollView className="px-4 pt-20 pb-8">
        <Text className="text-2xl text-white font-psemibold mb-4 text-center">Detalhes do ECG</Text>
        <View className="mb-4 bg-black-100 rounded-lg p-4">
          <Text className="text-white text-base font-bold mb-1">Paciente: {ecg.patientName}</Text>
          <Text className="text-gray-300 text-sm mb-1">Idade: {ecg.age} | Sexo: {ecg.sex}</Text>
          <Text className="text-gray-300 text-sm mb-1">Prioridade: {ecg.priority}</Text>
          {ecg.createdAt?.seconds && (
            <Text className="text-gray-300 text-sm mb-1">Data: {new Date(ecg.createdAt.seconds * 1000).toLocaleDateString()}</Text>
          )}
        </View>
        {ecg.imageUrl && (
          <Image source={{ uri: ecg.imageUrl }} className="w-full h-64 rounded-xl mb-4" resizeMode="cover" />
        )}
        <View className="mb-4 bg-black-100 rounded-lg p-4">
          <Text className="text-white text-base font-bold mb-2">Laudo</Text>
          {ecg.laudationContent ? (
            <Text className="text-gray-100 text-base">{ecg.laudationContent}</Text>
          ) : (
            <Text className="text-gray-400 text-base">Nenhum laudo disponível.</Text>
          )}
        </View>
        {ecg.notes && (
          <View className="mb-4 bg-black-100 rounded-lg p-4">
            <Text className="text-white text-base font-bold mb-2">Observações</Text>
            <Text className="text-gray-100 text-base">{ecg.notes}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default EcgDetail; 