// Carregador de imagens.
// Para cada imagem, o jogo tenta primeiro "assets/<nome>.png".
// Se o PNG não existir, usa o desenho padrão "assets/<nome>.svg".
// Assim, quando o bot colocar um PNG com o mesmo nome na pasta,
// ele aparece no jogo automaticamente, sem mexer no código.
const Assets = (() => {
  const cache = {};

  function url(name) {
    if (!cache[name]) {
      cache[name] = new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(`assets/${name}.png`);
        img.onerror = () => resolve(`assets/${name}.svg`);
        img.src = `assets/${name}.png`;
      });
    }
    return cache[name];
  }

  // Preenche todos os <img data-asset="pasta/nome"> da página
  function fill(root = document) {
    root.querySelectorAll('img[data-asset]').forEach(async (img) => {
      img.src = await url(img.dataset.asset);
    });
  }

  return { url, fill };
})();
