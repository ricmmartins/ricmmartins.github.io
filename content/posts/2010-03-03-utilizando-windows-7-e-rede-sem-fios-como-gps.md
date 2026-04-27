---
slug: "utilizando-windows-7-e-rede-sem-fios-como-gps"
title: 'Utilizando Windows 7 e rede sem fios como GPS'
date: '2010-03-03T19:30:50-05:00'
tags:
    - windows
description: "Aproveitando o assunto anterior sobre redes, wireless e o Windows 7, encontrei no site do Plínio Torres um artigo muito interessante e vou transcrevê-lo"
---

Aproveitando o assunto anterior sobre redes, wireless e o Windows 7, encontrei no site do Plínio Torres um artigo muito interessante e vou transcrevê-lo aqui. Trata de uma forma de usar o Windows 7 como se fosse um GPS através de redes sem fio.

O novo Windows 7 possui uma plataforma de suporte a sensores, estes usados para ler informações de aparelhos como medidores de temperatura, pressão ou aparelhos de localização, como um GPS físico ligado ao micro.

Através do desenvolvimento de um drive especial, é possível utilizar o sistema de sensores para tringular sinais de conexão wireless e IP Lookup para determinar a localização física do micro em um determinado local.

[![gpswindows-300x174](/wp-content/uploads/2010/03/gpswindows-300x174.jpg "gpswindows-300x174")  ](http://www.pliniotorres.com/wp-content/uploads/2010/03/gpswindows.jpg)

Após determinar as coordenadas de localização, um aplicativo desenvolvido a partir do Google Maps, permite visualizar o local onde o micro se encontra naquele momento.

Mesmo não sendo preciso como um GPS, o sistema conseguiu dentro de uma margem de erro de 100 metros determinar a localização do meu notebook sem maiores dificuldades. Segundo os desenvolvedores do drive, a localização pode ser feita apenas utilizando o IP da máquina, mas a recomendação para uma boa localização é a conexão com uma rede wireless, para que o sistema possa realizar a triangulação física do dispositivo.

**Instalação:**

1. Conecte o computador a rede sem fios.

2. Faça a download do drive e do software de localização.

[**Software para ativação do sensor (Somente para Windows 7)** ](http://geosenseforwindows.com/)

[**Aplicativo Google para utilização das coordenadas** ](http://geosenseforwindows.com/builds/1.0/GoogleMapsDemo_1.0.zip)

3. Após a instalação do drive, vá ao **Painel de Controle**, em **Sensor de Localização e outros Sensores** e habilite o **Geosense Location Sensor.**

4. Abra o aplicativo do Google Maps e confira a localização sugerida.
