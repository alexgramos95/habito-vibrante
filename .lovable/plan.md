# Plano: Google Play Billing via RevenueCat (híbrido com Stripe)

## Estratégia
- **Web e iOS** → continuam com Stripe (já implementado, sem mudanças funcionais)
- **Android nativo (Capacitor)** → usa Google Play Billing via RevenueCat SDK
- Detecção de plataforma em runtime via `Capacitor.getPlatform()`
- Fonte única de verdade de subscrição: tabela `subscriptions` no Supabase, atualizada por webhooks Stripe **ou** webhooks RevenueCat

## Pré-requisitos que ficam do teu lado (passo-a-passo após eu acabar o código)

### 1. RevenueCat (conta gratuita até 2.5k$/mês receita)
1. Criar conta em https://app.revenuecat.com
2. Criar projeto "becoMe"
3. Adicionar app Android com package `app.lovable.becomeme`
4. Copiar **Public Android API Key** (começa com `goog_...`)

### 2. Google Play Console
1. Activity → criar 3 produtos de subscrição:
   - `becoMe Pro Monthly` — Product ID: `pro_monthly` — €7,99/mês
   - `becoMe Pro Yearly` — Product ID: `pro_yearly` — €59,99/ano
   - `becoMe Lifetime` — Product ID: `pro_lifetime` — €149 (one-time, criar como **In-app product**, não subscrição)
2. Em RevenueCat → Products → importar os 3 produtos via Google Play Service Account JSON
3. Em RevenueCat → Entitlements → criar `pro` → anexar os 3 produtos
4. Em RevenueCat → Offerings → criar default offering com 3 packages (monthly, annual, lifetime)

### 3. Webhook RevenueCat → Supabase
- Copiar URL: `https://yllrqgwiztnbhpxdnsvi.supabase.co/functions/v1/revenuecat-webhook`
- Em RevenueCat → Integrations → Webhooks → adicionar URL
- Copiar Authorization header secreto → guardar como `REVENUECAT_WEBHOOK_AUTH`

### 4. Secret que vou pedir-te
- `REVENUECAT_ANDROID_API_KEY` (public key, mas mantida fora do código por consistência)
- `REVENUECAT_WEBHOOK_AUTH` (para validar webhooks)

---

## O que vou implementar

### Frontend

**`src/lib/platform.ts`** (novo)
- `isNativeAndroid()`, `isNativeIOS()`, `isWeb()` helpers usando Capacitor

**`src/lib/billing/revenueCat.ts`** (novo)
- Inicialização do SDK com `Purchases.configure({ apiKey, appUserID: user.id })`
- `loginToRevenueCat(userId)` / `logoutRevenueCat()`
- `getOfferings()` → devolve packages
- `purchasePackage(pkg)` → trigger compra nativa
- `restorePurchases()` → restaura compras anteriores

**`src/lib/billing/index.ts`** (novo, router)
- `startCheckout(priceType)` → decide entre Stripe checkout ou RevenueCat purchase consoante plataforma
- `openManageSubscription()` → no Android abre Play Store subs management; na web/iOS chama `customer-portal` Stripe

**`src/contexts/AuthContext.tsx`** (editar mínimo)
- Após login, se Android nativo → `loginToRevenueCat(user.id)`
- Após logout → `logoutRevenueCat()`

**`src/components/Paywall/PaywallModal.tsx`** (editar)
- Substituir chamada direta a `create-checkout` por `startCheckout()` do billing router
- No Android, mostrar "Restore purchases" link

**`src/main.tsx`** ou app boot
- Inicializar RevenueCat SDK uma vez se plataforma nativa

### Backend (Edge Functions)

**`supabase/functions/revenuecat-webhook/index.ts`** (novo)
- Recebe eventos RC (`INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `EXPIRATION`, `NON_RENEWING_PURCHASE`)
- Valida header `Authorization` contra `REVENUECAT_WEBHOOK_AUTH`
- Faz upsert na tabela `subscriptions` com mesmo schema usado pelo webhook Stripe (`plan`, `plan_status`, `purchase_plan`, `subscription_end`, etc.)
- User mapping via `app_user_id` (= `user.id` do Supabase)
- `verify_jwt = false` em `supabase/config.toml`

### Capacitor
- `bun add @revenuecat/purchases-capacitor`
- Após sync, plugin adiciona Google Play Billing Library v6 automaticamente no Android

### Documentação para ti
- `docs/google-play-billing.md` com checklist completo de setup, screenshots descritos e processo de teste com licensed testers

---

## O que NÃO muda
- Stripe continua intacto para web e iOS
- Tabela `subscriptions` mantém o mesmo schema
- Lógica de entitlements (`src/lib/entitlements.ts`) inalterada
- `src/config/billing.ts` mantém os preços (apenas display; a verdade vem de RC/Stripe)

---

## Ordem de implementação
1. Pedir secret `REVENUECAT_ANDROID_API_KEY` e `REVENUECAT_WEBHOOK_AUTH`
2. Instalar `@revenuecat/purchases-capacitor`
3. Criar billing router + revenueCat client + platform helper
4. Edge function `revenuecat-webhook`
5. Integrar no AuthContext e PaywallModal
6. Documentação `docs/google-play-billing.md`
7. Atualizar memory com nova arquitetura híbrida

Estimativa: ~8 ficheiros novos/editados. Tudo isolado — Stripe continua a funcionar exatamente como hoje.

---

## Avisos importantes
- **Não posso testar no sandbox**: Google Play Billing só funciona em build Android assinada instalada em device real ou emulador com Google Play Services + licensed tester configurado
- **Validação real só após teres produtos aprovados na Play Console** (pode demorar 24-48h após criar)
- **Lifetime no Android**: Google chama "In-app product" (não-consumível), gerido de forma ligeiramente diferente das subscrições — RevenueCat abstrai isto
- **Compatibilidade Stripe ↔ RC**: Se um utilizador já é PRO via Stripe e instala o Android, vai ver o paywall a menos que a check de entitlement consulte ambos. O webhook RC só promove a PRO, nunca despromove se Stripe estiver activo (vou implementar essa salvaguarda).

Confirma que avanço?
