---
slug: "como-monitorar-seu-servidor-com-o-monit"
title: 'Como monitorar seu servidor com o Monit'
date: '2013-04-08T11:17:01-04:00'
tags:
    - linux
    - monitoramento
description: "Olá pessoal. Este é um post rápido. Como no meu post anterior sobre a instalação do Nginx eu comentei sobre o Monit, achei que seria interessante"
cover:
  image: "/og/como-monitorar-seu-servidor-com-o-monit.png"
  alt: ""
  hidden: true
---

Olá pessoal. Este é um post rápido. Como no meu post anterior sobre a instalação do Nginx eu comentei sobre o Monit, achei que seria interessante compartilhar mais informações sobre o uso do Monit.

No exemplo do post anterior, monitoramos dois processos, e configuramos para que caso um deles saíssem do ar, o Monit automaticamente fizesse o start dos processos e nos enviasse um e-mail informando sobre o ocorrido.

Hoje vou mostrar como monitorar a carga do seu servidor (LoadAverage), uso de CPU e Memória, e fazer com que caso ultrapasse valores pré-definidos, sejamos alertados por e-mail.

Lembrando apenas que para que o envio de e-mails funcione, você precisa ter instalado um serviço de MTA como o Exim ou Postfix, e o Monit configurado para o uso de e-mail. Mais detalhes sobre como fazer isso você encontra aqui: <http://www.ricardomartins.com.br/como-instalar-o-nginx-com-php-fpm-e-wordpress-no-centos/>

Como neste caso quero monitorar o sistema, vou criar um arquivo com nome que facilite a identificação do arquivo em relação ao que ele faz.  

```bash
vim /etc/monit.d/system_monitor
```

```bash
check system localhost  
if loadavg (1min) > 10 then alert  
if loadavg (5min) > 8 then alert  
if memory usage > 75% then alert  
if swap usage > 25% then alert  
if cpu usage (user) > 90% then alert  
if cpu usage (system) > 70% then alert  
if cpu usage (wait) > 50% then alert  
alert seuendereco@email.com  
mail-format {  
from: alerta@seudominio.com  
subject: memcached $ACTION on $HOST at $DATE  
message: This event occurred on $HOST at $DATE.  
Event: $EVENT  
Description: $DESCRIPTION  
}
```

Pronto. Desta forma definimos que queremos receber um alerta por email caso a monitoração identifique um dos critérios abaixo:

– LoadAverage maior que 10 no último minuto, ou maior que 8 nos úlitmos 5 minutos;
– Uso de memória maior que 75%
– Uso de swap maior que 25%
– O uso de CPU (user) estiver maior que 90%;
– O uso de CPU (system) estiver maior que 70%;
– O uso de CPU (wait) estiver maior que 50%.

> Apenas a título de informação:
> 
> - <span style="line-height: 13px;">CPU (user): Porcentagem de utilização de CPU enquanto o processador executa uma operação a nível de usuário (aplicação)</span>
> - CPU (system): Porcentagem de utilização de CPU enquanto o processador executa uma operação a nível de systema (kernel)
> - CPU (wait): Porcentagem de tempo de CPU gasto em espera (normalmente em espera por escrita em disco ou outro processo em execução)
> 
> *[http://publib.boulder.ibm.com/infocenter/javasdk/tools/index.jsp?topic=%2Fcom.ibm.java.doc.igaa%2F\_1vg0001475cb4a-1190e2e0f74-8000\_1007.html](http://publib.boulder.ibm.com/infocenter/javasdk/tools/index.jsp?topic=%2Fcom.ibm.java.doc.igaa%2F_1vg0001475cb4a-1190e2e0f74-8000_1007.html)*

Estes valores são o que utilizo em alguns servidores que administro. No entanto dependendo do seu cenário você deve ajustar os valores para se adequarem melhor ao seu ambiente.
