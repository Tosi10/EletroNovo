# 🔐 Configuração do Template de Email de Reset de Senha

## 📧 Firebase Authentication - Template de Email

### **1. Acesse o Firebase Console**
- Vá para [console.firebase.google.com](https://console.firebase.google.com)
- Selecione seu projeto: `ecgscan-e5a18`

### **2. Configure o Template de Email**
- **Authentication** → **Templates** → **Password reset**
- Clique em **Edit template**

### **3. Template Recomendado:**

**Assunto do Email:**
```
Redefinir sua senha - ECG Scan
```

**Corpo do Email (HTML):**
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Redefinir Senha - ECG Scan</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: #ffffff;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            width: 120px;
            height: auto;
            margin-bottom: 20px;
        }
        .title {
            color: #2c3e50;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .subtitle {
            color: #7f8c8d;
            font-size: 16px;
        }
        .content {
            margin-bottom: 30px;
        }
        .button {
            display: inline-block;
            background-color: #3498db;
            color: #ffffff;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            font-size: 16px;
            margin: 20px 0;
        }
        .button:hover {
            background-color: #2980b9;
        }
        .warning {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
            color: #856404;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ecf0f1;
            color: #7f8c8d;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">🔐 Redefinir Senha</h1>
            <p class="subtitle">ECG Scan - Sistema de Eletrocardiogramas</p>
        </div>
        
        <div class="content">
            <p>Olá!</p>
            
            <p>Recebemos uma solicitação para redefinir a senha da sua conta no ECG Scan.</p>
            
            <p>Se você fez essa solicitação, clique no botão abaixo para criar uma nova senha:</p>
            
            <div style="text-align: center;">
                <a href="{{link}}" class="button">🔑 Redefinir Minha Senha</a>
            </div>
            
            <div class="warning">
                <strong>⚠️ Importante:</strong>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>Este link é válido por apenas 1 hora</li>
                    <li>Se você não solicitou esta alteração, ignore este email</li>
                    <li>Sua senha atual permanecerá inalterada</li>
                </ul>
            </div>
            
            <p>Se o botão não funcionar, copie e cole este link no seu navegador:</p>
            <p style="word-break: break-all; color: #3498db;">{{link}}</p>
        </div>
        
        <div class="footer">
            <p>Este é um email automático, não responda a esta mensagem.</p>
            <p>Se precisar de ajuda, entre em contato com o suporte técnico.</p>
            <p>&copy; 2024 ECG Scan. Todos os direitos reservados.</p>
        </div>
    </div>
</body>
</html>
```

### **4. Configurações Importantes:**
- **Action URL**: Deixe como padrão (Firebase gerencia automaticamente)
- **Salvar** o template

### **5. Teste o Sistema:**
1. No app, clique em "Esqueci minha senha"
2. Digite um email válido
3. Verifique se o email chega com o template personalizado
4. Clique no link para testar o reset

### **6. Segurança:**
- ✅ Links expiram em 1 hora
- ✅ Tokens únicos por reset
- ✅ Rate limiting automático
- ✅ Validação de email

---

## 🚀 **Próximos Passos:**
1. **Configure o template** no Firebase Console
2. **Teste o fluxo completo** no app
3. **Verifique se os emails chegam** corretamente
4. **Teste o reset de senha** pelo link

**O sistema está pronto para uso!** 🎉
