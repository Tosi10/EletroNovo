import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { icons } from '../constants';
import { useGlobalContext } from '../context/GlobalProvider';
import { getLaudedEcgsByDoctorId } from '../lib/firebase';

const EcgLaudedList = () => {
  const { user } = useGlobalContext();
  const router = useRouter();
  const [ecgs, setEcgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLaudedEcgs = async () => {
    if (!user?.uid || user?.role !== 'medico') return;
    
    setLoading(true);
    try {
      const data = await getLaudedEcgsByDoctorId(user.uid);
      setEcgs(data);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar os ECGs laudados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLaudedEcgs();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLaudedEcgs();
    setRefreshing(false);
  };

  const handleEcgPress = (ecg) => {
    router.push(`/ecg/${ecg.id}`);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-primary">
        <ActivityIndicator size="large" color="#FFA001" />
        <Text className="text-white text-lg mt-4">Carregando ECGs laudados...</Text>
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
      
      <View className="pt-20 pb-4 px-4">
        <Text className="text-2xl text-white font-psemibold text-center mb-6">
          ECGs Laudados
        </Text>
      </View>

      <FlatList
        data={ecgs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handleEcgPress(item)}
            className="mx-4 mb-3 bg-black-100 rounded-lg border border-black-200 p-4"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-white font-pmedium text-lg mb-1">
                  {item.patientName}
                </Text>
                <Text className="text-gray-300 text-sm">
                  {item.age} anos | {item.sex} | {item.priority}
                </Text>
                {item.createdAt?.seconds && (
                  <Text className="text-gray-400 text-xs mt-1">
                    {new Date(item.createdAt.seconds * 1000).toLocaleDateString()}
                  </Text>
                )}
              </View>
              <Image 
                source={icons.rightArrow} 
                style={{ width: 20, height: 20, tintColor: 'white' }} 
              />
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <View className="flex-1 justify-center items-center px-4">
            <Text className="text-white text-lg text-center mb-2">
              Nenhum ECG laudado encontrado
            </Text>
            <Text className="text-gray-300 text-center">
              Você ainda não laudou nenhum eletrocardiograma.
            </Text>
          </View>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
        }
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
      />
    </SafeAreaView>
  );
};

export default EcgLaudedList;
