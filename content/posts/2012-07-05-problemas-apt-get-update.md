---
slug: "problemas-apt-get-update"
title: 'Problemas no apt-get update'
date: '2012-07-05T16:35:43-04:00'
tags:
    - linux
description: "Ok, então você acabou de instalar seu Ubuntu e na primeira execução do apt-get update, quando chega em 100% fica parado exibindo:"
---

Ok, então você acabou de instalar seu Ubuntu e na primeira execução do apt-get update, quando chega em 100% fica parado exibindo:

> 100% [Waiting for Headers]

Isto ocorre porque alguns repositórios tem problemas com o HTTP/1.1 pipelining.

Crie o arquivo **/etc/apt/apt.conf.d/piplining-off.conf** com o seguinte conteúdo:

```bash
Acquire::http::Pipeline-Depth "0";
```

Em seguinda rode o **apt-get clean all** e depois rode sem problemas o **apt-get update**
