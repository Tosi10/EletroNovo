import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { icons } from '../constants'; 
import { useGlobalContext } from '../context/GlobalProvider'; 
import { router } from 'expo-router';
import { db, markEcgMessagesAsRead } from '../lib/firebase'; 
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore'; 

// Adicionado 'currentUserId' como prop
const EcgCard = ({ ecg, currentUserId }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingUnread, setLoadingUnread] = useState(true);

  // LOGS DE DEPURACAO (mantidos se você quiser continuar depurando o conteúdo do laudo)
  useEffect(() => {
    console.log(`EcgCard for Patient ${ecg.patientName}:`);
    console.log(`  Status: ${ecg.status}`);
    console.log(`  Laudation Content Exists: ${!!ecg.laudationContent}`);
    if (ecg.laudationContent) {
      console.log(`  Laudation Content (first 50 chars): ${ecg.laudationContent.substring(0, Math.min(ecg.laudationContent.length, 50))}...`);
    } else {
      console.log(`  Laudation Content: NULL/UNDEFINED`);
    }
  }, [ecg.id, ecg.status, ecg.laudationContent, ecg.patientName]); 

  // Efeito para escutar mensagens não lidas para este ECG
  useEffect(() => {
    if (!ecg.id || !currentUserId) {
      setLoadingUnread(false);
      return;
    }

    setLoadingUnread(true);

    const messagesCollectionRef = collection(db, `ecgs/${ecg.id}/messages`);
    const q = query(
      messagesCollectionRef,
      where('senderId', '!=', currentUserId), 
      orderBy('createdAt', 'desc') 
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let currentUnread = 0;
      snapshot.forEach(docSnap => {
        const message = docSnap.data();
        if (!message.readBy || !message.readBy.includes(currentUserId)) {
          currentUnread++;
        }
      });
      setUnreadCount(currentUnread);
      setLoadingUnread(false);
    }, (error) => {
      console.error(`Erro ao escutar mensagens não lidas para ECG ${ecg.id}:`, error);
      setUnreadCount(0);
      setLoadingUnread(false);
    });

    return () => unsubscribe();
  }, [ecg.id, currentUserId]); 

  const handleChatPress = async () => {
    if (!ecg.id || !currentUserId) {
      Alert.alert('Erro', 'Dados do ECG ou do usuário não disponíveis para abrir o chat.');
      return;
    }
    
    try {
      await markEcgMessagesAsRead(ecg.id, currentUserId);
      console.log(`Mensagens para ECG ${ecg.id} marcadas como lidas.`);
    } catch (error) {
      console.error("Erro ao marcar mensagens como lidas:", error);
    }

    router.push(`/chat/${ecg.id}`);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'text-orange-500';
      case 'lauded':
        return 'text-green-500';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <View className="flex-col items-center px-4 mb-14">
      <View className="flex-row gap-3 items-start">
        <View className="justify-center items-center flex-row flex-1">
          <View className="w-[46px] h-[46px] rounded-lg border border-secondary justify-center items-center p-0.5">
            <Image
              source={ecg.creator?.avatar ? { uri: ecg.creator.avatar } : icons.profile}
              className="w-full h-full rounded-lg"
              resizeMode="cover"
            />
          </View>

          <View className="flex-1 justify-center ml-3 gap-y-1">
            <Text className="text-sm text-gray-100 font-pmedium" numberOfLines={1}>
              Paciente: {ecg.patientName}
            </Text>
            <Text className="text-xs text-gray-100 font-pregular">
              Prioridade: {ecg.priority} - Status: <Text className={`${getStatusColor(ecg.status)} font-psemibold`}>
                {ecg.status === 'pending' ? 'Pendente' : 'Laudado'}
              </Text>
            </Text>
          </View>

          <View className="pt-2">
            <Image source={icons.bookmark} className="w-5 h-5" resizeMode="contain" />
          </View>
        </View>
      </View>

      <Image
        source={{ uri: ecg.imageUrl }}
        className="w-full h-64 rounded-xl mt-3"
        resizeMode="cover"
      />

      <View className="w-full mt-3 flex-col justify-between items-start px-2"> 
        {ecg.status === 'lauded' && ecg.laudationContent ? (
          <View className="mb-2"> 
            <Text className="text-sm text-white font-psemibold mb-1">Laudo:</Text>
            <Text className="text-sm text-gray-100 font-pregular">
              {ecg.laudationContent}
            </Text>
          </View>
        ) : (
          // >>> RE-CONFIRMAÇÃO DO WRAP DE TEXTO AQUI <<<
          // Mesmo que pareça já estar dentro, a explicitamos para evitar avisos.
          <Text className="text-sm text-gray-100 font-pregular mb-2" numberOfLines={1}>
            {ecg.notes || 'Sem notas adicionais'}
          </Text>
        )}

        <TouchableOpacity 
          onPress={handleChatPress} 
          className="flex-row items-center bg-secondary-100 p-2 rounded-lg mt-2 self-start" 
        >
          <Image source={icons.chat} className="w-5 h-5 mr-1" tintColor="#FFF" />
          <Text className="text-white font-pmedium text-sm">Chat</Text>
          {loadingUnread ? (
            <ActivityIndicator size="small" color="#FFFFFF" className="ml-1" />
          ) : unreadCount > 0 ? (
            <View className="ml-1 bg-red-500 rounded-full w-5 h-5 flex items-center justify-center">
              <Text className="text-white text-xs font-pbold">{unreadCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default EcgCard;
