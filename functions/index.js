// Importações necessárias para Firebase Functions, Admin SDK e SendGrid
const functions = require('firebase-functions/v1'); // Importa a biblioteca principal do Firebase Functions (compatível com a API v1)
const admin = require('firebase-admin'); // Importa o SDK Admin do Firebase para interagir com o Firestore e outros serviços
const sgMail = require('@sendgrid/mail'); // Importa a biblioteca SendGrid para envio de e-mails

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

        // Formata os detalhes estruturados do laudo para inclusão no email HTML.
        let formattedDetails = '';
        if (parsedLaudationDetails.ritmo) formattedDetails += `<li><strong>Ritmo:</strong> ${parsedLaudationDetails.ritmo}</li>`;
        if (parsedLaudationDetails.fc) formattedDetails += `<li><strong>FC:</strong> ${parsedLaudationDetails.fc} bpm</li>`;
        if (parsedLaudationDetails.pr) formattedDetails += `<li><strong>PR:</strong> ${parsedLaudationDetails.pr} ms</li>`;
        if (parsedLaudationDetails.qrs) formattedDetails += `<li><strong>QRS:</strong> ${parsedLaudationDetails.qrs} ms</li>`;
        if (parsedLaudationDetails.eixo) formattedDetails += `<li><strong>Eixo:</strong> ${parsedLaudationDetails.eixo}</li>`;
        
        let bloqueiosList = [];
        if (parsedLaudationDetails.brc) bloqueiosList.push('Bloqueio de Ramo Completo (BRC)');
        if (parsedLaudationDetails.brd) bloqueiosList.push('Bloqueio de Ramo Direito (BRD)');
        if (bloqueiosList.length > 0) formattedDetails += `<li><strong>Bloqueios de Ramo:</strong> ${bloqueiosList.join(' e ')}</li>`;
        
        if (parsedLaudationDetails.repolarizacao) formattedDetails += `<li><strong>Repolarização:</strong> ${parsedLaudationDetails.repolarizacao}</li>`;
        if (parsedLaudationDetails.outrosAchados) formattedDetails += `<li><strong>Outros Achados:</strong> ${parsedLaudationDetails.outrosAchados}</li>`;

        // 2. Gerar o conteúdo HTML do email.
        const emailContent = `
          <!DOCTYPE html>
          <html>
          <head>
              <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f4f4f4; }
                  .container { max-width: 800px; margin: 20px auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); border-top: 5px solid #204b32; }
                  .header { text-align: center; margin-bottom: 20px; }
                  .header img { max-width: 150px; margin-bottom: 10px; }
                  .header h1 { color: #204b32; margin: 0; font-size: 24px; }
                  .section-title { font-weight: bold; color: #204b32; margin-top: 20px; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 10px; }
                  .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                  .info-table td { padding: 8px 0; border-bottom: 1px dashed #eee; font-size: 14px; }
                  .conclusion { background-color: #f9f9f9; padding: 15px; border-left: 5px solid #ffa001; margin-bottom: 20px; }
                  .signature { text-align: right; margin-top: 30px; }
                  .signature p { margin: 5px 0; }
                  .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #777; }
                  .footer a { color: #777; text-decoration: none; }
              </style>
          </head>
          <body>
              <div class="container">
                  <div class="header">
                      <img src="https://placehold.co/150x50/204b32/ffffff?text=Logo+MaisLaudo" alt="Mais Laudo Logo"> 
                      <h1>Laudo de Eletrocardiograma</h1>
                  </div>

                  <table class="info-table">
                      <tr>
                          <td><strong>Nome do Paciente:</strong> ${newData.patientName}</td>
                          <td><strong>Data do Exame:</strong> ${new Date(newData.createdAt._seconds * 1000).toLocaleDateString('pt-BR')}</td>
                      </tr>
                      <tr>
                          <td><strong>Idade:</strong> ${newData.age} anos</td>
                          <td><strong>Sexo:</strong> ${newData.sex}</td>
                      </tr>
                      <tr>
                          <td><strong>Marcapasso:</strong> ${newData.hasPacemaker ? 'Sim' : 'Não'}</td>
                          <td><strong>Prioridade:</strong> ${newData.priority}</td>
                      </tr>
                  </table>

                  <div class="section-title">Análise Detalhada</div>
                  <ul>
                    ${formattedDetails}
                  </ul>

                  <div class="section-title">Laudo Final</div>
                  <div class="conclusion">
                      <p>${newData.laudationContent.replace(/\n/g, '<br>')}</p>
                  </div>

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
                      <img src="https://placehold.co/150x50/204b32/ffffff?text=Assinatura" alt="Assinatura" style="max-width: 150px; height: auto; margin-top: 10px;"> 
                  </div>

                  <div class="footer">
                      <p>Este é um laudo oficial do ECG Scan App. Não responda a este e-mail.</p>
                      <p><a href="http://www.seuapp.com">www.seuapp.com</a></p> 
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
          html: emailContent, // Conteúdo HTML do e-mail
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
