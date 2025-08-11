import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import CustomButton from '../../components/CustomButton';
import FormField from '../../components/FormField';
import { icons, images } from '../../constants';
import { sendPasswordReset } from '../../lib/firebase';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert('Erro', 'Por favor, digite seu email');
      return;
    }

    setIsSubmitting(true);

    try {
      await sendPasswordReset(email);
      Alert.alert(
        'Email Enviado!', 
        'Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/sign-in')
          }
        ]
      );
    } catch (error) {
      Alert.alert('Erro', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ImageBackground
      source={images.cardio2}
      resizeMode="cover"
      style={StyleSheet.absoluteFillObject}
    >
      <View pointerEvents="none" className="absolute inset-0 bg-black/20 z-10" />

      <SafeAreaView className="h-full flex-1" style={{ zIndex: 2, backgroundColor: 'transparent' }}>
        {/* Botão de voltar */}
        <TouchableOpacity
          onPress={() => router.back()}
          className="absolute top-20 left-10 z-20 p-3 rounded-full"
        >
          <Image source={icons.leftArrow} style={{ width: 28, height: 28, tintColor: 'white' }} />
        </TouchableOpacity>

        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View className="w-full justify-center min-h-[100vh] px-8 my-3">
            <Text className="text-4xl text-black font-pbold mt-20 text-center">
              Recuperar Senha
            </Text>
            
            <Text className="text-lg text-black/80 font-pmedium mt-6 text-center leading-7 px-4">
              Digite seu email cadastrado e enviaremos um link para você redefinir sua senha de forma segura.
            </Text>

            <FormField
              title="Email"
              value={email}
              placeholder="Digite seu email"
              handleChangeText={setEmail}
              otherStyles="mt-12"
              keyboardType="email-address"
            />

            <CustomButton
              title="Enviar Email de Recuperação"
              handlePress={handleResetPassword}
              containerStyles="mt-12"
              isLoading={isSubmitting}
            />

            <View className="justify-center pt-10 flex-row gap-2">
              <Text className="text-black text-base font-pmedium">Lembrou sua senha?</Text>
              <TouchableOpacity onPress={() => router.replace('/sign-in')}>
                <Text className="text-lg font-psemibold text-secondary">Voltar ao Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
};

export default ForgotPassword;
