// lib/firebase.js - Configuração e Funções do Firebase

// Importações do Firebase
import { initializeApp } from 'firebase/app';
import {
    createUserWithEmailAndPassword,
    signOut as firebaseAuthSignOut,
    getAuth,
    getReactNativePersistence,
    initializeAuth, // Renomeado para evitar qualquer conflito, só para clareza interna
    onAuthStateChanged,
    signInWithEmailAndPassword
} from 'firebase/auth';
import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    getFirestore,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where, // Import onSnapshot
    writeBatch // Import writeBatch
} from 'firebase/firestore';
import {
    getDownloadURL,
    getStorage,
    ref,
    uploadBytes
} from 'firebase/storage';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Suas configurações do Firebase (DEVE SER MANTIDO PELO USUÁRIO)
const firebaseConfig = {
  apiKey: "AIzaSyA2h6dnrB5mrV8wi078QxaZg9n7dMbDLuk", 
  authDomain: "ecgscan-e5a18.firebaseapp.com",
  projectId: "ecgscan-e5a18",
  storageBucket: "ecgscan-e5a18.firebasestorage.app",
  messagingSenderId: "195471348171",
  appId: "1:195471348171:web:7f23c729fc44c66834a64e"
};

// Inicializa o Firebase App
const app = initializeApp(firebaseConfig);

let authInstance; // Use um nome diferente para a instância de auth para clareza
// ATENÇÃO AQUI: Inicialização condicional da persistência com base na plataforma
if (Platform.OS === 'ios' || Platform.OS === 'android') {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
  console.log("Firebase: Usando persistência para React Native (AsyncStorage).");
} else {
  // Para Web e outras plataformas, usa getAuth, que já gerencia a persistência padrão do navegador
  authInstance = getAuth(app);
  console.log("Firebase: Usando persistência padrão do navegador (web).");
}

const db = getFirestore(app);
const storage = getStorage(app);

// Exportar instâncias do Firebase
export { app, authInstance, db, storage }; // <<< ATENÇÃO AQUI: Exportando 'authInstance'

// --- FUNÇÕES DE LÓGICA DO BACKEND COM FIREBASE ---

/**
 * Cria um novo usuário no Firebase Authentication e um documento de perfil no Firestore.
 * @param {string} email O e-mail do usuário.
 * @param {string} password A senha do usuário.
 * @param {string} username O nome de usuário.
 * @param {string} role O papel do usuário (ex: 'enfermeiro', 'medico').
 * @returns {object} O objeto de usuário do Firestore.
 */
export const createUser = async (email, password, username, role = 'enfermeiro') => {
  try {
    const userCredential = await createUserWithEmailAndPassword(authInstance, email, password); // Usa authInstance
    const user = userCredential.user;

    const userDocRef = doc(db, 'users', user.uid); 
    const userProfile = {
      uid: user.uid,
      email: user.email,
      username: username,
      avatar: `https://ui-avatars.com/api/?name=${username}&background=random`, 
      role: role, 
      createdAt: serverTimestamp(), 
    };

    await setDoc(userDocRef, userProfile); 

    console.log('Firebase: Usuário criado e perfil salvo no Firestore:', userProfile);
    return userProfile; 
  } catch (error) {
    console.error('Firebase: Erro ao criar usuário:', error.message);
    throw new Error(error.message); 
  }
};

/**
 * Autentica um usuário no Firebase Authentication.
 * @param {string} email O e-mail do usuário.
 * @param {string} password A senha do usuário.
 * @returns {object} O objeto de usuário do Firebase Auth.
 */
export const signIn = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(authInstance, email, password); // Usa authInstance
    console.log('Firebase: Login bem-sucedido para:', userCredential.user.email);
    return userCredential.user;
  } catch (error) {
    console.error('Firebase: Erro ao fazer login:', error.message);
    throw new Error(error.message);
  }
};

/**
 * Faz logout do usuário atual no Firebase Authentication.
 */
export const signOut = async () => {
  try {
    await firebaseAuthSignOut(authInstance); // Usa firebaseAuthSignOut com authInstance
    console.log('Firebase: Logout bem-sucedido.');
    return true;
  } catch (error) {
    console.error('Firebase: Erro ao fazer logout:', error.message);
    throw new Error(error.message);
  }
};

/**
 * Obtém o usuário atualmente logado e seu perfil do Firestore.
 * Esta função é robusta para persistência de sessão e busca o perfil completo.
 * @returns {object|null} O objeto de perfil do usuário (do Firestore) ou null se não houver usuário logado.
 */
export const getCurrentUser = () => {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(authInstance, async (user) => { // Usa authInstance
      unsubscribe(); 
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            console.log('Firebase: Perfil do usuário carregado:', userDocSnap.data());
            resolve(userDocSnap.data()); 
          } else {
            console.warn('Firebase: Usuário autenticado, mas perfil não encontrado no Firestore. Criando perfil...');
            const newProfile = await ensureUserProfile(user); 
            resolve(newProfile);
          }
        } catch (error) {
          console.error('Firebase: Erro ao buscar/criar perfil do usuário no Firestore:', error.message);
          reject(error);
        }
      } else {
        console.log('Firebase: Nenhum usuário logado.');
        resolve(null);
      }
    });
  });
};

/**
 * Garante que o perfil de um usuário exista no Firestore.
 * @param {object} userAuth O objeto de usuário retornado pelo Firebase Authentication.
 * @returns {object} O documento de perfil do usuário do Firestore.
 */
export const ensureUserProfile = async (userAuth) => {
  if (!userAuth || !userAuth.uid) {
    throw new Error('Objeto de usuário de autenticação inválido.');
  }

  const userDocRef = doc(db, 'users', userAuth.uid);
  try {
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      console.log('Firebase: Perfil do usuário já existe:', userDocSnap.data());
      return userDocSnap.data();
    } else {
      console.log('Firebase: Criando perfil para novo usuário...');
      const username = userAuth.displayName || userAuth.email.split('@')[0];
      const avatarUrl = userAuth.photoURL || `https://ui-avatars.com/api/?name=${username.replace(/\s/g, '+')}&background=random`;
      
      const newProfileData = {
        uid: userAuth.uid,
        email: userAuth.email,
        username: username,
        avatar: avatarUrl,
        role: 'enfermeiro', 
        createdAt: serverTimestamp(),
      };
      await setDoc(userDocRef, newProfileData);
      console.log('Firebase: Perfil do usuário criado.');
      return newProfileData;
    }
  } catch (error) {
    console.error('Firebase: Erro ao garantir perfil do usuário:', error.message);
    throw new Error(error.message);
  }
};

/**
 * Faz upload de um arquivo para o Firebase Storage.
 * @param {object} file Objeto de arquivo do ImagePicker (uri, fileName, mimeType).
 * @param {string} type Tipo do arquivo (ex: 'image').
 * @returns {string} URL de download do arquivo.
 */
export const uploadFile = async (file, type) => {
  if (!file || !file.uri) throw new Error('Arquivo inválido para upload.');

  try {
    const response = await fetch(file.uri);
    const blob = await response.blob();

    const storageRef = ref(storage, `ecg_images/${file.fileName || Date.now()}`);
    const uploadTask = await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(uploadTask.ref);

    console.log('Firebase Storage: Arquivo enviado com sucesso. URL:', downloadURL);
    return downloadURL;
  } catch (error) {
    console.error('Firebase Storage: Erro ao fazer upload do arquivo:', error);
    throw new Error(`Erro ao fazer upload do arquivo: ${error.message}`);
  }
};

/**
 * Cria um novo documento de ECG no Cloud Firestore.
 * @param {object} ecgData Dados do ECG (patientName, age, sex, hasPacemaker, priority, ecgFile, notes, uploaderId).
 * @returns {string} O ID do documento do ECG criado.
 */
export async function createEcg({ patientName, age, sex, hasPacemaker, priority, ecgFile, notes, uploaderId }) {
  try {
    const imageUrl = await uploadFile(ecgFile, 'image');

    const ecgDocRef = collection(db, 'ecgs'); // Coleção 'ecgs'
    const newEcg = await addDoc(ecgDocRef, {
      patientName,
      age: parseInt(age),
      sex,
      hasPacemaker,
      priority,
      imageUrl,
      status: 'pending',
      notes,
      uploaderId,
      createdAt: serverTimestamp(), 
      emailSent: false, // Indica que o email ainda não foi enviado
    });

    console.log('Firebase Firestore: ECG criado com ID:', newEcg.id);
    return newEcg.id; // Retorna APENAS o ID do novo documento
  } catch (error) {
    console.error('Firebase Firestore: Erro ao criar ECG:', error);
    throw new Error(error.message);
  }
}

/**
 * Busca um ECG específico por ID no Cloud Firestore.
 * @param {string} ecgId O ID do documento do ECG.
 * @returns {object|null} O documento do ECG ou null se não for encontrado.
 */
export const getEcgById = async (ecgId) => {
  try {
    const ecgDocRef = doc(db, 'ecgs', ecgId);
    const ecgSnap = await getDoc(ecgDocRef);
    if (ecgSnap.exists()) {
      const ecgData = { id: ecgSnap.id, ...ecgSnap.data() };
      // Popula o campo creator e laudationDoctor se existirem
      if (ecgData.uploaderId) {
        try {
          const uploaderSnap = await getDoc(doc(db, 'users', ecgData.uploaderId));
          if (uploaderSnap.exists()) {
            ecgData.creator = { id: uploaderSnap.id, ...uploaderSnap.data() };
          } else {
            console.warn(`Firebase: Perfil do uploader com ID ${ecgData.uploaderId} não encontrado.`);
            ecgData.creator = { username: 'Desconhecido', avatar: `https://ui-avatars.com/api/?name=U` };
          }
        } catch (e) {
          console.error(`Erro ao buscar perfil do criador ${ecgData.uploaderId}:`, e.message);
          ecgData.creator = { username: 'Erro', avatar: `https://ui-avatars.com/api/?name=E` };
        }
      }
      if (ecgData.laudationDoctorId) {
        try {
          const doctorSnap = await getDoc(doc(db, 'users', ecgData.laudationDoctorId));
          if (doctorSnap.exists()) {
            ecgData.laudationDoctor = { id: doctorSnap.id, ...doctorSnap.data() };
          } else {
            console.warn(`Firebase: Perfil do médico laudador ${ecgData.laudationDoctorId} não encontrado.`);
            ecgData.laudationDoctor = { username: 'Médico Desconhecido', avatar: `https://ui-avatars.com/api/?name=M` };
          }
        } catch (e) {
          console.error(`Erro ao buscar perfil do médico laudador ${ecgData.laudationDoctorId}:`, e.message);
          ecgData.laudationDoctor = { username: 'Erro Médico', avatar: `https://ui-avatars.com/api/?name=ME` };
        }
      }
      return ecgData;
    } else {
      throw new Error('ECG não encontrado.');
    }
  } catch (error) {
    console.error(`Firebase Firestore: Erro ao buscar ECG com ID ${ecgId}:`, error);
    throw new Error(error.message);
  }
};


/**
 * Busca todos os ECGs enviados por um usuário específico.
 * @param {string} uploaderId O UID do usuário que fez o upload.
 * @returns {Array<object>} Lista de documentos de ECG.
 */
export const getUserPosts = async (uploaderId) => {
  try {
    if (!uploaderId) return [];

    const q = query(collection(db, 'ecgs'), where('uploaderId', '==', uploaderId), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const ecgs = [];
    for (const docSnapshot of querySnapshot.docs) {
      const ecgData = { id: docSnapshot.id, ...docSnapshot.data() };
      
      if (ecgData.uploaderId) {
        try {
          const uploaderProfileRef = doc(db, 'users', ecgData.uploaderId);
          const uploaderSnap = await getDoc(uploaderProfileRef);
          if (uploaderSnap.exists()) {
            ecgData.creator = { id: uploaderSnap.id, ...uploaderSnap.data() };
          } else {
            console.warn(`Firebase: Perfil do uploader com ID ${ecgData.uploaderId} não encontrado.`);
            ecgData.creator = { username: 'Desconhecido', avatar: `https://ui-avatars.com/api/?name=U` };
          }
        } catch (profileError) {
          console.error(`Firebase: Erro ao buscar perfil do uploader ${ecgData.uploaderId}:`, profileError);
          ecgData.creator = { username: 'Erro', avatar: `https://ui-avatars.com/api/?name=E` };
        }
      }

      if (ecgData.status === 'lauded' && ecgData.laudationDoctorId) {
        try {
          const doctorProfileRef = doc(db, 'users', ecgData.laudationDoctorId);
          const doctorSnap = await getDoc(doctorProfileRef);
          if (doctorSnap.exists()) {
            ecgData.laudationDoctor = { id: doctorSnap.id, ...doctorSnap.data() };
          } else {
            console.warn(`Firebase: Perfil do médico com ID ${ecgData.laudationDoctorId} não encontrado.`);
            ecgData.laudationDoctor = { username: 'Médico Desconhecido', avatar: `https://ui-avatars.com/api/?name=M` };
          }
        } catch (doctorProfileError) {
          console.error(`Firebase: Erro ao buscar perfil do médico ${ecgData.laudationDoctorId}:`, doctorProfileError);
          ecgData.laudationDoctor = { username: 'Erro Médico', avatar: `https://ui-avatars.com/api/?name=ME` };
        }
      }

      ecgs.push(ecgData);
    }
    return ecgs;
  } catch (error) {
    console.error("Firebase Firestore: Erro ao buscar ECGs do usuário:", error);
    throw new Error(error.message);
  }
};

/**
 * Busca todos os ECGs laudados por um médico específico.
 * @param {string} doctorId O UID do médico que laudou.
 * @returns {Array<object>} Lista de documentos de ECG laudados.
 */
export const getLaudedEcgsByDoctorId = async (doctorId) => {
  try {
    if (!doctorId) return [];

    const q = query(
      collection(db, 'ecgs'),
      where('laudationDoctorId', '==', doctorId),
      where('status', '==', 'lauded'),
      orderBy('createdAt', 'desc') 
    );
    const querySnapshot = await getDocs(q);
    const ecgs = [];
    for (const docSnapshot of querySnapshot.docs) {
      const ecgData = { id: docSnapshot.id, ...docSnapshot.data() };
      
      if (ecgData.uploaderId) {
        try {
          const uploaderProfileRef = doc(db, 'users', ecgData.uploaderId);
          const uploaderSnap = await getDoc(uploaderProfileRef);
          if (uploaderSnap.exists()) {
            ecgData.creator = { id: uploaderSnap.id, ...uploaderSnap.data() };
          } else {
            console.warn(`Firebase: Perfil do uploader ${ecgData.uploaderId} não encontrado.`);
            ecgData.creator = { username: 'Uploader Desconhecido', avatar: `https://ui-avatars.com/api/?name=U` };
          }
        } catch (profileError) {
          console.error(`Firebase: Erro ao buscar perfil do uploader ${ecgData.uploaderId}:`, profileError);
          ecgData.creator = { username: 'Erro Uploader', avatar: `https://ui-avatars.com/api/?name=E` };
        }
      }
      
      // O laudationDoctor é o próprio médico logado, então podemos populá-lo diretamente
      // Ou, se quisermos pegar do Firestore para ter certeza dos dados mais recentes:
      const doctorProfileRef = doc(db, 'users', doctorId);
      const doctorSnap = await getDoc(doctorProfileRef);
      if (doctorSnap.exists()) {
        ecgData.laudationDoctor = { id: doctorSnap.id, ...doctorSnap.data() };
      } else {
        ecgData.laudationDoctor = { username: 'Você (Desconhecido)', avatar: `https://ui-avatars.com/api/?name=V` };
      }

      ecgs.push(ecgData);
    }
    return ecgs;
  } catch (error) {
    console.error("Firebase Firestore: Erro ao buscar ECGs laudados pelo médico:", error);
    throw new Error(error.message);
  }
};


/**
 * Busca ECGs com status 'pending' e opcionalmente por prioridade.
 * @param {string|null} priority O tipo de prioridade ('Urgente', 'Eletivo') ou null para todos.
 * @returns {Array<object>} Lista de documentos de ECG pendentes.
 */
export const getPendingEcgs = async (priority = null) => {
  try {
    let q;
    if (priority) {
      q = query(collection(db, 'ecgs'), where('status', '==', 'pending'), where('priority', '==', priority), orderBy('createdAt', 'desc'));
    } else {
      q = query(collection(db, 'ecgs'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
    }
    
    const querySnapshot = await getDocs(q);
    const ecgs = [];
    for (const docSnapshot of querySnapshot.docs) {
      const ecgData = { id: docSnapshot.id, ...docSnapshot.data() };

      if (ecgData.uploaderId) {
        try {
          const uploaderProfileRef = doc(db, 'users', ecgData.uploaderId);
          const uploaderSnap = await getDoc(uploaderProfileRef);
          if (uploaderSnap.exists()) {
            ecgData.creator = { id: uploaderSnap.id, ...uploaderSnap.data() };
          } else {
            console.warn(`Firebase: Perfil do uploader ${ecgData.uploaderId} não encontrado.`);
            ecgData.creator = { username: 'Desconhecido', avatar: `https://ui-avatars.com/api/?name=U` };
          }
        } catch (profileError) {
          console.error(`Firebase: Erro ao buscar perfil do criador ${ecgData.uploaderId}:`, profileError);
          ecgData.creator = { username: 'Erro', avatar: `https://ui-avatars.com/api/?name=E` };
        }
      }
      ecgs.push(ecgData);
    }
    return ecgs;
  } catch (error) {
    console.error(`Firebase Firestore: Erro ao buscar ECGs pendentes (priority: ${priority}):`, error);
    throw new Error(error.message);
  }
};

/**
 * Busca ECGs pelo nome do paciente (case insensitive, filtro no cliente).
 * @param {string} name Parte do nome do paciente.
 * @returns {Array<object>} Lista de ECGs encontrados.
 */
export const searchEcgsByPatientName = async (name) => {
  try {
    const q = query(collection(db, 'ecgs'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const lower = name.toLowerCase();
    return querySnapshot.docs
      .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
      .filter(ecg => ecg.patientName && ecg.patientName.toLowerCase().includes(lower));
  } catch (error) {
    console.error('Erro ao buscar ECGs por nome:', error);
    throw new Error(error.message);
  }
};

/**
 * Atualiza um documento de ECG com os dados do laudo no Cloud Firestore.
 * @param {string} ecgId O ID do documento do ECG a ser atualizado.
 * @param {string} laudationContent O conteúdo do laudo (texto livre).
 * @param {string} laudationDoctorId O UID do médico que laudou.
 * @param {object} laudationDetails Detalhes estruturados do laudo.
 * @returns {string} O ID do documento do ECG laudado.
 */
export const updateEcgLaudation = async (ecgId, laudationContent, laudationDoctorId, laudationDetails) => {
  try {
    const ecgDocRef = doc(db, 'ecgs', ecgId); 
    await updateDoc(ecgDocRef, {
      status: 'lauded',
      laudationContent: laudationContent,
      laudationDoctorId: laudationDoctorId,
      laudationDetails: JSON.stringify(laudationDetails), 
      laudedAt: serverTimestamp(), 
    });
    console.log("Firebase Firestore: ECG atualizado com laudo:", ecgId);
    return ecgId;
  } catch (error) {
    console.error("Firebase Firestore: Erro ao atualizar ECG com laudo:", error);
    throw new Error(error.message);
  }
};

/**
 * Busca mensagens de um ECG específico no Cloud Firestore.
 * AGORA POPULA isRead para o leitor atual
 * @param {string} ecgId O ID do ECG.
 * @param {string} currentUserId O UID do usuário atual (para marcar como lida).
 * @returns {Array<object>} Lista de mensagens do chat.
 */
export const getEcgMessages = async (ecgId, currentUserId) => {
  try {
    const q = query(collection(db, `ecgs/${ecgId}/messages`), orderBy('createdAt', 'asc'));
    const querySnapshot = await getDocs(q);

    const messagesData = await Promise.all(querySnapshot.docs.map(async (docSnapshot) => {
      const message = { id: docSnapshot.id, ...docSnapshot.data() };
      
      // Popula o campo sender
      if (message.senderId) {
        try {
          const senderProfileSnap = await getDoc(doc(db, 'users', message.senderId));
          if (senderProfileSnap.exists()) {
            message.sender = { id: senderProfileSnap.id, ...senderProfileSnap.data() };
          } else {
            console.warn(`Firebase: Perfil do remetente ${message.senderId} não encontrado.`);
            message.sender = { username: 'Desconhecido', avatar: `https://ui-avatars.com/api/?name=U` };
          }
        } catch (e) {
          console.error(`Firebase: Erro ao buscar perfil do remetente ${message.senderId}:`, e.message);
          message.sender = { username: 'Erro', avatar: `https://ui-avatars.com/api/?name=E` };
        }
      }

      // Adiciona 'isRead' baseado no array 'readBy'
      // Se readBy não existir ou não incluir o currentUserId, é considerado não lido.
      message.isRead = message.readBy && message.readBy.includes(currentUserId);

      return message;
    }));
    return messagesData;
  } catch (error) {
    console.error('Firebase Firestore: Erro ao buscar mensagens do ECG:', error.message);
    throw new Error(error.message);
  }
};

/**
 * Envia uma nova mensagem para um ECG no Cloud Firestore.
 * Inclui o senderId no array readBy por padrão.
 * @param {string} ecgId O ID do ECG.
 * @param {string} senderId O UID do remetente.
 * @param {string} message O conteúdo da mensagem.
 * @returns {string} O ID da mensagem criada.
 */
export const sendEcgMessage = async (ecgId, senderId, message, imageUrl = null) => {
  try {
    const messagesCollectionRef = collection(db, `ecgs/${ecgId}/messages`);
    const newMessageDoc = await addDoc(messagesCollectionRef, {
      ecgId,
      senderId,
      message,
      imageUrl, // Salva o campo de imagem se fornecido
      createdAt: serverTimestamp(), 
      readBy: [senderId],
    });
    console.log('Firebase Firestore: Mensagem enviada com ID:', newMessageDoc.id);
    return newMessageDoc.id;
  } catch (error) {
    console.error('Firebase Firestore: Erro ao enviar mensagem do ECG:', error.message);
    throw new Error(error.message);
  }
};

/**
 * Subscreve a atualizações em tempo real das mensagens de um ECG no Cloud Firestore.
 * @param {string} ecgId O ID do ECG.
 * @param {string} currentUserId O UID do usuário atual para marcar como lida.
 * @param {function} callback Função de callback para cada nova mensagem.
 * @returns {function} Uma função para cancelar a subscrição.
 */
export const subscribeToEcgMessages = (ecgId, currentUserId, callback) => {
  const q = query(collection(db, `ecgs/${ecgId}/messages`), orderBy('createdAt', 'asc'));
  const unsubscribe = onSnapshot(q, async (snapshot) => {
    const updatedMessages = [];
    for (const docSnapshot of snapshot.docs) { // Itera sobre todos os documentos no snapshot
      const messageData = { id: docSnapshot.id, ...docSnapshot.data() };
      
      // Popula o sender
      if (messageData.senderId) {
        try {
          const senderProfileRef = doc(db, 'users', messageData.senderId);
          const senderSnap = await getDoc(senderProfileRef);
          if (senderSnap.exists()) {
            messageData.sender = { id: senderSnap.id, ...senderSnap.data() };
          } else {
            console.warn(`Firebase: Perfil do remetente ${messageData.senderId} não encontrado (realtime).`);
            messageData.sender = { username: 'Desconhecido', avatar: `https://ui-avatars.com/api/?name=U` };
          }
        } catch (profileError) {
          console.error(`Firebase: Erro ao buscar perfil do remetente ${messageData.senderId} (realtime):`, profileError);
          messageData.sender = { username: 'Erro Realtime', avatar: `https://ui-avatars.com/api/?name=E` };
        }
      }
      
      // Adiciona 'isRead' baseado no array 'readBy' para o usuário atual
      messageData.isRead = messageData.readBy && messageData.readBy.includes(currentUserId);
      
      updatedMessages.push(messageData);
    }
    callback(updatedMessages); // Passa TODAS as mensagens atualizadas para o callback
  }, (error) => {
    console.error("Firebase Firestore: Erro na subscrição de mensagens em tempo real:", error);
  });
  return unsubscribe;
};


/**
 * Marca as mensagens de um ECG como lidas para um usuário específico.
 * Adiciona o readerId ao array 'readBy' de mensagens onde o usuário não é o remetente e ainda não leu.
 * @param {string} ecgId O ID do ECG.
 * @param {string} readerId O UID do usuário que está lendo as mensagens.
 */
export const markEcgMessagesAsRead = async (ecgId, readerId) => {
  try {
    const messagesCollectionRef = collection(db, `ecgs/${ecgId}/messages`);
    
    // Busca todas as mensagens do chat, filtrando no cliente para evitar problemas de índice
    const allMessagesSnapshot = await getDocs(messagesCollectionRef);
    const batch = writeBatch(db);
    let messagesMarked = 0;

    allMessagesSnapshot.forEach((docSnap) => {
      const message = docSnap.data();
      // Se a mensagem não foi enviada pelo usuário atual E ele ainda não a leu
      if (message.senderId !== readerId && (!message.readBy || !message.readBy.includes(readerId))) {
        const newReadBy = [...(message.readBy || []), readerId];
        batch.update(docSnap.ref, { readBy: newReadBy });
        messagesMarked++;
      }
    });

    if (messagesMarked > 0) {
      await batch.commit();
      console.log(`${messagesMarked} mensagens para ECG ${ecgId} marcadas como lidas por ${readerId}.`);
    } else {
      console.log(`Nenhuma nova mensagem para ECG ${ecgId} para marcar como lida por ${readerId}.`);
    }
  } catch (error) {
    console.error("Erro ao marcar mensagens do ECG como lidas:", error);
    throw new Error(error.message);
  }
};

// Busca pacientes únicos dos ECGs enviados pelo usuário (enfermeiro ou médico)
export const getUniquePatients = async (userId, role) => {
  try {
    const q = query(
      collection(db, 'ecgs'),
      where(role === 'enfermeiro' ? 'uploaderId' : 'laudationDoctorId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    const patients = {};
    querySnapshot.forEach(doc => {
      const data = doc.data();
      if (data.patientName) {
        patients[data.patientName] = {
          name: data.patientName,
          age: data.age,
          sex: data.sex
        };
      }
    });
    return Object.values(patients);
  } catch (error) {
    console.error('Erro ao buscar pacientes únicos:', error);
    throw new Error(error.message);
  }
};

// Busca todos os ECGs de um paciente específico
export const getEcgsByPatient = async (patientName) => {
  try {
    const q = query(
      collection(db, 'ecgs'),
      where('patientName', '==', patientName),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Erro ao buscar ECGs do paciente:', error);
    throw new Error(error.message);
  }
};

/**
 * Busca o expoPushToken de um usuário pelo userId.
 * @param {string} userId
 * @returns {string|null} expoPushToken ou null
 */
export const getUserPushToken = async (userId) => {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      const data = userSnap.data();
      return data.expoPushToken || null;
    }
    return null;
  } catch (error) {
    console.error('Erro ao buscar expoPushToken do usuário:', error);
    return null;
  }
};

/**
 * Envia uma notificação push via Expo para um dispositivo.
 * @param {string} expoPushToken Token do destinatário (Expo push token)
 * @param {string} title Título da notificação
 * @param {string} body Corpo da notificação
 */
export async function sendPushNotification(expoPushToken, title, body) {
  try {
    const message = {
      to: expoPushToken,
      sound: 'default',
      title,
      body,
      data: {},
    };
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
    console.log('Push notification enviada para', expoPushToken);
  } catch (error) {
    console.error('Erro ao enviar push notification:', error);
  }
}