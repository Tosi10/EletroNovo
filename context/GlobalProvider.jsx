import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getCurrentUser } from "../lib/firebase";

const GlobalContext = createContext();
export const useGlobalContext = () => useContext(GlobalContext);

const GlobalProvider = ({ children }) => {
  const [isLogged, setIsLogged] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    setLoading(true);
    let fetchedUser = null;
    try {
      const currentUserProfile = await getCurrentUser();
      if (currentUserProfile) {
        fetchedUser = currentUserProfile;
        setIsLogged(true);
        console.log('Usuário autenticado:', currentUserProfile);
      } else {
        setIsLogged(false);
        console.log('Nenhum usuário logado.');
      }
    } catch (error) {
      setIsLogged(false);
      console.error('Erro ao buscar usuário:', error);
    } finally {
      setUser(fetchedUser);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return (
    <GlobalContext.Provider value={{ isLogged, setIsLogged, user, setUser, isLoading: loading, refetchUser: fetchUser }}>
      {children}
    </GlobalContext.Provider>
  );
};

export default GlobalProvider;