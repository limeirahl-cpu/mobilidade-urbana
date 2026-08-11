# Guia de setup — Urbix (MVP)

Este app não roda "pronto": ele precisa de um backend (Supabase) e de uma API key do Google Maps configurados com suas próprias chaves. Siga os passos abaixo uma vez só.

## 1. Criar conta e projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta gratuita.
2. Clique em **New Project**. Escolha um nome (ex: `mobilidade-urbana`), uma senha de banco (guarde-a) e a região mais próxima (ex: São Paulo).
3. Aguarde o projeto ser criado (1–2 minutos).
4. No menu lateral, vá em **Project Settings → API**. Anote:
   - **Project URL** (algo como `https://xxxxx.supabase.co`)
   - **anon public key** (uma chave longa)

## 2. Aplicar as migrations (schema do banco)

1. No painel do Supabase, vá em **SQL Editor**.
2. Abra o arquivo [`supabase/migrations/0001_init_schema.sql`](supabase/migrations/0001_init_schema.sql) deste projeto, copie todo o conteúdo, cole no SQL Editor e clique em **Run**.
3. Repita o mesmo processo, em ordem, para:
   - [`supabase/migrations/0002_rls_policies.sql`](supabase/migrations/0002_rls_policies.sql)
   - [`supabase/migrations/0003_realtime_publication.sql`](supabase/migrations/0003_realtime_publication.sql)
   - [`supabase/migrations/0004_fix_profiles_rides_rls_recursion.sql`](supabase/migrations/0004_fix_profiles_rides_rls_recursion.sql)
   - [`supabase/migrations/0005_ride_categories.sql`](supabase/migrations/0005_ride_categories.sql)
   - [`supabase/migrations/0006_boarding_pin.sql`](supabase/migrations/0006_boarding_pin.sql)
   - [`supabase/migrations/0007_ratings.sql`](supabase/migrations/0007_ratings.sql)
   - [`supabase/migrations/0008_profile_extras.sql`](supabase/migrations/0008_profile_extras.sql)
   - [`supabase/migrations/0009_coupons.sql`](supabase/migrations/0009_coupons.sql)
   - [`supabase/migrations/0010_payment_method.sql`](supabase/migrations/0010_payment_method.sql)
   - [`supabase/migrations/0011_profile_gender.sql`](supabase/migrations/0011_profile_gender.sql)
   - [`supabase/migrations/0012_phone_profile_and_payments.sql`](supabase/migrations/0012_phone_profile_and_payments.sql)
   - [`supabase/migrations/0013_ride_negotiation_and_capacity.sql`](supabase/migrations/0013_ride_negotiation_and_capacity.sql)
   - [`supabase/migrations/0014_payments.sql`](supabase/migrations/0014_payments.sql)
   - [`supabase/migrations/0015_cancellation_reason.sql`](supabase/migrations/0015_cancellation_reason.sql)
   - [`supabase/migrations/0016_ride_offers.sql`](supabase/migrations/0016_ride_offers.sql)
   - [`supabase/migrations/0017_driver_verification.sql`](supabase/migrations/0017_driver_verification.sql)
   - [`supabase/migrations/0018_ride_earnings.sql`](supabase/migrations/0018_ride_earnings.sql)
   - [`supabase/migrations/0019_driver_push_tokens.sql`](supabase/migrations/0019_driver_push_tokens.sql)
   - [`supabase/migrations/0020_phone_verifications.sql`](supabase/migrations/0020_phone_verifications.sql)
   - [`supabase/migrations/0021_terms_acceptance.sql`](supabase/migrations/0021_terms_acceptance.sql)
   - [`supabase/migrations/0022_drop_phone_verifications.sql`](supabase/migrations/0022_drop_phone_verifications.sql)

Cada um deve rodar sem erro antes de colar o próximo.

**Nota sobre verificação de motorista** (migration 0017): todo motorista novo nasce com `verification_status = 'pending'` e não consegue ficar online até isso virar `'approved'`. Não existe painel admin no app ainda — pra aprovar um motorista de teste, rode no SQL Editor:
```sql
update public.profiles set verification_status = 'approved' where id = 'uuid-do-motorista';
```
(o `id` é o mesmo da tabela `auth.users` — dá pra achar pelo telefone/nome direto na tabela `profiles`).

## 3. Desativar confirmação de e-mail (obrigatório, mesmo com login por telefone)

O app pede telefone na tela de entrada, mas por baixo dos panos ainda usa a
infraestrutura de e-mail/senha do Supabase (veja o comentário no topo de
[`src/services/auth.ts`](src/services/auth.ts) pra entender por quê — em
resumo: sem provedor de SMS configurado, é a única forma de logar de verdade
sem depender de um serviço externo agora). O "e-mail" usado é sintético e
nunca existe de verdade, então **sem desativar isso, ninguém consegue
completar o cadastro**:

1. Vá em **Authentication → Providers → Email**.
2. Desmarque **Confirm email**.
3. Salve.

Lembre de reativar isso (e trocar pro fluxo de SMS real) antes de qualquer lançamento real.

## 4. Criar a API key do Google Maps

O mapa roda dentro de um WebView carregando o Google Maps JavaScript API
(não é o SDK nativo — veja o comentário no topo de
[`src/components/map/googleMapsHtml.ts`](src/components/map/googleMapsHtml.ts)
pra entender por quê). Isso significa que a mesma key cobre mapa, busca de
endereço e cálculo de rota:

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/) e crie um projeto (ou use um existente). Precisa de uma conta com faturamento ativado (o Google exige cartão, mas dá uma cota gratuita mensal generosa).
2. Em **APIs e serviços → Biblioteca**, ative estas 4 APIs:
   - **Maps JavaScript API**
   - **Places API**
   - **Directions API**
   - **Geocoding API**
3. Em **APIs e serviços → Credenciais**, crie uma **Chave de API**.
4. Edite a chave e, em **Restrições de API**, marque "Restringir chave" e selecione só as 4 APIs acima. **Não** use restrição por app/site (referrer/pacote) — a key roda dentro de HTML embutido no WebView, sem uma origem HTTPS real, então esse tipo de restrição bloquearia tudo.

## 5. Configurar o Mercado Pago (pagamento real de Pix/cartão)

Pix e cartão de crédito/débito agora processam um pagamento de verdade
(Checkout Pro do Mercado Pago) antes de criar a corrida — só "Dinheiro"
continua sem cobrança. Isso roda em duas Edge Functions do Supabase (a
única parte do projeto com um "backend" além do banco), então tem mais
passos que o normal:

1. Crie uma conta em [mercadopago.com.br/developers](https://www.mercadopago.com.br/developers/panel) (gratuita).
2. No painel, em **Suas integrações → Credenciais de teste**, copie o **Access Token de teste** (começa com `TEST-`). Use essas credenciais de teste por enquanto — antes de lançar de verdade, troque pelas credenciais de produção.
3. Instale a [CLI do Supabase](https://supabase.com/docs/guides/cli) se ainda não tiver, e rode na raiz do projeto:
   ```bash
   supabase login
   supabase link --project-ref SEU-PROJECT-REF
   supabase secrets set MERCADOPAGO_ACCESS_TOKEN=TEST-seu-token-aqui
   supabase functions deploy mercadopago-create-preference
   supabase functions deploy mercadopago-webhook
   ```
   (O `PROJECT-REF` é o final da sua Project URL, ex: `xxxxx` de `https://xxxxx.supabase.co`.) Se preferir não instalar a CLI, dá pra criar as duas functions colando o código direto no painel do Supabase, em **Edge Functions → Deploy a new function** — o secret se configura em **Edge Functions → Secrets**, do mesmo jeito.
4. Pra testar pagamentos de verdade sem gastar dinheiro, crie um **comprador de teste** em **Suas integrações → Contas de teste** e use o e-mail/senha dele na hora de pagar dentro do checkout do Mercado Pago.

## 6. Publicar a Edge Function de notificação (push de corrida nova)

Motorista online recebe uma notificação push (mesmo com o app em segundo plano) quando surge uma corrida na categoria dele. Isso é mais uma Edge Function — sem secret novo pra configurar, só publicar:
```bash
supabase functions deploy notify-drivers-new-ride
```
Push só funciona em **dispositivo físico** (Android/iOS de verdade) — simulador/emulador não recebe notificação push do Expo. Pra testar: motorista fica online num aparelho físico, trava a tela, e pede uma corrida do outro dispositivo — a notificação deve aparecer mesmo com o app fechado.

## 7. Configurar o SMS real (Twilio Verify)

O código de verificação de telefone agora é enviado por SMS de verdade — antes disso, ele só aparecia na própria tela ("Modo de teste"), o que não serve pra abrir o app pra gente de fora. Usa o **Twilio Verify**, um serviço pronto pra esse fluxo exato (o Twilio mesmo gera o código, cuida da expiração e do limite de tentativas — não precisamos guardar nada nosso).

1. Crie uma conta em [twilio.com/try-twilio](https://www.twilio.com/try-twilio) (cadastro autoatendido, ganha crédito de teste).
2. No [Console do Twilio](https://console.twilio.com/), anote o **Account SID** e o **Auth Token** (aparecem na página inicial do painel).
3. Vá em **Verify → Services** (menu lateral) e crie um novo **Verify Service** (qualquer nome, ex: "Urbix") — anote o **Service SID** (começa com `VA`).
4. Configure os secrets e publique as duas Edge Functions novas:
   ```bash
   supabase secrets set TWILIO_ACCOUNT_SID=seu-account-sid
   supabase secrets set TWILIO_AUTH_TOKEN=seu-auth-token
   supabase secrets set TWILIO_VERIFY_SERVICE_SID=seu-verify-service-sid
   supabase functions deploy send-verification-code
   supabase functions deploy verify-phone-code
   ```
5. Números de teste (trial) do Twilio só mandam SMS pra números verificados na conta — em **Phone Numbers → Verified Caller IDs**, adicione o seu próprio celular antes de testar. Isso deixa de ser necessário quando você sair do modo trial (conta paga).
6. O formato exato das chamadas em [`supabase/functions/send-verification-code/index.ts`](supabase/functions/send-verification-code/index.ts) e [`verify-phone-code/index.ts`](supabase/functions/verify-phone-code/index.ts) foi montado com base no conhecimento geral do modelo sobre a API do Twilio Verify (v2), não testado ao vivo — confira contra a documentação atual da sua conta se algo não bater.
7. Teste mandando um código de verdade pro seu próprio celular (o que você verificou no passo 5) na tela de entrada do app — deve chegar um SMS em alguns segundos.

## 8. Preencher o `.env`

Na raiz do projeto, copie [`​.env.example`](.env.example) para um arquivo chamado `.env` e preencha com os valores que você anotou:

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-aqui
EXPO_PUBLIC_GOOGLE_MAPS_KEY=sua-chave-do-google-maps-aqui
```

## 9. Rodar o app

No terminal, dentro da pasta do projeto:

```bash
npm install
npx expo start
```

Vai aparecer um QR code. Abra o app **Expo Go** (Android/iOS, disponível na loja de apps) no celular e escaneie o QR code — ou pressione `i`/`a` no terminal para abrir num simulador iOS/Android, se você tiver um instalado.

## 10. Testar o fluxo completo

Você vai precisar de **dois dispositivos/simuladores** rodando o app ao mesmo tempo (ex: seu celular com Expo Go + um simulador, ou dois simuladores):

1. **Dispositivo A**: digite um telefone de verdade (o seu), toque em "Enviar código" — deve chegar um SMS real em alguns segundos. Digite o código recebido, confirme, escolha "Sou passageiro" e um gênero (Masculino/Feminino) — define qual boneco aparece no mapa. Marque o checkbox de aceite dos termos (obrigatório pra continuar) antes de tocar em "Continuar".
2. **Dispositivo B**: repita com outro telefone real, escolha "Sou motorista", preencha o veículo, escolha uma categoria (ex: Econômico), aceite os termos. Tente ativar o toggle **Online** — deve aparecer um aviso pedindo pra enviar documentos primeiro. Toque em "Enviar documentos", suba as 3 fotos (podem ser qualquer imagem da galeria pra teste) e a placa, e envie. Aprove manualmente pelo SQL Editor (nota da seção 2 acima) — só depois disso o toggle Online libera de verdade. Saia e entre de novo com o mesmo telefone — deve pular direto pra tela inicial, sem passar pelo cadastro de novo.
3. **A**: toque em "Para onde vamos?". No destino, digite um endereço e escolha uma sugestão do Google Places (ou toque direto no mapa). Confirme que uma linha de rota real aparece entre embarque e destino (não só os dois marcadores). Escolha uma categoria entre os cartões — cada um mostra preço, capacidade (👤) e o tempo até o motorista mais próximo daquela categoria (ou "Sem motoristas" se B ainda não estiver online nela) — e uma forma de pagamento; o botão "Continuar" só habilita depois dos dois.
3a. Se estiver testando push notification, trave a tela do dispositivo B (ou minimize o app) antes do próximo passo — a notificação só faz sentido testar assim, com o app em segundo plano.
3b. **A**: na tela de preço, teste os botões "−"/"+" (travados na faixa de ±20%) e toque no valor pra digitar direto. Toque em "Solicitar viagem" — isso já cria a corrida de verdade (é o que a torna visível pro motorista) e mostra a animação de radar ("Procurando motoristas...") até a primeira proposta chegar. Em B (dispositivo físico), deve chegar uma notificação push de corrida nova mesmo com o app em segundo plano.
3c. **B**: a corrida deve aparecer no cartão em poucos segundos, mostrando o valor pedido pelo passageiro. Ajuste o preço com os botões "−"/"+" se quiser propor outro valor, e toque em "Enviar proposta" — a tela deve mostrar "Proposta enviada, aguardando o passageiro...".
3d. **A**: assim que B enviar a proposta, a tela sai do radar e mostra o cartão dele (nome, nota, veículo, preço). Toque em "Aceitar" — deve navegar pra tela de confirmação com o resumo da corrida (categoria, distância, preço acordado).
3e. **A**: escolhendo "Pix" ou "Cartão de crédito/débito" como forma de pagamento, ao tocar em "Confirmar corrida" deve abrir o checkout do Mercado Pago **dentro do próprio app** (WebView em modal, sem sair pro navegador do sistema) — pague com um comprador de teste do Mercado Pago. Ao voltar (o app detecta o redirecionamento sozinho), a corrida só avança depois que o pagamento aparecer como aprovado (tela mostra "Aguardando confirmação do pagamento..." enquanto isso); se for recusado, a corrida é cancelada automaticamente. Repita escolhendo "Dinheiro" e confirme que pula direto pra confirmação, sem abrir nenhum checkout.
4. **B**: assim que A aceitar a proposta, a tela deve navegar sozinha pra tela da corrida (sem precisar tocar em nada) — e mostrar a rota até o embarque desenhada no mapa.
5. **A**: a tela deve mostrar o motorista atribuído.
6. Para simular o motorista se movendo (sem GPS real): no simulador iOS, vá em **Features → Location**; no Android, use os **Extended Controls → Location** e mova o ponto ou rode uma rota. O marcador azul no dispositivo A deve se mover em tempo real.
7. **A**: teste o botão "Compartilhar viagem" — deve abrir o menu nativo de compartilhamento (WhatsApp/SMS/etc) com os dados da corrida.
8. **B**: toque em "Seguir para o embarque". Na tela do passageiro (A) deve aparecer um PIN de 4 dígitos.
9. **B**: tente iniciar a corrida com um PIN errado — deve dar erro "PIN incorreto" sem avançar. Digite o PIN certo (o que aparece na tela de A) — a corrida deve avançar para "em andamento".
10. **B**: toque em "Concluir corrida".
10b. **B**: abra "Ganhos" — a corrida concluída deve entrar no total de hoje, com "A receber" (se foi Pix/cartão) ou "Comissão devida" (se foi dinheiro) batendo com a `commission_rate` da categoria (20% por padrão). Confira também pelo SQL Editor que `rides.platform_fee`/`driver_earnings` foram preenchidos.
11. **A**: deve ver a tela de conclusão com o resumo da tarifa — avalie o motorista com estrelas e um comentário.
12. **B**: avalie o passageiro também.
13. Nos dois lados, toque em "Histórico" na tela inicial e confirme que a corrida concluída aparece na lista.
14. Toque em "Perfil" (A ou B), troque a foto e o nome, adicione um e-mail (opcional) e confirme que o telefone aparece só-leitura com "✓ Verificado". Volte e reabra a tela — tudo deve persistir.
15. Em "Meus endereços" (A), toque no chip "Trabalho" (preenche o nome) e marque um ponto no mapa — confirme que o endereço legível aparece antes de salvar. Volte pra tela inicial, toque em "Para onde vamos?" e confirme que ele aparece como chip — tocar nele já marca o destino sem precisar tocar no mapa.
16. Em "Métodos de pagamento" (A, dentro de Perfil), adicione um cartão com um número válido por Luhn (ex: `4242 4242 4242 4242`), validade futura e CVV de 3 dígitos — deve salvar e virar o método padrão automaticamente (é o primeiro). Adicione uma chave Pix também, defina-a como padrão, depois exclua um dos dois métodos.
17. Depois de concluir uma corrida, toque na estrela do card do motorista pra favoritar; abra "Motoristas favoritos" (dentro de Perfil) e confirme que ele aparece lá.
18. Numa corrida nova, no sheet de categoria, digite `BEMVINDO10` no campo de cupom e toque em "Aplicar" — a tarifa final deve cair 10%. Peça a corrida e confirme na tela de detalhe (e no histórico) que aparece "Cupom aplicado: -R$X".
19. Confirme os ícones do mapa: o marcador de embarque mostra o boneco (👨/👩) pulsando conforme o gênero escolhido por A; depois que B aceita, o marcador dele mostra 🚗 (categorias Econômico/Conforto) ou 🏍️ (categoria Moto) e desliza suavemente ao mover a localização, em vez de saltar.
20. Numa corrida nova, cancele pelo lado de B (ou A) antes de concluir — deve aparecer o seletor de motivo antes de confirmar. Confira no histórico ou pelo SQL Editor que `rides.cancellation_reason` foi salvo com o motivo escolhido.

Se algo travar, o primeiro lugar para olhar é o terminal onde `npx expo start` está rodando — os erros de JavaScript aparecem ali.
