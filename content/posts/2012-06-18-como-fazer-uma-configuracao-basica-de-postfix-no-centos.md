---
slug: "como-fazer-uma-configuracao-basica-de-postfix-no-centos"
aliases:
  - "/posts/como-fazer-uma-configuracao-basica-de-postfix-no-centos/"
title: 'Como fazer uma configuração básica de Postfix no CentOS'
date: '2012-06-18T16:46:08-04:00'
tags:
    - linux
categories:
    - Linux
description: "Ok, então você administra uma rede, e instalou um serviço de monitoração para acompanhar a atividade e desempenho da sua rede, tipo o Nagios ou Zabbix"
---

Ok, então você administra uma rede, e instalou um serviço de monitoração para acompanhar a atividade e desempenho da sua rede, tipo o Nagios ou Zabbix. Agora você gostaria de receber e-mails com os alertas sobre o que está ocorrendo na rede. Siga os passos abaixo:

# 1. Instalando o Postfix

```bash[root@ricardo ~\]# yum install postfix  
[root@ricardo ~\]# chkconfig –level 345 postfix on  
[root@ricardo ~\]# /etc/init.d/postfix start  
[root@ricardo ~\]# yum remove sendmail
```

# 2. Realizando a configuração básica do Postfix

```bash
[root@ricardo ~\]# vi /etc/postfix/main.cf
```

Altere as seguintes linhas:  

```bash
myhostname = mailserver  
mydomain = ricardo.local  
myorigin = $mydomain  
inet_interfaces = 10.21.0.1 (ip do servidor)  
mydestination = $myhostname, localhost.$mydomain, localhost, $mydomain  
mynetworks = 10.21.0.0/16, 127.0.0.1/32  
relay_domains = $mynetworks
```

# 3. Testes

Pronto! Já está configurado. Agora logue em outra máquina e você pode testar fazendo um telnet para o seu servidor diretamente na porta 25:  

```bash
[root@martins ~\]# telnet 10.21.0.1 25  
mail from:zabbix@gmail.com  
rcpt to:contato@ricardomartins.com.br  
data  
subject:Teste do Postfix  
Isso eh um teste do nosso servidor Postifx.  
.  
quit
```

> Importante: Como o servidor não está usando um domínio válido, o endereço de e-mail do remetente utilizado em “mail from” deve ser um endereço de um domínio válido.
> 
> Ou seja, o endereço de e-mail não precisa existir, mas o domínio tem que ser válido, como nos exemplos: qualquercoisa@microsoft.com ou meualerta@microsoft.com
