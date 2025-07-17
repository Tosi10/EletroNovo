import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import ImageViewer from 'react-native-image-zoom-viewer';
import Modal from 'react-native-modal';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomButton from '../../components/CustomButton';
import FormField from '../../components/FormField';
import { icons } from '../../constants';
import { useGlobalContext } from '../../context/GlobalProvider';
import { getEcgMessages, getPendingEcgs, updateEcgLaudation } from '../../lib/firebase';
import { generateLaudo } from '../../lib/generateLaudo';

const Laudo = () => {
  const { user } = useGlobalContext();
  const router = useRouter(); 
  const [selectedEcg, setSelectedEcg] = useState(null); 
  const [loadingEcgs, setLoadingEcgs] = useState(false); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false); 
  const [laudoForm, setLaudoForm] = useState({
    ritmo: '', fc: '', pr: '', qrs: '', eixo: '',
    bre: false, brd: false, repolarizacao: '', outrosAchados: '', laudoFinal: ''
  });
  const [urgentEcgs, setUrgentEcgs] = useState([]);
  const [electiveEcgs, setElectiveEcgs] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showOutroRepolarizacao, setShowOutroRepolarizacao] = useState(false);

  const ritmoOptions = ['Sinusal', 'Ectópico Atrial', 'Juncional', 'Fibrilação Atrial', 'Flutter Atrial', 'MP (Marcapasso)', 'Outro'];
  const repolarizacaoOptions = ['Normal', 'Alteração difusa da repolarização ventricular', 'Infradesnivelamento', 'Supradesnivelamento', 'Outro'];

  const generateLaudoFinal = (form) => {
    let lines = [];
    if (form.ritmo) lines.push(`Ritmo: ${form.ritmo}.`);
    if (form.fc) lines.push(`Frequência Cardíaca: ${form.fc} bpm.`);
    if (form.pr) lines.push(`Intervalo PR: ${form.pr} ms.`);
    if (form.qrs) lines.push(`Duração QRS: ${form.qrs} ms.`);
    if (form.eixo) lines.push(`Eixo elétrico: ${form.eixo}°.`);
    let bloqueios = [];
    if (form.bre) bloqueios.push('Bloqueio de ramo esquerdo');
    if (form.brd) bloqueios.push('Bloqueio de ramo direito');
    if (bloqueios.length) lines.push(`${bloqueios.join(' e ')}.`);
    if (form.repolarizacao) lines.push(`${form.repolarizacao}.`); // Apenas o valor, sem prefixo
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
    setLaudoForm({ ritmo: '', fc: '', pr: '', qrs: '', eixo: '', bre: false, brd: false, repolarizacao: '', outrosAchados: '', laudoFinal: '' });
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
    const fetchAllEcgs = async () => {
      setLoadingEcgs(true);
      setSelectedEcg(null);
      setLaudoForm({ ritmo: '', fc: '', pr: '', qrs: '', eixo: '', bre: false, brd: false, repolarizacao: '', outrosAchados: '', laudoFinal: '' });
      try {
        const allEcgs = await getPendingEcgs();
        setUrgentEcgs(allEcgs.filter(e => e.priority === 'Urgente'));
        setElectiveEcgs(allEcgs.filter(e => e.priority === 'Eletivo'));
      } catch (error) {
        Alert.alert('Erro', 'Não foi possível carregar os exames.');
      } finally {
        setLoadingEcgs(false);
      }
    };
    if (user?.role === 'medico') {
      fetchAllEcgs();
    }
  }, [user]);

  // Atualiza a contagem de mensagens não lidas sempre que um ECG é selecionado
  useEffect(() => {
    const fetchUnread = async () => {
      if (selectedEcg && user?.uid) {
        try {
          const messages = await getEcgMessages(selectedEcg.id, user.uid);
          const unread = messages.filter(m => !m.isRead && m.senderId !== user.uid).length;
          setUnreadCount(unread);
        } catch (e) {
          setUnreadCount(0);
        }
      } else {
        setUnreadCount(0);
      }
    };
    fetchUnread();
  }, [selectedEcg, user?.uid]);

  const submitLaudo = async () => {
    if (!selectedEcg || !laudoForm.laudoFinal || !user?.uid) {
      Alert.alert('Erro', 'Preencha todos os campos.');
      return;
    }
    setIsSubmitting(true);
    try {
      await updateEcgLaudation(selectedEcg.id, laudoForm.laudoFinal, user.uid, {
        ritmo: laudoForm.ritmo, fc: laudoForm.fc, pr: laudoForm.pr, qrs: laudoForm.qrs,
        eixo: laudoForm.eixo, bre: laudoForm.bre, brd: laudoForm.brd, repolarizacao: laudoForm.repolarizacao, outrosAchados: laudoForm.outrosAchados
      });
      Alert.alert('Sucesso', 'Laudo enviado!');
      setSelectedEcg(null);
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

  const handleGenerateLaudo = async () => {
    console.log('=== INICIANDO GERAÇÃO DE LAUDO ===');
    console.log('Estado atual do formulário:', laudoForm);
    console.log('ECG selecionado:', selectedEcg);
    
    setIsGenerating(true);
    try {
      console.log('Chamando generateLaudo...');
      const laudo = await generateLaudo(laudoForm, selectedEcg?.imageUrl);
      console.log('Laudo gerado:', laudo);
      // Gera o laudoFinal automaticamente com os campos preenchidos pela IA
      const laudoComFinal = { ...laudo };
      laudoComFinal.laudoFinal = generateLaudoFinal(laudoComFinal);
      setLaudoForm(prev => ({ ...prev, ...laudoComFinal }));
      console.log('Formulário atualizado com sucesso');
    } catch (e) {
      console.error('Erro na geração do laudo:', e);
      Alert.alert('Erro', e.message || 'Não foi possível gerar o laudo automaticamente.');
    } finally {
      console.log('Finalizando geração de laudo');
      setIsGenerating(false);
    }
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
      {/* Botão de voltar igual ao Create */}
      <TouchableOpacity
        onPress={handleBack}
        style={{
          position: 'absolute',
          top: Platform.OS === 'ios' ? 80 : 50,
          left: 36,
          zIndex: 20,
          backgroundColor: 'rgba(0,0,0,0.4)',
          padding: 8,
          borderRadius: 20
        }}
      >
        <Image source={icons.leftArrow} style={{ width: 30, height: 23, tintColor: 'white' }} />
      </TouchableOpacity>
      <ScrollView className="px-4 my-6">
        <Text className="text-2xl text-white font-psemibold mb-6 text-center mt-16">Laudar Eletrocardiogramas</Text>

        {loadingEcgs ? (
          <ActivityIndicator size="large" color="#FFA001" className="mt-10" />
        ) : !selectedEcg ? (
          <>
            <Text className="text-xl text-red-500 font-psemibold text-center mt-4 mb-2">URGENTE</Text>
            {urgentEcgs.length === 0 ? (
              <Text className="text-gray-100 text-center mb-4">Nenhum ECG urgente pendente.</Text>
            ) : urgentEcgs.map(ecg => (
              <TouchableOpacity
                key={ecg.id}
                onPress={() => {
                  setSelectedEcg(ecg);
                  setLaudoForm({ ritmo: '', fc: '', pr: '', qrs: '', eixo: '', bre: false, brd: false, repolarizacao: '', outrosAchados: '', laudoFinal: '' });
                }}
                className={`flex-row items-center bg-black-100 rounded-lg border-2 border-black-200 px-4 py-3 mb-2`}
              >
                <Text className="text-white font-pmedium flex-1">{ecg.patientName} ({ecg.age} anos) - {ecg.sex}</Text>
                <Text className="text-xs text-gray-300 ml-2">{ecg.priority}</Text>
              </TouchableOpacity>
            ))}

            <Text className="text-xl text-orange-400 font-psemibold text-center mt-8 mb-2">ELETIVO</Text>
            {electiveEcgs.length === 0 ? (
              <Text className="text-gray-100 text-center mb-4">Nenhum ECG eletivo pendente.</Text>
            ) : electiveEcgs.map(ecg => (
              <TouchableOpacity
                key={ecg.id}
                onPress={() => {
                  setSelectedEcg(ecg);
                  setLaudoForm({ ritmo: '', fc: '', pr: '', qrs: '', eixo: '', bre: false, brd: false, repolarizacao: '', outrosAchados: '', laudoFinal: '' });
                }}
                className={`flex-row items-center bg-black-100 rounded-lg border-2 border-black-200 px-4 py-3 mb-2`}
              >
                <Text className="text-white font-pmedium flex-1">{ecg.patientName} ({ecg.age} anos) - {ecg.sex}</Text>
                <Text className="text-xs text-gray-300 ml-2">{ecg.priority}</Text>
              </TouchableOpacity>
            ))}
          </>
        ) : null}

        {/* Formulário de laudo só aparece se houver ECG selecionado */}
        {selectedEcg && (
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
            <FormField title="Eixo " value={laudoForm.eixo} handleChangeText={(e) => updateFormAndGenerateLaudo('eixo', e)} otherStyles="mt-7" />
            <View className="mt-7 flex-row space-x-4">
              <TouchableOpacity onPress={() => updateFormAndGenerateLaudo('bre', !laudoForm.bre)} className={`py-2 px-5 rounded-lg ${laudoForm.bre ? 'bg-blue-600' : 'bg-gray-800 border border-gray-700'}`}><Text className="text-white">BRE</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => updateFormAndGenerateLaudo('brd', !laudoForm.brd)} className={`py-2 px-5 rounded-lg ${laudoForm.brd ? 'bg-blue-600' : 'bg-gray-800 border border-gray-700'}`}><Text className="text-white">BRD</Text></TouchableOpacity>
            </View>
            <RadioGroup label="Repolarização" options={repolarizacaoOptions} selectedOption={laudoForm.repolarizacao} onSelect={(option) => {
              updateFormAndGenerateLaudo('repolarizacao', option === 'Outro' ? '' : option);
              setShowOutroRepolarizacao(option === 'Outro');
            }} />
            {showOutroRepolarizacao && (
              <FormField
                title="Descreva a repolarização"
                value={laudoForm.repolarizacao}
                handleChangeText={(e) => updateFormAndGenerateLaudo('repolarizacao', e)}
                otherStyles="mt-4"
              />
            )}
            <FormField title="Outros Achados" value={laudoForm.outrosAchados} handleChangeText={(e) => updateFormAndGenerateLaudo('outrosAchados', e)} otherStyles="mt-7" multiline />
            <FormField title="Laudo Final" value={laudoForm.laudoFinal} handleChangeText={(e) => updateFormAndGenerateLaudo('laudoFinal', e)} otherStyles="mt-7" multiline />
            <CustomButton title="Submeter Laudo" handlePress={submitLaudo} containerStyles="mt-7" isLoading={isSubmitting} />
            {/* <CustomButton
              title={isGenerating ? 'Gerando laudo...' : 'Gerar laudo automático'}
              handlePress={() => {
                console.log('=== BOTÃO PRESSIONADO ===');
                handleGenerateLaudo();
              }}
              isLoading={isGenerating}
              containerStyles="mt-4 mb-10 bg-green-600"
            /> */}
            <CustomButton title={`Abrir Chat${unreadCount > 0 ? ` (${unreadCount})` : ''}`} handlePress={handleOpenChat} containerStyles="mt-4 mb-10 bg-green-600" />
          </View>
        )}
      </ScrollView>

      <Modal isVisible={showFullImage} style={{ margin: 0, backgroundColor: 'black' }}>
        {selectedEcg ? (
          <ImageViewer imageUrls={[{ url: selectedEcg.imageUrl }]} enableSwipeDown onSwipeDown={() => setShowFullImage(false)} renderIndicator={() => null} style={{ flex: 1, backgroundColor: 'black' }}
            renderHeader={() => (
              <View style={{ position: 'absolute', top: Platform.OS === 'ios' ? 40 : 20, right: 20, zIndex: 50 }}>
                <TouchableOpacity onPress={() => setShowFullImage(false)} className="p-3 rounded-full bg-gray-800">
                  <Text className="text-white text-xl font-bold">×</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        ) : (
          <View style={{ flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => setShowFullImage(false)} className="p-3 rounded-full bg-gray-800">
              <Text className="text-white text-xl font-bold">×</Text>
            </TouchableOpacity>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
};

export default Laudo;
