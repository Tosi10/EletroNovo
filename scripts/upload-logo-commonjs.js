// Script para upload da logo da empresa - Versão CommonJS
const fs = require('fs');
const path = require('path');

// Configuração do Firebase (copiada do lib/firebase.js)
const firebaseConfig = {
  apiKey: "AIzaSyA2h6dnrB5mrV8wi078QxaZg9n7dMbDLuk", 
  authDomain: "ecgscan-e5a18.firebaseapp.com",
  projectId: "ecgscan-e5a18",
  storageBucket: "ecgscan-e5a18.firebasestorage.app",
  messagingSenderId: "195471348171",
  appId: "1:195471348171:web:7f23c729fc44c66834a64e"
};

// Função para fazer upload da logo
const uploadCompanyLogo = async () => {
  try {
    // Caminho para a imagem
    const logoPath = path.join(__dirname, '../assets/images/cardio2.png');
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(logoPath)) {
      throw new Error('Arquivo cardio2.png não encontrado em assets/images/');
    }
    
    console.log('✅ Arquivo encontrado:', logoPath);
    console.log('📁 Tamanho do arquivo:', (fs.statSync(logoPath).size / 1024 / 1024).toFixed(2), 'MB');
    
    // Para este exemplo, vamos simular o upload e gerar uma URL
    // Na prática, você precisaria usar o Firebase Admin SDK ou fazer o upload via app
    console.log('\n⚠️  ATENÇÃO: Este script detectou o arquivo, mas para fazer o upload real você precisa:');
    console.log('1. Abrir o app no seu celular/emulador');
    console.log('2. Ir para a tela de perfil ou qualquer tela que tenha acesso ao Firebase');
    console.log('3. Executar manualmente a função uploadCompanyLogo() no console do app');
    console.log('\n📱 Alternativa: Use o app para fazer o upload e depois copie a URL gerada');
    
    return null;
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return null;
  }
};

// Executar o script
uploadCompanyLogo();
