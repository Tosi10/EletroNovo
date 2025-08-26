const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

console.log('🚀 Deploy manual limpo para GitHub Pages...');

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

  // 3. Limpar branch gh-pages local se existir
  console.log('🧹 Limpando branch gh-pages local...');
  try {
    execSync('git branch -D gh-pages', { stdio: 'inherit' });
  } catch (error) {
    console.log('   (Branch gh-pages local não existe)');
  }

  // 4. Criar uma nova branch gh-pages limpa
  console.log('🌱 Criando branch gh-pages limpa...');
  execSync('git checkout --orphan gh-pages', { stdio: 'inherit' });
  execSync('git reset --hard', { stdio: 'inherit' });

  // 5. Copiar apenas os arquivos da pasta dist
  console.log('📁 Copiando arquivos da pasta dist...');
  const distPath = path.join(__dirname, '..', 'dist');
  const files = fs.readdirSync(distPath);
  
  files.forEach(file => {
    const srcPath = path.join(distPath, file);
    const destPath = path.join(__dirname, '..', file);
    
    if (fs.statSync(srcPath).isDirectory()) {
      fs.copySync(srcPath, destPath);
    } else {
      fs.copySync(srcPath, destPath);
    }
  });
  
  console.log('✅ Arquivos copiados.');

  // 6. Adicionar e fazer commit
  console.log('💾 Fazendo commit...');
  execSync('git add .', { stdio: 'inherit' });
  execSync('git commit -m "Deploy GitHub Pages - Build limpo"', { stdio: 'inherit' });
  console.log('✅ Commit criado.');

  // 7. Enviar para o GitHub
  console.log('⬆️ Enviando para GitHub...');
  execSync('git push -f origin gh-pages', { stdio: 'inherit' });
  console.log('✅ Enviado para GitHub.');

  // 8. Voltar para a branch main
  console.log('↩️ Voltando para a branch main...');
  execSync('git checkout main', { stdio: 'inherit' });
  console.log('✅ Voltou para a branch main.');

  console.log('🎉 Deploy concluído! Aguarde 2-5 minutos para o site ficar online.');
  console.log('🌐 URL: https://tosi10.github.io/EletroNovo');

} catch (error) {
  console.error('❌ Erro no deploy:', error.message);
  
  // Tentar voltar para main em caso de erro
  try {
    execSync('git checkout main', { stdio: 'inherit' });
    console.log('✅ Voltou para a branch main após erro.');
  } catch (cleanupError) {
    console.error('Erro ao voltar para main:', cleanupError.message);
  }
}
