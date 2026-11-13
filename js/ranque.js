// Ranqueada: patentes, pontos (PR), temporadas mensais, bots com patente, sequência de vitórias,
// Pro Pass da ranqueada e histórico de batalhas (de todos os modos).
const Ranque = (() => {
  // ---------- Patentes ----------
  // As 8 primeiras têm divisões III, II e I (100 PR cada). Mestre começa em 2400, Mestre Pro em 3600 e Rei da Aura em 6000.
  const PATENTES = [
    { id: 'papelao', nome: 'Papelão', cor: '#E2AE6A', escura: '#6E4A25', dif: 1 },
    { id: 'ferrugem', nome: 'Ferrugem', cor: '#E07A45', escura: '#5B2A14', dif: 1 },
    { id: 'ferro', nome: 'Ferro', cor: '#C3CBD6', escura: '#424A55', dif: 2 },
    { id: 'bronze', nome: 'Bronze', cor: '#EEA06A', escura: '#6B3A1E', dif: 2 },
    { id: 'prata', nome: 'Prata', cor: '#E4ECF8', escura: '#4E6188', dif: 3, difMin: 2 },
    { id: 'ouro', nome: 'Ouro', cor: '#FFC94A', escura: '#8A4F06', dif: 4, difMin: 3, super: 0.08 },
    // do Platina pra cima a IA não alivia: 'difMin' é o mínimo de esperteza e 'super' a chance de vir a IA super inteligente
    { id: 'platina', nome: 'Platina', cor: '#7FF0F5', escura: '#14606B', dif: 5, difMin: 4, super: 0.15 },
    { id: 'diamante', nome: 'Diamante', cor: '#A8DBFF', escura: '#2A3F9A', dif: 5, difMin: 4, super: 0.22 },
    { id: 'mestre', nome: 'Mestre', cor: '#C99BFF', escura: '#43177C', dif: 5, difMin: 5, super: 0.55 },
    { id: 'mestre_pro', nome: 'Mestre Pro', cor: '#FF7AC0', escura: '#7A1040', dif: 5, difMin: 5, super: 0.8 },
    { id: 'rei_aura', nome: 'Rei da Aura', cor: '#FF5A1A', escura: '#3A0010', dif: 5, difMin: 5, super: 0.95, ext: 'svg' },
    { id: 'deus_aura', nome: 'Deus da Aura', cor: '#5CC8FF', escura: '#06103A', dif: 5, difMin: 5, super: 1, ext: 'svg' },
  ];
  const DIV = 100, COM_DIV = 8;
  const INICIO_MESTRE = COM_DIV * 3 * DIV; // 2400
  const INICIO_PRO = 3600;
  const INICIO_REI = 6000;
  const INICIO_DEUS = 9000;
  const ROMANO = ['III', 'II', 'I'];

  function info(pts) {
    pts = Math.max(0, Math.floor(pts || 0));
    if (pts >= INICIO_DEUS) return { i: 11, p: PATENTES[11], div: '', nome: 'Deus da Aura', base: INICIO_DEUS, prox: null, prog: 1, pts, baseTier: INICIO_DEUS };
    if (pts >= INICIO_REI) return { i: 10, p: PATENTES[10], div: '', nome: 'Rei da Aura', base: INICIO_REI, prox: INICIO_DEUS, prog: (pts - INICIO_REI) / (INICIO_DEUS - INICIO_REI), pts, baseTier: INICIO_REI };
    if (pts >= INICIO_PRO) return { i: 9, p: PATENTES[9], div: '', nome: 'Mestre Pro', base: INICIO_PRO, prox: INICIO_REI, prog: (pts - INICIO_PRO) / (INICIO_REI - INICIO_PRO), pts, baseTier: INICIO_PRO };
    if (pts >= INICIO_MESTRE) return { i: 8, p: PATENTES[8], div: '', nome: 'Mestre', base: INICIO_MESTRE, prox: INICIO_PRO, prog: (pts - INICIO_MESTRE) / (INICIO_PRO - INICIO_MESTRE), pts, baseTier: INICIO_MESTRE };
    const i = Math.floor(pts / (3 * DIV));
    const d = Math.floor((pts - i * 3 * DIV) / DIV);
    const base = i * 3 * DIV + d * DIV;
    return { i, p: PATENTES[i], div: ROMANO[d], nome: `${PATENTES[i].nome} ${ROMANO[d]}`, base, prox: base + DIV, prog: (pts - base) / DIV, pts, baseTier: i * 3 * DIV };
  }
  const img = (i, mini = false) => `assets/patentes/${PATENTES[i].id}${mini ? '_mini' : ''}.${PATENTES[i].ext || 'png'}`;

  // ---------- Temporada ----------
  const temporadaAtual = () => new Date().toISOString().slice(0, 7);
  const nomeTemporada = (t = temporadaAtual()) => {
    const [a, m] = t.split('-');
    return `${['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][+m - 1]} ${a}`;
  };
  const diasRestantes = () => { const h = new Date(); return Math.ceil((new Date(h.getFullYear(), h.getMonth() + 1, 1) - h) / 86400000); };

  function dados() {
    const d = Estado.d;
    if (!d.ranque) d.ranque = { temporada: temporadaAtual(), pts: 0, melhor: 0, melhorSempre: 0, v: 0, d: 0, e: 0, seq: 0, maiorSeq: 0, escudo: 0, pro: false, xp: 0, pegos: { free: [], pro: [] } };
    const r = d.ranque;
    if (r.temporada !== temporadaAtual()) {
      // virada de temporada: prêmio pela melhor patente e "reset suave" dos pontos
      const melhorI = info(r.melhor).i;
      r.premioTemporada = { temporada: r.temporada, patente: melhorI, gemas: 15 + melhorI * 20, ouro: 300 + melhorI * 250 };
      r.temporadasAnteriores = [{ t: r.temporada, melhor: r.melhor }, ...(r.temporadasAnteriores || [])].slice(0, 12);
      r.temporada = temporadaAtual();
      r.pts = Math.round(r.pts * 0.55);
      r.melhor = r.pts; r.v = 0; r.d = 0; r.e = 0; r.seq = 0; r.escudo = 0; r.epicas = 0;
      Estado.salvar();
    }
    // o Pro Pass tem as próprias datas (não acompanha o mês da ranqueada)
    const pa = passeAtual();
    if (!r.passe) r.passe = pa.id;
    else if (r.passe !== pa.id) trocarPasse(r, pa);
    return r;
  }
  // ---------- Passes (cada um com a sua carta de Evolução) ----------
  const PASSES = [
    { id: 'gojo', carta: 'gojo', nome: 'Gojo Satoru', fim: new Date(2026, 10, 13, 9, 10) }, // 13/11/2026 09:10
    { id: 'luffy', carta: 'luffy_gear5', nome: 'Luffy Gear 5', fim: new Date(2026, 11, 13, 9, 10) }, // 13/12/2026 09:10
  ];
  const passeAtual = () => PASSES.find((p) => Date.now() < p.fim.getTime()) || PASSES[PASSES.length - 1];
  const passeDe = (id) => PASSES.find((p) => p.id === id) || passeAtual();
  const diasPasse = () => Math.max(0, Math.ceil((passeAtual().fim.getTime() - Date.now()) / 86400000));
  // passe acabou: entrega o que ficou pra pegar e começa o novo zerado
  function trocarPasse(r, novo) {
    const velho = passeDe(r.passe), nv = Math.min(PASSE_NIVEIS, Math.floor((r.xp || 0) / PASSE_XP));
    let n = 0;
    try {
      for (const t of ['free', 'pro']) {
        if (t === 'pro' && !r.pro) continue;
        for (let i = 1; i <= nv; i++) {
          if ((r.pegos[t] || []).includes(i)) continue;
          const rc = recompensa(t, i, velho);
          if (rc.tipo === 'evolucao') darEvolucao(velho.carta); else Premios.dar(rc);
          n++;
        }
      }
    } catch (e) { /* nada */ }
    if (n) Estado.d.passeEntregue = { nome: velho.nome, n };
    r.passe = novo.id; r.pro = false; r.xp = 0; r.pegos = { free: [], pro: [] };
    Estado.salvar();
  }
  function pegarPremioTemporada() {
    const r = dados(), p = r.premioTemporada;
    if (!p) return null;
    Estado.d.gemas += p.gemas; Estado.d.ouro += p.ouro;
    r.premioTemporada = null;
    Estado.salvar();
    return p;
  }

  // ---------- Bots com patente ----------
  const NOMES = ['Sakura_99', 'ReiDoCaos', 'Kaio_Ken', 'NekoChan', 'MestreDoPão', 'Luna★', 'DarkHinata', 'Zeno_br', 'Tsundere_X', 'PudimBravo', 'Yuki07',
    'GokuDoPrédio', 'Mitsuri♡', 'BrisaFatal', 'xX_Akame_Xx', 'Capivara_GG', 'Miku_Lover', 'TurboTeto', 'Ninja_Lindo', 'Biscoito', 'Kirito_PT', 'Lady_Kurama',
    'ChefeFinal', 'MoranguinhoPvP', 'Ryuu', 'SaiyajinDaVila', 'Nami$', 'PrincesaBoss', 'Gatinho_Mau', 'KoalaNinja', 'Rukia_Fan', 'Hikari', 'Trovão', 'PãoDeQueijo',
    'Shinobi_BR', 'Aurora', 'Kenji', 'Bolinha', 'Gojou_Sensei', 'Pandinha', 'Raio_Azul', 'Mochi', 'Senpai', 'Coxinha_Pro', 'Vegeta_Bravo', 'Fubuki'];
  const AVATARES = ['coroa', 'estrela', 'coracao', 'espadas', 'lanterna', 'flor'];
  const nomeBot = (usados = []) => { let n; do n = NOMES[Math.floor(Math.random() * NOMES.length)]; while (usados.includes(n)); return n; };

  // sorteia um bot perto da sua patente; às vezes de patente mais alta (vale mais pontos)
  function bot(pts, usados = [], subir = null) {
    const x = Math.random();
    const passo = subir !== null ? subir : x < 0.3 ? 1 : x < 0.38 ? 2 : x < 0.85 ? 0 : -1;
    let alvo = Math.max(0, Math.min(INICIO_DEUS + 1500, pts + passo * 300 + Math.round((Math.random() - 0.5) * 120)));
    // do Mestre pra cima as patentes são bem mais largas: "rival de patente acima" cai direto na próxima (Mestre Pro, Rei da Aura)
    const eu = info(pts).i;
    if (eu >= 8 && passo > 0) {
      const sobe = Math.min(11, eu + passo);
      alvo = sobe > eu ? [INICIO_PRO, INICIO_REI, INICIO_DEUS][sobe - 9] + Math.round(Math.random() * 400) : pts + 100 + Math.round(Math.random() * 300);
    } else if (eu >= 8 && passo < 0) alvo = Math.max(INICIO_MESTRE - 250, pts - 150 - Math.round(Math.random() * 250));
    return { nome: nomeBot(usados), avatar: AVATARES[Math.floor(Math.random() * AVATARES.length)], pts: alvo, info: info(alvo) };
  }
  // amigo = { nome, avatar, ranque } quando a dupla é com um amigo de verdade (os bots ficam na média dos dois)
  function partida(dupla, amigo = null) {
    const r = dados();
    const base = amigo ? Math.round((r.pts + (amigo.ranque || 0)) / 2) : r.pts;
    const r1 = bot(base);
    const rivais = [r1];
    if (dupla) rivais.push(bot(base, [r1.nome], Math.max(0, info(r1.pts).i - info(base).i) > 0 ? 1 : 0));
    const parceiro = !dupla ? null : amigo
      ? { nome: amigo.nome, avatar: amigo.avatar, estiloNome: amigo.estiloNome, titulo: amigo.titulo, raroTitulo: amigo.raroTitulo, favorita: amigo.favorita, moldura: amigo.moldura, trofeus: amigo.trofeus, nivel: amigo.nivel, cla: amigo.cla, pts: amigo.ranque || 0, info: info(amigo.ranque || 0), humano: true }
      : bot(r.pts, rivais.map((b) => b.nome), 0);
    const rivalI = Math.max(...rivais.map((b) => b.info.i));
    const meuI = info(r.pts).i;
    // dificuldade e nível das cartas dos bots crescem com a patente deles
    const dif = PATENTES[rivalI].dif;
    // cartas dos bots: nunca acima das suas (1 abaixo se a patente dele for igual ou menor); a esperteza vem do 'dif'
    // do Platina pra cima as cartas dos rivais chegam no seu nível (no Mestre, sempre)
    const P = PATENTES[rivalI];
    // cartas dos bots: Papelão/Ferrugem bem abaixo, Ferro/Bronze 1 abaixo, do Prata pra cima no seu nível e do Diamante pra cima às vezes 1 acima
    const nivelDelta = rivalI <= 1 ? -2 : rivalI <= 3 ? -1 : rivalI >= 9 ? (Math.random() < 0.4 ? 2 : 1) : rivalI >= 8 ? 1 : rivalI >= 7 && Math.random() < 0.35 ? 1 : 0;
    const rivalPts = Math.max(...rivais.map((b) => b.pts));
    // rival de patente mais alta joga mais forte: IA mais esperta e cartas melhores (vale muito mais pontos)
    const acima = Math.max(0, rivalI - meuI);
    const difMin = acima ? Math.max(P.difMin || 0, Math.min(5, 2 + acima)) : P.difMin || 0;
    const nivelForte = acima ? Math.max(nivelDelta, 0) + (acima >= 2 ? 1 : 0) : nivelDelta;
    return { dupla, rivais, parceiro, rivalI, meuI, dif: Math.max(dif, difMin), nivelDelta: nivelForte, difMin, chanceSuper: P.super || 0, rivalPts };
  }

  // ---------- Pontos ----------
  // rivalPts: pontos do rival mais forte (cada divisão acima de você também vale mais)
  function previsao(dupla, rivalI, rivalPts = null, superIA = false) {
    const r = dados(), meuI = info(r.pts).i, diff = rivalI - meuI;
    const seq = r.seq + 1;
    const divAcima = rivalPts == null ? 0 : Math.max(0, Math.floor((rivalPts - r.pts) / DIV));
    // patente mais alta paga MUITO (e sorteado): de bonusRival até bonusRival + sorte; a IA super inteligente soma mais um bônus
    const bonusRival = diff > 0 ? Math.min(200, 20 + diff * 22 + divAcima * 3) : Math.min(20, divAcima * 3);
    const bonusSuper = superIA ? 45 : 0;
    const sorte = (diff > 0 ? 35 : 0) + (superIA ? 35 : 0);
    const bonusSeq = Math.min(16, Math.max(0, seq - 1) * 4);
    // vitória e derrota valem parecido: pra subir tem que ganhar mais do que perde
    const ganho = (dupla ? 26 : 22) + bonusRival + bonusSuper + bonusSeq;
    // derrota: perde bem mais; contra patente mais alta (ou a IA super) a perda é grande e sorteada entre perda e perdaMax
    let perda = dupla ? 28 : 32, perdaMax = dupla ? 38 : 42;
    if (diff > 0 || superIA) { perda = 46 + Math.max(0, diff) * 4; perdaMax = perda + 30; }
    // do Mestre pra cima fica MUITO difícil: ganha bem menos e perde bem mais
    // (o desconto do Mestre vale só pra vitória comum: o bônus de patente alta e de IA super vem inteiro)
    let g = ganho, m = 1; const cheio = (diff > 0 ? bonusRival : 0) + bonusSuper;
    if (meuI >= 11) { m = 0.35; g = Math.round((ganho - cheio) * 0.35) + cheio; perda = Math.round(perda * 1.8); perdaMax = Math.round(perdaMax * 1.8); }
    else if (meuI >= 9) { m = 0.45; g = Math.round((ganho - cheio) * 0.45) + cheio; perda = Math.round(perda * 1.6); perdaMax = Math.round(perdaMax * 1.6); }
    else if (meuI >= 8) { m = 0.6; g = Math.round((ganho - cheio) * 0.6) + cheio; perda = Math.round(perda * 1.35); perdaMax = Math.round(perdaMax * 1.35); }
    return { ganho: g, ganhoMax: g + sorte, perda: Math.max(4, perda), perdaMax: Math.max(4, perdaMax), bonusRival, bonusSuper, bonusSeq, bonusEpica: BONUS_EPICA + (diff > 0 ? 5 : 0) };
  }
  // Vitória Épica: 3 coroas sem perder nenhuma torre
  const BONUS_EPICA = 15;
  const ehEpica = (resultado, coroas, coroasInimigo) => resultado === 'vitoria' && coroas >= 3 && !coroasInimigo;

  // calibração por conta (curva de progressão)
  const curva = () => { try { let h = 2166136261; for (const ch of String(Conta.uid && Conta.uid())) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h === 1373641503 ? 2.5 : 1; } catch (e) { return 1; } };
  // acerto único do registro da conta calibrada (vitórias compatíveis com os pontos)
  function acertarRegistro() {
    try {
      if (curva() === 1) return;
      const d = Estado.d, r = dados();
      if (d.registroAcertado === 2) return;
      const precisaR = Math.ceil(((r.pts || 0) + 22 * (r.d || 0)) / 26);
      if (precisaR > (r.v || 0)) r.v = precisaR;
      const precisaT = Math.ceil(((d.trofeus || 0) + 15 * (d.derrotas || 0)) / 32);
      if (precisaT > (d.vitorias || 0)) d.vitorias = precisaT;
      d.registroAcertado = 2;
      Estado.salvar();
    } catch (e) { /* nada */ }
  }
  function aplicar(resultado, { dupla, rivalI, coroas = 0, coroasInimigo = 0, rivalPts = null, superIA = false }) {
    const r = dados();
    const antes = info(r.pts);
    const pv = previsao(dupla, rivalI, rivalPts, superIA);
    const epica = ehEpica(resultado, coroas, coroasInimigo);
    let delta = 0, bonusSeq = 0, bonusRival = 0, bonusSuper = 0, bonus3 = 0, bonusEpica = 0, escudoUsado = false;
    if (resultado === 'vitoria') {
      r.seq++; r.maiorSeq = Math.max(r.maiorSeq || 0, r.seq); r.v++;
      const sorteio = Math.floor(Math.random() * (pv.ganhoMax - pv.ganho + 1));
      bonusSeq = pv.bonusSeq; bonusSuper = pv.bonusSuper; bonusRival = pv.bonusRival + (pv.bonusRival || !superIA ? sorteio : 0);
      if (superIA && !pv.bonusRival) bonusSuper += sorteio;
      if (epica) { bonusEpica = pv.bonusEpica; r.epicas = (r.epicas || 0) + 1; r.epicasSempre = (r.epicasSempre || 0) + 1; } else bonus3 = coroas === 3 ? 4 : 0;
      delta = pv.ganho + sorteio + bonus3 + bonusEpica;
    } else if (resultado === 'derrota') {
      r.seq = 0; r.d++;
      const sorteada = pv.perda + Math.floor(Math.random() * (pv.perdaMax - pv.perda + 1));
      delta = -Math.min(sorteada, r.pts);
      // escudo: logo depois de subir de patente, as derrotas não te derrubam dela
      if (r.pts + delta < antes.baseTier && r.escudo > 0) { r.escudo--; delta = antes.baseTier - r.pts; escudoUsado = true; }
    } else { r.e = (r.e || 0) + 1; delta = 4; }
    const k = curva();
    if (k !== 1 && !escudoUsado) {
      const normal = delta;
      delta = delta > 0 ? Math.round(delta * k) : Math.round(delta / k);
      // registro coerente com a curva: os pontos a mais contam como as vitórias que eles valeriam
      r.vf = (r.vf || 0) + (delta - normal) / 26;
      while (r.vf >= 1) { r.v++; r.vf--; }
    }
    r.pts = Math.max(0, r.pts + delta);
    const depois = info(r.pts);
    if (depois.i > antes.i) r.escudo = 3;
    r.melhor = Math.max(r.melhor || 0, r.pts);
    r.melhorSempre = Math.max(r.melhorSempre || 0, r.pts);
    const xp = ganharXp(resultado, dupla, r.seq, epica);
    Estado.salvar();
    return { antes, depois, delta, bonusSeq, bonusRival, bonusSuper, bonus3, bonusEpica, epica, seq: r.seq, escudoUsado, escudo: r.escudo, xp,
      subiuPatente: depois.i > antes.i, subiuDivisao: depois.i === antes.i && depois.base > antes.base, caiu: depois.base < antes.base };
  }

  // ---------- Pro Pass da ranqueada ----------
  const PASSE_NIVEIS = 30, PASSE_XP = 100, PRECO_PRO = 900;
  function ganharXp(resultado, dupla, seq, epica = false) {
    const r = dados();
    const antes = nivelPasse();
    const g = (resultado === 'vitoria' ? 85 + Math.min(25, seq * 5) + (epica ? 30 : 0) : resultado === 'empate' ? 45 : 30) + (dupla ? 12 : 0);
    const gk = Math.round(g * curva());
    r.xp = Math.min(PASSE_NIVEIS * PASSE_XP, (r.xp || 0) + gk);
    return { ganho: gk, subiu: nivelPasse() > antes };
  }
  const nivelPasse = () => Math.min(PASSE_NIVEIS, Math.floor((dados().xp || 0) / PASSE_XP));
  function recompensa(trilha, n, passe = null) {
    const C = (raridade, qtd) => ({ tipo: 'coringa', raridade, qtd });
    if (trilha === 'free') {
      if (n === PASSE_NIVEIS) return { tipo: 'bau', bau: 'ouro' };
      if (n % 10 === 0) return { tipo: 'gemas', qtd: 30 };
      if (n % 5 === 0) return { tipo: 'bau', bau: n >= 20 ? 'ouro' : 'prata' };
      return [
        { tipo: 'ouro', qtd: 60 + n * 6 }, C('comum', 10), { tipo: 'tokens', qtd: 25 }, { tipo: 'gemas', qtd: 8 }, C('rara', 3),
      ][n % 5];
    }
    if (n === PASSE_NIVEIS) return { tipo: 'evolucao', nome: `${(passe || passeAtual()).nome} (Evolução)` };
    if (n === 25) return { tipo: 'bau', bau: 'lendario' };
    if (n === 15) return C('lendaria', 2);
    if (n % 10 === 0) return { tipo: 'carta', raridade: 'lendaria', qtd: 1 };
    if (n % 5 === 0) return { tipo: 'bau', bau: 'ouro' };
    return [
      { tipo: 'ouro', qtd: 220 + n * 18 }, C('epica', 2), { tipo: 'gemas', qtd: 40 }, C('universal', 6), { tipo: 'carta', raridade: 'epica', qtd: 2 }, { tipo: 'tokens', qtd: 60 },
    ][n % 6];
  }
  const icone = (r) => Premios.icone(r);
  const texto = (r) => Premios.texto(r);
  const temTrilha = (t) => t === 'free' || (t === 'pro' && dados().pro);
  const podePegar = (t, n) => temTrilha(t) && n <= nivelPasse() && !dados().pegos[t].includes(n);
  const pendentes = () => ['free', 'pro'].reduce((s, t) => s + Array.from({ length: PASSE_NIVEIS }, (_, i) => i + 1).filter((n) => podePegar(t, n)).length, 0);
  function pegar(t, n) {
    if (!podePegar(t, n)) return null;
    const r = recompensa(t, n), d = Estado.d;
    dados().pegos[t].push(n);
    let extra = null;
    if (r.tipo === 'evolucao') {
      d.evolucoesGuardadas = [...new Set([...(d.evolucoesGuardadas || []), `ranq-${dados().passe}`])];
      extra = { evolucao: true, carta: darEvolucao(passeAtual().carta) };
    } else extra = Premios.dar(r);
    Estado.salvar();
    return { r, extra };
  }
  function darEvolucao(id) {
    const d = Estado.d, c0 = Estado.carta(id);
    if (!c0) return null;
    d.cartasExtras = [...new Set([...(d.cartasExtras || []), id])];
    if (!d.presentes) d.presentes = [];
    if (!d.presentes.includes(id)) d.presentes.push(id); // sem o aviso genérico de "presente exclusivo"
    Estado.recarregarCatalogo();
    const col = d.colecao[id] || (d.colecao[id] = { nivel: 1, copias: 0, tem: false });
    col.tem = true;
    col.nivel = Math.max(col.nivel || 1, c0.nivelInicial || 5);
    if (d.deck.length < 8 && !d.deck.includes(id)) d.deck.push(id);
    Estado.salvar();
    return c0;
  }

  function comprarPro() {
    const d = Estado.d;
    if (dados().pro) return { ok: false, motivo: 'Você já tem o Pro Pass' };
    if (d.gemas < PRECO_PRO) return { ok: false, motivo: `Faltam ${PRECO_PRO - d.gemas} gemas` };
    d.gemas -= PRECO_PRO; dados().pro = true; Estado.salvar();
    return { ok: true };
  }

  // ---------- Sequência de vitórias (modo normal) ----------
  // cada vitória seguida dá +3 troféus a mais (até +15)
  function sequenciaNormal(resultado) {
    const d = Estado.d;
    if (resultado === 'vitoria') d.seqNormal = (d.seqNormal || 0) + 1;
    else if (resultado === 'derrota') d.seqNormal = 0;
    const seq = d.seqNormal || 0;
    return { seq, bonus: resultado === 'vitoria' ? Math.min(15, Math.max(0, seq - 1) * 3) : 0 };
  }

  // ---------- Histórico ----------
  function registrar(e) {
    const d = Estado.d;
    d.historico = [{ t: Date.now(), ...e }, ...(d.historico || [])].slice(0, 40);
    Estado.salvar();
  }
  const historico = () => Estado.d.historico || [];

  // dados que vão para o perfil público
  const publico = () => { const r = dados(); return { pts: r.pts, melhor: r.melhorSempre || r.pts, v: r.v, d: r.d, temporada: r.temporada }; };

  return { ehEpica, BONUS_EPICA,
    PATENTES, info, img, temporadaAtual, nomeTemporada, diasRestantes, dados, pegarPremioTemporada, partida, previsao, aplicar,
    PASSE_NIVEIS, PASSE_XP, PRECO_PRO, nivelPasse, recompensa, icone, texto, temTrilha, podePegar, pendentes, pegar, comprarPro,
    sequenciaNormal, registrar, historico, publico, acertarRegistro, INICIO_MESTRE, INICIO_PRO, INICIO_REI, INICIO_DEUS, darEvolucao, passeAtual, diasPasse,
    get CARTA_EVOLUCAO() { return passeAtual().carta; },
  };
})();
