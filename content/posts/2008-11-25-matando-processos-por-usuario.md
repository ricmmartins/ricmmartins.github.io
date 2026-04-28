---
slug: "matando-processos-por-usuario"
aliases:
  - "/posts/matando-processos-por-usuario/"
title: 'Matando processos por usuário'
date: '2008-11-25T19:48:13-05:00'
tags:
    - linux
    - shell
categories:
    - Linux
description: "Essa é uma dica rápida para matar todos os processos de um usuário de uma vez só."
---

<div class="entry">Essa é uma dica rápida para matar todos os processos de um usuário de uma vez só.

Basta executar:

`$ ps -efu$USER | awk '{print $2}' | xargs -i bash -c "echo matando {};kill -TERM {}"`

Agora explicando…

O comando “ps -efu$USER” vai mostrar todos os processos iniciados pelo usuário que você está usando. (Para verificar qual é este usuário, usa-se o comando “whoami” ou o comandi “id”).

`$ ps -efu$USER<br></br>USER PID %CPU %MEM VSZ RSS TTY STAT START TIME COMMAND`

rmartins 12577 0.0 0.0 2424 1300 ? S 14:38 0:00 script\_test.ksh  
rmartins 12638 0.0 0.0 2148 788 ? R+ 14:39 0:00 top  
rmartins 12439 0.0 0.0 2424 1296 ? S+ 14:37 0:00 watchlog\_ricardo.sh

Em seguida usamos o awk para exibir apenas o segundo campo da saída do ps -efu$USER.

`$ ps -efu$USER | awk '{print $2}'`

PID  
12577  
12638  
12439

Depois usamos o xargs para montar uma lista à partir da resposta do awk e guardar a mesma em { }, e depois o Kill -TERM na lista que esta dentro de { }.

Vejamos abaixo o resultado:

`$ ps -efu$USER | awk '{print $2}' | xargs -i bash -c "echo matando {};kill -TERM {}"`

matando 12577  
matando 12638  
matando 12439  
Terminated

Obs.: A opção bash -c echo matando {} é só para mostrar a informação de qual processo ele está matando no momento da execução da linha de comando. Caso queira matar os processos sem nenhuma informação, execute:

`$ ps -efu$USER | awk '{print $2}' | xargs -i kill -9 {}`

Até a próxima

</div>
