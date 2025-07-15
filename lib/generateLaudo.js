import axios from 'axios';
import * as FileSystem from 'expo-file-system';

export async function generateLaudo(ecgData, imageUrl) {
  console.log('=== FUNÇÃO GENERATE LAUDO CHAMADA ===');
  console.log('Dados recebidos:', ecgData, 'Imagem:', imageUrl);

  const prompt = `Analise a imagem do ECG e retorne um JSON preenchendo os seguintes campos:\n{\n  "ritmo": "",\n  "fc": "",\n  "pr": "",\n  "qrs": "",\n  "eixo": "",\n  "bre": false,\n  "brd": false,\n  "repolarizacao": "",\n  "outrosAchados": ""\n}\nAtenção: Sempre escolha entre BRE (bloqueio de ramo esquerdo) ou BRD (bloqueio de ramo direito). Um deles deve ser true e o outro false, nunca ambos true ou ambos false. Preencha os demais campos normalmente. Responda apenas com o JSON.`;

  let imageBase64 = null;
  let mimeType = 'image/png';

  if (imageUrl) {
    try {
      const localUri = FileSystem.cacheDirectory + 'ecg_image';
      await FileSystem.downloadAsync(imageUrl, localUri);
      imageBase64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
      if (imageUrl.endsWith('.jpg') || imageUrl.endsWith('.jpeg')) {
        mimeType = 'image/jpeg';
      } else if (imageUrl.endsWith('.webp')) {
        mimeType = 'image/webp';
      }
    } catch (err) {
      console.error('Erro ao baixar imagem do ECG:', err);
      throw new Error('Não foi possível baixar a imagem do ECG.');
    }
  } else {
    throw new Error('Imagem do ECG não encontrada.');
  }

  const GEMINI_API_KEY = 'AIzaSyBfHHvBZv1CCansz-JJv1-irvTskbCUSw8';
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro-002:generateContent?key=${GEMINI_API_KEY}`;

  const body = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType,
              data: imageBase64
            }
          }
        ]
      }
    ]
  };

  try {
    console.log('Fazendo requisição para Gemini...');
    const response = await axios.post(url, body, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('Resposta recebida, status:', response.status);
    console.log('Gemini response:', response.data);
    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Erro ao gerar laudo.');
    // Tenta fazer o parse do JSON retornado
    try {
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const jsonString = text.substring(jsonStart, jsonEnd + 1);
        const parsed = JSON.parse(jsonString);
        // Garante que sempre um dos campos seja true
        if (typeof parsed.bre === 'boolean' && typeof parsed.brd === 'boolean') {
          if (parsed.bre === parsed.brd) {
            // Se ambos true ou ambos false, define bre como true e brd como false
            parsed.bre = true;
            parsed.brd = false;
          }
        }
        return parsed;
      } else {
        throw new Error('Resposta da IA não contém JSON válido.');
      }
    } catch (parseErr) {
      console.error('Erro ao fazer parse do JSON retornado pela IA:', parseErr);
      throw new Error('A resposta da IA não pôde ser interpretada como JSON.');
    }
  } catch (err) {
    console.error('Erro ao chamar Gemini:', err.response?.data || err.message);
    throw err;
  }
} 