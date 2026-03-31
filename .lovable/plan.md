

## Diagnóstico: Site vs APP — Por que não recebes notificações?

### Resposta curta

**Não, o problema não é ser "site vs app".** Web Push funciona em browsers desktop (Chrome, Edge, Firefox) e em Android Chrome sem precisar de instalar como PWA. A única exceção é **iOS Safari**, que exige instalação como PWA (Add to Home Screen) desde iOS 16.4+.

### O que os logs confirmam

O backend enviou a notificação com sucesso (`Sent: 1, Failed: 0`) — o serviço de push (FCM/Google) aceitou a mensagem. Isto significa que o problema está entre o serviço de push e o teu dispositivo/browser.

### Causas mais prováveis

1. **Notificações do browser silenciadas no sistema operativo** — O Windows/macOS pode ter "Do Not Disturb" ativo, ou as notificações do Chrome/browser podem estar desligadas nas definições do SO.

2. **Service Worker desatualizado** — O SW em cache pode não ter o handler `push` atualizado. Solução: DevTools → Application → Service Workers → "Update" ou "Unregister" e recarregar.

3. **Testar no preview do Lovable (iframe)** — Push notifications não funcionam dentro de iframes. Tens de testar no URL publicado: `https://becomeme.lovable.app`

4. **iOS Safari sem instalar como PWA** — Se estás num iPhone/iPad, precisas de "Adicionar ao Ecrã Inicial" primeiro.

### Plano de ação

Adicionar um **botão "Enviar notificação de teste"** na página de Definições que:
1. Chama a edge function `send-push-notification` diretamente com um payload de teste
2. Mostra feedback imediato na UI (sucesso/erro do envio)
3. Permite validar instantaneamente se a notificação chega ao dispositivo

Isto elimina a espera pelo cron job e permite diagnosticar rapidamente.

### Alterações técnicas

**Ficheiro: `src/pages/Definicoes.tsx`**
- Adicionar botão "Enviar notificação de teste" no painel de debug
- Chamar `supabase.functions.invoke('send-push-notification', { body: { userId, payload: { title: 'becoMe Teste', body: 'Se vês isto, as notificações funcionam!' } } })`
- Mostrar toast com resultado

**Nenhuma alteração de backend necessária** — a edge function já suporta este fluxo.

