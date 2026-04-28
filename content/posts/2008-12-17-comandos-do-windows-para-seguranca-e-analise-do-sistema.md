---
slug: "comandos-do-windows-para-seguranca-e-analise-do-sistema"
aliases:
  - "/posts/comandos-do-windows-para-seguranca-e-analise-do-sistema/"
title: 'Comandos do Windows para segurança e análise do sistema'
date: '2008-12-17T21:06:29-05:00'
tags:
    - windows
    - segurança
categories:
    - Windows
description: "Hoje vou compartilhar com vocês alguns comandos que permitem que analistas de suporte possam manter um diagnóstico bem mais amplo do sistema. Os comandos"
---

Hoje vou compartilhar com vocês alguns comandos que permitem que analistas de suporte possam manter um diagnóstico bem mais amplo do sistema. Os comandos devem ser executados em modo de console. (Menu iniciar &gt; Executar &gt; escreva”cmd” ou “command” &gt; enter ou ok).

**Interagindo com o gerenciador de tarefas do windows.**

Exibir todos os serviços que estão interagindo com os processos (cada serviço do windows deve estar dentro de um processo e os processos possuem um ou varios serviços), isso ajuda a saber as interações entre eles.

*Comando: tasklist /svc*

Exibir os processos que do windows e as suas respectivas DLLs, bibliotecas e códigos dependentes. Isso mais uma vez ajuda a saber qual dll, biblioteca ou código está sendo usada em casa processo. (M = Modulo)

*Comando: tasklist /m*

**Interagindo com o registro do windows.**

Exibir os programas que rodam juntamente quando o windows é iniciado. Muitas pessoas ou analistas vão no registro buscar informações de programas maliciosos, a ponto de tentar bloqueá-los ou apagá-los de serem executados junto com o sistema. Que tal fazer uma busca diretamente no registro? Usando o comando “reg query” , você pode buscar automaticamente qualquer chave do registro. Por exemplo, para buscar todos os programas que são executados junco com o windows execute:

 *Comando: reg query hklmsoftwaremicrosoftwindowscurrentversionrun*

Espero que estes comandos possam ser úteis !

Até a próxima.
