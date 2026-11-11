// Obriga a atualizar quando sai uma versão nova do jogo.
// - O carregador (index.html) guarda a versão em window.VERSAO_JOGO.
// - A cada 30s, quando o jogo volta a aparecer na tela e antes de cada batalha, conferimos o versao.txt
//   (com ?t= para furar o cache do GitHub Pages, que guarda cópias por até 10 minutos).
// - Se mudou, aparece uma tela que bloqueia o jogo até atualizar. Durante uma batalha, ela espera a batalha acabar.
const Atualizacao = (() => {
  let pendente = null;
  let mostrando = false;
  let ultimaConferida = 0;

  const emBatalha = () => {
    const b = document.getElementById('batalha');
    return b && !b.classList.contains('oculto');
  };
  const minha = () => String(window.VERSAO_JOGO || '');
  const maisNova = (a, b) => /^\d+$/.test(a) && /^\d+$/.test(b) && +a > +b; // a é mais nova que b?

  async function versaoNoServidor(limiteMs = 6000) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), limiteMs);
      const r = await fetch(`versao.txt?t=${Date.now()}`, { cache: 'no-store', signal: ctrl.signal });
      clearTimeout(t);
      if (!r.ok) return null;
      const v = (await r.text()).trim();
      return /^\d+$/.test(v) ? v : null;
    } catch (e) {
      return null; // sem internet: tenta de novo depois
    }
  }

  async function atualizarAgora() {
    try { Estado.salvar(); } catch (e) { /* nada */ }
    try { if (Conta.logado()) await Promise.race([Conta.salvarAgora(), new Promise((ok) => setTimeout(ok, 3000))]); } catch (e) { /* nada */ }
    try { sessionStorage.setItem('qk-atualizou', minha()); } catch (e) { /* nada */ }
    // endereço novo = o navegador e o GitHub não podem usar a página antiga guardada
    location.replace(`${location.pathname}?v=${pendente || Date.now()}&r=${Date.now()}`);
  }

  function mostrarTela() {
    if (mostrando) return;
    mostrando = true;
    document.querySelectorAll('.modal-fundo').forEach((m) => m.remove());
    const el = document.createElement('div');
    el.className = 'tela-atualizar';
    el.innerHTML = `<div class="atualizar-caixa">
      <div class="atualizar-icone">✨</div>
      <b>Nova versão do jogo!</b>
      <p>Saiu uma atualização com novidades e correções. Atualize para continuar jogando.</p>
      <p class="aviso">Seu progresso fica salvo.</p>
      <button class="btn-modal principal" id="btn-atualizar-jogo">Atualizar agora</button>
    </div>`;
    document.getElementById('app').appendChild(el);
    el.querySelector('#btn-atualizar-jogo').onclick = (e) => { e.target.disabled = true; e.target.textContent = 'Atualizando…'; atualizarAgora(); };
    // se a pessoa não tocar, atualiza sozinho depois de 20s (só fora de batalha)
    setTimeout(() => { if (!emBatalha()) atualizarAgora(); }, 20000);
  }

  // devolve true se achou versão nova
  async function conferir() {
    if (mostrando) return true;
    ultimaConferida = Date.now();
    const nova = await versaoNoServidor();
    if (!nova || !minha() || nova === minha()) return false;
    if (!maisNova(nova, minha())) return false; // servidor com cópia velha: ignora
    pendente = nova;
    if (!emBatalha()) mostrarTela();
    return true;
  }

  // chamado antes de começar uma batalha: se tem atualização, bloqueia
  async function podeJogar() {
    if (pendente) { mostrarTela(); return false; }
    if (Date.now() - ultimaConferida < 15000) return true; // conferiu agora há pouco
    const achou = await conferir();
    return !achou;
  }

  // o amigo do x1 está numa versão mais nova que a minha?
  function versaoDoAmigo(v) {
    v = String(v || '');
    if (!v || v === minha()) return 'igual';
    if (maisNova(v, minha())) { pendente = v; mostrarTela(); return 'eu-velho'; }
    return 'amigo-velho';
  }

  // quando a batalha fecha, mostra a tela se havia atualização esperando
  setInterval(() => { if (pendente && !mostrando && !emBatalha()) mostrarTela(); }, 1000);
  setInterval(() => { if (document.visibilityState === 'visible') conferir(); }, 30000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') conferir(); });
  window.addEventListener('online', conferir);
  window.addEventListener('pageshow', (e) => { if (e.persisted) conferir(); }); // voltou pelo botão "voltar" do navegador
  setTimeout(conferir, 4000);

  // avisa que atualizou
  setTimeout(() => {
    try {
      const antes = sessionStorage.getItem('qk-atualizou');
      if (antes && antes !== minha() && typeof UI !== 'undefined') UI.toast('Jogo atualizado! ✨');
      sessionStorage.removeItem('qk-atualizou');
    } catch (e) { /* nada */ }
  }, 2500);

  return { conferir, podeJogar, versaoDoAmigo, versao: minha };
})();
