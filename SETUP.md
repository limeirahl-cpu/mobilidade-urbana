# Guia de setup — Urbix (MVP)

Este app não roda "pronto": ele precisa de um backend (Supabase) e de um provedor de mapas (Mapbox) configurados com suas próprias chaves. Siga os passos abaixo uma vez só.

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

Cada um deve rodar sem erro antes de colar o próximo.

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

## 4. Criar conta no Mapbox

1. Acesse [mapbox.com](https://www.mapbox.com) e crie uma conta gratuita (não pede cartão de crédito).
2. No painel, vá em **Tokens**.
3. Copie o **Default public token** (começa com `pk.`), ou crie um novo.

## 5. Preencher o `.env`

Na raiz do projeto, copie [`​.env.example`](.env.example) para um arquivo chamado `.env` e preencha com os valores que você anotou:

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-aqui
EXPO_PUBLIC_MAPBOX_TOKEN=pk.sua-chave-aqui
```

## 6. Rodar o app

No terminal, dentro da pasta do projeto:

```bash
npm install
npx expo start
```

Vai aparecer um QR code. Abra o app **Expo Go** (Android/iOS, disponível na loja de apps) no celular e escaneie o QR code — ou pressione `i`/`a` no terminal para abrir num simulador iOS/Android, se você tiver um instalado.

## 7. Testar o fluxo completo

Você vai precisar de **dois dispositivos/simuladores** rodando o app ao mesmo tempo (ex: seu celular com Expo Go + um simulador, ou dois simuladores):

1. **Dispositivo A**: digite um telefone, toque em "Enviar código" — a tela seguinte mostra um aviso "Modo de teste — código: XXXX" (é mockado, não chega SMS de verdade ainda). Digite esse código, confirme, escolha "Sou passageiro" e um gênero (Masculino/Feminino) — define qual boneco aparece no mapa.
2. **Dispositivo B**: repita com outro telefone, escolha "Sou motorista", preencha o veículo, escolha uma categoria (ex: Econômico), e ative o toggle **Online**. Depois, saia e entre de novo com o mesmo telefone — deve pular direto pra tela inicial, sem passar pelo cadastro de novo.
3. **A**: toque em "Para onde vamos?". No destino, digite um endereço no campo de busca e escolha um resultado (ou toque direto no mapa). Escolha uma categoria entre os cartões de preço e uma forma de pagamento — o botão "Pedir corrida" só habilita depois dos dois. Se marcar uma categoria diferente da que o motorista B escolheu (ex: passageiro pede Moto, motorista está em Econômico), B não deve ver a corrida.
4. **B**: a corrida deve aparecer no cartão em poucos segundos — toque em "Aceitar".
5. **A**: a tela deve mostrar o motorista atribuído.
6. Para simular o motorista se movendo (sem GPS real): no simulador iOS, vá em **Features → Location**; no Android, use os **Extended Controls → Location** e mova o ponto ou rode uma rota. O marcador azul no dispositivo A deve se mover em tempo real.
7. **A**: teste o botão "Compartilhar viagem" — deve abrir o menu nativo de compartilhamento (WhatsApp/SMS/etc) com os dados da corrida.
8. **B**: toque em "Seguir para o embarque". Na tela do passageiro (A) deve aparecer um PIN de 4 dígitos.
9. **B**: tente iniciar a corrida com um PIN errado — deve dar erro "PIN incorreto" sem avançar. Digite o PIN certo (o que aparece na tela de A) — a corrida deve avançar para "em andamento".
10. **B**: toque em "Concluir corrida".
11. **A**: deve ver a tela de conclusão com o resumo da tarifa — avalie o motorista com estrelas e um comentário.
12. **B**: avalie o passageiro também.
13. Nos dois lados, toque em "Histórico" na tela inicial e confirme que a corrida concluída aparece na lista.
14. Toque em "Perfil" (A ou B), troque a foto e o nome, adicione um e-mail (opcional) e confirme que o telefone aparece só-leitura com "✓ Verificado". Volte e reabra a tela — tudo deve persistir.
15. Em "Meus endereços" (A), toque no chip "Trabalho" (preenche o nome) e marque um ponto no mapa — confirme que o endereço legível aparece antes de salvar. Volte pra tela inicial, toque em "Para onde vamos?" e confirme que ele aparece como chip — tocar nele já marca o destino sem precisar tocar no mapa.
16. Em "Métodos de pagamento" (A, dentro de Perfil), adicione um cartão com um número válido por Luhn (ex: `4242 4242 4242 4242`), validade futura e CVV de 3 dígitos — deve salvar e virar o método padrão automaticamente (é o primeiro). Adicione uma chave Pix também, defina-a como padrão, depois exclua um dos dois métodos.
17. Depois de concluir uma corrida, toque na estrela do card do motorista pra favoritar; abra "Motoristas favoritos" (dentro de Perfil) e confirme que ele aparece lá.
18. Numa corrida nova, no sheet de categoria, digite `BEMVINDO10` no campo de cupom e toque em "Aplicar" — a tarifa final deve cair 10%. Peça a corrida e confirme na tela de detalhe (e no histórico) que aparece "Cupom aplicado: -R$X".
19. Confirme os ícones do mapa: o marcador de embarque mostra o boneco (👨/👩) pulsando conforme o gênero escolhido por A; depois que B aceita, o marcador dele mostra 🚗 (categorias Econômico/Conforto) ou 🏍️ (categoria Moto) e desliza suavemente ao mover a localização, em vez de saltar.

Se algo travar, o primeiro lugar para olhar é o terminal onde `npx expo start` está rodando — os erros de JavaScript aparecem ali.
