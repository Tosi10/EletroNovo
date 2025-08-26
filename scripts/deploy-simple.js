const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Deploy simples para GitHub Pages...');

try {
  // 1. Fazer o build da aplicação web
  console.log('📦 Fazendo build...');
  execSync('npx expo export --platform web', { stdio: 'inherit' });
  console.log('✅ Build concluído.');

  // 2. Corrigir caminhos no index.html
  console.log('🔧 Corrigindo caminhos no index.html...');
  const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
  
  if (fs.existsSync(indexPath)) {
    let data = fs.readFileSync(indexPath, 'utf8');
    // Substitui barras invertidas por barras normais
    data = data.replace(/\\/g, '/');
    fs.writeFileSync(indexPath, data, 'utf8');
    console.log('✅ Caminhos corrigidos.');
  } else {
    console.log('⚠️ index.html não encontrado.');
  }

  // 3. Usar gh-pages para deployar apenas a pasta dist
  console.log('⬆️ Enviando para GitHub Pages...');
  execSync('npx gh-pages -d dist', { stdio: 'inherit' });
  console.log('✅ Deploy concluído!');

  console.log('🎉 Aguarde 2-5 minutos para o site ficar online.');
  console.log('🌐 URL: https://tosi10.github.io/EletroNovo');

} catch (error) {
  console.error('❌ Erro no deploy:', error.message);
}
