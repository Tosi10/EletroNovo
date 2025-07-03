// app/(tabs)/dinamica.jsx

import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useGlobalContext } from '../../context/GlobalProvider';
import { ActivityIndicator, View, Text } from 'react-native';

const Dinamica = () => {
  const router = useRouter();
  const { user, isLoading } = useGlobalContext();

  useEffect(() => {
    if (!isLoading) {
      if (user?.role === 'enfermeiro') {
        // Redireciona para a tela de criação (fora das abas)
        router.replace('/enfermeiro/create'); 
      } else if (user?.role === 'medico') {
        // Redireciona para a tela de laudo (fora das abas)
        router.replace('/medico/laudo');     
      } else {
        // Caso o role não seja reconhecido ou o usuário não esteja logado, 
        // ou se tentar acessar dinamicamente sem um role específico,
        // pode redirecionar para a home para evitar erros.
        router.replace('/home'); 
      }
    }
  }, [user, isLoading, router]);

  // Exibe um indicador de carregamento enquanto o redirecionamento ocorre
  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-primary">
        <ActivityIndicator size="large" color="#FFA001" />
        <Text className="text-white mt-4">Verificando permissões...</Text>
      </View>
    );
  }

  // O componente Dinamica não renderiza UI própria, apenas redireciona
  return null;
};

export default Dinamica;
