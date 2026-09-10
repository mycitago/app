
const fs=require('fs'),p=require('path');
const root=process.argv[2];
const read=f=>fs.readFileSync(p.join(root,f),'utf8');
let bad=false;
function ok(v,m){if(!v){console.error('FAIL:',m);bad=true}}

const sql=read('sql/STRIPE_DUAL_PAYMENTS_SANDBOX.sql');
const page=read('admin/pagos.html');
const admin=read('js/admin-payments.js');
const pub=read('js/public-payments.js');
const app=read('js/app.js');
const booking=read('reservar.html');
const shell=read('js/citago-shell.js');
const plans=read('js/admin-plans.js');
const shared=read('supabase/functions/_shared/stripe.ts');
const connect=read('supabase/functions/stripe-connect-start/index.ts');
const status=read('supabase/functions/stripe-connect-status/index.ts');
const platform=read('supabase/functions/stripe-platform-checkout/index.ts');
const customer=read('supabase/functions/stripe-customer-checkout/index.ts');
const webhook=read('supabase/functions/stripe-webhook/index.ts');

ok(sql.includes('business_payment_accounts'),'missing connected account table');
ok(sql.includes('business_payment_settings'),'missing tenant payment settings');
ok(sql.includes('customer_payments'),'missing customer payment ledger');
ok(sql.includes('platform_billing_accounts'),'missing platform billing mapping');
ok(sql.includes('payment_events'),'missing event idempotency table');
ok(sql.includes('get_public_payment_options'),'missing safe public payment RPC');
ok(!sql.match(/grant\s+select.*business_payment_accounts.*anon/i),'connected Stripe account must not be public');

ok(page.includes('Cobros a tus clientes'),'tenant payments UI missing');
ok(page.includes('Tu suscripción MyCitaGo'),'platform subscription UI missing');
ok(admin.includes("stripe-connect-start"),'connect onboarding action missing');
ok(admin.includes("stripe-connect-status"),'connect status action missing');
ok(admin.includes("business_payment_settings"),'settings persistence missing');

ok(pub.includes('stripe-customer-checkout'),'public checkout edge invocation missing');
ok(pub.includes('get_public_payment_options'),'public safe payment settings missing');
ok(app.includes('appointmentId:result.appointmentId'),'booking does not pass server-issued appointment token');
ok(booking.includes('online-payment-card'),'payment CTA not present in booking success UI');
ok(booking.includes('js/public-payments.js'),'public payments script missing');

ok(shell.includes("['pagos-negocio','Pagos','pagos.html'"),'tenant Payments nav item missing');
ok(plans.includes('stripe-platform-checkout'),'subscription checkout missing');

ok(shared.includes('STRIPE_SECRET_KEY'),'Stripe secret must come from Edge env');
ok(shared.includes('2026-08-26.preview'),'Connect v2 preview version missing');
ok(connect.includes('/v2/core/accounts'),'new Connect account must use Accounts v2');
ok(connect.includes('/v2/core/account_links'),'Connect onboarding must use v2 account links');
ok(connect.includes('fees_collector:"stripe"'),'Stripe fee responsibility missing');
ok(connect.includes('losses_collector:"stripe"'),'Stripe loss responsibility missing');
ok(status.includes('card_payments'),'charges readiness must be capability-derived');
ok(platform.includes('/v1/checkout/sessions'),'platform Billing Checkout missing');
ok(platform.includes('mode','subscription') || platform.includes('mode=subscription') || platform.includes("['mode','subscription']"),'subscription mode missing');
ok(customer.includes('appointments'),'customer checkout must re-read appointment server-side');
ok(customer.includes('access_token'),'customer checkout must validate appointment access token');
ok(customer.includes('service.price'),'payment amount must be server-calculated from service');
ok(customer.includes('Stripe-Account'),'direct charge connected account header missing');
ok(webhook.includes('STRIPE_WEBHOOK_SECRET'),'webhook signature secret missing');
ok(webhook.includes('checkout.session.completed'),'checkout completion handler missing');
ok(webhook.includes('invoice.paid'),'subscription recurring success handler missing');
ok(webhook.includes('invoice.payment_failed'),'subscription failed payment handler missing');

const publicFiles=[page,admin,pub,app,booking,shell,plans];
ok(!publicFiles.some(s=>/sk_(live|test)_[A-Za-z0-9]+/.test(s)),'secret key leaked into public files');
ok(!publicFiles.some(s=>s.includes('STRIPE_SECRET_KEY')),'secret env name should not be consumed in browser code');

process.exit(bad?1:0);
