---
slug: "janelas-transparentes-no-ubuntu-9-04"
title: 'Janelas transparentes no Ubuntu 9.04'
date: '2009-06-14T06:31:25-04:00'
tags:
    - linux
    - ubuntu
---

Hoje tive que trabalhar de madrugada… Fazer o quê né ?!

Como neste horário as coisas por aqui são bem tranquilas, eu resolví trazer o meu note para fazer alguns ajustes finos no sistema: atualizei os pacotes, instalei alguns aplicativos e configurei o meu CZero Deleted Scenes no Wine.

Olhando as configurações do Compiz, notei que não tinha nenum efeito de transparência de janelas bacana. Então mãos à obra!

Procurando no Google, encontrei coisas interessantes, mas muitas voltadas para o Fluxbox, que consequentemente, não funcionaram corretamente no Gnome. Pesquisando, pastanto e testando, depois de algumas adaptações conseguí ter as minhas janelas com efeitos de transparência!

Veja o procedimento:

Instale os pacotes xcompmgr e transset:

`$ sudo apt-get install xcompmgr transset`

Descobri que o transset não necessita do xcompmgr, ele roda sobre o metacity (já vem instalado por padrão no ubuntu), e para ativá-lo (metacity) use Alt + F2 (ou no terminal) e execute o comando gconf-editor, vá em ‘apps’ &gt; ‘metacity’ &gt; e ative o ‘composite manager’.

Para testar o transset no terminal digite:

`$ transset 0.8`

Aparecerá uma cruz no lugar do cursor e daí é só clicar numa janela que ela se tornará transparente em 80%.  
Mas colocar transparência nas janelas assim dá trabalho. Para facilitar um pouco esse processo indicaram o uso do ‘xbindkeys’, programa que faz atalhos pelo teclado. Para instalá-lo é fácil, no terminal digite:

`$ sudo apt-get install xbindkeys`

Agora crie o arquivo-texto para configurar os atalhos do xbindkeys. No terminal:

`$ gedit ~/.xbindkeysrc`

No arquivo em branco aberto digite:

`"transset 0.83"<br></br>control + b:4`

`"transset 1"<br></br>control + b:5`

Salve e feche. Para testar o xbindkeys mais o transset, no terminal digite:

`$ xbindkeys`

Depois testamos o transset segurando o Control e girando a roda do mouse, pra cima deixa a janela transparente, e pra baixo volta ao normal.

Por fim, para ‘fixar’ o uso deste atalho para o transset, temos que habilitar o xbindkeys para rodar no início da sessão, vá em Menu &gt; Sistema &gt; Preferências &gt; Aplicativos de sessão &gt; + Adicionar, na caixa ‘nome’ e ‘comando’ escreva xbindkeys.

Pronto, agora pode colocar transparência nas janelas e mostrar para todo mundo o seu linux bonitão!
