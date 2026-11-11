// Contas: entrar, criar conta, Google ou convidado.
// Quando o projeto do Firebase estiver pronto, cole o firebaseConfig aqui
// e as contas passam a funcionar (o resto do código já está preparado).
const FIREBASE_CONFIG = null;

const Conta = (() => {
  const ativo = () => !!FIREBASE_CONFIG;

  function tela() {
    return new Promise((ok) => {
      const d = Estado.d;
      if (d.conta) return ok(); // já escolheu antes (convidado ou logado)

      const el = document.createElement('div');
      el.className = 'tela-conta';
      el.innerHTML = `
        <div class="conta-caixa">
          <div class="logo-texto"><span>Queens</span><small>and</small><span>Kings</span></div>
          <div class="conta-abas"><button class="ativa" data-aba="entrar">Entrar</button><button data-aba="criar">Criar conta</button></div>
          <form class="conta-form" autocomplete="on">
            <label class="campo so-criar oculto">Nome no jogo<input name="nome" maxlength="16" placeholder="Como quer ser chamado(a)" /></label>
            <label class="campo">E-mail<input name="email" type="email" autocomplete="email" placeholder="seu@email.com" /></label>
            <label class="campo">Senha<input name="senha" type="password" autocomplete="current-password" placeholder="Pelo menos 6 caracteres" /></label>
            <p class="conta-erro"></p>
            <button type="submit" class="btn-modal principal" id="conta-enviar">Entrar</button>
          </form>
          <div class="conta-ou"><span>ou</span></div>
          <button class="btn-modal btn-google" id="conta-google"><b>G</b> Entrar com Google</button>
          <button class="btn-modal secundario" id="conta-convidado">Jogar sem conta</button>
          ${ativo() ? '' : '<p class="aviso">As contas ainda estão sendo ativadas. Por enquanto, jogue sem conta: seu progresso fica salvo neste celular.</p>'}
        </div>`;
      document.getElementById('app').appendChild(el);

      let modo = 'entrar';
      const form = el.querySelector('form');
      const erro = el.querySelector('.conta-erro');
      el.querySelectorAll('.conta-abas button').forEach((b) => (b.onclick = () => {
        modo = b.dataset.aba;
        el.querySelectorAll('.conta-abas button').forEach((x) => x.classList.toggle('ativa', x === b));
        el.querySelector('.so-criar').classList.toggle('oculto', modo !== 'criar');
        el.querySelector('#conta-enviar').textContent = modo === 'criar' ? 'Criar conta' : 'Entrar';
        erro.textContent = '';
      }));

      const fechar = () => { el.classList.add('saindo'); setTimeout(() => { el.remove(); ok(); }, 300); };
      const emBreve = () => UI.toast('As contas chegam em breve! Jogue sem conta por enquanto 💕');

      form.onsubmit = (e) => {
        e.preventDefault();
        const email = form.email.value.trim(), senha = form.senha.value;
        if (!email.includes('@')) { erro.textContent = 'Digite um e-mail válido.'; return; }
        if (senha.length < 6) { erro.textContent = 'A senha precisa ter pelo menos 6 caracteres.'; return; }
        if (!ativo()) return emBreve();
        // (será ligado ao Firebase Authentication quando o config chegar)
      };
      el.querySelector('#conta-google').onclick = () => (ativo() ? null : emBreve());
      el.querySelector('#conta-convidado').onclick = () => {
        d.conta = { tipo: 'convidado' };
        Estado.salvar();
        fechar();
      };
    });
  }

  return { tela, ativo };
})();
