---
slug: "como-cancelar-realmente-uma-impressao"
title: 'Como cancelar realmente uma impressão'
date: '2009-04-10T17:54:26-04:00'
tags:
    - windows
description: "Acontece muito, sabe quando quer cancelar um documento e ele fica horas para desaparecer da fila de impressão? Depois de reiniciar ele continua lá, quando"
---

Acontece muito, sabe quando quer cancelar um documento e ele fica horas para desaparecer da fila de impressão? Depois de reiniciar ele continua lá, quando não sai imprimindo tudo em várias folhas, você fica doido com aquela situação, gastando tinta e papeis, da vontade jogar a impressora fora? Como gosto de dizer esta frase: Seus problemas acabaram! Pelo menos para quem usa o Windows XP.

Vá ao Iniciar / Executar, escreva cmd e tecle Enter, com este comando abrirá uma janela/Prompt do DOS. Agora escreva os comandos na sequência demonstrada abaixo:

1. net stop spooler  
2. cd %systemroot%system32spoolPRINTERS  
3. del /f /s \*.shd  
4. del /f /s \*.spl  
5. net start spooler  
6. exit

Pronto, desta forma excluiu todos os documento que estão na fila de impressão (spool).

Para facilitar o trabalho e resolver em apenas um clique, faça o seguinte:

Abra o Bloco de Notas, copie o código acima e salve como .bat, dê um nome qualquer, por exemplo, ‘anti-spool.bat’, pode deixar na área de trabalho mesmo, quando o problema persistir, basta executar o pequeno arquivo para ter todas as impressões canceladas instantaneamente.

