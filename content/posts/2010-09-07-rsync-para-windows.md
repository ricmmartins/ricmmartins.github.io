---
slug: "rsync-para-windows"
title: 'RSync para Windows'
date: '2010-09-07T18:34:32-04:00'
tags:
    - rsync
    - windows
description: "Eu gostei tanto de mecher no AutoIt, que depois do programinha de Assitência Remota sem convites, criei um outro, para sincronizar os dados do meu"
cover:
  image: "/og/rsync-para-windows.png"
  alt: ""
  hidden: true
---

Eu gostei tanto de mecher no [AutoIt](http://www.autoitscript.com/), que depois do programinha de [Assitência Remota sem convites](http://ricardomartins.com.br/2010/09/07/assistencia-remota-sem-convites/), criei um outro, para sincronizar os dados do meu pendrive com minha máquina. Dei o nome de RSyncWin.

Ele funciona como o [RSync](http://pt.wikipedia.org/wiki/Rsync). No caso, ao executá-lo, pede para você informar o diretório de origem e depois o diretório de destino. Não precisa ser um diretório, se preciso, pode especificar a letra destinada ao seu pendrive, por exemplo, F: como diretório de origem e uma pasta na sua máquina como diretório destino, por exemplo, D:PenBackup.

Ele fica rodando no system tray e monitorando. Caso algo novo seja adicionado na origem, automaticamente é replicado para o destino.

Baixe [aqui](http://www.ricardomartins.com.br/arquivos/RsyncWin.zip) e use à vontade. Depois dê seu feedback.
