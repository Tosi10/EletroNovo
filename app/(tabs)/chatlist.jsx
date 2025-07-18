import { useRouter } from 'expo-router';
import { collection, getDocs, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SearchInput from '../../components/SearchInput';
import { icons } from '../../constants';
import { useGlobalContext } from '../../context/GlobalProvider';
import { db, getLaudedEcgsByDoctorId, getUserPosts } from '../../lib/firebase';

const ChatList = () => {
  const { user } = useGlobalContext();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [ecgs, setEcgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [filter, setFilter] = useState('all'); // 'all' ou 'unread'

  useEffect(() => {
    const fetchEcgsWithMessages = async () => {
      setLoading(true);
      try {
        let data = [];
        if (user?.role === 'enfermeiro') {
          data = await getUserPosts(user.uid);
        } else if (user?.role === 'medico') {
          data = await getLaudedEcgsByDoctorId(user.uid);
        }
        // Filtrar apenas ECGs que têm pelo menos uma mensagem
        const ecgsWithMessages = [];
        await Promise.all(data.map(async (ecg) => {
          const messagesRef = collection(db, `ecgs/${ecg.id}/messages`);
          const q = query(messagesRef, limit(1));
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            ecgsWithMessages.push(ecg);
          }
        }));
        setEcgs(ecgsWithMessages);
      } catch (e) {
        setEcgs([]);
      } finally {
        setLoading(false);
      }
    };
    if (user?.uid) fetchEcgsWithMessages();
  }, [user]);

  useEffect(() => {
    if (!user?.uid) return;
    // Limpa listeners antigos
    let unsubscribes = [];
    const listenUnread = async () => {
      let data = [];
      if (user?.role === 'enfermeiro') {
        data = await getUserPosts(user.uid);
      } else if (user?.role === 'medico') {
        data = await getLaudedEcgsByDoctorId(user.uid);
      }
      data.forEach(ecg => {
        if (!ecg.id) return;
        const messagesCollectionRef = collection(db, `ecgs/${ecg.id}/messages`);
        const q = query(
          messagesCollectionRef,
          where('senderId', '!=', user.uid),
          orderBy('createdAt', 'desc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
          let currentUnread = 0;
          snapshot.forEach(docSnap => {
            const message = docSnap.data();
            if (!message.readBy || !message.readBy.includes(user.uid)) {
              currentUnread++;
            }
          });
          setUnreadCounts(prev => ({ ...prev, [ecg.id]: currentUnread }));
        });
        unsubscribes.push(unsubscribe);
      });
    };
    listenUnread();
    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [user]);

  const filteredEcgs = ecgs.filter(ecg => {
    const matchesSearch = ecg.patientName?.toLowerCase().includes(search.toLowerCase());
    if (filter === 'unread') {
      return matchesSearch && unreadCounts[ecg.id] > 0;
    }
    return matchesSearch;
  });

  return (
    <SafeAreaView className="bg-primary h-full flex-1">
      <View className="px-4 mt-8">
        <Text className="text-2xl text-white font-psemibold mb-4">Chats</Text>
        <View style={{ alignItems: 'center', width: '100%' }}>
          <View style={{ width: '85%', maxWidth: 400, marginBottom: 18 }}>
            <SearchInput initialQuery={search} onChangeText={setSearch} placeholder="Buscar por paciente..." showButton={false} />
          </View>
          {/* Filtros de chat */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 18, gap: 12 }}>
            <TouchableOpacity
              onPress={() => setFilter('all')}
              style={{
                backgroundColor: filter === 'all' ? '#FFA001' : '#232533',
                paddingVertical: 8,
                paddingHorizontal: 24,
                borderRadius: 20,
                marginRight: 8,
              }}
            >
              <Text style={{ color: filter === 'all' ? '#fff' : '#FFA001', fontWeight: 'bold', fontSize: 16 }}>Todos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFilter('unread')}
              style={{
                backgroundColor: filter === 'unread' ? '#FFA001' : '#232533',
                paddingVertical: 8,
                paddingHorizontal: 24,
                borderRadius: 20,
              }}
            >
              <Text style={{ color: filter === 'unread' ? '#fff' : '#FFA001', fontWeight: 'bold', fontSize: 16 }}>Não lidos</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FFA001" />
        </View>
      ) : (
        <FlatList
          data={filteredEcgs}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View className="flex-row items-center justify-between bg-black-100 rounded-xl px-4 py-3 mb-3">
              <Text className="text-white text-base font-pmedium flex-1" numberOfLines={1}>{item.patientName}</Text>
              <View style={{ position: 'relative' }}>
                <TouchableOpacity
                  className="flex-row items-center bg-secondary-200 px-4 py-2 rounded-xl ml-2"
                  onPress={() => router.push(`/chat/${item.id}`)}
                >
                  <Image source={icons.chat} className="w-5 h-5 mr-2" tintColor="#FFF" />
                  <Text className="text-white font-pmedium text-md text-center">Chat</Text>
                </TouchableOpacity>
                {unreadCounts[item.id] > 0 && (
                  <View style={{ position: 'absolute', top: -8, right: -8, backgroundColor: '#EF4444', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' }}>
                    <Text className="text-white text-xs font-pbold">{unreadCounts[item.id]}</Text>
                  </View>
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={() => (
            <Text className="text-gray-400 text-center mt-10">Nenhum chat encontrado.</Text>
          )}
        />
      )}
    </SafeAreaView>
  );
};

export default ChatList; 