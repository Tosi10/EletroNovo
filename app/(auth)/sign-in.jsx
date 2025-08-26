import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Alert, ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import CustomButton from '../../components/CustomButton';
import FormField from '../../components/FormField';
import { images } from '../../constants';
import { useGlobalContext } from '../../context/GlobalProvider';
import { signIn } from '../../lib/firebase';

const SignIn = () => {
  const { refetchUser, testRole, setTestRole } = useGlobalContext();

  const [form, setForm] = useState({
    email: '',
    password: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    if (!form.email || !form.password) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }

    setIsSubmitting(true);

    try {
      await signIn(form.email, form.password);
      await refetchUser();
      router.replace('/home');
    } catch (error) {
      let errorMessage = 'Ocorreu um erro ao fazer login.';
      if (error.code === 'auth/invalid-email') {
        errorMessage = 'Endereço de e-mail inválido.';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'Sua conta foi desativada.';
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Credenciais inválidas. Verifique seu e-mail e senha.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Muitas tentativas de login. Tente novamente mais tarde.';
      } else {
        errorMessage = error.message;
      }
      Alert.alert('Erro no Login', errorMessage);
      console.error("Erro detalhado durante o login (Firebase):", error);
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
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View className="w-full justify-center min-h-[100vh] px-8 my-3">
            <Text className="text-3xl text-black font-psemibold mt-10">Entrar</Text>

            <FormField
              title="Email"
              value={form.email}
              placeholder="Email"
              handleChangeText={(e) => setForm({ ...form, email: e })}
              otherStyles="mt-7"
              keyboardType="email-address"
            />

            <FormField
              title="Senha"
              value={form.password}
              placeholder="Senha"
              handleChangeText={(e) => setForm({ ...form, password: e })}
              otherStyles="mt-7"
              secureTextEntry
            />

            {/* Botão Esqueci minha senha */}
            <View className="mt-4 items-center">
              <Text 
                onPress={() => router.push('/forgot-password')}
                className="text-secondary text-base font-pmedium underline ml-12"
              >
                Esqueci minha senha
              </Text>
            </View>

            <CustomButton
              title="Entrar"
              handlePress={submit}
              containerStyles="mt-7"
              isLoading={isSubmitting}
            />

            {/* Seletor de tipo de usuário para teste */}
            <View className="mt-6 px-4">
                <Text className="text-white text-center text-sm font-pmedium mb-3">
                  Tipo de Usuário (Teste)
                </Text>
                <View className="flex-row gap-3 justify-center">
                  <TouchableOpacity
                    onPress={() => setTestRole('medico')}
                    className={`px-6 py-3 rounded-lg flex-1 ${
                      testRole === 'medico' ? 'bg-blue-600' : 'bg-gray-700'
                    }`}
                  >
                    <Text className="text-white text-center font-pmedium">
                      Laudar
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setTestRole('enfermeiro')}
                    className={`px-6 py-3 rounded-lg flex-1 ${
                      testRole === 'enfermeiro' ? 'bg-green-600' : 'bg-gray-700'
                    }`}
                  >
                    <Text className="text-white text-center font-pmedium">
                      Enviar ECG
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text className="text-gray-300 text-center text-xs mt-2">
                  {testRole === 'medico' 
                    ? 'Após o login, você será tratado como V6Core' 
                    : 'Após o login, você poderá enviar ECGs para laudo'
                  }
                </Text>
            </View>

            <View className="justify-center pt-5 flex-row gap-2">
              <Text className="text-white text-sm font-pmedium">Não tem uma conta?</Text>
              <Link href="/sign-up" asChild>
                <Text className="text-lg font-psemibold text-secondary">Cadastre-se</Text>
              </Link>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
};

export default SignIn;