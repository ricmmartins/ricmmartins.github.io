---
slug: "convertando-espacos-para-underscore"
title: 'Convertando espaços para underscore'
date: '2009-03-19T00:46:55-04:00'
tags:
    - comandos
---

Você odeia usuários que colocam espaço no nome de arquivos, causando diversos problemas em qualquer tipo de script que você tenha? Bom, este pequeno one-liner elimina a necessidade de gerar um shell script para efetuar esta mudança …

```bash
for i in $1 ; do mv "$i" `echo $i | sed 's/ /_/g'` ; done
```

o echo $i | sed ‘s/ /_/g’ é cercado por aspas simples e não por aspas duplas.
