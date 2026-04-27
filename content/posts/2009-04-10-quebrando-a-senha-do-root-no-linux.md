---
slug: "quebrando-a-senha-do-root-no-linux"
title: 'Quebrando a senha do root no linux'
date: '2009-04-10T17:58:15-04:00'
tags:
    - linux
    - segurança
description: "Esta é uma dica rápida, para quem precisa quebrar a senha do usuário root em qualquer distribuição linux, utilizando um live-cd."
---

Esta é uma dica rápida, para quem precisa quebrar a senha do usuário root em qualquer distribuição linux, utilizando um live-cd.

1. Bootar com o live-cd.
2. Descobrir em qual área do disco esta instalada a partição / (# cfdisk)
3. Criar um diretório – pode chamar de target (# mkdir /target)
4. Assumindo que a partição instalada no hd, esteja em hda1, monte a partição no diretório /target (# mount /dev/hda1 /target)
5. Acessar o diretório /target (# cd /target)
6. Alterar a partição / que está rodando do cd, para a partição raiz instalada no HD montada no /target (# chroot .)
7. Alterar a senha do root com o comando passwd (# passwd root)

Explicando o funcionamento:

Inicializaremos a máquina através da distribuição carregada à partir do cd. Nestes live-cd’s, o usuário disponibilizado é o usuário root.

Depois de montar a partição / do HD na pasta criada na ramdrive (/target), e tornar a mesma como partição / para o sistema que está rodando via cd (# chroot . ) , ganhamos acesso total ao sistema, pois estávamos rodando do cd como usuário root, e tornamos a partição raiz do HD, como a partição raiz do CD. Agora rodamos o comando passwd para trocar a senha do usuário root.

Obs.: Atentar para o (.) depois do comando chroot, pois ele indica para alterar a raiz para o diretório atual, e neste caso se faz necessário estar dentro do diretório desejado ( no nosso exemplo, o /target)
