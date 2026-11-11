# Queens and Kings

Fangame de cartas e torres, sem fins lucrativos. Este jogo é inspirado no gênero de Clash Royale, mas não tem ligação com a Supercell e não usa nenhuma imagem, nome ou arquivo do jogo original.

## O que já funciona

- **Batalha** contra o computador: elixir, mão com 4 cartas e próxima, tropas que andam, atravessam as pontes e lutam, torres que atiram, feitiços, tempo de 3 minutos (elixir em dobro no último minuto), prorrogação, coroas, vitória e derrota.
- **Recompensas:** troféus, ouro, XP, nível do jogador (+10 gemas por nível) e baús.
- **Baús:** destrancar com tempo (um por vez) ou abrir na hora com gemas.
- **Começo:** o jogador começa sem cartas e abre 4 baús iniciais, que dão as 8 cartas básicas.
- **Cartas:** As outras são liberadas por troféus (veja o caminho tocando nos troféus) e desbloqueadas ao ganhar a primeira cópia em baús ou na loja. Dá pra montar o deck (até 8) e evoluir com cópias + ouro.
- **Loja:** ofertas do dia (ouro), baús e pacotes de ouro (gemas). Tudo de mentirinha.
- **Clã:** buscar, entrar e sair (lista de membros simulada).
- **Eventos:** Desafio do Festival (3 vitórias seguidas), Torneio das Coroas (30 coroas) e batalha com elixir em dobro.
- **Perfil:** toque no nome para trocar, ver estatísticas ou apagar o progresso.
- O progresso fica salvo no navegador do celular.

Dica para testes: colocar `?vel=5` no final do link deixa a batalha 5x mais rápida.

## Como abrir

Ative o GitHub Pages em **Settings → Pages → Branch: main / (root)**. Depois, abra o link que aparecer lá.

## Como trocar as imagens

Todas as imagens ficam em `assets/`. Os desenhos padrão são arquivos `.svg`.

Para trocar uma imagem, coloque um `.png` com **o mesmo nome** na mesma pasta. Por exemplo, um `assets/arena/torre_azul.png` substitui o `torre_azul.svg` sozinho, sem mexer no código.

| Arquivo | O que é |
| --- | --- |
| `arena/cerca` | Moldura de madeira em volta da arena |
| `arena/chao` | Textura da grama (repetida) |
| `arena/pedra` | Pedrinhas da trilha |
| `arena/rio` | Rio do meio |
| `arena/ponte` | Ponte |
| `arena/torre_azul`, `arena/torre_vermelha` | Torres laterais |
| `arena/torre_rei_azul`, `arena/torre_rei_vermelha` | Torres do rei |
| `arena/arvore` | Cerejeira |
| `arena/varal_lanternas` | Varal com lanternas |
| `arena/barraca` | Barraca de festival |
| `ui/bau_madeira`, `ui/bau_prata`, `ui/bau_ouro` | Baús |

As imagens novas devem ser de fontes com licença livre (CC0), como Kenney e Quaternius. Anote a origem de cada uma em `CREDITOS.md`.

## Bot de imagens

O bot fica em `bot/`. Ele baixa pacotes 3D com licença CC0 da Kenney, tira "fotos" dos modelos no Blender e salva os PNGs com os nomes certos em `assets/`. Os créditos são atualizados sozinhos em `CREDITOS.md`.

**Para rodar pelo celular:** abra a aba **Actions** do repositório, toque em **Bot de imagens**, depois em **Run workflow** e confirme com **baixar**. Em uns 5 a 10 minutos, as imagens novas entram no jogo.

- O modo **listar** só gera `bot/catalogo.txt` com todos os modelos disponíveis.
- Para trocar qual modelo vira qual imagem, edite `bot/fontes.json`.
- Só entram pacotes CC0 de sites da lista `sites_permitidos`.

## Cartas das personagens

1. Coloque a imagem em `assets/cartas/originais/<id>.jpg` (ou `.png`).
2. Adicione a carta em `assets/cartas/cartas.json`, com nome, raridade, custo, tipo, posição do rosto (medalhão) e recorte da arte.
3. Rode `python tools/montar_cartas.py`. Ele gera `<id>.jpg`, que é a arte da carta, e `<id>_medalhao.png`, que é a tropa na arena.

## Contas (Firebase)

- Login com e-mail/senha ou Google, ou jogar sem conta.
- Quem tem conta tem o progresso salvo no Firestore em `jogadores/{uid}` e pode jogar em qualquer celular.
- As regras de segurança estão em `firestore.rules`. Cole esse texto em **Firestore → Regras → Publicar**.

## Top global, passe e mod menu

- **Top global:** os 50 jogadores com mais troféus (coleção `ranking`). Contas que usaram o mod menu ficam de fora.
- **Passe da temporada:** 30 níveis por mês; trilhas Free, Plus (600 gemas) e Ultra (1.500 gemas). Pontos por batalha.
- **Mod menu:** só aparece para os IDs listados em `CRIADORES`, no arquivo `js/mod.js`. O ID aparece no perfil de quem está logado.
