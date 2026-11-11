#!/bin/bash
# Baixa recursos gratuitos para o jogo (roda no robô do GitHub, que tem internet).
# - Poly Haven (CC0): lista de texturas + texturas escolhidas em tools/recursos/texturas.txt
# - Kenney (CC0): pacotes de partículas/efeitos
# - game-icons.net (CC BY 3.0): ícones de armas e itens
set -u
cd "$(dirname "$0")/.."
mkdir -p tools/recursos assets/texturas assets/efeitos assets/icones

# 1) lista de texturas do Poly Haven (para escolher)
curl -fsSL -A "queens-and-kings-bot" "https://api.polyhaven.com/assets?t=textures" -o /tmp/ph.json && \
  jq '[to_entries[] | {slug: .key, nome: .value.name, cat: .value.categories, tags: .value.tags}]' /tmp/ph.json > tools/recursos/polyhaven.json || echo "falhou lista polyhaven"

# 2) texturas escolhidas (diffuse 1k jpg)
if [ -f tools/recursos/texturas.txt ]; then
  while read -r slug; do
    [ -z "$slug" ] && continue
    [ -f "assets/texturas/$slug.jpg" ] && continue
    url=$(curl -fsSL -A "queens-and-kings-bot" "https://api.polyhaven.com/files/$slug" | jq -r '.Diffuse["1k"].jpg.url // .diffuse["1k"].jpg.url // empty')
    if [ -n "$url" ]; then curl -fsSL "$url" -o "assets/texturas/$slug.jpg" && echo "ok $slug"; else echo "sem textura $slug"; fi
  done < tools/recursos/texturas.txt
fi

# 3) pacotes do Kenney
for pacote in particle-pack smoke-particles; do
  [ -d "assets/efeitos/$pacote" ] && continue
  zip=$(curl -fsSL "https://kenney.nl/assets/$pacote" | grep -oE 'https://kenney.nl/media/pages/assets/[^"]+\.zip' | head -1)
  if [ -n "$zip" ]; then
    curl -fsSL "$zip" -o /tmp/k.zip && mkdir -p "/tmp/k/$pacote" && unzip -qo /tmp/k.zip -d "/tmp/k/$pacote" && \
      mkdir -p "assets/efeitos/$pacote" && find "/tmp/k/$pacote" -iname '*.png' -path '*PNG*' -exec cp {} "assets/efeitos/$pacote/" \; && echo "ok kenney $pacote"
    [ -n "$(ls -A assets/efeitos/$pacote 2>/dev/null)" ] || find "/tmp/k/$pacote" -iname '*.png' -exec cp {} "assets/efeitos/$pacote/" \;
  else echo "sem zip $pacote"; fi
done

# 4) ícones do game-icons.net (só os que têm a ver com ataques)
if [ ! -f assets/icones/LISTA.txt ]; then
  git clone -q --depth 1 https://github.com/game-icons/icons.git /tmp/gi && \
  find /tmp/gi -name '*.svg' | grep -iE 'sword|katana|pistol|revolver|gun|staff|wand|bow|arrow|fireball|lightning|bolt|snowflake|ice|shuriken|kunai|scythe|hammer|spear|trident|dagger|knife|fist|punch|kick|music|note|card|petal|flower|sakura|heart|bread|book|fan|whip|axe|star|orb|crystal|flame|fire|wind|tornado|energy|explosion|beam|laser|claw|fang|chain|bomb|grenade|shield|ball|bubble|feather|leaf|lantern|bell|mic|guitar|soccer|teleport|portal|aura|spark|halo|skull|ghost|moon|sun|comet|meteor|kunai|sai|nunchaku|tonfa|rapier|sabre|saber|blade' | \
  while read -r f; do autor=$(basename "$(dirname "$f")"); cp "$f" "assets/icones/${autor}__$(basename "$f")"; done
  ls assets/icones > assets/icones/LISTA.txt
  echo "ícones: $(wc -l < assets/icones/LISTA.txt)"
fi
du -sh assets/texturas assets/efeitos assets/icones
