import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Image, SafeAreaView, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useGlobalContext } from '../../context/GlobalProvider';
import { getEcgById, sendEcgMessage, subscribeToEcgMessages, markEcgMessagesAsRead } from '../../lib/firebase';
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
        <Text className="text-white font-pregular text-base">{message.message}</Text>
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
      setMessages(newMessages);
      if (flatListRef.current) {
        setTimeout(() => flatListRef.current.scrollToEnd({ animated: true }), 100);
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
      setNewMessage(''); 
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      Alert.alert("Erro", "Não foi possível enviar a mensagem.");
    } finally {
      setSendingMessage(false);
    }
  };

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
            <TouchableOpacity onPress={() => router.back()} className="p-2">
              <Image source={icons.leftArrow} className="w-6 h-6" tintColor="#FFA001" />
            </TouchableOpacity>
          ),
          headerTitle: ecgDetails.patientName ? `Chat com ${ecgDetails.patientName}` : 'Chat do ECG',
          headerTitleStyle: { color: '#FFFFFF', fontFamily: 'Poppins-SemiBold' },
          headerStyle: { backgroundColor: '#161622' },
        }}
      />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0} 
      >
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
        <View className="flex-row items-center px-4 py-3 border-t border-gray-700 bg-black-100">
          <TextInput
            className="flex-1 h-12 bg-gray-800 rounded-lg px-4 text-white font-pregular text-base mr-3"
            placeholder="Digite sua mensagem..."
            placeholderTextColor="#9CA3AF"
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={500}
            editable={!sendingMessage}
          />
          <TouchableOpacity
            onPress={handleSendMessage}
            className={`p-3 rounded-lg ${sendingMessage ? 'bg-gray-600' : 'bg-secondary-100'}`}
            disabled={sendingMessage || !newMessage.trim()}
          >
            {sendingMessage ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Image source={icons.send} className="w-6 h-6" tintColor="#FFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatScreen;
