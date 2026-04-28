---
slug: "assistencia-remota-sem-convites"
aliases:
  - "/posts/assistencia-remota-sem-convites/"
title: 'Assistência Remota sem convites'
date: '2010-09-07T18:19:10-04:00'
tags:
    - ferramentas
    - windows
categories:
    - Windows
description: "Esses dias precisei elaborar uma solução de compartilhamento de desktop entre usuários que fosse de utilização simples. Inicialmente pensei em procurar na"
---

Esses dias precisei elaborar uma <span class="bbli">solução</span> de compartilhamento de <span class="bbli">desktop</span> entre usuários que fosse de utilização simples. Inicialmente pensei em procurar na Internet algum<span class="bbli">programa</span> específico, porém me lembrei da Assitência Remota, um recurso nativo do Windows, que muitos desconhecem/confundem com a Área de Trabalho Remota.

Embora ambos utilizem o protocolo RDP, porta 3389, o escopo de utilização é bem diferente. A Assistência Remota, permite que você realmente preste assistência remota ao usuário, permitindo <span class="bbli">chat</span>, envio de arquivos, interação com a área de <span class="bbli">trabalho</span>, etc. Além disto, o usuário consegue ver tudo o que você está fazendo na máquina dele, e precisa lhe dar permissão para isto.

A Área de trabalho remota, permite gerenciar uma máquina remotamente e não disponibiliza estes recursos de interação com o usuário.

Enfim, para utilizar a assistência remota, é necessário à partir da ajuda do Windows, gerar um convite, que pode ser enviado pelo <span class="bbli">messenger</span>, <span class="bbli">e-mail</span>ou salvá-lo em um arquivo. Neste último caso, o arquivo precisa ser enviado para quem irá se conectar na <span class="bbli">máquina</span>.

O “problema”, é que gerar este convite pode ser confuso para alguns usuários, pois se faz necessário informar um nome para exibição no convite, uma senha e a validade do convite. Além disso, ele ainda teria que se virar para enviar este convite para a pessoa que iria conectar em sua máquina.

Pensando nisto, eu comecei a fuçar o [AutoIt](http://www.autoitscript.com/). Se você não conhece, vale a pena procurar saber do que se trata. Ele permite criar pequenos “scripts” que podem ser convertidos em programas executáveis (.exe) para automatizar tarefas no Windows. É uma linguagem simples e de fácil aprendizado. Além do mais, existem centenas de códigos prontos e que você pode ajustar para a sua necessidade. E o melhor: Tudo gratuito!

Com o auxílio do AutoIt, eu criei um programinha que ao ser executado, pergunta o nome e a máquina que deseja se conectar. Em seguida a conexão RDP da Assistência Remota é iniciada e pronto! Assistência remota sem convites!

Assim, eu consegui resolver o meu problema, e qualquer usuário poderá utilizá-lo sem nenhuma dificuldade.

Se você gostou, pode baixá-lo [aqui](http://www.ricardomartins.com.br/arquivos/AssistenciaRemota.zip). Depois, deixe seu feedback.
