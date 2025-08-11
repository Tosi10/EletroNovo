import { router, useLocalSearchParams } from 'expo-router';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { Alert, Image, ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authInstance } from '../../lib/firebase';

import CustomButton from '../../components/CustomButton';
import FormField from '../../components/FormField';
import { icons, images } from '../../constants';

const ResetPassword = () => {
  const { oobCode } = useLocalSearchParams(); // Firebase envia o código via URL
  const [form, setForm] = useState({
    password: '',
    confirmPassword: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidCode, setIsValidCode] = useState(false);

  // Verificar se o código de reset é válido
  useEffect(() => {
    if (oobCode) {
      verifyPasswordResetCode(authInstance, oobCode)
        .then(() => {
          setIsValidCode(true);
        })
        .catch((error) => {
          console.error('Código de reset inválido:', error);
          setIsValidCode(false);
        });
    }
  }, [oobCode]);

  const handleResetPassword = async () => {
    if (!form.password || !form.confirmPassword) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }

    if (form.password !== form.confirmPassword) {
      Alert.alert('Erro', 'As senhas não coincidem');
      return;
    }

    if (form.password.length < 6) {
      Alert.alert('Erro', 'A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (!oobCode) {
      Alert.alert('Erro', 'Código de reset inválido');
      return;
    }

    setIsSubmitting(true);

    try {
      await confirmPasswordReset(authInstance, oobCode, form.password);
      Alert.alert(
        'Senha Alterada!', 
        'Sua senha foi redefinida com sucesso. Você pode fazer login com a nova senha.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/sign-in')
          }
        ]
      );
    } catch (error) {
      let errorMessage = 'Ocorreu um erro ao redefinir a senha.';
      if (error.code === 'auth/expired-action-code') {
        errorMessage = 'O link de recuperação expirou. Solicite um novo.';
      } else if (error.code === 'auth/invalid-action-code') {
        errorMessage = 'Link de recuperação inválido.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'A senha é muito fraca. Escolha uma senha mais forte.';
      }
      Alert.alert('Erro', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!oobCode) {
    return (
      <ImageBackground
        source={images.cardio2}
        resizeMode="cover"
        style={StyleSheet.absoluteFillObject}
      >
        <View pointerEvents="none" className="absolute inset-0 bg-black/20 z-10" />
        <SafeAreaView className="h-full flex-1" style={{ zIndex: 2, backgroundColor: 'transparent' }}>
          <View className="flex-1 justify-center items-center px-8">
            <Text className="text-2xl text-black font-psemibold text-center mb-4">
              Link Inválido
            </Text>
            <Text className="text-base text-black/80 font-pmedium text-center mb-8">
              Este link de recuperação de senha é inválido ou expirou.
            </Text>
            <CustomButton
              title="Voltar ao Login"
              handlePress={() => router.replace('/sign-in')}
              containerStyles="bg-secondary"
            />
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  if (!isValidCode) {
    return (
      <ImageBackground
        source={images.cardio2}
        resizeMode="cover"
        style={StyleSheet.absoluteFillObject}
      >
        <View pointerEvents="none" className="absolute inset-0 bg-black/20 z-10" />
        <SafeAreaView className="h-full flex-1" style={{ zIndex: 2, backgroundColor: 'transparent' }}>
          <View className="flex-1 justify-center items-center px-8">
            <Text className="text-2xl text-black font-psemibold text-center mb-4">
              Verificando...
            </Text>
            <Text className="text-base text-black/80 font-pmedium text-center">
              Aguarde enquanto verificamos o link de recuperação...
            </Text>
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

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
          onPress={() => router.replace('/sign-in')}
          className="absolute top-16 left-6 z-20 bg-black/40 p-3 rounded-full"
        >
          <Image source={icons.leftArrow} style={{ width: 24, height: 24, tintColor: 'white' }} />
        </TouchableOpacity>

        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View className="w-full justify-center min-h-[100vh] px-8 my-3">
            <Text className="text-3xl text-black font-psemibold mt-20 text-center">
              Nova Senha
            </Text>
            
            <Text className="text-base text-black/80 font-pmedium mt-4 text-center leading-6">
              Digite sua nova senha. Ela deve ter pelo menos 6 caracteres.
            </Text>

            <FormField
              title="Nova Senha"
              value={form.password}
              placeholder="Digite sua nova senha"
              handleChangeText={(e) => setForm({ ...form, password: e })}
              otherStyles="mt-10"
              secureTextEntry
            />

            <FormField
              title="Confirmar Senha"
              value={form.confirmPassword}
              placeholder="Confirme sua nova senha"
              handleChangeText={(e) => setForm({ ...form, confirmPassword: e })}
              otherStyles="mt-7"
              secureTextEntry
            />

            <CustomButton
              title="Redefinir Senha"
              handlePress={handleResetPassword}
              containerStyles="mt-10"
              isLoading={isSubmitting}
            />

            <View className="justify-center pt-8 flex-row gap-2">
              <Text className="text-black text-sm font-pmedium">Lembrou sua senha?</Text>
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

export default ResetPassword;
