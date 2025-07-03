import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';

/**
 * Hook customizado para buscar dados do Firebase Firestore.
 * @param {function} fetchCallback Uma função assíncrona que retorna os dados do Firebase.
 * @param {Array} dependencies Array de dependências para re-executar o fetch.
 */
const useFirebaseData = (fetchCallback, dependencies = []) => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // O useCallback depende apenas das dependências fornecidas
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchCallback();
      if (Array.isArray(response)) {
        setData(response);
      } else if (response === null || response === undefined) {
        setData([]);
      } else {
        setData([response]);
        console.warn('useFirebaseData: fetchCallback retornou um não-array. Encapsulando em array.');
      }
    } catch (err) {
      setError(err);
      setData([]);
      console.error("useFirebaseData: Erro ao buscar dados:", err);
      Alert.alert('Erro ao Carregar Dados', err.message || 'Ocorreu um erro ao carregar os dados.');
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  useEffect(() => {
    fetchData();
     
  }, [fetchData]);

  const refetch = fetchData;

  return { data, isLoading, refetch, error };
};

export default useFirebaseData;