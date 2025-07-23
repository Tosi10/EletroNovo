import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActionSheetIOS, Alert, Image, ImageBackground, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomButton from '../../components/CustomButton';
import FormField from '../../components/FormField';
import { icons, images } from '../../constants';
import { useGlobalContext } from '../../context/GlobalProvider';
import { createEcg } from '../../lib/firebase';

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
      <ImageBackground source={images.cardio2} resizeMode="cover" style={{ flex: 1 }}>
        {/* Overlay branco translúcido para ofuscar e suavizar o fundo */}
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(255,255,255,0.1)', zIndex: 10 }]} />

        <View style={{ flex: 1, zIndex: 20 }}>
          <TouchableOpacity
            onPress={() => router.replace('/home')}
            style={{
              position: 'absolute',
              top: Platform.OS === 'ios' ? 80 : 50, // aumentado
              left: 36, // aumentado
              zIndex: 30,
              backgroundColor: 'rgba(0,0,0,0.4)',
              padding: 8,
              borderRadius: 20
            }}
          >
            <Image source={icons.leftArrow} style={{ width: 30, height: 23, tintColor: 'white' }} />
          </TouchableOpacity>

          <ScrollView className="px-4 my-6" contentContainerStyle={{ flexGrow: 1, zIndex: 2 }}>
            <Text className="text-2xl text-white font-psemibold mb-4 mt-24">Upload de Eletrocardiograma</Text>

            <FormField title="Nome do Paciente" value={form.patientName} placeholder="Nome completo..." handleChangeText={(e) => setForm({ ...form, patientName: e })} otherStyles="mt-2" />
            <FormField title="Idade" value={form.age} placeholder="Idade..." keyboardType="numeric" handleChangeText={(e) => setForm({ ...form, age: e })} otherStyles="mt-4" />

            <View className="mt-4">
              <Text className="text-base text-black font-bold mb-2">Sexo</Text>
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
              <Text className="text-lg text-black font-bold mb-2">Possui Marcapasso?</Text>
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
              <Text className="text-lg text-black font-bold mb-2">Prioridade</Text>
              <View className="flex-row space-x-4">
                {['Urgente', 'Eletivo'].map((p) => (
                  <TouchableOpacity key={p} onPress={() => setForm({ ...form, priority: p })}
                    className={`py-2 px-5 rounded-lg ${form.priority === p ? (p === 'Urgente' ? 'bg-red-600' : 'bg-blue-600') : 'bg-gray-800 border border-gray-700'}`}>
                    <Text className="text-white font-pmedium">{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View className="mt-8 space-y-2">
              <Text className="text-lg text-black font-bold">Imagem do ECG</Text>
              {form.ecgFile ? (
                <View className="relative w-full h-64 rounded-2xl border-2 border-black-200 justify-center items-center">
                  <Image source={{ uri: form.ecgFile.uri }} className="w-full h-full rounded-2xl" resizeMode="cover" />
                  <TouchableOpacity onPress={clearImage} style={{ position: 'absolute', top: 8, right: 8, zIndex: 20 }}>
                    <Text style={{ color: 'white', fontSize: 32, fontWeight: 'bold', textShadowColor: 'black', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 4 }}>×</Text>
                  </TouchableOpacity>
                  <View className="absolute bottom-2 left-0 right-0 items-center z-10">
                    <Text className="text-white bg-black bg-opacity-60 px-3 py-1 rounded-full text-xs">Toque no X para remover</Text>
                  </View>
                </View>
              ) : (
                <View className="w-full items-center mt-2">
                  <CustomButton
                    title="Adicionar Imagem"
                    handlePress={showImageOptions}
                    containerStyles="w-4/5 rounded-xl h-14"
                    textStyles="text-sm font-pmedium text-gray-100"
                    icon={icons.upload}
                  />
                </View>
              )}
            </View>

            <FormField title="Observações" value={form.notes} placeholder="Observações importantes..." handleChangeText={(e) => setForm({ ...form, notes: e })} otherStyles="mt-4" multiline numberOfLines={4} />

            <CustomButton title="Enviar ECG para Laudo" handlePress={submit} containerStyles="mt-6 mb-10" isLoading={uploading} />
          </ScrollView>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
};

export default Create;
