import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert, StatusBar, Platform } from 'react-native'; 
import { SafeAreaView } from 'react-native-safe-area-context';
import FormField from '../../components/FormField'; 
import CustomButton from '../../components/CustomButton'; 
import { icons } from '../../constants'; 
import { getPendingEcgs, updateEcgLaudation } from '../../lib/firebase'; 
import { useGlobalContext } from '../../context/GlobalProvider';
import { useRouter } from 'expo-router'; 
import Modal from 'react-native-modal'; 
import ImageViewer from 'react-native-image-zoom-viewer'; 

const Laudo = () => {
  const { user } = useGlobalContext();
  const router = useRouter(); 
  const [selectedPriorityType, setSelectedPriorityType] = useState(null); 
  const [selectedEcg, setSelectedEcg] = useState(null); 
  const [loadingEcgs, setLoadingEcgs] = useState(false); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false); 
  const [laudoForm, setLaudoForm] = useState({
    ritmo: '', fc: '', pr: '', qrs: '', eixo: '',
    brc: false, brd: false, repolarizacao: '', outrosAchados: '', laudoFinal: ''
  });

  const ritmoOptions = ['Sinusal', 'Ectópico Atrial', 'Juncional', 'Fibrilação Atrial', 'Flutter Atrial', 'MP (Marcapasso)', 'Outro'];
  const repolarizacaoOptions = ['Normal', 'Alterado Difuso da Repolarização Ventricular', 'Infradesnivelamento', 'Supradesnivelamento', 'Outro'];

  const generateLaudoFinal = (form) => {
    let lines = [];
    if (form.ritmo) lines.push(`Ritmo: ${form.ritmo}.`);
    if (form.fc) lines.push(`Frequência Cardíaca: ${form.fc} bpm.`);
    if (form.pr) lines.push(`Intervalo PR: ${form.pr} ms.`);
    if (form.qrs) lines.push(`Duração QRS: ${form.qrs} ms.`);
    if (form.eixo) lines.push(`Eixo elétrico: ${form.eixo}.`);
    let bloqueios = [];
    if (form.brc) bloqueios.push('BRC');
    if (form.brd) bloqueios.push('BRD');
    if (bloqueios.length) lines.push(`Bloqueios de Ramo: ${bloqueios.join(' e ')}.`);
    if (form.repolarizacao) lines.push(`Repolarização: ${form.repolarizacao}.`);
    if (form.outrosAchados) lines.push(`Outros Achados: ${form.outrosAchados}.`);
    return lines.join('\n');
  };

  const updateFormAndGenerateLaudo = (field, value) => {
    setLaudoForm(prev => {
      const updated = { ...prev, [field]: value };
      if (field !== 'laudoFinal') updated.laudoFinal = generateLaudoFinal(updated);
      return updated;
    });
  };

  const fetchAndSelectFirstEcg = useCallback(async (priorityType) => {
    setLoadingEcgs(true);
    setSelectedEcg(null);
    setLaudoForm({ ritmo: '', fc: '', pr: '', qrs: '', eixo: '', brc: false, brd: false, repolarizacao: '', outrosAchados: '', laudoFinal: '' });
    try {
      const ecgs = await getPendingEcgs(priorityType); 
      if (ecgs.length > 0) setSelectedEcg(ecgs[0]);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar os exames.');
    } finally {
      setLoadingEcgs(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'medico' && selectedPriorityType) {
      fetchAndSelectFirstEcg(selectedPriorityType);
    }
  }, [user, selectedPriorityType]);

  const submitLaudo = async () => {
    if (!selectedEcg || !laudoForm.laudoFinal || !user?.uid) {
      Alert.alert('Erro', 'Preencha todos os campos.');
      return;
    }
    setIsSubmitting(true);
    try {
      await updateEcgLaudation(selectedEcg.id, laudoForm.laudoFinal, user.uid, {
        ritmo: laudoForm.ritmo, fc: laudoForm.fc, pr: laudoForm.pr, qrs: laudoForm.qrs,
        eixo: laudoForm.eixo, brc: laudoForm.brc, brd: laudoForm.brd, repolarizacao: laudoForm.repolarizacao, outrosAchados: laudoForm.outrosAchados
      });
      Alert.alert('Sucesso', 'Laudo enviado!');
      setSelectedEcg(null);
      setSelectedPriorityType(null);
    } catch (err) {
      Alert.alert('Erro', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => router.replace('/home');
  const handleOpenChat = () => {
    if (selectedEcg?.id) router.push(`/chat/${selectedEcg.id}`);
    else Alert.alert('Erro', 'Selecione um ECG');
  };

  const RadioGroup = ({ label, options, selectedOption, onSelect }) => (
    <View className="mt-7">
      <Text className="text-base text-gray-100 font-pmedium mb-2">{label}</Text>
      <View className="flex-row flex-wrap">
        {options.map((option, index) => (
          <TouchableOpacity key={index} onPress={() => onSelect(option)}
            className={`py-2 px-4 rounded-lg mr-2 mb-2 ${selectedOption === option ? 'bg-blue-600' : 'bg-gray-800 border border-gray-700'}`}>
            <Text className="text-white font-pmedium">{option}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView className="bg-primary h-full flex-1">
      <ScrollView className="px-4 my-6">
        <TouchableOpacity onPress={handleBack} className="flex-row items-center mb-6">
          <Image source={icons.leftArrow} className="w-6 h-6 mr-2" resizeMode="contain" tintColor="#FFFFFF" />
          <Text className="text-white text-base font-pmedium">Voltar</Text>
        </TouchableOpacity>
        <Text className="text-2xl text-white font-psemibold mb-6">Laudar Eletrocardiogramas</Text>

        {!selectedPriorityType ? (
          <View className="flex-1 justify-center items-center h-80">
            <Text className="text-xl text-white font-pmedium mb-4">Escolha o tipo:</Text>
            <View className="flex-row space-x-4 mt-4">
              <CustomButton title="Urgente" handlePress={() => setSelectedPriorityType('Urgente')} containerStyles="bg-red-600 w-1/2" />
              <CustomButton title="Eletivo" handlePress={() => setSelectedPriorityType('Eletivo')} containerStyles="bg-orange-500 w-1/2" />
            </View>
          </View>
        ) : loadingEcgs ? (
          <ActivityIndicator size="large" color="#FFA001" className="mt-10" />
        ) : !selectedEcg ? (
          <View className="flex-1 justify-center items-center h-40">
            <Text className="text-gray-100 font-pmedium text-lg">Nenhum ECG pendente.</Text>
            <CustomButton title="Voltar" handlePress={() => setSelectedPriorityType(null)} containerStyles="mt-4 bg-gray-700" />
          </View>
        ) : (
          <View className="mt-8 p-4 bg-black-100 rounded-xl border-2 border-black-200">
            <Text className="text-xl text-white font-psemibold mb-4">Paciente: {selectedEcg.patientName}</Text>
            <TouchableOpacity onPress={() => setShowFullImage(true)} className="w-full h-64 rounded-lg mb-4">
              <Image source={{ uri: selectedEcg.imageUrl }} className="w-full h-full" resizeMode="contain" />
            </TouchableOpacity>

            <View className="mb-4">
              <Text className="text-gray-100 font-pregular">Idade: {selectedEcg.age}</Text>
              <Text className="text-gray-100 font-pregular">Sexo: {selectedEcg.sex}</Text>
              <Text className="text-gray-100 font-pregular">Marcapasso: {selectedEcg.hasPacemaker}</Text>
              <Text className="text-gray-100 font-pregular">Prioridade: {selectedEcg.priority}</Text>
            </View>

            <RadioGroup label="Ritmo" options={ritmoOptions} selectedOption={laudoForm.ritmo} onSelect={(option) => updateFormAndGenerateLaudo('ritmo', option)} />
            <FormField title="FC" value={laudoForm.fc} handleChangeText={(e) => updateFormAndGenerateLaudo('fc', e)} keyboardType="numeric" otherStyles="mt-7" />
            <FormField title="PR" value={laudoForm.pr} handleChangeText={(e) => updateFormAndGenerateLaudo('pr', e)} keyboardType="numeric" otherStyles="mt-7" />
            <FormField title="QRS" value={laudoForm.qrs} handleChangeText={(e) => updateFormAndGenerateLaudo('qrs', e)} keyboardType="numeric" otherStyles="mt-7" />
            <FormField title="Eixo" value={laudoForm.eixo} handleChangeText={(e) => updateFormAndGenerateLaudo('eixo', e)} otherStyles="mt-7" />
            <View className="mt-7 flex-row space-x-4">
              <TouchableOpacity onPress={() => updateFormAndGenerateLaudo('brc', !laudoForm.brc)} className={`py-2 px-5 rounded-lg ${laudoForm.brc ? 'bg-blue-600' : 'bg-gray-800 border border-gray-700'}`}><Text className="text-white">BRC</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => updateFormAndGenerateLaudo('brd', !laudoForm.brd)} className={`py-2 px-5 rounded-lg ${laudoForm.brd ? 'bg-blue-600' : 'bg-gray-800 border border-gray-700'}`}><Text className="text-white">BRD</Text></TouchableOpacity>
            </View>
            <RadioGroup label="Repolarização" options={repolarizacaoOptions} selectedOption={laudoForm.repolarizacao} onSelect={(option) => updateFormAndGenerateLaudo('repolarizacao', option)} />
            <FormField title="Outros Achados" value={laudoForm.outrosAchados} handleChangeText={(e) => updateFormAndGenerateLaudo('outrosAchados', e)} otherStyles="mt-7" multiline />
            <FormField title="Laudo Final" value={laudoForm.laudoFinal} handleChangeText={(e) => updateFormAndGenerateLaudo('laudoFinal', e)} otherStyles="mt-7" multiline />
            <CustomButton title="Submeter Laudo" handlePress={submitLaudo} containerStyles="mt-7" isLoading={isSubmitting} />
            <CustomButton title="Abrir Chat" handlePress={handleOpenChat} containerStyles="mt-4 mb-10 bg-green-600" />
          </View>
        )}
      </ScrollView>

      <Modal isVisible={showFullImage} style={{ margin: 0, backgroundColor: 'black' }}>
        {selectedEcg && (
          <ImageViewer imageUrls={[{ url: selectedEcg.imageUrl }]} enableSwipeDown onSwipeDown={() => setShowFullImage(false)} renderIndicator={() => null} style={{ flex: 1, backgroundColor: 'black' }}
            renderHeader={() => (
              <View style={{ position: 'absolute', top: Platform.OS === 'ios' ? 40 : 20, right: 20, zIndex: 50 }}>
                <TouchableOpacity onPress={() => setShowFullImage(false)} className="p-3 rounded-full bg-gray-800">
                  <Image source={icons.close} className="w-6 h-6" tintColor="#FFFFFF" />
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </Modal>
    </SafeAreaView>
  );
};

export default Laudo;
