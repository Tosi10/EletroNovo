import { Text, View, FlatList, Image, RefreshControl, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { icons, images } from '../../constants';
import EmptyState from '../../components/EmptyState';
import { getUserPosts, signOut, getPendingEcgs, getLaudedEcgsByDoctorId } from '../../lib/firebase';
import useFirebaseData from '../../lib/useFirebaseData';
import { useGlobalContext } from '../../context/GlobalProvider';
import InfoBox from '../../components/InfoBox';
import { router } from 'expo-router';
import EcgCard from '../../components/EcgCard';
import WeeklyCalendarPicker from '../../components/WeeklyCalendarPicker';

const Profile = () => {
  const { user, setUser, setIsLogged, isLoading: isGlobalLoading } = useGlobalContext();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  const fetchEcgsFunction = useCallback(() => {
    if (!user?.uid) return Promise.resolve([]);
    if (user?.role === 'enfermeiro') {
      
      return getUserPosts(user.uid);
    } else if (user?.role === 'medico') {
      return getLaudedEcgsByDoctorId(user.uid);
    }
    return Promise.resolve([]);
  }, [user?.uid, user?.role]);

  const { data: ecgs, isLoading: areEcgsLoading, refetch } = useFirebaseData(
    fetchEcgsFunction,
    [user?.uid, user?.role]
  );

  const [pendingEcgsCount, setPendingEcgsCount] = useState(0);
  const [fetchingPending, setFetchingPending] = useState(false);

  const fetchPendingForDoctor = useCallback(async () => {
    if (user?.role === 'medico' && user?.uid) {
      setFetchingPending(true);
      try {
        const allPendingEcgs = await getPendingEcgs();
        setPendingEcgsCount(allPendingEcgs.length);
      } catch (error) {
        console.error("Erro ao buscar ECGs pendentes para o médico:", error);
        setPendingEcgsCount(0);
      } finally {
        setFetchingPending(false);
      }
    } else {
      setPendingEcgsCount(0);
    }
  }, [user?.role, user?.uid]);

  useEffect(() => {
    fetchPendingForDoctor();
  }, [user, fetchPendingForDoctor]);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    await fetchPendingForDoctor();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      setUser(null);
      setIsLogged(false);
      router.replace('/sign-in');
    } catch (error) {
      Alert.alert('Erro ao Sair', error.message);
    }
  };

  const filteredEcgs = useMemo(() => {
    if (!selectedDate) return ecgs;
    return ecgs.filter(ecg => {
      const ecgDate = new Date(ecg.createdAt?.seconds * 1000).toISOString().slice(0, 10);
      return ecgDate === selectedDate;
    });
  }, [ecgs, selectedDate]);

  const laudedsOrSentEcgsCount = ecgs.length || 0;

  if (isGlobalLoading || !user || areEcgsLoading || (user?.role === 'medico' && fetchingPending)) {
    return (
      <SafeAreaView className="bg-primary h-full justify-center items-center">
        <ActivityIndicator size="large" color="#FFA001" />
        <Text className="text-white text-lg mt-4">Carregando perfil e histórico de ECGs...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="bg-primary h-full">
      <FlatList
        data={filteredEcgs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EcgCard ecg={item} currentUserId={user?.uid} />
        )}
        ListHeaderComponent={() => (
          <View className="w-full justify-center items-center mt-6 mb-12 px-4">
            <TouchableOpacity
              className="w-full items-end mb-10"
              onPress={handleLogout}
            >
              <Image source={icons.logout}
                resizeMode='contain' className="w-6 h-6" />
            </TouchableOpacity>

            <View className="w-24 h-24 border border-secondary rounded-full justify-center items-center p-1">
              <Image
                source={images.profile}
                className="w-full h-full rounded-full"
                resizeMode='cover'
              />
            </View>

            <InfoBox
              title={user.username}
              containerStyles="mt-5"
              titleStyles="text-lg"
            />

            <View className="mt-5 flex-row">
              {user?.role === 'enfermeiro' ? (
                <>
                  <InfoBox
                    title={laudedsOrSentEcgsCount}
                    subtitle="ECGs Enviados"
                    containerStyles="mr-10"
                    titleStyles="text-xl"
                  />
                  <InfoBox
                    title={ecgs.filter(ecg => ecg.status === 'lauded').length}
                    subtitle="Laudos Recebidos"
                    titleStyles="text-xl"
                  />
                </>
              ) : (
                <>
                  <InfoBox
                    title={laudedsOrSentEcgsCount}
                    subtitle="ECGs Laudados"
                    containerStyles="mr-10"
                    titleStyles="text-xl"
                  />
                  <InfoBox
                    title={pendingEcgsCount}
                    subtitle="ECGs Pendentes"
                    titleStyles="text-xl"
                  />
                </>
              )}
            </View>
            <WeeklyCalendarPicker
              onSelectDate={setSelectedDate}
              selectedDate={selectedDate}
            />
          </View>
        )}
        ListEmptyComponent={() => (
          <EmptyState
            title={`Nenhum ECG ${user?.role === 'medico' ? 'Laudado' : 'Enviado'} para esta data`}
            subtitle={user?.role === 'medico' ?
                      "Você não laudou nenhum eletrocardiograma neste dia." :
                      "Você não enviou nenhum eletrocardiograma neste dia."}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
      />
    </SafeAreaView>
  );
};

export default Profile;

