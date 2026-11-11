// Janelas (modais) e avisos rápidos (toasts).
const UI = (() => {
  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = msg;
    document.getElementById('app').appendChild(t);
    setTimeout(() => t.classList.add('sumir'), 1800);
    setTimeout(() => t.remove(), 2300);
  }

  // botoes: [{ texto, classe, acao }] — acao retorna false para manter a janela aberta
  function modal({ titulo = '', html = '', botoes = [{ texto: 'OK' }], classe = '' }) {
    const fundo = document.createElement('div');
    fundo.className = 'modal-fundo';
    fundo.innerHTML = `<div class="modal ${classe}">
      ${titulo ? `<div class="modal-titulo">${titulo}</div>` : ''}
      <div class="modal-corpo">${html}</div>
      <div class="modal-botoes"></div></div>`;
    const caixa = fundo.querySelector('.modal-botoes');
    const fechar = () => { fundo.classList.add('sumir'); setTimeout(() => fundo.remove(), 200); };
    botoes.forEach((b) => {
      const el = document.createElement('button');
      el.className = `btn-modal ${b.classe || ''}`;
      el.textContent = b.texto;
      if (b.desativado) el.classList.add('desativado');
      el.onclick = () => {
        if (b.desativado) { if (b.motivo) toast(b.motivo); return; }
        if (b.acao && b.acao(fundo) === false) return;
        fechar();
      };
      caixa.appendChild(el);
    });
    fundo.addEventListener('click', (e) => { if (e.target === fundo) fechar(); });
    document.getElementById('app').appendChild(fundo);
    return { fechar, el: fundo };
  }

  const fmt = (n) => n.toLocaleString('pt-BR');
  const tempo = (ms) => {
    const s = Math.ceil(ms / 1000);
    if (s >= 3600) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}min`;
    if (s >= 60) return `${Math.floor(s / 60)}min ${s % 60}s`;
    return `${s}s`;
  };

  return { toast, modal, fmt, tempo };
})();
