// Menu principal: troca de abas e prévia da arena. Tudo só visual por enquanto.
(() => {
  const ordem = ['loja', 'cartas', 'batalha', 'cla', 'eventos'];
  const telas = document.getElementById('telas');
  const abas = document.querySelectorAll('#abas button');

  function irPara(aba) {
    const i = ordem.indexOf(aba);
    telas.style.transform = `translateX(-${i * 20}%)`;
    abas.forEach((b) => b.classList.toggle('ativa', b.dataset.aba === aba));
  }
  abas.forEach((b) => b.addEventListener('click', () => irPara(b.dataset.aba)));

  // Arrastar para o lado também troca de aba
  let inicioX = null;
  telas.addEventListener('touchstart', (e) => (inicioX = e.touches[0].clientX), { passive: true });
  telas.addEventListener('touchend', (e) => {
    if (inicioX === null) return;
    const dx = e.changedTouches[0].clientX - inicioX;
    const atual = ordem.indexOf(document.querySelector('#abas .ativa').dataset.aba);
    if (Math.abs(dx) > 60) irPara(ordem[Math.max(0, Math.min(4, atual + (dx < 0 ? 1 : -1)))]);
    inicioX = null;
  });

  // Cartas de exemplo (vazias até chegarem as personagens)
  const raridades = ['comum', 'comum', 'rara', 'rara', 'epica', 'epica', 'lendaria', 'comum'];
  const custos = [3, 2, 4, 5, 3, 6, 5, 1];
  const carta = (r, c, txt = '?') =>
    `<div class="carta-vazia ${r}"><span class="custo">${c}</span>${txt}</div>`;

  document.getElementById('deck').innerHTML = Array(8).fill('<div class="slot-deck">+</div>').join('');
  document.getElementById('colecao').innerHTML = raridades.map((r, i) => carta(r, custos[i])).join('');
  document.getElementById('ofertas').innerHTML = ['comum', 'rara', 'epica']
    .map((r, i) => `<div class="item-loja">${carta(r, custos[i])}<div class="item-nome">Carta ${['comum', 'rara', 'épica'][i]}</div><div class="preco"><i class="ic-ouro"></i>${[100, 500, 2000][i]}</div></div>`)
    .join('');
  document.getElementById('mao').innerHTML = raridades.slice(0, 4).map((r, i) => carta(r, custos[i])).join('');
  document.getElementById('barra-elixir').innerHTML = Array.from({ length: 10 }, (_, i) => `<span class="${i < 5 ? 'cheio' : ''}"></span>`).join('');

  // Arenas
  Arena.render(document.getElementById('arena-mini'), { petalas: false });
  Arena.render(document.getElementById('arena-grande'));

  const batalha = document.getElementById('batalha');
  document.getElementById('btn-jogar').addEventListener('click', () => batalha.classList.remove('oculto'));
  document.getElementById('btn-sair').addEventListener('click', () => batalha.classList.add('oculto'));

  Assets.fill();
  irPara('batalha');
})();
