// Log in, sign up, password reset, and the screen for a HUB access key.
import { S, $, esc, APP, icon } from '../core.js';
import { CONFIG } from '../config.js';

const SPK = `<svg class="spk" viewBox="0 0 40 40" aria-hidden="true"><path d="M20 2c1.5 9 4.6 13.4 18 18-13.4 4.6-16.5 9-18 18-1.5-9-4.6-13.4-18-18 13.4-4.6 16.5-9 18-18z"/></svg>`;
const HUBLIST = [['crystal', 'Vision', 't5'], ['target', 'Planning', 't1'], ['wallet', 'Finance', 't4'], ['graduation', 'Learning', 't6'], ['heartbeat', 'Mind', 't2'], ['airplane', 'Travel', 't1'], ['books', 'Media', 't5'], ['network', 'Knowledge', 't3'], ['timer', 'Deep work', 't2'], ['archive', 'Archive', 't6']];
const art = () => `<div class="auth-art"><div class="aa-win" aria-hidden="true">
<div class="aa-body"><span class="kicker t3 aa-kick">${SPK}<span>O planejador cerebral completo</span></span><b class="aa-title">${esc(APP)}<em>.</em></b>
<p class="aa-lede">Visão, planos, dinheiro, carreira, estudos, saúde, bem-estar, cozinha, casa, viagens, mídia, pessoas, conhecimento, foco e memórias em um único lugar conectado.</p>
  <div class="aa-folders">${HUBLIST.map(([ic, t, tone]) => `<span class="aa-f"><span class="hbadge ${tone}">${icon(ic)}</span><small>${t}</small></span>`).join('')}</div>
  <div class="aa-stats"><span class="tag t-blue">15 hubs</span><span class="tag t-yellow">1 inbox</span><span class="tag t-green">evergreen planners</span></div></div></div>
</div>`;
const msg = () => `${S.authErr ? `<p class="error-text" role="alert">${esc(S.authErr)}</p>` : ''}${S.authMsg ? `<p class="small" role="status">${esc(S.authMsg)}</p>` : ''}`;
const field = (label, input) => `<label class="field"><span>${label}</span>${input}</label>`;

export function renderAuth() {
  const v = S.authView; const email = esc(S.authEmail || '');
  const em = field('E-mail', `<input class="input" type="email" name="email" autocomplete="email" required value="${email}">`);
  const forms = {
    login: `<h2>Bem-vindo <em>de volta</em></h2>${msg()}<form class="stack" data-form="login">${em}${field('Senha', '<input class="input" type="password" name="password" autocomplete="current-password" required>')}<button class="btn solid">Entrar</button></form>
      <p class="small"><button class="link" data-action="auth-view" data-v="signup">Criar uma conta</button> · <button class="link" data-action="auth-view" data-v="forgot">Esqueci minha senha</button></p>
      ${S.needConfirm ? '<button class="btn" data-action="auth-view" data-v="resend">Reenviar e-mail de confirmação</button>' : '<p class="small"><button class="link" data-action="auth-view" data-v="resend">Não recebeu o e-mail de confirmação?</button></p>'}`,
    signup: `<h2>Crie sua conta</h2>${msg()}<form class="stack" data-form="signup">${em}${field('Senha', '<input class="input" type="password" name="password" minlength="8" autocomplete="new-password" required placeholder="8 caracteres ou mais">')}<button class="btn solid">Criar conta</button></form>
      <p class="small">Já possui uma conta? <button class="link" data-action="auth-view" data-v="login">Entrar</button></p>`,
    forgot: `<h2>Redefinir sua senha</h2>${msg()}<form class="stack" data-form="forgot">${em}<button class="btn solid">Enviar link de redefinição</button></form>
      <p class="small"><button class="link" data-action="auth-view" data-v="login">Voltar para o login</button></p>`,
    resend: `<h2>Reenviar e-mail de confirmação</h2>${msg()}<p class="small">Informe o e-mail usado no cadastro e enviaremos um novo link de confirmação. Abra-o neste dispositivo e entre novamente.</p><form class="stack" data-form="resend">${em}<button class="btn solid">Enviar novo link</button></form>
      <p class="small"><button class="link" data-action="auth-view" data-v="login">Voltar para o login</button></p>`,
    reset: `<h2>Escolha uma nova senha</h2>${msg()}<form class="stack" data-form="newpass">${field('Nova senha', '<input class="input" type="password" name="password" minlength="8" autocomplete="new-password" required>')}<button class="btn solid">Salvar senha</button></form>`,
  };
  $('#root').innerHTML = `<div class="auth">${art()}<div class="auth-form"><div class="auth-card">${forms[v] || forms.login}</div></div></div>`;
}

export function renderUnlock() {
  $('#root').innerHTML = `<div class="auth">${art()}<div class="auth-form"><div class="auth-card">
    <h2>Último passo</h2>${msg()}
    <p class="small">Informe a chave de acesso da sua compra do ${esc(APP)}. Você fará isso apenas uma vez.</p>
    <form data-form="unlock" class="stack">
      ${field('Seu nome', `<input class="input" name="name" maxlength="60" autocomplete="given-name" placeholder="Como o HUB deve chamar você?" value="${esc(S.settings.display_name || '')}">`)}
      ${field('Chave de acesso', '<input class="input key-input" name="code" placeholder="XXXX-XXXX-XXXX" autocomplete="off" autocapitalize="characters" spellcheck="false" required>')}
      <button class="btn solid">${icon('key')} Abrir ${esc(APP)}</button></form>
    ${CONFIG.shopUrl ? `<p class="small">No key yet? <a href="${esc(CONFIG.shopUrl)}" target="_blank" rel="noopener">Get ${esc(APP)}</a></p>` : ''}
    ${CONFIG.supportEmail ? `<p class="small muted">Trouble? Email <a href="mailto:${esc(CONFIG.supportEmail)}">${esc(CONFIG.supportEmail)}</a></p>` : ''}
    <p class="small"><button class="link" data-action="sign-out">Sair</button></p></div></div></div>`;
}

export function friendlyAuthError(m = '') {
  S.needConfirm = /email not confirmed/i.test(m);
  if (/invalid login/i.test(m)) return 'That email and password don’t match. Check them, or reset your password.';
  if (/email not confirmed/i.test(m)) return 'Your email isn’t confirmed yet. Tap the link we emailed you, or send yourself a new one below.';
  if (/already registered/i.test(m)) return 'That email already has an account. Log in instead.';
  if (/rate limit|too many/i.test(m)) return 'Too many tries. Wait a minute, then try again.';
  if (/already been used/i.test(m)) return 'That key has already been used. Each key opens one account.';
  if (/is for/i.test(m)) return m;
  if (/not found|invalid key|no such key/i.test(m)) return 'That key wasn’t found. Check it against your order email.';
  return m || 'Something went wrong. Try again.';
}
