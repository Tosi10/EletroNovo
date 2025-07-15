import React, { useEffect, useState } from 'react';
import { FlatList, Image, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EmptyState from '../../components/EmptyState';
import SearchInput from '../../components/SearchInput';


import { useLocalSearchParams, useRouter } from 'expo-router';
import EcgCard from '../../components/EcgCard';
import { searchEcgsByPatientName } from '../../lib/firebase';

const Search = () => {
  const { query } = useLocalSearchParams();
  const router = useRouter();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const ecgs = await searchEcgsByPatientName(query);
      setResults(ecgs);
    } catch (e) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [query]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchResults();
    setRefreshing(false);
  };
 
  return (
    <SafeAreaView className="bg-primary border-2 h-full">
      {/* Botão de voltar igual ao Create/Laudo */}
      <TouchableOpacity
        onPress={() => router.replace('/profile')}
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
        <Image source={require('../../assets/icons/left-arrow.png')} style={{ width: 30, height: 23, tintColor: 'white' }} />
      </TouchableOpacity>
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EcgCard ecg={item} />
        )}
        ListHeaderComponent={() => (
          <View className="my-6 px-4">
            
              
                <Text className="font-pmedium text-sm text-gray-100 mt-16">
                 Resultados da Busca
                </Text>
                <Text className="text-2xl font-psemibold text-white">
                  {query}
                </Text>

                <View className="mt-6 mb-8">
                  <SearchInput initialQuery={query}/>
                </View>  
             

          </View>
        )}
        ListEmptyComponent={() => (
          <EmptyState
            title="Nenhum ECG encontrado"
            subtitle="Nenhum ECG encontrado para este nome."
          />
        )}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />
    </SafeAreaView>
  );
};

export default Search