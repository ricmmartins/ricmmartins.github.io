---
slug: "como-instalar-o-wordpress-linux"
title: 'Como instalar o WordPress no Linux'
date: '2012-09-20T16:25:56-04:00'
tags:
    - wordpress
    - linux
description: "Olá. Depois de algum tempo sem postar novidades por aqui, aqui estamos nós. Vou descrever como realizar a instalação do WordPress no Linux. Neste exemplo"
cover:
  image: "/og/como-instalar-o-wordpress-linux.png"
  alt: ""
  hidden: true
---

Olá. Depois de algum tempo sem postar novidades por aqui, aqui estamos nós. Vou descrever como realizar a instalação do WordPress no Linux. Neste exemplo, estou usando o CentOS 6.3.

Não vou entrar em muitos detalhes, e o WordPress dispensa apresentações. Mãos à obra:

### 1. Instalando os requisitos

```bash
yum -y install mysql-server mysql  
service mysqld start  
mysqladmin -u root password ‘definaumasenhaparaorootnomysql’  
chkconfig –levels 2345 mysqld on

yum -y install httpd  
chkconfig –levels 2345 httpd on  
yum -y install php php-common php-mysql php-gd php-mbstring php-xml php-xmlrpc
```

### 2. Instalação do WordPress

```bash
cd /tmp  
wget http://wordpress.org/latest.tar.gz  
tar xzvf latest.tar.gz  
mv wordpress /var/www/html/  
chown -R apache:apache /var/www/html/wordpres
```

### 3. Configurando o Apache

```bash
vim /etc/httpd/conf/httpd.conf  
DirectoryIndex index.php  
LoadModule php5\_module modules/libphp5.so  
/etc/init.d/httpd reload
```

### 4. Configurando o MySQL

```bash
mysql -u root -p  
create database wordpress  
grant all privileges on wordpress.\* to ‘seuusuariomysql’@’localhost’ identified by ‘senhadoseuusuariomysql’;  
exit
```

### 5. Configurando o WordPress

```bash
cd /var/www/html/wordpress  
cp wp-config-sample.php wp-config.php  
vim wp-config.php

define(‘DB_NAME’, ‘wordpress’);

/** MySQL database username */  
define(‘DB_USER’, ‘seuusuariomysql’);

/** MySQL database password */  
define(‘DB_PASSWORD’, ‘senhadoseuusuariomysql’);
```

### 6. Finalizando a configuração:

Acesse [http://ip-do-seu-servidor/wordpress/](http://ec2-50-112-47-146.us-west-2.compute.amazonaws.com/wordpress/) e finalize as configurações informando os dados definidos acima (nome do database, usuário e senha do banco e endereço do servidor)</div>
