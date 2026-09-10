MyCitaGo · Edge Functions STANDALONE

Estas versiones no dependen de ../_shared/stripe.ts y están preparadas
para pegarlas directamente en el editor web de Supabase.

ORDEN DE DESPLIEGUE
1. stripe-connect-start
2. stripe-connect-status
3. stripe-platform-checkout
4. stripe-customer-checkout
5. stripe-webhook

PARA CADA FUNCIÓN
- Supabase > Edge Functions > Deploy a new function
- Abre el index.ts de la carpeta correspondiente
- Copia TODO
- Sustituye todo el código de ejemplo de Supabase
- Function name: exactamente el nombre de la carpeta
- Deploy function

SECRETS
STRIPE_SECRET_KEY
APP_PUBLIC_URL=https://mycitago.github.io/app
STRIPE_WEBHOOK_SECRET   (se configurará al crear el webhook)

No pongas valores secretos dentro del código.
