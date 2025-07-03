import { Alert, Image, ScrollView, Text, TouchableOpacity, View, ImageBackground, StyleSheet, Platform, ActionSheetIOS } from 'react-native';
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import FormField from '../../components/FormField';
import CustomButton from '../../components/CustomButton';
import { icons, images } from '../../constants';
import { createEcg } from '../../lib/firebase';
import { useGlobalContext } from '../../context/GlobalProvider';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';

const Create = () => {
  const { user } = useGlobalContext();
  const router = useRouter();

  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    patientName: '',
    age: '',
    sex: '',
    hasPacemaker: '',
    priority: '',
    ecgFile: null,
    notes: '',
  });

  const openPicker = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Ative acesso à galeria nas configurações.', [
        { text: 'Cancelar' },
        { text: 'Abrir', onPress: () => Linking.openSettings() },
      ]);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets?.length > 0) {
      setForm((prev) => ({ ...prev, ecgFile: result.assets[0] }));
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Ative acesso à câmera nas configurações.', [
        { text: 'Cancelar' },
        { text: 'Abrir', onPress: () => Linking.openSettings() },
      ]);
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets?.length > 0) {
      setForm((prev) => ({ ...prev, ecgFile: result.assets[0] }));
    }
  };

  const showImageOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({
        options: ['Cancelar', 'Tirar Foto', 'Escolher da Galeria'],
        cancelButtonIndex: 0,
      }, (buttonIndex) => {
        if (buttonIndex === 1) takePhoto();
        if (buttonIndex === 2) openPicker();
      });
    } else {
      // Fallback para Android
      Alert.alert('Escolha Imagem', 'Tirar Foto ou Escolher da Galeria', [
        { text: 'Cancelar' },
        { text: 'Câmera', onPress: () => takePhoto() },
        { text: 'Galeria', onPress: () => openPicker() },
      ]);
    }
  };

  const clearImage = () => setForm((prev) => ({ ...prev, ecgFile: null }));

  const submit = async () => {
    if (!user?.uid) return Alert.alert('Erro', 'Faça login novamente.');

    if (!form.patientName || !form.age || !form.sex || !form.hasPacemaker || !form.priority || !form.ecgFile || !form.notes) {
      return Alert.alert('Campos obrigatórios', 'Preencha tudo e selecione uma imagem.');
    }

    setUploading(true);
    try {
      await createEcg({
        ...form,
        uploaderId: user.uid,
      });
      Alert.alert('Sucesso', 'ECG enviado com sucesso.');
      router.replace('/home');
      setForm({ patientName: '', age: '', sex: '', hasPacemaker: '', priority: '', ecgFile: null, notes: '' });
    } catch (error) {
      Alert.alert('Erro', error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView className="bg-primary h-full flex-1">
      <ImageBackground source={images.cardio2} resizeMode="cover" style={StyleSheet.absoluteFillObject}>
        <View pointerEvents="none" className="absolute inset-0 bg-black/20 z-10" />

        <TouchableOpacity
          onPress={() => router.replace('/home')}
          style={{
            position: 'absolute',
            top: Platform.OS === 'ios' ? 60 : 30,
            left: 20,
            zIndex: 20,
            backgroundColor: 'rgba(0,0,0,0.4)',
            padding: 8,
            borderRadius: 20
          }}
        >
          <Image source={icons.leftArrow} style={{ width: 24, height: 24, tintColor: 'white' }} />
        </TouchableOpacity>

        <ScrollView className="px-4 my-6" contentContainerStyle={{ flexGrow: 1, zIndex: 2 }}>
          <Text className="text-2xl text-white font-psemibold mb-4 mt-10">Upload de Eletrocardiograma</Text>

          <FormField title="Nome do Paciente" value={form.patientName} placeholder="Nome completo..." handleChangeText={(e) => setForm({ ...form, patientName: e })} otherStyles="mt-2" />
          <FormField title="Idade" value={form.age} placeholder="Idade..." keyboardType="numeric" handleChangeText={(e) => setForm({ ...form, age: e })} otherStyles="mt-4" />

          <View className="mt-4">
            <Text className="text-base text-gray-100 font-pmedium mb-2">Sexo</Text>
            <View className="flex-row space-x-4">
              {['Masculino', 'Feminino'].map((s) => (
                <TouchableOpacity key={s} onPress={() => setForm({ ...form, sex: s })}
                  className={`py-2 px-5 rounded-lg ${form.sex === s ? 'bg-blue-600' : 'bg-gray-800 border border-gray-700'}`}>
                  <Text className="text-white font-pmedium">{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View className="mt-4">
            <Text className="text-base text-gray-100 font-pmedium mb-2">Possui Marcapasso?</Text>
            <View className="flex-row space-x-4">
              {['Sim', 'Não'].map((v) => (
                <TouchableOpacity key={v} onPress={() => setForm({ ...form, hasPacemaker: v })}
                  className={`py-2 px-5 rounded-lg ${form.hasPacemaker === v ? 'bg-blue-600' : 'bg-gray-800 border border-gray-700'}`}>
                  <Text className="text-white font-pmedium">{v}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View className="mt-4">
            <Text className="text-base text-gray-100 font-pmedium mb-2">Prioridade</Text>
            <View className="flex-row space-x-4">
              {['Urgente', 'Eletivo'].map((p) => (
                <TouchableOpacity key={p} onPress={() => setForm({ ...form, priority: p })}
                  className={`py-2 px-5 rounded-lg ${form.priority === p ? 'bg-red-600' : 'bg-gray-800 border border-gray-700'}`}>
                  <Text className="text-white font-pmedium">{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View className="mt-4 space-y-2">
            <Text className="text-base text-gray-100 font-pmedium">Imagem do ECG</Text>
            {form.ecgFile ? (
              <TouchableOpacity onPress={clearImage} className="relative w-full h-64 rounded-2xl border-2 border-black-200 justify-center items-center">
                <Image source={{ uri: form.ecgFile.uri }} className="w-full h-full rounded-2xl" resizeMode="cover" />
                <View className="absolute top-2 right-2 bg-red-500 rounded-full p-2">
                  <Image source={icons.close} className="w-4 h-4" tintColor="#FFFFFF" />
                </View>
              </TouchableOpacity>
            ) : (
              <View className="w-full h-16 px-4 bg-black-100 rounded-2xl justify-center items-center border-2 border-black-200">
                <CustomButton title="Adicionar Imagem" handlePress={showImageOptions} containerStyles="w-full" textStyles="text-sm font-pmedium text-gray-100" icon={icons.upload} />
              </View>
            )}
          </View>

          <FormField title="Observações" value={form.notes} placeholder="Observações importantes..." handleChangeText={(e) => setForm({ ...form, notes: e })} otherStyles="mt-4" multiline numberOfLines={4} />

          <CustomButton title="Enviar ECG para Laudo" handlePress={submit} containerStyles="mt-6 mb-10" isLoading={uploading} />
        </ScrollView>
      </ImageBackground>
    </SafeAreaView>
  );
};

export default Create;
