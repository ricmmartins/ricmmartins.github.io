---
slug: "repositorio-interno-pacotes-centos"
title: 'Como criar um repositório interno do CentOS'
date: '2013-07-22T15:20:37-04:00'
author: rmmartins
tags:
    - linux
description: "O objetivo deste post, é mostrar como criar um repositório local do CentOS. Criando um repositório local você tem alguns benefícios interessantes, dentre"
cover:
  image: "/og/repositorio-interno-pacotes-centos.png"
  alt: ""
  hidden: true
---

O objetivo deste post, é mostrar como criar um repositório local do CentOS.

Criando um repositório local você tem alguns benefícios interessantes, dentre eles a economia do uso do link de internet em suas máquinas toda vez que for atualizar ou instalar pacotes novos, ou ainda, pode ser útil nos casos onde você não pode liberar acesso internet para todas as máquinas. Então você configura o seu repositório local e aponta as suas demais máquinas para buscarem os pacotes nele.

Neste tutorial, vamos fazer um repositório local do CentOS 6.4 para a arquitetura x86\_64 (64 Bits) e configurá-lo para enviar emails de alerta com o Exim

## Preparação do ambiente

### Instalação do Apache
```bash
[root@ricardo ~]# yum install httpd
```

### Instalar o pacote createrepo

Instalação do pacote createrepo, que cria informações de repositório utilizadas pelo yum e armazena estes dados numa pasta chamada “repodata”.

```bash
[root@ricardo ~]# yum install -y createrepo
```

### Construir a estrutura do repositório

```bash
[root@ricardo ~]# mkdir -p /var/www/html/centos/6.4/{os,updates,fasttrack,extras,cr,contrib,centosplus,epel}/x86_64/
```

*Neste caso, queremos apenas pacotes 64bits

** Note que criaremos também uma pasta chamada epel. Será utilizada para baixarmos também pacotes do repositório Epel, necessário para a instalação de alguns pacotes extras, que não constam na mídia de instalação do CentOS. Maiores informações em [http://fedoraproject.org/wiki/EPEL/FAQ#What_is_EPEL.3F](http://fedoraproject.org/wiki/EPEL/FAQ#What_is_EPEL.3F)

Criando o link simbólico:  

```bash
[root@ricardo ~]# ln -s /var/www/html/centos/6.4 /var/www/html/centos/6
```

Precisamos copiar o conteúdo do DVD para o Apache. Então primeiro precisamos montar a ISO:  

```bash
[root@ricardo ~]# mount -o loop /local_da_ISO/CentOS-6.4-x86_64-bin-DVD.iso /mnt
```

Copiando os arquivos:  

```bash
[root@ricardo \]# cp -pvr /mnt/* /var/www/html/centos/6.4/os/x86_64
```

Criando o repositório:  

```bash
[root@ricardo ~]# createrepo /var/www/html/centos/6.4/os/x86_64
```

### Script de rsync das atualizações

Agora iremos criar um script que será responsável por baixar as atualizações e utilizar um servidor smtp interno para enviar um e-mail informando o momento em que o download das atualizações foi concluído.  

```bash
[root@ricardo ~]# vim /root/sync_repo.sh
```
```bash
#!/bin/bash  
#CentOS updates  
/usr/bin/rsync -avrt rsync://mirror.cogentco.com/CentOS/6.4/updates/x86_64/ –exclude=debug /var/www/html/centos/6.4/updates/x86_64/  
/usr/bin/createrepo –update /var/www/html/centos/6.4/updates/x86_64/  
/usr/bin/rsync -avrt rsync://mirror.cogentco.com/CentOS/6.4/fasttrack/x86_64/ –exclude=debug /var/www/html/centos/6.4/fasttrack/x86_64/  
/usr/bin/createrepo –update /var/www/html/centos/6.4/fasttrack/x86_64/  
/usr/bin/rsync -avrt rsync://mirror.cogentco.com/CentOS/6.4/extras/x86_64/ –exclude=debug /var/www/html/centos/6.4/extras/x86_64/  
/usr/bin/createrepo –update /var/www/html/centos/6.4/extras/x86_64/  
/usr/bin/rsync -avrt rsync://mirror.cogentco.com/CentOS/6.4/cr/x86_64/ –exclude=debug /var/www/html/centos/6.4/cr/x86_64/  
/usr/bin/createrepo –update /var/www/html/centos/6.4/cr/x86_64/  
/usr/bin/rsync -avrt rsync://mirror.cogentco.com/CentOS/6.4/contrib/x86_64/ –exclude=debug /var/www/html/centos/6.4/contrib/x86_64/  
/usr/bin/createrepo –update /var/www/html/centos/6.4/contrib/x86_64/  
/usr/bin/rsync -avrt rsync://mirror.cogentco.com/CentOS/6.4/centosplus/x86_64/ –exclude=debug /var/www/html/centos/6.4/centosplus/x86_64/  
/usr/bin/createrepo –update /var/www/html/centos/6.4/centosplus/x86_64/  
/usr/bin/rsync -avrt rsync://mirrors.rit.edu/epel/6/x86_64/ –exclude=debub /var/www/html/centos/6.4/epel/x86_64/  
/usr/bin/createrepo –update /var/www/html/centos/6.4/epel/x86_64  
nc 127.0.0.1 25 < /root/email
```

Conteúdo do email que será enviado ao término das atualizações (/root/email):  

```bash
HELO 127.0.0.1  
MAIL FROM:repositorio@ricardomartins.com.br  
RCPT TO:sysadmin@ricardomartins.com.br  
DATA  
SUBJECT: Novas atualizações no Repositório CentOS  
O repositório foi atualizado.  
.  
QUIT
```

Ajustando as permissões para a execução do script:  

```bash
# chmod +x /root/sync\_repo.sh
```

Agendando a execução do script:  

```bash
# vim /etc/crontab
```

```bash
00 00 \* \* \* /root/sync_repo.sh
```

###  Configurando o Exim para o envio de e-mails

Primeiro instalamos o Exim e em seguida removemos o Sendmail (caso esteja instalado).  

```bash# yum install exim```

A configuração do exim é feita no arquivo /etc/exim/exim.conf. Como a configuração padrão atende ao que queremos fazer, não vou modificar nada.

Removendo o Sendmail:  

```bash# yum remove sendmail```

Inicializando o Exim e garantido sua inicialização no boot  

```bash
# service exim start
``` 

```bash
# chkconfig exim on
```

### Configurando os servidores que serão clientes do nosso repositório local

Faça antes um backup do arquivo original:  
```bash
# cp -p /etc/yum.repos.d/CentOS-Base.repo /etc/yum.repos.d/CentOS-Base.repo.orig
```

Em seguida altere a url para o endereço do seu servidor interno.

```bash
#vi /etc/yum.repos.d/CentOS-base.repo
```

```bash
[base]  
name=CentOS-$releasever – Base  
baseurl=http://ip.do.servidor/centos/$releasever/os/$basearch/  
gpgcheck=1  
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-CentOS-6  
[updates]  
name=CentOS-$releasever – Updates  
baseurl=http://ip.do.servidor/centos/$releasever/updates/$basearch/  
gpgcheck=1  
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-CentOS-6  
[extras]  
name=CentOS-$releasever – Extras  
baseurl=http://ip.do.servidor/centos/$releasever/extras/$basearch/  
gpgcheck=1  
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-CentOS-6  
[cr]  
name=CentOS-$releasever – Cr  
baseurl=http://ip.do.servidor/centos/$releasever/cr/$basearch/  
gpgcheck=1  
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-CentOS-6  
[contrib]  
name=CentOS-$releasever – Contrib  
baseurl=http://ip.do.servidor/centos/$releasever/contrib/$basearch/  
gpgcheck=1  
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-CentOS-6  
[centosplus]  
name=CentOS-$releasever – Centosplus  
baseurl=http://ip.do.servidor/centos/$releasever/centosplus/$basearch/  
gpgcheck=1  
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-CentOS-6  
[epel]  
name=CentOS-$releasever – Epel  
baseurl=http://ip.do.servidor/centos/$releasever/epel/$basearch/  
gpgcheck=1  
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-CentOS-6
```

### Testando

Vá em uma máquina cliente, e faça uma atualização:  

```bash
# yum update
```

Ou uma pesquisa:  

```
# yum search [pacote]
```

Testando a instalação de um pacote:  

```bash
# yum install [pacote]
```

Por hoje é isso…
