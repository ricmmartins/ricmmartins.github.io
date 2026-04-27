---
slug: "bloqueando-sites-na-unha"
title: 'Bloqueando sites  na unha - Parte 1'
date: '2009-02-20T17:32:22-05:00'
tags:
    - segurança
description: "Essa dica é para você que tem um filho pequeno em casa, empregados espertinhos na sua pequena rede do trabalho, e precisa bloquear alguns sites de maneira"
cover:
  image: "/og/bloqueando-sites-na-unha.png"
  alt: ""
  hidden: true
---

Essa dica é para você que tem um filho pequeno em casa, empregados espertinhos na sua pequena rede do trabalho, e precisa bloquear alguns sites de maneira rápida e fácil, sem muita complicação.

Existe um método mais “completo” de bloqueio de sites através do já citado aqui OpenDNS. Caso você não saiba do que eu estou falando e se interessou, basta acessar [aqui](http://ricardomartins.com.br/2008/12/07/voce-conhece-o-opendns/).

Agora vamos ao que interessa.

Nesta dica, vou ensinar como bloquear sites através do próprio arquivo hosts de seu sistema operacional. que funciona de forma semelhante à um DNS, porém muito limitado, pois você não tem como colocar lá todos os endereços ip e todos os nomes de todos os sites da internet.

Como o seu navegador olha primeiro para o seu arquivo hosts antes de ir procurar algo na internet, basta você apontar o nome de um site que deseja bloquear para o seu ip de localhost, assim toda vez que alguem tentar acessar este site, o seu browser vai procurar o site na sua própria máquina, consequentemente, não conseguirá abrir nada e pdoemos dizer que teve o seu acesso bloqueado.

A dica é simples, você pode fazer de duas formas.

1\. Manualmente adicione ao seu arquivo /etc/hosts o ip 127.0.0.1 (localhost) apontando para o site que deseja bloquear o acesso.  
127.0.0.1 [www.orkut.com](http://www.orkut.com/)  
127.0.0.1 [www.youtube.com](http://www.youtube.com/)

2\. Criando um arquivo .bat que automatize esta tarefa para você:

\* Lembre – se que para criar o arquivo .bat, basta abrir o seu notepad, colar as linhas abaixo nele e depois salvar como teste.bat (ou o nome que você preferir .bat)

```bash
@echo off
Attrib -r -s -h %WINDIR%/system32/driversetc/hosts
echo 127.0.0.1 www.orkut.com >> %SystemRoot%/system32/driversetc/hosts
echo 127.0.0.1 www.youtube.com >> %SystemRoot%/system32/driversetc/hosts
Attrib +r +h %WINDIR%/system32/driversetc/hosts
```

Outra forma fácil de bloquear conteúdos web é com softwares de filtragem de conteúdo. Com um software deste tipo, qualquer administrador de rede detém as ferramentas específicas para bloquear sites que em geral não são apropriados e, claro, de material sexualmente explícito. Filtros de conteúdo da Web normalmente são muito simples de instalar e, na maior parte, trabalham bem. Alguns dos principais softwares de filtro de conteúdo disponíveis são: Cyber Patrol, Net Nanny, Surf Control e Websense.

Note-se que não há nenhuma maneira de bloquear tudo explícito o conteúdo da web. Embora a maioria dos navegadores da web e de ajustes de software de filtragem deve bloquear a grande maioria dos conteúdos explícitos, pode haver momentos em que irá passar sorrateiramente através de conteúdos inadequados.

Por hoje é só ! Até a próxima.

> Leia também a continuação deste post em <http://ricardomartins.com.br/2009/03/19/bloqueando-sites-atraves-do-arquivo-hosts/> – Parte 2
