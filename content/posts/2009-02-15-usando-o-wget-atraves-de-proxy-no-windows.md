---
slug: "usando-o-wget-atraves-de-proxy-no-windows"
title: 'Usando o Wget através de Proxy no Windows'
date: '2009-02-15T00:20:11-05:00'
tags:
    - wget
description: "Essa dica tem origem em um problema que tive no meu trabalho ao precisar baixar o conteúdo de um site."
---

Essa dica tem origem em um problema que tive no meu trabalho ao precisar baixar o conteúdo de um site.

No meu trabalho, não tenho acesso de administrador à máquina que utilizo e pra piorar ainda existe um proxy para realizar a conexão com a internet. Estava eu aqui precisando baixar um site inteiro e pensando e pesquisando no google, juntando os resultados que obtive aqui e alí, encontrei uma forma para resolver o meu problema.

Primeiro baixe o Wget for Windows em <http://users.ugent.be/~bpuype/wget/>.

Depois de baixar, descompacte o arquivo zip. Através do prompt de comando, entre na pasta onde descompactou o wget e depois siga os comandos abaixo:

1. Informe ao wget que deseja usar proxy:

```bash
wget --proxy=on
```

2. Configure o endereço do seu proxy e a porta como uma variável de ambiente chamada “http\_proxy” no windows:

```bash
set http_proxy=http://129.20.9.217:8080
```

3. Faça o download do que deseja, passando o usuário e a senha do proxy:

```bash
wget --proxy-user="usuario" --proxy-passwd="senha" -r http://www.enderecodosite.com.br/arquivo.zip
```

Espero que seja útil ! E que quem mais precisar de algo similar, não precise levar tanto tempo por aí procurando como fazaer isto, pois além de incompletas, aslgumas dicas da internet não funcionam.
