import { Stack, router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Platform, SafeAreaView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useGlobalContext } from '../../context/GlobalProvider';
import { getEcgById, getUserPushToken, markEcgMessagesAsRead, sendEcgMessage, sendPushNotification, subscribeToEcgMessages } from '../../lib/firebase';
// >>> CORRIGIDO AQUI: Caminho da importação para 'constants' <<<
import { icons } from '../../constants';

// Componente para renderizar cada mensagem individualmente
const MessageItem = ({ message, currentUserId }) => {
  const isMyMessage = message.senderId === currentUserId;
  // Formata o timestamp do servidor ou um novo Date para mensagens ainda não sincronizadas
  const timestamp = message.createdAt?.toDate ? message.createdAt.toDate() : new Date();
  const timeString = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <View className={`flex-row items-end mb-2 ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
      {!isMyMessage && (
        <Image
          source={message.sender?.avatar ? { uri: message.sender.avatar } : icons.profile}
          className="w-8 h-8 rounded-full mr-2"
          resizeMode="cover"
        />
      )}
      <View className={`p-3 rounded-lg max-w-[75%] ${isMyMessage ? 'bg-secondary-100' : 'bg-gray-700'}`}>
        {!isMyMessage && (
          <Text className="text-white text-xs font-psemibold mb-1">
            {message.sender?.username || 'Usuário Desconhecido'}
          </Text>
        )}
        {/* Remover exibição de imagem */}
        {message.message ? (
          <Text className="text-white font-pregular text-base">{message.message}</Text>
        ) : null}
        <Text className={`text-xs mt-1 ${isMyMessage ? 'text-gray-300 self-end' : 'text-gray-400 self-start'}`}>
          {timeString} {isMyMessage && message.isRead && '✓'} {/* Adiciona o check de lido para suas mensagens */}
        </Text>
      </View>
      {isMyMessage && (
        <Image
          source={message.sender?.avatar ? { uri: message.sender.avatar } : icons.profile}
          className="w-8 h-8 rounded-full ml-2"
          resizeMode="cover"
        />
      )}
    </View>
  );
};

const ChatScreen = () => {
  const { ecgId } = useLocalSearchParams();
  const { user, isLoading: isGlobalLoading } = useGlobalContext();
  const [ecgDetails, setEcgDetails] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingEcg, setLoadingEcg] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const flatListRef = useRef(null);
  const isMounted = useRef(true);
  // Remover estados relacionados a imagem
  // const [imageModalVisible, setImageModalVisible] = useState(false);
  // const [modalImageUrl, setModalImageUrl] = useState(null);
  // const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // 1. Efeito para carregar os detalhes do ECG
  useEffect(() => {
    const fetchEcgDetails = async () => {
      if (!ecgId) return;
      setLoadingEcg(true);
      try {
        const data = await getEcgById(ecgId);
        setEcgDetails(data);
      } catch (error) {
        console.error("Erro ao carregar detalhes do ECG:", error);
        Alert.alert("Erro", "Não foi possível carregar os detalhes do ECG.");
        router.back(); 
      } finally {
        setLoadingEcg(false);
      }
    };
    fetchEcgDetails();
  }, [ecgId]);

  // 2. Efeito para subscrever a mensagens em tempo real
  useEffect(() => {
    if (!ecgId || !user?.uid) {
      console.log("ChatScreen: ecgId ou user.uid não disponíveis para subscrição.");
      return;
    }

    console.log(`ChatScreen: Subscribing to messages for ECG ${ecgId} by user ${user.uid}`);

    const unsubscribe = subscribeToEcgMessages(ecgId, user.uid, (newMessages) => {
      if (isMounted.current) {
        setMessages(newMessages);
        if (flatListRef.current) {
          setTimeout(() => {
            if (flatListRef.current) {
              flatListRef.current.scrollToEnd({ animated: true });
            }
          }, 100);
        }
      }
    });

    return () => {
      console.log(`ChatScreen: Unsubscribing from messages for ECG ${ecgId}`);
      unsubscribe();
    };
  }, [ecgId, user?.uid]); 

  // 3. Efeito para marcar mensagens como lidas ao entrar no chat
  useEffect(() => {
    if (ecgId && user?.uid && messages.length > 0) {
      const timer = setTimeout(() => {
        markEcgMessagesAsRead(ecgId, user.uid)
          .catch(error => console.error("Erro ao marcar mensagens como lidas na entrada:", error));
      }, 1000); 
      return () => clearTimeout(timer); 
    }
  }, [ecgId, user?.uid, messages.length]); 

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sendingMessage || !user?.uid || !ecgId) {
      return;
    }
    setSendingMessage(true);
    try {
      await sendEcgMessage(ecgId, user.uid, newMessage);
      // Envio de push notification para o outro participante do chat
      // Busca detalhes do ECG para saber quem é o outro participante
      const ecg = ecgDetails || await getEcgById(ecgId);
      let recipientId = null;
      if (user.uid === ecg.uploaderId && ecg.laudationDoctorId) {
        recipientId = ecg.laudationDoctorId;
      } else if (user.uid === ecg.laudationDoctorId && ecg.uploaderId) {
        recipientId = ecg.uploaderId;
      }
      if (recipientId) {
        try {
          const token = await getUserPushToken(recipientId);
          if (token) {
            await sendPushNotification(
              token,
              'Nova mensagem no chat do ECG',
              `Você recebeu uma nova mensagem sobre o exame de ${ecg.patientName}`
            );
          }
        } catch (e) {
          console.error('Erro ao enviar push notification:', e);
        }
      }
      setNewMessage(''); 
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      Alert.alert("Erro", "Não foi possível enviar a mensagem.");
    } finally {
      setSendingMessage(false);
    }
  };

  // Remover função handlePickImage
  // Função para selecionar e enviar imagem
  // const handlePickImage = async () => {
  //   if (uploadingImage) return;
  //   try {
  //     const result = await ImagePicker.launchImageLibraryAsync({
  //       mediaTypes: ImagePicker.MediaTypeOptions.Images,
  //       allowsEditing: false,
  //       quality: 0.7,
  //     });
  //     if (!result.canceled && result.assets && result.assets.length > 0) {
  //       setUploadingImage(true);
  //       const file = {
  //         uri: result.assets[0].uri,
  //         fileName: result.assets[0].fileName || `chatimg_${Date.now()}.jpg`,
  //       };
  //       const imageUrl = await uploadFile(file, 'image');
  //       await sendEcgMessage(ecgId, user.uid, '', imageUrl); // mensagem vazia, só imagem
  //       setUploadingImage(false);
  //     }
  //   } catch (e) {
  //     setUploadingImage(false);
  //     Alert.alert('Erro', 'Não foi possível enviar a imagem.');
  //   }
  // };

  const MemoizedMessageItem = useCallback(({ item }) => (
    <MessageItem message={item} currentUserId={user?.uid} />
  ), [user?.uid]);

  if (isGlobalLoading || loadingEcg || !user || !ecgDetails) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-primary">
        <ActivityIndicator size="large" color="#FFA001" />
        <Text className="text-white text-lg mt-4">Carregando chat...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-primary">
      <Stack.Screen
        options={{
          headerShown: true,
          headerBackVisible: false,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="ml-2 tp-7">
              <Image source={icons.leftArrow} className="w- h-6" tintColor="#FFA001" />
            </TouchableOpacity>
          ),
          headerTitle: () => (
            <Text className="text-white font-psemibold text-lg ml-6">
              {ecgDetails.patientName ? `Chat com ${ecgDetails.patientName}` : 'Chat do ECG'}
            </Text>
          ),
          headerTitleStyle: { color: '#FFFFFF', fontFamily: 'Poppins-SemiBold', paddingLeft: 24 },
          headerStyle: { backgroundColor: '#161622' },
        }}
      />
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={MemoizedMessageItem}
        className="px-4 py-2 flex-1"
        onContentSizeChange={() => {
          if (flatListRef.current) {
            flatListRef.current.scrollToEnd({ animated: true });
          }
        }}
        ListEmptyComponent={() => (
          <View className="flex-1 justify-center items-center">
            <Text className="text-gray-400 text-lg">Nenhuma mensagem ainda.</Text>
            <Text className="text-gray-400 text-sm">Seja o primeiro a enviar uma mensagem!</Text>
          </View>
        )}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View className="flex-row items-center px-4 py-3 border-t border-gray-700 bg-black-100">
          {/* Remover botão de upload de imagem */}
          <TextInput
            className="flex-1 h-12 bg-gray-800 rounded-lg px-4 text-white font-pregular text-base mr-3"
            placeholder="Digite sua mensagem..."
            placeholderTextColor="#9CA3AF"
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={500}
            style={{ opacity: 1 }}
            editable={true}
          />
          <TouchableOpacity
            onPress={handleSendMessage}
            className={`p-3 rounded-lg ${sendingMessage || !newMessage.trim() ? 'bg-gray-600' : 'bg-secondary-100'}`}
            disabled={sendingMessage || !newMessage.trim()}
          >
            {sendingMessage ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Image source={icons.send1} className="w-6 h-6" tintColor="#FFF" />
            )}
          </TouchableOpacity>
        </View>
        {/* Remover Modal de visualização de imagem */}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatScreen;

