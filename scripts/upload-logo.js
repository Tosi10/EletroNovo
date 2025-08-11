// Script para fazer upload da logo da empresa para o Firebase Storage
// Execute este script uma vez para configurar a logo no storage

const { uploadCompanyLogo } = require('../lib/firebase.js');

const uploadLogo = async () => {
  try {
    console.log('Iniciando upload da logo da empresa...');
    const logoUrl = await uploadCompanyLogo();
    console.log('✅ Logo enviada com sucesso!');
    console.log('URL da logo:', logoUrl);
    console.log('\n📧 Use esta URL no seu email template:');
    console.log(`const LOGO_URL = '${logoUrl}';`);
  } catch (error) {
    console.error('❌ Erro ao fazer upload da logo:', error.message);
  }
};

uploadLogo();
