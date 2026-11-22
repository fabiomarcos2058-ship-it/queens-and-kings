// Instalar o jogo: vira um app na tela inicial (PWA). Botão 📲 no topo, aviso gentil na 1ª visita e passo a passo pro iPhone.
const Instalar = (() => {
  let evento = null; // o navegador (Chrome/Android) entrega isso quando dá pra instalar com 1 toque
  const CHAVE = 'qk_instalar_aviso';
  const instalado = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const ios = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  function registrar() {
    if (!('serviceWorker' in navigator)) return;
    if (!(location.protocol === 'https:' || location.hostname === 'localhost')) return;
    navigator.serviceWorker.register('sw.js').catch(() => { /* sem service worker o jogo funciona igual */ });
  }
  function botao() {
    let b = document.getElementById('btn-instalar');
    if (instalado()) { if (b) b.remove(); return; }
    if (b) return;
    const som = document.getElementById('btn-som'); if (!som) return;
    b = document.createElement('button');
    b.className = 'btn-som btn-instalar'; b.id = 'btn-instalar'; b.title = 'Instalar o jogo'; b.textContent = '📲';
    b.onclick = abrir;
    som.parentNode.insertBefore(b, som);
  }
  async function instalar() {
    if (!evento) return false;
    evento.prompt();
    try { await evento.userChoice; } catch (e) { /* nada */ }
    evento = null;
    return true;
  }
  function abrir() {
    if (instalado()) { UI.toast('O jogo já está instalado! 💛'); return; }
    if (evento) {
      UI.modal({ titulo: '📲 Instalar o jogo', html: '<p class="ev-res">Instale o <b>Queens and Kings</b> na tela inicial: abre em tela cheia, como um app de verdade, e carrega mais rápido!</p>',
        botoes: [{ texto: 'Agora não' }, { texto: 'Instalar', classe: 'principal', acao: () => { instalar(); } }] });
      return;
    }
    const passos = ios()
      ? '<ol class="inst-passos"><li>Toque no botão <b>Compartilhar</b> <span class="inst-ic">⬆️</span> do Safari (embaixo da tela).</li><li>Role e toque em <b>Adicionar à Tela de Início</b> ➕.</li><li>Toque em <b>Adicionar</b>. Pronto, o jogo vira um app! 🎉</li></ol><small>No iPhone só dá pra instalar pelo <b>Safari</b>.</small>'
      : '<ol class="inst-passos"><li>Toque no menu <b>⋮</b> (três pontinhos) do navegador.</li><li>Toque em <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.</li><li>Confirme. Pronto, o jogo vira um app! 🎉</li></ol><small>Se a opção não aparecer, abra o jogo pelo <b>Chrome</b> (Android) ou <b>Safari</b> (iPhone).</small>';
    UI.modal({ titulo: '📲 Instalar o jogo', html: `<p class="ev-res">Instale o <b>Queens and Kings</b> na tela inicial: tela cheia e abre rapidinho!</p>${passos}`, botoes: [{ texto: 'Entendi', classe: 'principal' }] });
  }
  function avisoGentil() {
    if (instalado()) return;
    try { if (localStorage.getItem(CHAVE)) return; localStorage.setItem(CHAVE, '1'); } catch (e) { return; }
    setTimeout(() => { if (!instalado()) UI.toast('📲 Toque no 📲 lá em cima pra instalar o jogo na tela inicial!'); }, 25000);
  }

  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); evento = e; botao(); });
  window.addEventListener('appinstalled', () => { evento = null; botao(); UI.toast('Jogo instalado! 💛'); });
  registrar();
  const iniciar = () => { botao(); avisoGentil(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
  return { abrir, instalado };
})();
