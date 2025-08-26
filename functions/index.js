// Importações necessárias para Firebase Functions, Admin SDK e SendGrid
const functions = require('firebase-functions/v1'); // Importa a biblioteca principal do Firebase Functions (compatível com a API v1)
const admin = require('firebase-admin'); // Importa o SDK Admin do Firebase para interagir com o Firestore e outros serviços
const sgMail = require('@sendgrid/mail'); // Importa a biblioteca SendGrid para envio de e-mails
// Configuração da URL da logo - esta URL será gerada após o upload da logo para o Firebase Storage
// Para obter a URL correta, execute o script: node scripts/upload-logo.js
const LOGO_URL = 'https://firebasestorage.googleapis.com/v0/b/ecgscan-e5a18.firebasestorage.app/o/images%2Fcardio2.png?alt=media&token=76413d86-454d-4ae0-a9c0-ecca0b7cf4f4';

// Inicializa o SDK Admin do Firebase.
// Isso permite que a função interaja com os serviços do Firebase (Firestore, etc.).
admin.initializeApp();

// A Cloud Function será acionada SEMPRE que um documento na coleção 'ecgs' for ATUALIZADO.
// O caminho 'ecgs/{ecgId}' indica que a função será acionada para qualquer documento em 'ecgs'.
exports.sendLaudationEmail = functions.firestore
  .document('ecgs/{ecgId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data(); // Dados do documento após a atualização
    const previousData = change.before.data(); // Dados do documento antes da atualização
    const ecgId = context.params.ecgId; // ID do documento do ECG que foi atualizado

    console.log(`Função 'sendLaudationEmail' acionada para ECG ID: ${ecgId}`);
    console.log(`Status Anterior: ${previousData.status || 'undefined'}, Status Novo: ${newData.status || 'undefined'}`);
    console.log(`Email Enviado Anteriormente (newData.emailSent): ${newData.emailSent || false}`);

    // Condição para enviar o email:
    // 1. O status mudou para 'lauded'
    // 2. E o status anterior NÃO era 'lauded' (garante que a mudança ocorreu AGORA)
    // 3. E o campo 'emailSent' (no novo dado) NÃO é true (garante que não foi enviado antes para este estado)
    if (newData.status === 'lauded' && previousData.status !== 'lauded' && newData.emailSent !== true) {
      console.log(`Condição de envio de email satisfeita para ECG ID: ${ecgId}. Tentando enviar email...`);

      try {
        // Define a API Key do SendGrid usando as variáveis de configuração do Firebase Functions.
        sgMail.setApiKey(functions.config().sendgrid.key); 

        // 1. Buscar informações do Enfermeiro (uploader) e do Médico (laudationDoctor) no Firestore.
        // O campo 'uploaderId' deve ser o UID do enfermeiro.
        const uploaderSnap = await admin.firestore().collection('users').doc(newData.uploaderId).get();
        const uploaderData = uploaderSnap.exists ? uploaderSnap.data() : null;

        // O campo 'laudationDoctorId' deve ser o UID do médico.
        const doctorSnap = await admin.firestore().collection('users').doc(newData.laudationDoctorId).get();
        const doctorData = doctorSnap.exists ? doctorSnap.data() : null;

        // Verifica se o email do enfermeiro está disponível. Se não, loga um erro e atualiza o ECG.
        if (!uploaderData || !uploaderData.email) {
          console.error(`Erro: Email do enfermeiro (uploaderId: ${newData.uploaderId}) não encontrado. Não foi possível enviar.`);
          // Marca o email como "enviado" com um erro para evitar novas tentativas desnecessárias
          await change.after.ref.update({ emailSent: true, emailError: 'Email do enfermeiro não encontrado' });
          return null; // Encerra a execução da função
        }

        const nurseEmail = uploaderData.email;
        const doctorName = (doctorData && doctorData.username) || 'Dr(a). Desconhecido(a)';
        const doctorRole = (doctorData && doctorData.role) || 'Médico(a)'; 
        const doctorCRM = (doctorData && doctorData.crm) || 'CRM Não Informado'; 

        // Extrai e parseia 'laudationDetails' se existir.
        let parsedLaudationDetails = {};
        if (newData.laudationDetails) {
            try {
                parsedLaudationDetails = JSON.parse(newData.laudationDetails);
            } catch (parseError) {
                console.error("Erro ao fazer parse de laudationDetails:", parseError);
                // Pode-se considerar não prosseguir ou usar detalhes vazios
            }
        }

        // Formata o laudo final para inclusão no email HTML.
        let formattedLaudoFinal = '';
        if (newData.laudationContent) {
            // Divide o laudo final por quebras de linha e formata cada linha
            const laudoLines = newData.laudationContent.split('\n').filter(line => line.trim());
            formattedLaudoFinal = laudoLines.map(line => {
                const trimmedLine = line.trim();
                // Remove o ponto final se existir
                const lineWithoutDot = trimmedLine.endsWith('.') ? trimmedLine.slice(0, -1) : trimmedLine;
                
                if (lineWithoutDot.includes(':')) {
                    const parts = lineWithoutDot.split(':');
                    const title = parts[0].trim();
                    const content = parts.slice(1).join(':').trim();
                    return `<li><strong>${title}:</strong> ${content}.</li>`;
                } else {
                    // Se não tem ":", é provavelmente um bloqueio ou repolarização
                    return `<li>${lineWithoutDot}.</li>`;
                }
            }).join('');
        }

        // 2. Gerar o conteúdo HTML do email com design responsivo e compatível com clientes de email.
        const emailContent = `
          <!DOCTYPE html>
          <html>
          <head>
              <style>
                  body { 
                      font-family: Arial, sans-serif; 
                      line-height: 1.6; 
                      color: #333; 
                      margin: 0; 
                      padding: 20px; 
                      background-color: #f4f4f4; 
                      background-image: url('${LOGO_URL}');
                      background-repeat: repeat;
                      background-position: 0 0;
                      background-size: 150px 150px;
                      background-attachment: fixed;
                      position: relative;
                  }
                  body::after {
                      content: '';
                      position: fixed;
                      top: 0;
                      left: 0;
                      right: 0;
                      bottom: 0;
                      background: rgba(255, 255, 255, 0.85);
                      pointer-events: none;
                      z-index: 0;
                  }
                  .container { 
                      max-width: 800px; 
                      margin: 20px auto; 
                      background: rgba(255, 255, 255, 0.98); 
                      padding: 30px; 
                      border-radius: 8px; 
                      box-shadow: 0 0 10px rgba(0,0,0,0.1); 
                      border-top: 5px solid #204b32; 
                      position: relative;
                      z-index: 2;
                  }
                  .header { text-align: center; margin-bottom: 20px; }
                  .header .logo-container { 
                      margin-bottom: 20px; 
                      text-align: center;
                  }
                  .header .logo-img {
                      max-width: 120px; 
                      height: auto; 
                      border-radius: 8px; 
                      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                      filter: brightness(1.8) contrast(1.4) saturate(1.2);
                      display: block;
                      margin: 0 auto;
                      position: relative;
                      z-index: 2;
                  }
                  .header h1 { color: #204b32; margin: 0; font-size: 24px; position: relative; z-index: 3; }
                  .section-title { font-weight: bold; color: #204b32; margin-top: 20px; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 10px; position: relative; z-index: 3; }
                  .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; position: relative; z-index: 3; }
                  .info-table td { padding: 8px 0; border-bottom: 1px dashed #eee; font-size: 14px; }
                  .signature { text-align: right; margin-top: 30px; position: relative; z-index: 3; }
                  .signature p { margin: 5px 0; }
                  .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #777; position: relative; z-index: 3; }
                  .footer a { color: #777; text-decoration: none; }
                  .laudo-list { list-style-type: disc; padding-left: 20px; position: relative; z-index: 3; }
                  .laudo-list li { margin-bottom: 8px; }
              </style>
          </head>
          <body>
              <div class="container">
                  <div class="header">
                      <div class="logo-container">
                          <img src="${LOGO_URL}" alt="Logo da Empresa" class="logo-img">
                      </div>
                      <h1>Laudo de Eletrocardiograma</h1>
                  </div>

                  <table class="info-table">
                      <tr>
                          <td><strong>Nome do Paciente:</strong> ${newData.patientName}</td>
                          <td><strong>Data do Exame:</strong> ${newData.createdAt && newData.createdAt._seconds ? new Date(newData.createdAt._seconds * 1000).toLocaleDateString('pt-BR') : 'Data não disponível'}</td>
                      </tr>
                      <tr>
                          <td><strong>Idade:</strong> ${newData.age} anos</td>
                          <td><strong>Sexo:</strong> ${newData.sex}</td>
                      </tr>
                      <tr>
                          <td><strong>Prioridade:</strong> ${newData.priority}</td>
                          <td>${newData.hasPacemaker === 'Sim' ? '<strong>Marcapasso:</strong> Sim' : ''}</td>
                      </tr>
                  </table>

                  <div class="section-title">Laudo Final</div>
                  <ul class="laudo-list">
                    ${formattedLaudoFinal}
                  </ul>

                  ${newData.imageUrl ? `
                  <div class="section-title">Imagem do ECG</div>
                  <p>A imagem original do ECG pode ser visualizada no link abaixo:</p>
                  <p><a href="${newData.imageUrl}" target="_blank">Visualizar Imagem do ECG</a></p>
                  <img src="${newData.imageUrl}" alt="Imagem do ECG" style="max-width: 100%; height: auto; margin-top: 10px; border: 1px solid #eee; border-radius: 5px;">
                  ` : ''}

                  <div class="signature">
                      <p>Atenciosamente,</p>
                      <p><strong>${doctorName}</strong></p>
                      <p>${doctorRole}</p>
                      <p>${doctorCRM}</p>
                      <div style="background: linear-gradient(135deg, #204b32 0%, #2d5a3f 100%); color: white; padding: 10px 20px; border-radius: 5px; display: inline-block; margin-top: 10px;">
                          <strong>Assinatura Digital</strong>
                      </div>
                  </div>

                  <div class="footer">
                      <p>Este é um laudo oficial do V6 Core App. Não responda a este e-mail.</p>
                      <p><a href="http://www.v6core.com">www.v6core.com</a></p> 
                  </div>
              </div>
          </body>
          </html>
        `;

        // 3. Enviar o email com SendGrid.
        const msg = {
          to: nurseEmail, // E-mail do enfermeiro (destinatário)
          from: 'adm.ecg.19@gmail.com', // O e-mail VERIFICADO e configurado no SendGrid
          subject: `Laudo Concluído: ECG do Paciente ${newData.patientName}`, // Assunto do e-mail
          html: emailContent, // Conteúdo HTML do email
        };

        await sgMail.send(msg);
        console.log(`Email de laudo (SendGrid) enviado para ${nurseEmail} para ECG ID: ${ecgId}`);

        // 4. Marcar o ECG como emailSent no Firestore para evitar reenvios.
        // Adiciona um timestamp de quando o email foi enviado.
        await change.after.ref.update({ emailSent: true, emailSentAt: admin.firestore.FieldValue.serverTimestamp() });
        console.log(`ECG ID: ${ecgId} marcado como 'emailSent: true' no Firestore.`);

        } catch (error) {
        console.error(`Erro ao enviar email (SendGrid) para ECG ID: ${ecgId}:`, error);
        // Em caso de erro, ainda marca emailSent como true, mas registra o erro para depuração.
        await change.after.ref.update({ emailSent: true, emailError: error.message || 'Erro desconhecido ao enviar email com SendGrid' });
      }
    } else {
      console.log(`Nenhuma ação de email necessária para ECG ID: ${ecgId}. Status: ${newData.status}, Email Já Enviado: ${newData.emailSent}`);
    }

    return null; // Cloud Functions devem retornar null ou uma Promise vazia.
  });

// Função para notificar médicos quando um ECG urgente é criado
exports.notifyUrgentEcgCreated = functions.firestore
  .document('ecgs/{ecgId}')
  .onCreate(async (snap, context) => {
    const ecgData = snap.data();
      const ecgId = context.params.ecgId;

    console.log(`ECG criado: ${ecgId}, Prioridade: ${ecgData.priority}`);

    // Só envia notificação se for urgente
    if (ecgData.priority !== 'urgent') {
      console.log(`ECG ${ecgId} não é urgente, não enviando notificação`);
          return null;
        }

    try {
      // Buscar todos os médicos no sistema
      const doctorsSnapshot = await admin.firestore()
        .collection('users')
        .where('role', '==', 'medico')
        .get();

      if (doctorsSnapshot.empty) {
        console.log('Nenhum médico encontrado no sistema');
          return null;
        }

      const notifications = [];
      
      doctorsSnapshot.forEach(doc => {
        const doctorData = doc.data();
        const pushToken = doctorData.pushToken || doctorData.expoPushToken;
        
        if (pushToken) {
          console.log(`Enviando notificação para médico: ${doctorData.username}`);
          
          const message = {
            to: pushToken,
            sound: 'default',
            title: '🚨 ECG Urgente Recebido',
            body: `Paciente: ${ecgData.patientName} - Idade: ${ecgData.age} anos`,
            data: {
              ecgId: ecgId,
              priority: 'urgent',
              patientName: ecgData.patientName,
              age: ecgData.age
            }
          };
          
          notifications.push(admin.messaging().send(message));
      } else {
          console.log(`⚠️ Token push não encontrado para médico: ${doctorData.username}`);
        }
      });

      if (notifications.length > 0) {
        await Promise.all(notifications);
        console.log(`✅ ${notifications.length} notificações enviadas para ECGs urgentes`);
      } else {
        console.log('❌ Nenhuma notificação foi enviada - nenhum médico com token válido');
      }

    } catch (error) {
      console.error('Erro ao enviar notificações de ECG urgente:', error);
    }

    return null;
  });
