---
slug: "sandcat-scanner-de-vulnerabilidades-de-sistemas-e-servidores-web"
aliases:
  - "/posts/sandcat-scanner-de-vulnerabilidades-de-sistemas-e-servidores-web/"
id: 821
title: 'Sandcat - Scanner de vulnerabilidades de sistemas e servidores web'
date: '2009-04-10T17:36:19-04:00'
tags:
    - segurança
categories:
    - Geral
description: "Autor: Pedro Augusto de O. Pereira / Considere o Sandcat um NMap especializado em varrer servidores web (como IIS ou Apache) e aplicações web (o seu"
---

Autor: Pedro Augusto de O. Pereira / <http://augusto.pedro.googlepages.com/>

Considere o Sandcat um [NMap](http://www.insecure.org/nmap) especializado em varrer servidores web (como IIS ou Apache) e aplicações web (o seu site!). Isso facilita muito, pois você pode testar um determinado site ou servidor procurando por vários tipos de falhas como SQL Injection, Blind SQL Injection, XSS, XPath Injection, etc.

Existem várias opções para este tipo de aplicativo, a que mais gosto e uso regularmente é o scanner da [Acunetix](http://www.acunetix.com/), chamado [Web Vulnerability Scanner](http://www.acunetix.com/vulnerability-scanner/). Uma outra opção que tenho usado há alguns dias e gostado bastante é o [Sandcat](http://www.syhunt.com/section.php?id=sandcat), da empresa Syhunt.

[![Imagem do post Sandcat - Scanner de vulnerabilidades de sistemas e servidores web](http://www.syhunt.com/img/screenshots/current/012.jpg) ](http://www.syhunt.com/img/screenshots/current/012.jpg)

Ela é gratuita para ser utilizada e bem completa (bem próxima do nível do Web Vulnerability Scanner, da Acunetix). Ele checa por, aproximadamente, 260 vulnerabilidades conhecidas (utilizando o ranking de várias entidades como OWASP, OWASP PHP, CVE, CWE, etc), detecta falhas de XSS (Cross Site Scripting), testas sistemas IDS, consegue explorar sistemas web desenvolvidos utilizando AJAX, descobre e analisa a configuração utilizada no servidor automaticamente para descobrir quais testes são necessários, etc.

Além de checar o que pode ser explorado na sua aplicação web, ele também analisa o que pode ser explorado no seu servidor web. No website oficial do produto, é declarado que ele tem compatibilidade total com o Microsoft IIS. Porém já li opiniões e testei pessoalmente o programa utilizando Apache e também tive bons resultados.

Sem dúvida é um download recomendado, porém até agora só há opção para Windows (95, 98, Me, NT, 2000, 2003, XP e Vista). Faça o download [aqui](http://www.syhunt.com/section.php?id=sc_download).
