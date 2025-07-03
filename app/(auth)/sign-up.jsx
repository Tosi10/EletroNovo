import { ScrollView, Text, View, ImageBackground, Alert, StyleSheet } from 'react-native';
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';

import { images } from '../../constants';
import FormField from '../../components/FormField';
import CustomButton from '../../components/CustomButton';
import { createUser } from '../../lib/firebase';
import { useGlobalContext } from '../../context/GlobalProvider';

const SignUp = () => {
  const { refetchUser } = useGlobalContext();

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    if (!form.username || !form.email || !form.password) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }

    setIsSubmitting(true);

    try {
      await createUser(form.email, form.password, form.username);
      await refetchUser();
      Alert.alert('Sucesso', 'Conta criada com sucesso!');
      router.replace('/home');
    } catch (error) {
      let errorMessage = 'Ocorreu um erro ao criar a conta.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Este e-mail já está em uso. Tente outro ou faça login.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'A senha é muito fraca. Por favor, insira uma senha com pelo menos 6 caracteres.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Endereço de e-mail inválido.';
      } else {
        errorMessage = error.message;
      }
      Alert.alert('Erro no Registro', errorMessage);
      console.error("Erro detalhado durante o registro (Firebase):", error);
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
          <View className="w-full justify-center min-h-[100vh] px-8 my-2">

            <Text className="text-2xl text-white font-psemibold mt-10">Criar Conta</Text>

            <FormField 
              title="Nome de Usuário"
              value={form.username}
              placeholder="Digite seu nome de usuário"
              handleChangeText={(e) => setForm({ ...form, username: e })}
              otherStyles="mt-10"
            />

            <FormField 
              title="Email"
              value={form.email}
              placeholder="Digite seu e-mail"
              handleChangeText={(e) => setForm({ ...form, email: e })}
              otherStyles="mt-7"
              keyboardType="email-address" 
            />

            <FormField 
              title="Senha"
              value={form.password}
              placeholder="Digite sua senha"
              handleChangeText={(e) => setForm({ ...form, password: e })}
              otherStyles="mt-7"
              secureTextEntry
            />

            <CustomButton 
              title="Cadastrar"
              handlePress={submit}
              containerStyles="mt-7"
              isLoading={isSubmitting}
            />

            <View className="justify-center pt-5 flex-row gap-2">
              <Text className="text-white text-sm font-pmedium">Já tem uma conta?</Text>
              <Link href="/sign-in" asChild>
                <Text className="text-lg font-psemibold text-secondary">Entrar</Text>
              </Link>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
};

export default SignUp;
