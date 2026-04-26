---
slug: "verificando-o-arquivo-mais-recente"
title: 'Verificando o arquivo mais recente'
date: '2008-11-25T19:49:24-05:00'
tags:
    - linux
    - shell
---

<div class="entry">Hoje estava eu aqui testando uns shell scripts, e descobri uma forma de verificar qual o arquivo de log mais recente criado em um diretório.

Basta você executar:

`$ ls -1rtd /home/pasta/* | tail -1`

Se quiser testar, entre no seu /home, e crie 4 arquivos, por exemplo, arq1, arq2, arq3 e arq4, com algum intervalo entre o tempo de criação de cada um.

Depois execute:

`$ cd ~`

`$ ls -1rtd * | tail -1`

E a saída será:

`-rw-rw-r--  1 ricardo ricardo    0 Jun  6 12:22 arq4`

Até a próxima…

</div>
