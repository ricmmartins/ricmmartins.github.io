---
slug: "dashboard-lindao-para-seu-servidor-linux"

title: 'Instalando um dashboard lindão para seu servidor linux'
date: '2014-01-28T11:46:24-05:00'
tags:
    - linux
    - monitoramento
description: "Depois de algum tempo sem colocar nada por aqui, hoje vou mostrar como instalar um dashboard com as principais informações sobre o seu servidor em uma"
---

Depois de algum tempo sem colocar nada por aqui, hoje vou mostrar como instalar um dashboard com as principais informações sobre o seu servidor em uma interface web bastante agradável. Tudo isso de forma bem rápida e fácil.

Com ele, você não vai precisar mais acessar a console para obter informações básicas como uso de processador, memória ou disco.

Você vai precisar instalar basicamente um Apache, PHP, baixar do Github o projeto deste dashboard e em 5 minutos você terá um dashboard como este:

[https://afaqurk.github.io/linux-dash/#/system-status](https://afaqurk.github.io/linux-dash/#/system-status)
    
Vamos aos comandos:  
```bash
# yum install httpd  
# cd /var/www/html/  
# git clone https://github.com/afaqurk/linux-dash.git  
# yum -y install php php-common php-gd php-mbstring php-xml php-xmlrpc  
# /etc/init.d/httpd start
```

Agora acesse: http://endereco.ip.do.server/linux-dash

E aí, gostou?!
