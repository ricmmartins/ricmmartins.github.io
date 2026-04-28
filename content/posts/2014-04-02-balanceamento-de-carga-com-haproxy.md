---
slug: "balanceamento-de-carga-com-haproxy"
aliases:
  - "/posts/balanceamento-de-carga-com-haproxy/"
title: 'Balanceamento de carga com HAProxy'
date: '2014-04-02T13:34:43-04:00'
tags:
    - linux
categories:
    - Linux
description: "Configurar o balanceamento de carga entre vários servidores web pode parecer um desafio, porém na verdade não é. O HAProxy é uma ferramenta poderosa"
---

![haproxy](/media/haproxy1.png)

Configurar o balanceamento de carga entre vários servidores web pode parecer um desafio, porém na verdade não é. O [HAProxy](http://haproxy.1wt.eu/ "HAProxy") é uma ferramenta poderosa, leve, fácil de configurar e com um grande número de recursos sofisticados para gerenciar e servir conteúdo.

Neste artigo, tenho um cenário simples usando três servidores:

1. Node1-LB (**192.168.10.10**): O nó com o HAProxy configurado e com função de load balancer
2. Node2 (**192.168.10.20**): Servidor Web
3. Node3 (**192.168.10.30**): Servidor Web

Todos os servidores estão com CentOS 5.8 e rodando dentro do Vagrant.

## Configuração do Node1-LB:

### Instalação do repositório EPEL

```bash
# wget http://dl.fedoraproject.org/pub/epel/5/x86\_64/epel-release-5-4.noarch.rpm  
# wget http://rpms.famillecollet.com/enterprise/remi-release-5.rpm  
# rpm -Uvh remi-release-5*.rpm epel-release-5*.rpm
```

### Instalação e Configuração do HAProxy

No caso vamos usar o algoritmo de balanceamento por RoundRobin. Existem outras opções de uso que você pode definir de acordo com sua necessidade. [Neste link](http://wiki.joyent.com/wiki/display/jpc2/Load+Balancing+with+HAproxy), tem uma boa explicação sobre eles.

```bash
# yum install haproxy
```

```bash
# mv /etc/haproxy/haproxy.cfg /etc/haproxy/haproxy.cfg.ori
```

```bash
# vim /etc/haproxy/haproxy.cfg
```

```bash
global  
log 127.0.0.1 local0  
maxconn 4096  
user haproxy  
group haproxy  
daemon
```

```bash
defaults  
log global  
mode http  
option httplog  
option dontlognull  
retries 3  
option redispatch  
maxconn 2000  
contimeout 5000  
clitimeout 50000  
srvtimeout 50000
```

```bash
listen web-farm 0.0.0.0:80  
cookie SERVERID rewrite  
balance roundrobin  
server node2 192.168.10.20:80 cookie app1inst1 check inter 2000 rise 2 fall 5  
server node3 192.168.10.30:80 cookie app1inst2 check inter 2000 rise 2 fall 5
```

### Start no serviço e garantia de inicialização no boot

```bash]# /etc/init.d/haproxy start  
# /sbin/chkconfig haproxy on
```

## Configuração do servidor Web – Node2 (192.168.10.20):

### Instalação do repositório EPEL

```bash
# wget http://dl.fedoraproject.org/pub/epel/5/x86\_64/epel-release-5-4.noarch.rpm  
# wget http://rpms.famillecollet.com/enterprise/remi-release-5.rpm  
# rpm -Uvh remi-release-5\*.rpm epel-release-5\*.rpm
```

### Instalação e configuração básica do Apache

```bash
# yum install httpd  
# rm /etc/httpd/conf.d/welcome.conf  
# echo Node2 > /var/www/html/index.html
```

### Start no serviço e garantia de inicialização no boot

```bash
# /etc/init.d/httpd start  
# /sbin/chkconfig httpd on
```

## Configuração do servidor Web – Node3 (192.168.10.30):

### Instalação do repositório EPEL

```bash
# wget http://dl.fedoraproject.org/pub/epel/5/x86\_64/epel-release-5-4.noarch.rpm  
# wget http://rpms.famillecollet.com/enterprise/remi-release-5.rpm  
# rpm -Uvh remi-release-5*.rpm epel-release-5*.rpm
```

### Instalação e configuração básica do Apache

```bash
# yum install httpd  
# rm /etc/httpd/conf.d/welcome.conf  
# echo Node3 > /var/www/html/index.html
```

### Start no serviço e garantia de inicialização no boot

```bash
# /etc/init.d/httpd start  
# /sbin/chkconfig httpd on
```

## Vídeo Demo 

Assista ao vídeo com a validação do uso:

<iframe allow="autoplay; encrypted-media" allowfullscreen="" frameborder="0" height="281" loading="lazy" src="https://www.youtube.com/embed/jXbZ_C00Jvc?feature=oembed" width="500"></iframe>

## Plus: WebStats

Se você quiser disponibilizar uma interface Web para visualização das estatísticas do HAProxy similar à esta: <http://demo.1wt.eu/>, basta adicionar as linhas abaixo no arquivo **/etc/haproxy/haproxy.cfg** e reiniciar o serviço.

```bash
listen stats 0.0.0.0:9000  
stats uri /haproxy_stats  
stats realm HAProxy Statistics  
stats auth admin:password
```

No caso, ao tentar acessar o serviço através da url http://192.168.10.10:9000/haproxy_stats será solicitado o usuário e senha conforme explicitados no arquivo acima (admin/password)

Até a próxima!
