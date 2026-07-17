---
slug: "como-organizei-watch-later-youtube-javascript-console"
aliases:
  - "/posts/como-organizei-watch-later-youtube-javascript-console/"
title: "Como organizei 302 vídeos do Watch Later do YouTube com JavaScript no console"
description: "Watch Later com 302 vídeos virou 14 playlists organizadas. Sem extensão, sem app. Só JavaScript no console do navegador e GitHub Copilot pra categorizar."
date: 2026-07-17T09:00:00-04:00
categories:
  - Produtividade
  - Automação
tags:
  - javascript
  - youtube
  - automação
  - github-copilot
  - produtividade
---

Meu Watch Later tinha 302 vídeos. Tutoriais de Azure, receita de panqueca japonesa, debates teológicos, vídeo de hamster escapando de labirinto. Tudo junto, tudo misturado, completamente inútil como lista.

Eu nunca ia assistir aquilo daquele jeito. Ninguém assiste. O Watch Later do YouTube é onde vídeo vai pra morrer.

Resolvi limpar a bagunça inteira sem instalar extensão, sem dar permissão pra app de terceiro, sem arrastar vídeo por vídeo. Só JavaScript no console do navegador e uma IA pra categorizar.

## O problema real

O YouTube não tem nenhuma ferramenta pra organizar o Watch Later. Suas opções são duas: arrastar vídeo por vídeo pra outras playlists (inviável com 300+), ou instalar extensões que pedem acesso à sua conta inteira.

Eu queria automatizar.

## Como resolvi: 3 scripts

### 1. Extrair a lista de vídeos

Primeiro, pegar os títulos e canais de tudo que está na playlist. Abre o Watch Later, rola até o final (o YouTube carrega lazy, precisa rolar tudo), F12, Console, cola:

```javascript
let videos = document.querySelectorAll('ytd-playlist-video-renderer');
let list = [];
videos.forEach((v, i) => {
  let title = v.querySelector('#video-title')?.textContent?.trim();
  let channel = v.querySelector('#channel-name a, .ytd-channel-name a')?.textContent?.trim();
  if (title) list.push(`${i+1}. ${title} | ${channel || 'Canal desconhecido'}`);
});
copy(list.join('\n'));
console.log(`${list.length} videos copiados para a area de transferencia`);
```

Isso joga a lista inteira no clipboard. Salva num .txt.

### 2. Categorizar com IA

Peguei essa lista e joguei no GitHub Copilot com um prompt simples:

> "Tenho essa lista de vídeos do YouTube. Categorize todos em playlists temáticas organizadas. Agrupe por assunto e me devolva os números de cada vídeo por categoria."

O Copilot analisou os 302 títulos e devolveu 14 categorias:

| Playlist | Qtd |
|----------|-----|
| Fé, Religião e Teologia | 55 |
| Programação e Cloud | 45 |
| Finanças e Investimentos | 43 |
| Inteligência Artificial | 30 |
| Empreendedorismo e Renda Extra | 26 |
| Política e Sociedade | 25 |
| Produtividade e Dev. Pessoal | 24 |
| Vida nos EUA e Imigração | 17 |
| Saúde e Fitness | 10 |
| Entretenimento e Diversos | 10 |
| Imóveis e Cidades | 6 |
| Inglês | 5 |
| Música | 4 |
| Culinária e Receitas | 2 |

Achei engraçado ver meus interesses tabulados assim. 55 vídeos de teologia, 2 de culinária. Acho que diz algo sobre mim.

O Copilot também gerou uma planilha Excel com uma aba por categoria. Útil pra revisar antes de executar o próximo passo.

### 3. Criar as playlists via API

Com a categorização pronta, o segundo script usa a API interna do YouTube (InnerTube) pra criar as playlists e adicionar os vídeos direto do console.

```javascript
async function createPlaylistWithVideos(title, videoIds) {
  await ytApiCall('playlist/create', {
    title: title,
    videoIds: videoIds,
    privacyStatus: 'PRIVATE',
  });
}
```

O script completo faz o seguinte: extrai os IDs dos vídeos da página, mapeia cada um pra sua categoria pelo índice, cria 14 playlists privadas via API e adiciona os vídeos. Tem um delay de 2 segundos entre cada chamada pra não tomar rate limit do YouTube.

### Extra: esvaziar o Watch Later

Depois de confirmar que as playlists ficaram certas, um terceiro script limpa o Watch Later:

```javascript
await ytApiCall('browse/edit_playlist', {
  playlistId: 'WL',
  actions: videoIds.map(id => ({
    action: 'ACTION_REMOVE_VIDEO_BY_VIDEO_ID',
    removedVideoId: id,
  })),
});
```

Remove em lotes de 50. Se um lote falhar, tenta individualmente. Os vídeos continuam existindo no YouTube, só saem da playlist.

## O que é essa API InnerTube

O YouTube usa uma API interna chamada InnerTube pra tudo que acontece na interface. Quando você está logado, o navegador tem acesso a três coisas que o script aproveita:

- `ytcfg`: um objeto global com a API key e versão do client
- O cookie SAPISID: usado pra gerar o hash de autenticação
- Endpoints como `playlist/create` e `browse/edit_playlist`

Na prática, o script faz exatamente o que a interface faria se você clicasse em "Adicionar à playlist" 302 vezes. Só que em segundos.

### Sobre segurança

Não precisa de extensão, não precisa de API key externa, as playlists são criadas como privadas. Mas dois avisos: nunca cole scripts de fontes que você não confia no console do navegador, e a InnerTube não é uma API oficial, então pode mudar sem aviso.

## O que mudou

Em uns 5 minutos (contando o scroll e a execução), saí de 302 vídeos jogados numa lista pra 14 playlists organizadas por tema. Watch Later zerado.

Agora quando quero ver algo sobre Kubernetes, abro a playlist de Programação. Receita? Culinária. Parece óbvio mas antes eu não achava nada.

## Se quiser reproduzir

Os 3 scripts completos estão neste [Gist no GitHub](https://gist.github.com/ricmmartins/a154e680e42f1eb75d55de0e2edbd619). O que mostrei acima são trechos simplificados pra explicar a lógica. Pro script funcionar de verdade, você precisa da versão completa do Gist, que inclui autenticação via SAPISID, extração dos videoIds, mapeamento de categorias e controle de rate limit.

O script tem uma flag `DRY_RUN` que mostra o que seria feito sem criar nada de fato. Recomendo rodar assim primeiro. Também precisa rolar a página inteira antes de executar, senão o script não pega todos os vídeos. As categorias que usei refletem o que eu assisto, então adapte pro que faz sentido pra você. E salve a lista original antes de esvaziar o Watch Later, por garantia.

A ferramenta certa pro problema não era um app novo. Era um script no console e uma IA pra classificação. Às vezes é só isso.
