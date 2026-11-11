# Queens and Kings

Fangame de cartas e torres, sem fins lucrativos. Este jogo é inspirado no gênero de Clash Royale, mas não tem ligação com a Supercell e não usa nenhuma imagem, nome ou arquivo do jogo original.

## Etapa atual: 1 (só visual)

- Menu com abas embaixo: Loja, Cartas, Batalha, Clã e Eventos. Toque nas abas ou arraste para o lado.
- Botão **Jogar**: abre a prévia da primeira arena, o Festival da Escola.
- Nada é interativo ainda: não tem batalha, compras nem online.

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
