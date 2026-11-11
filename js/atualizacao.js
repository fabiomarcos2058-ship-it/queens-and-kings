// Obriga a atualizar quando sai uma versão nova do jogo.
// O carregador guarda a versão em window.VERSAO_JOGO; a cada minuto (e quando o jogo volta a aparecer na tela)
// conferimos o versao.txt. Se mudou, aparece uma tela que bloqueia o jogo até atualizar.
// Durante uma batalha, a tela espera a batalha acabar.
const Atualizacao = (() => {
  let pendente = null;
  let mostrando = false;

  const emBatalha = () => {
    const b = document.getElementById('batalha');
    return b && !b.classList.contains('oculto');
  };

  async function versaoNoServidor() {
    try {
      const r = await fetch(`versao.txt?t=${Date.now()}`, { cache: 'no-store' });
      return (await r.text()).trim();
    } catch (e) {
      return null; // sem internet: tenta de novo depois
    }
  }

  async function atualizarAgora() {
    try { Estado.salvar(); } catch (e) { /* nada */ }
    try { if (Conta.logado()) await Conta.salvarAgora(); } catch (e) { /* nada */ }
    // muda o endereço para o navegador não usar a página antiga guardada
    location.replace(`${location.pathname}?v=${pendente || Date.now()}`);
  }

  function mostrarTela() {
    if (mostrando) return;
    mostrando = true;
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
  }

  async function conferir() {
    if (mostrando) return;
    const atual = window.VERSAO_JOGO;
    const nova = await versaoNoServidor();
    if (!nova || !atual || nova === String(atual)) return;
    pendente = nova;
    if (!emBatalha()) mostrarTela();
  }

  // quando a batalha fecha, mostra a tela se havia atualização esperando
  setInterval(() => { if (pendente && !mostrando && !emBatalha()) mostrarTela(); }, 1000);
  setInterval(conferir, 60000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') conferir(); });
  setTimeout(conferir, 5000);

  return { conferir };
})();
