import { useRouter } from 'expo-router';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import ImageViewer from 'react-native-image-zoom-viewer';
import Modal from 'react-native-modal';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomButton from '../../components/CustomButton';
import FormField from '../../components/FormField';
import { icons } from '../../constants';
import { useGlobalContext } from '../../context/GlobalProvider';
import { db, getEcgMessages, getEcgsForReview, getPendingEcgs, updateEcgLaudation } from '../../lib/firebase';
import { generateLaudo } from '../../lib/generateLaudo';

const Laudo = () => {
  const { user } = useGlobalContext();
  const router = useRouter(); 
  const [selectedEcg, setSelectedEcg] = useState(null); 
  const [loadingEcgs, setLoadingEcgs] = useState(false); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false); 
  const [laudoForm, setLaudoForm] = useState({
    ritmo: '', fc: '', pr: '', qrs: '', eixo: '', qt: '', qtQuadrados: '', qtBpm: '', prTipo: '',
    bre: false, brd: false, bdase: false, dcrd: false, repolarizacao: '', repolarizacaoTipo: '', derivacoes: [],
    laudoFinal: ''
  });
  const [urgentEcgs, setUrgentEcgs] = useState([]);
  const [electiveEcgs, setElectiveEcgs] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showOutroRepolarizacao, setShowOutroRepolarizacao] = useState(false);
  const [showDerivacoes, setShowDerivacoes] = useState(false);
  const [showOutroRitmo, setShowOutroRitmo] = useState(false);
  const [showMarcapassoTipo, setShowMarcapassoTipo] = useState(false);
  const [showPrAnormal, setShowPrAnormal] = useState(false);
  const [showQrsAnormal, setShowQrsAnormal] = useState(false);
  const [showEixoAnormal, setShowEixoAnormal] = useState(false);
  const [showQtAnormal, setShowQtAnormal] = useState(false);
  const [draftEcgs, setDraftEcgs] = useState([]);
  const [reviewEcgs, setReviewEcgs] = useState([]);

  const ritmoOptions = ['Sinusal', 'Ectópico Atrial', 'Juncional', 'Fibrilação Atrial', 'Flutter Atrial', 'MP (Marcapasso)', 'Outro'];
  const repolarizacaoOptions = ['Normal', 'Alteração difusa da repolarização ventricular', 'Infradesnivelamento', 'Supradesnivelamento', 'Outro'];

  const generateLaudoFinal = (form) => {
    let lines = [];
    if (form.ritmo) lines.push(`Ritmo: ${form.ritmo}.`);
    if (form.fc) lines.push(`Frequência Cardíaca: ${form.fc} bpm.`);
    if (form.pr) {
      if (form.pr === 'Normal') {
        lines.push(`Intervalo PR: Normal.`);
      } else if (form.prTipo === 'WPW') {
        lines.push(`Intervalo PR: ${form.pr} ms - Wolff-Parkinson-White.`);
      } else if (form.prTipo === 'BAV 1º') {
        lines.push(`Intervalo PR: ${form.pr} ms - Bloqueio Atrioventricular de Primeiro Grau.`);
      } else {
        lines.push(`Intervalo PR: ${form.pr} ms.`);
      }
    }
    if (form.qrs) lines.push(`Duração QRS: ${form.qrs === 'Normal' ? 'Normal' : form.qrs + ' ms'}.`);
    if (form.eixo) lines.push(`Eixo elétrico: ${form.eixo === 'Normal' ? 'Normal' : form.eixo + '°'}.`);
    if (form.qt) lines.push(`Intervalo QT: ${form.qt === 'Normal' ? 'Normal' : form.qt }.`);
    let bloqueios = [];
    if (form.bre) bloqueios.push('Bloqueio de ramo esquerdo');
    if (form.brd) bloqueios.push('Bloqueio de ramo direito');
    if (form.bdase) bloqueios.push('Bloqueio Divisional Anterossuperior Esquerdo');
    if (form.dcrd) bloqueios.push('Distúrbio de Condução do Ramo Direito');
    if (bloqueios.length) lines.push(`${bloqueios.join(' e ')}.`);
    if (form.repolarizacao) {
      if (form.derivacoes && Array.isArray(form.derivacoes) && form.derivacoes.length > 0) {
        lines.push(`${form.repolarizacaoTipo} de ${form.derivacoes.join(', ')}.`);
      } else {
        lines.push(`${form.repolarizacao}.`);
      }
    }

    return lines.join('\n');
  };

  const calculateQTc = (quadrados, bpm) => {
    if (!quadrados || !bpm || quadrados <= 0 || bpm <= 0) return '';
    
    // Fórmula de Framingham: QTcms = (QTquadradinhos × 40) + 0.154 × (1000 - 60000/BPM)
    const qtcMs = (parseFloat(quadrados) * 40) + 0.154 * (1000 - (60000 / parseFloat(bpm)));
    
    // Determinar se é normal, prolongado ou curto
    if (qtcMs > 450) {
      return `${qtcMs.toFixed(0)} ms (Prolongado)`;
    } else if (qtcMs < 350) {
      return `${qtcMs.toFixed(0)} ms (Curto)`;
    } else {
      return `${qtcMs.toFixed(0)} ms (Normal)`;
    }
  };

  const toggleDerivacao = (derivacao) => {
    setLaudoForm(prev => {
      const derivacoes = prev.derivacoes.includes(derivacao)
        ? prev.derivacoes.filter(d => d !== derivacao)
        : [...prev.derivacoes, derivacao];
      
      const updated = { ...prev, derivacoes };
      updated.laudoFinal = generateLaudoFinal(updated);
      return updated;
    });
  };

  const updateFormAndGenerateLaudo = (field, value) => {
    setLaudoForm(prev => {
      const updated = { ...prev, [field]: value };
      
      // Se for campo de QT quadrados ou BPM, calcular automaticamente o QTc
      if (field === 'qtQuadrados' || field === 'qtBpm') {
        const quadrados = field === 'qtQuadrados' ? value : updated.qtQuadrados;
        const bpm = field === 'qtBpm' ? value : updated.qtBpm;
        updated.qt = calculateQTc(quadrados, bpm);
      }
      
      if (field !== 'laudoFinal') updated.laudoFinal = generateLaudoFinal(updated);
      return updated;
    });
  };

  const validateLaudoForm = () => {
    const errors = [];
    
    // Campos obrigatórios principais
    if (!laudoForm.ritmo) errors.push('Ritmo');
    if (!laudoForm.fc) errors.push('Frequência Cardíaca (FC)');
    if (!laudoForm.pr) errors.push('Intervalo PR');
    if (!laudoForm.qrs) errors.push('Duração QRS');
    if (!laudoForm.eixo) errors.push('Eixo elétrico');
    if (!laudoForm.qt) errors.push('Intervalo QT');
    if (!laudoForm.repolarizacao) errors.push('Repolarização');
    
    // Validações específicas para campos anormais
    if (laudoForm.pr !== 'Normal' && !laudoForm.pr) {
      errors.push('Valor do PR (quando anormal)');
    }
    if (laudoForm.qrs !== 'Normal' && !laudoForm.qrs) {
      errors.push('Valor do QRS (quando anormal)');
    }
    if (laudoForm.eixo !== 'Normal' && !laudoForm.eixo) {
      errors.push('Valor do Eixo (quando anormal)');
    }
    if (laudoForm.qt !== 'Normal' && (!laudoForm.qtQuadrados || !laudoForm.qtBpm)) {
      errors.push('Valores de QT (quadrados e BPM quando anormal)');
    }
    
    // Validação específica para QT - deve ter um valor válido
    if (!laudoForm.qt || laudoForm.qt === '') {
      errors.push('Intervalo QT');
    }
    
    // Validações específicas para tipos especiais
    if (laudoForm.ritmo === 'MP (Marcapasso)' && !laudoForm.ritmo.includes('Marcapasso operando')) {
      errors.push('Tipo de Marcapasso');
    }
    if (laudoForm.ritmo === 'Outro' && !laudoForm.ritmo) {
      errors.push('Descrição do Ritmo');
    }
    if (laudoForm.repolarizacao === 'Outro' && !laudoForm.repolarizacao) {
      errors.push('Descrição da Repolarização');
    }
    
    // Validação para repolarização com derivacoes
    if ((laudoForm.repolarizacao === 'Infradesnivelamento' || laudoForm.repolarizacao === 'Supradesnivelamento') && 
        (!laudoForm.derivacoes || laudoForm.derivacoes.length === 0)) {
      errors.push('Seleção de Derivações para Repolarização');
    }
    
    return errors;
  };

  const isFormValid = () => {
    const errors = validateLaudoForm();
    return errors.length === 0 && laudoForm.laudoFinal && laudoForm.laudoFinal.trim() !== '';
  };

  const fetchAndSelectFirstEcg = useCallback(async (priorityType) => {
    setLoadingEcgs(true);
    setSelectedEcg(null);
    setLaudoForm({ ritmo: '', fc: '', pr: '', qrs: '', eixo: '', qt: '', qtQuadrados: '', qtBpm: '', prTipo: '', bre: false, brd: false, bdase: false, dcrd: false, repolarizacao: '', repolarizacaoTipo: '', derivacoes: [], laudoFinal: '' });
    setShowPrAnormal(false);
    setShowQrsAnormal(false);
    setShowEixoAnormal(false);
    setShowQtAnormal(false);
    setShowOutroRitmo(false);
    setShowMarcapassoTipo(false);
    setShowDerivacoes(false);
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
      setLaudoForm({ ritmo: '', fc: '', pr: '', qrs: '', eixo: '', qt: '', qtQuadrados: '', qtBpm: '', prTipo: '', bre: false, brd: false, bdase: false, dcrd: false, repolarizacao: '', repolarizacaoTipo: '', derivacoes: [], laudoFinal: '' });
      setShowPrAnormal(false);
      setShowQrsAnormal(false);
      setShowEixoAnormal(false);
      setShowQtAnormal(false);
      setShowOutroRitmo(false);
      setShowMarcapassoTipo(false);
      setShowDerivacoes(false);
      try {
        const allEcgs = await getPendingEcgs();
        setUrgentEcgs(allEcgs.filter(e => e.priority === 'Urgente'));
        setElectiveEcgs(allEcgs.filter(e => e.priority === 'Eletivo'));
        // Buscar drafts do médico logado (status draft e laudationDoctorId = user.uid)
        if (user?.uid) {
          const qDrafts = query(
            collection(db, 'ecgs'),
            where('status', '==', 'draft'),
            where('laudationDoctorId', '==', user.uid),
            orderBy('createdAt', 'desc')
          );
          const snapDrafts = await getDocs(qDrafts);
          setDraftEcgs(snapDrafts.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } else {
          setDraftEcgs([]);
        }
        // Buscar ECGs para revisão
        const reviewList = await getEcgsForReview();
        setReviewEcgs(reviewList);
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
    if (!selectedEcg || !user?.uid) {
      Alert.alert('Erro', 'Selecione um ECG e certifique-se de estar logado.');
      return;
    }
    
    // Validação rigorosa de todos os campos
    const validationErrors = validateLaudoForm();
    if (validationErrors.length > 0) {
      Alert.alert(
        'Campos Obrigatórios Não Preenchidos', 
        `Por favor, preencha todos os campos obrigatórios:\n\n${validationErrors.join('\n')}`,
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Verificação adicional do laudo final
    if (!laudoForm.laudoFinal || laudoForm.laudoFinal.trim() === '') {
      Alert.alert('Erro', 'O laudo final não pode estar vazio.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await updateEcgLaudation(selectedEcg.id, laudoForm.laudoFinal, user.uid, {
        ritmo: laudoForm.ritmo, fc: laudoForm.fc, pr: laudoForm.pr, qrs: laudoForm.qrs,
        eixo: laudoForm.eixo, bre: laudoForm.bre, brd: laudoForm.brd, bdase: laudoForm.bdase, dcrd: laudoForm.dcrd, repolarizacao: laudoForm.repolarizacao
      });
      Alert.alert('Sucesso', 'Laudo enviado!');
      setSelectedEcg(null);
    } catch (err) {
      Alert.alert('Erro', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveLaudoDraft = async () => {
    if (!selectedEcg || !user?.uid) {
      Alert.alert('Erro', 'Selecione um ECG.');
      return;
    }
    
    // Para rascunho, permitimos campos vazios, mas validamos se pelo menos alguns campos foram preenchidos
    const hasAnyData = laudoForm.ritmo || laudoForm.fc || laudoForm.pr || laudoForm.qrs || 
                       laudoForm.eixo || laudoForm.qt || laudoForm.repolarizacao || 
                       laudoForm.bre || laudoForm.brd || laudoForm.bdase || laudoForm.dcrd;
    
    if (!hasAnyData) {
      Alert.alert('Aviso', 'Para salvar um rascunho, preencha pelo menos alguns campos do laudo.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await updateEcgLaudation(selectedEcg.id, laudoForm.laudoFinal || '', user.uid, {
        ritmo: laudoForm.ritmo, fc: laudoForm.fc, pr: laudoForm.pr, qrs: laudoForm.qrs,
        eixo: laudoForm.eixo, bre: laudoForm.bre, brd: laudoForm.brd, bdase: laudoForm.bdase, dcrd: laudoForm.dcrd, repolarizacao: laudoForm.repolarizacao,
        status: 'draft',
      });
      Alert.alert('Rascunho salvo', 'Seu rascunho foi salvo. Você pode continuar depois.');
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
      <Text className="text-lg text-white font-bold mb-2">{label}</Text>
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
                  setLaudoForm({ ritmo: '', fc: '', pr: '', qrs: '', eixo: '', qt: '', qtQuadrados: '', qtBpm: '', prTipo: '', bre: false, brd: false, bdase: false, dcrd: false, repolarizacao: '', repolarizacaoTipo: '', derivacoes: [], laudoFinal: '' });
                  setShowPrAnormal(false);
                  setShowQrsAnormal(false);
                  setShowEixoAnormal(false);
                  setShowQtAnormal(false);
                  setShowOutroRitmo(false);
                  setShowMarcapassoTipo(false);
                  setShowDerivacoes(false);
                  setShowOutroRepolarizacao(false);
                }}
                className={`flex-row items-center bg-black-100 rounded-lg border-2 border-black-200 px-4 py-3 mb-2`}
              >
                <Text className="text-white font-pmedium flex-1">{ecg.patientName} ({ecg.age} anos) - {ecg.sex}</Text>
                <Text className="text-xs text-gray-300 ml-2">{ecg.priority}</Text>
              </TouchableOpacity>
            ))}

            <Text className="text-xl text-blue-400 font-psemibold text-center mt-8 mb-2">ELETIVO</Text>
            {electiveEcgs.length === 0 ? (
              <Text className="text-gray-100 text-center mb-4">Nenhum ECG eletivo pendente.</Text>
            ) : electiveEcgs.map(ecg => (
              <TouchableOpacity
                key={ecg.id}
                onPress={() => {
                  setSelectedEcg(ecg);
                  setLaudoForm({ ritmo: '', fc: '', pr: '', qrs: '', eixo: '', qt: '', qtQuadrados: '', qtBpm: '', prTipo: '', bre: false, brd: false, bdase: false, dcrd: false, repolarizacao: '', repolarizacaoTipo: '', derivacoes: [], laudoFinal: '' });
                  setShowPrAnormal(false);
                  setShowQrsAnormal(false);
                  setShowEixoAnormal(false);
                  setShowQtAnormal(false);
                  setShowOutroRitmo(false);
                  setShowMarcapassoTipo(false);
                  setShowDerivacoes(false);
                  setShowOutroRepolarizacao(false);
                }}
                className={`flex-row items-center bg-black-100 rounded-lg border-2 border-black-200 px-4 py-3 mb-2`}
              >
                <Text className="text-white font-pmedium flex-1">{ecg.patientName} ({ecg.age} anos) - {ecg.sex}</Text>
                <Text className="text-xs text-gray-300 ml-2">{ecg.priority}</Text>
              </TouchableOpacity>
            ))}

            {/* Lista de ECGs salvos como rascunho */}
            <Text className="text-xl text-yellow-400 font-psemibold text-center mt-8 mb-2">SALVOS</Text>
            {draftEcgs.length === 0 ? (
              <Text className="text-gray-100 text-center mb-4">Nenhum ECG salvo como rascunho.</Text>
            ) : draftEcgs.map(ecg => {
                let borderColor = 'border-yellow-400';
                if (ecg.priority === 'Urgente') borderColor = 'border-red-500';
                else if (ecg.priority === 'Eletivo') borderColor = 'border-blue-500';
                return (
                  <TouchableOpacity
                    key={ecg.id}
                    onPress={() => {
                      setSelectedEcg(ecg);
                      // Preencher o formulário com os dados do rascunho, se existirem
                      if (ecg.laudationDetails) {
                        try {
                          const details = JSON.parse(ecg.laudationDetails);
                          const pr = details.pr || '';
                          const qrs = details.qrs || '';
                          const eixo = details.eixo || '';
                          const qt = details.qt || '';
                          setLaudoForm({
                            ritmo: details.ritmo || '',
                            fc: details.fc || '',
                            pr: pr,
                            qrs: qrs,
                            eixo: eixo,
                            qt: qt,
                            qtQuadrados: details.qtQuadrados || '',
                            qtBpm: details.qtBpm || '',
                            prTipo: details.prTipo || '',
                            bre: details.bre || false,
                            brd: details.brd || false,
                            bdase: details.bdase || false,
                            dcrd: details.dcrd || false,
                            repolarizacao: details.repolarizacao || '',
                            repolarizacaoTipo: details.repolarizacaoTipo || '',
                            derivacoes: details.derivacoes || [],
                            laudoFinal: ecg.laudationContent || ''
                          });
                          setShowPrAnormal(pr !== 'Normal' && pr !== '');
                          setShowQrsAnormal(qrs !== 'Normal' && qrs !== '');
                          setShowEixoAnormal(eixo !== 'Normal' && eixo !== '');
                          setShowQtAnormal(qt !== 'Normal' && qt !== '');
                          setShowMarcapassoTipo(details.ritmo && details.ritmo.includes && details.ritmo.includes('Marcapasso operando'));
                          setShowOutroRitmo(details.ritmo && !ritmoOptions.includes(details.ritmo) && details.ritmo.includes && !details.ritmo.includes('Marcapasso operando'));
                          setShowDerivacoes(details.repolarizacao === 'Infradesnivelamento' || details.repolarizacao === 'Supradesnivelamento');
                          setShowOutroRepolarizacao(details.repolarizacao && !repolarizacaoOptions.includes(details.repolarizacao));
                        } catch {
                          setLaudoForm({ ritmo: '', fc: '', pr: '', qrs: '', eixo: '', qt: '', qtQuadrados: '', qtBpm: '', prTipo: '', bre: false, brd: false, bdase: false, dcrd: false, repolarizacao: '', repolarizacaoTipo: '', derivacoes: [], laudoFinal: '' });
                        }
                      } else {
                        setLaudoForm({ ritmo: '', fc: '', pr: '', qrs: '', eixo: '', qt: '', qtQuadrados: '', qtBpm: '', prTipo: '', bre: false, brd: false, bdase: false, dcrd: false, repolarizacao: '', repolarizacaoTipo: '', derivacoes: [], laudoFinal: '' });
                      }
                    }}
                    className={`flex-row items-center bg-black-100 rounded-lg border-2 px-4 py-3 mb-2 ${borderColor}`}
                  >
                    <Text className="text-white font-pmedium flex-1">{ecg.patientName} ({ecg.age} anos) - {ecg.sex}</Text>
                    <Text className="text-xs text-yellow-400 ml-2">Rascunho</Text>
                  </TouchableOpacity>
                );
              })}
            {/* Lista de ECGs para revisão */}
            <Text className="text-xl text-purple-400 font-psemibold text-center mt-8 mb-2">PARA REVISÃO</Text>
            {reviewEcgs.length === 0 ? (
              <Text className="text-gray-100 text-center mb-4">Nenhum ECG aguardando revisão.</Text>
            ) : reviewEcgs.map(ecg => (
              <TouchableOpacity
                key={ecg.id}
                onPress={() => {
                  setSelectedEcg(ecg);
                  setLaudoForm({ ritmo: '', fc: '', pr: '', qrs: '', eixo: '', qt: '', qtQuadrados: '', qtBpm: '', prTipo: '', bre: false, brd: false, bdase: false, dcrd: false, repolarizacao: '', repolarizacaoTipo: '', derivacoes: [], laudoFinal: '' });
                  setShowPrAnormal(false);
                  setShowQrsAnormal(false);
                  setShowEixoAnormal(false);
                  setShowQtAnormal(false);
                  setShowOutroRitmo(false);
                  setShowMarcapassoTipo(false);
                  setShowDerivacoes(false);
                  setShowOutroRepolarizacao(false);
                }}
                className={`flex-row items-center bg-black-100 rounded-lg border-2 border-purple-400 px-4 py-3 mb-2`}
              >
                <Text className="text-white font-pmedium flex-1">{ecg.patientName} ({ecg.age} anos) - {ecg.sex}</Text>
                <Text className="text-xs text-purple-400 ml-2">Revisão</Text>
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

            <RadioGroup label="Ritmo *" options={ritmoOptions} selectedOption={laudoForm.ritmo} onSelect={(option) => {
              if (option === 'MP (Marcapasso)') {
                setShowMarcapassoTipo(true);
                setShowOutroRitmo(false);
                updateFormAndGenerateLaudo('ritmo', '');
              } else if (option === 'Outro') {
                updateFormAndGenerateLaudo('ritmo', '');
                setShowOutroRitmo(true);
                setShowMarcapassoTipo(false);
              } else {
                updateFormAndGenerateLaudo('ritmo', option);
                setShowOutroRitmo(false);
                setShowMarcapassoTipo(false);
              }
            }} />
            {showMarcapassoTipo && (
              <View className="mt-4">
                <Text className="text-lg text-white font-bold mb-2">Tipo de Marcapasso</Text>
                <View className="flex-row flex-wrap gap-2">
                  <TouchableOpacity onPress={() => {
                    updateFormAndGenerateLaudo('ritmo', 'Marcapasso operando em VAT');
                  }} className={`py-2 px-5 rounded-lg ${laudoForm.ritmo === 'Marcapasso operando em VAT' ? 'bg-blue-600' : 'bg-gray-800 border border-gray-700'}`}>
                    <Text className="text-white">VAT</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => {
                    updateFormAndGenerateLaudo('ritmo', 'Marcapasso operando em VVI');
                  }} className={`py-2 px-5 rounded-lg ${laudoForm.ritmo === 'Marcapasso operando em VVI' ? 'bg-blue-600' : 'bg-gray-800 border border-gray-700'}`}>
                    <Text className="text-white">VVI</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {showOutroRitmo && (
              <FormField
                title="Descreva o ritmo"
                value={laudoForm.ritmo}
                handleChangeText={(e) => updateFormAndGenerateLaudo('ritmo', e)}
                otherStyles="mt-4"
              />
            )}
            <View className="mt-7">
              <Text className="text-xl text-white font-bold mb-2">FC *</Text>
              <TextInput
                value={laudoForm.fc}
                onChangeText={(e) => updateFormAndGenerateLaudo('fc', e)}
                keyboardType="numeric"
                className="w-full h-12 px-4 bg-black-200 border border-gray-600 rounded-lg text-white font-pregular"
                placeholder="Digite a frequência cardíaca"
                placeholderTextColor="#CDCDE0"
              />
            </View>
            <View className="mt-7">
              <Text className="text-lg text-white font-bold mb-2">PR *</Text>
              <View className="flex-row flex-wrap gap-2">
                <TouchableOpacity onPress={() => {
                  updateFormAndGenerateLaudo('pr', 'Normal');
                  setShowPrAnormal(false);
                }} className={`py-2 px-5 rounded-lg ${laudoForm.pr === 'Normal' ? 'bg-blue-600' : 'bg-gray-800 border border-gray-700'}`}>
                  <Text className="text-white">Normal</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
                  setShowPrAnormal(true);
                  if (laudoForm.pr === 'Normal') updateFormAndGenerateLaudo('pr', '');
                }} className={`py-2 px-5 rounded-lg ${showPrAnormal ? 'bg-blue-600' : 'bg-gray-800 border border-gray-700'}`}>
                  <Text className="text-white">Anormal</Text>
                </TouchableOpacity>
              </View>
              {showPrAnormal && (
                <View className="mt-4">
                  <View className="flex-row gap-4 items-end">
                    <View style={{ width: 120 }}>
                      <FormField
                        title="Valor PR (ms)"
                        value={laudoForm.pr === 'Normal' ? '' : laudoForm.pr}
                        handleChangeText={(e) => updateFormAndGenerateLaudo('pr', e)}
                        keyboardType="numeric"
                        otherStyles=""
                      />
                    </View>
                    <View className="flex-row gap-2">
                      <TouchableOpacity onPress={() => {
                        updateFormAndGenerateLaudo('prTipo', 'WPW');
                      }} className={`py-3 px-4 rounded-lg ${laudoForm.prTipo === 'WPW' ? 'bg-blue-600' : 'bg-gray-800 border border-gray-700'}`}>
                        <Text className="text-white">WPW</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => {
                        updateFormAndGenerateLaudo('prTipo', 'BAV 1º');
                      }} className={`py-3 px-4 rounded-lg ${laudoForm.prTipo === 'BAV 1º' ? 'bg-blue-600' : 'bg-gray-800 border border-gray-700'}`}>
                        <Text className="text-white">BAV 1º</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </View>
            <View className="mt-7">
              <Text className="text-lg text-white font-bold mb-2">QRS *</Text>
              <View className="flex-row flex-wrap gap-2">
                <TouchableOpacity onPress={() => {
                  updateFormAndGenerateLaudo('qrs', 'Normal');
                  setShowQrsAnormal(false);
                }} className={`py-2 px-5 rounded-lg ${laudoForm.qrs === 'Normal' ? 'bg-blue-600' : 'bg-gray-800 border border-gray-700'}`}>
                  <Text className="text-white">Normal</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
                  setShowQrsAnormal(true);
                  if (laudoForm.qrs === 'Normal') updateFormAndGenerateLaudo('qrs', '');
                }} className={`py-2 px-5 rounded-lg ${showQrsAnormal ? 'bg-blue-600' : 'bg-gray-800 border border-gray-700'}`}>
                  <Text className="text-white">Anormal</Text>
                </TouchableOpacity>
              </View>
              {showQrsAnormal && (
                <FormField
                  title="Valor do QRS (ms)"
                  value={laudoForm.qrs === 'Normal' ? '' : laudoForm.qrs}
                  handleChangeText={(e) => updateFormAndGenerateLaudo('qrs', e)}
                  keyboardType="numeric"
                  otherStyles="mt-4"
                />
              )}
            </View>

            <View className="mt-7">
              <Text className="text-lg text-white font-bold mb-2">Eixo *</Text>
              <View className="flex-row flex-wrap gap-2">
                <TouchableOpacity onPress={() => {
                  updateFormAndGenerateLaudo('eixo', 'Normal');
                  setShowEixoAnormal(false);
                }} className={`py-2 px-5 rounded-lg ${laudoForm.eixo === 'Normal' ? 'bg-blue-600' : 'bg-gray-800 border border-gray-700'}`}>
                  <Text className="text-white">Normal</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
                  setShowEixoAnormal(true);
                  if (laudoForm.eixo === 'Normal') updateFormAndGenerateLaudo('eixo', '');
                }} className={`py-2 px-5 rounded-lg ${showEixoAnormal ? 'bg-blue-600' : 'bg-gray-800 border border-gray-700'}`}>
                  <Text className="text-white">Anormal</Text>
                </TouchableOpacity>
              </View>
              {showEixoAnormal && (
                <FormField
                  title="Valor do Eixo (graus)"
                  value={laudoForm.eixo === 'Normal' ? '' : laudoForm.eixo}
                  handleChangeText={(e) => updateFormAndGenerateLaudo('eixo', e)}
                  keyboardType="numeric"
                  otherStyles="mt-4"
                />
              )}
            </View>

            <View className="mt-7">
              <Text className="text-lg text-white font-bold mb-2">QT *</Text>
              <View className="flex-row flex-wrap gap-2">
                <TouchableOpacity onPress={() => {
                  updateFormAndGenerateLaudo('qt', 'Normal');
                  setShowQtAnormal(false);
                }} className={`py-2 px-5 rounded-lg ${laudoForm.qt === 'Normal' ? 'bg-blue-600' : 'bg-gray-800 border border-gray-700'}`}>
                  <Text className="text-white">Normal</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
                  setShowQtAnormal(true);
                  if (laudoForm.qt === 'Normal') {
                    updateFormAndGenerateLaudo('qt', '');
                    updateFormAndGenerateLaudo('qtQuadrados', '');
                    updateFormAndGenerateLaudo('qtBpm', '');
                  }
                }} className={`py-2 px-5 rounded-lg ${showQtAnormal ? 'bg-blue-600' : 'bg-gray-800 border border-gray-700'}`}>
                  <Text className="text-white">Anormal</Text>
                </TouchableOpacity>
              </View>
              {showQtAnormal && (
                <View className="mt-4">
                  <View className="flex-row gap-4">
                    <View className="flex-1">
                      <FormField
                        title="Quadrados"
                        value={laudoForm.qtQuadrados}
                        handleChangeText={(e) => updateFormAndGenerateLaudo('qtQuadrados', e)}
                        keyboardType="numeric"
                        otherStyles=""
                      />
                    </View>
                    <View className="flex-1">
                      <FormField
                        title="BPM"
                        value={laudoForm.qtBpm}
                        handleChangeText={(e) => updateFormAndGenerateLaudo('qtBpm', e)}
                        keyboardType="numeric"
                        otherStyles=""
                      />
                    </View>
                  </View>
                  {laudoForm.qt && (
                    <View className="mt-4 p-3 bg-gray-800 rounded-lg">
                      <Text className="text-white font-pmedium">QT calculado: {laudoForm.qt}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
            <View className="mt-7">
              <Text className="text-lg text-white font-bold mb-2">Bloqueios</Text>
              <View className="flex-row flex-wrap gap-2">
              <TouchableOpacity onPress={() => updateFormAndGenerateLaudo('bre', !laudoForm.bre)} className={`py-2 px-5 rounded-lg ${laudoForm.bre ? 'bg-blue-600' : 'bg-gray-800 border border-gray-700'}`}><Text className="text-white">BRE</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => updateFormAndGenerateLaudo('brd', !laudoForm.brd)} className={`py-2 px-5 rounded-lg ${laudoForm.brd ? 'bg-blue-600' : 'bg-gray-800 border border-gray-700'}`}><Text className="text-white">BRD</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => updateFormAndGenerateLaudo('bdase', !laudoForm.bdase)} className={`py-2 px-5 rounded-lg ${laudoForm.bdase ? 'bg-blue-600' : 'bg-gray-800 border border-gray-700'}`}><Text className="text-white">BDASE</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => updateFormAndGenerateLaudo('dcrd', !laudoForm.dcrd)} className={`py-2 px-5 rounded-lg ${laudoForm.dcrd ? 'bg-blue-600' : 'bg-gray-800 border border-gray-700'}`}><Text className="text-white">DCRD</Text></TouchableOpacity>
              </View>
            </View>
            <RadioGroup label="Repolarização *" options={repolarizacaoOptions} selectedOption={laudoForm.repolarizacao} onSelect={(option) => {
              if (option === 'Infradesnivelamento' || option === 'Supradesnivelamento') {
                updateFormAndGenerateLaudo('repolarizacao', option);
                updateFormAndGenerateLaudo('repolarizacaoTipo', option);
                setShowDerivacoes(true);
                setShowOutroRepolarizacao(false);
              } else if (option === 'Outro') {
                updateFormAndGenerateLaudo('repolarizacao', '');
                setShowOutroRepolarizacao(true);
                setShowDerivacoes(false);
              } else {
                updateFormAndGenerateLaudo('repolarizacao', option);
                setShowOutroRepolarizacao(false);
                setShowDerivacoes(false);
              }
            }} />
            {showDerivacoes && (
              <View className="mt-4">
                <Text className="text-lg text-white font-bold mb-2">Derivações</Text>
                <View className="flex-row flex-wrap">
                  {['AVR', 'AVL', 'AVF', 'DI', 'DII', 'DIII', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'].map((derivacao, index) => (
                    <TouchableOpacity
                      key={derivacao}
                      onPress={() => toggleDerivacao(derivacao)}
                      className={`py-2 px-3 rounded-lg mr-2 mb-2 ${laudoForm.derivacoes.includes(derivacao) ? 'bg-blue-600' : 'bg-gray-800 border border-gray-700'}`}
                      style={{ width: '30%' }}
                    >
                      <Text className="text-white text-center text-sm">{derivacao}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            {showOutroRepolarizacao && (
              <FormField
                title="Descreva a repolarização"
                value={laudoForm.repolarizacao}
                handleChangeText={(e) => updateFormAndGenerateLaudo('repolarizacao', e)}
                otherStyles="mt-4"
              />
            )}

            <View className="mt-7">
              <Text className="text-xl text-white font-bold mb-2">Laudo Final *</Text>
              <TextInput
                value={laudoForm.laudoFinal}
                onChangeText={(e) => updateFormAndGenerateLaudo('laudoFinal', e)}
                multiline
                numberOfLines={4}
                className="w-full h-24 px-4 py-3 bg-black-200 border border-gray-600 rounded-lg text-white font-pregular"
                placeholder="Digite o laudo final"
                placeholderTextColor="#CDCDE0"
                textAlignVertical="top"
              />
            </View>
            <CustomButton
              title="Salvar Rascunho"
              handlePress={saveLaudoDraft}
              containerStyles="mt-7 bg-gray-400"
              isLoading={isSubmitting}
            />
            <CustomButton
              title="Submeter Laudo"
              handlePress={submitLaudo}
              containerStyles={`mt-7 ${isFormValid() ? 'bg-blue-600' : 'bg-gray-500'}`}
              isLoading={isSubmitting}
              disabled={!isFormValid()}
            />
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
