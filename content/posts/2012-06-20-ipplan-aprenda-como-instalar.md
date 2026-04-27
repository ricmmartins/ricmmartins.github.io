---
slug: "ipplan-aprenda-como-instalar"
title: 'IPPlan: Aprenda como instalar e configurar'
date: '2012-06-20T14:05:32-04:00'
tags:
    - ferramentas
    - linux
    - networking
description: "Esta dica vai te ensinar como instalar e configurar o IPPlan, uma ferramenta Web para gerenciar o endereçamento IP da sua rede. Você não vai mais precisar"
---

Esta dica vai te ensinar como instalar e configurar o IPPlan, uma ferramenta Web para gerenciar o endereçamento IP da sua rede. Você não vai mais precisar usar planilhas!!!

Existem diversar ferramentas opensource com esta finalidade. Eu escolhi o IPPlan, pois me pareceu mais simples de instalar e configurar.

* Neste tutorial, o ambiente usado é o CentOS 6.2.

## 1. Instalando o PHP, Mysql e Apache

```bash
[root@ricardo ~\]# yum install httpd mysql-server php php-mysql php-xml php-soap  
[root@ricardo ~\]#service mysqld start  
[root@ricardo ~\]#service httpd start
```

## 2. Download e instalação do IpPlan

Download IpPlan: http://sourceforge.net/projects/iptrack/files/

Copiar para /var/ww/html:  

```bash
[root@ricardo ~\]# cp ipplan-4.92b.tar.gz /var/www/html
```

Extraindo o conteúdo:  

```bash
[root@ricardo ~\]# cd /var/www/html; tar xzvf ipplan-4.92b.tar.gz .
```

## 3. Configurando o MySql

Criar senha do usuário root no Mysql instalado:  

```bash
[root@ricardo ~\]# mysqladmin -u root password suasenha
```

Criar a base de dados para o ipplan:  

```bash
[root@ricardo ~\]# mysqladmin -u root -p create ipplan
```

Como devemos evitar o uso do banco de dados com o usuário root, precisamos criar um usuário com acesso full na base ipplan criada acima. Para isso, acessamos a base “ipplan”, e em seguida, já dentro da console do mysql, criamos o usuário ipplan com a senha ipplanpassword com todas as permissões nesta base:  

```bash
[root@ricardo ~\]# mysql -u root -p ipplan
```

> Apenas lembrando:
> 
> -u: Especifica o usuário
> 
> -p: solicita a senha
> 
> ipplan: nome da base de dados onde irá se conectar

```bash
mysql> grant all on ipplan.* to ipplan@localhost identified by ‘ipplanpassword’;
```

Agora, fazemos um reload nas permissões do Mysql:  

```bash
mysql>flush privileges;  
mysql>exit
```

## 4. Alterando o arquivo de configuração do IPPlan e inserindo as configurações de conexão ao MySql

```bash
[root@ricardo ~\]# vim /var/www/html/ipplan/config.php
```

Altere o arquivo da seguinte forma  

```bash
define(“DBF_TYPE”, ‘maxsql’);  
define(“DBF_HOST”, ‘localhost’);  
define(“DBF_USER”, ‘ipplan’);  
define(“DBF_NAME”, ‘ipplan’);  
define(“DBF_PASSWORD”, ‘ipplanpassword’);
```

## 5. Finalizando a instalação pela interface Web

Acesse: **http://localhost/ipplan/admin/install.php**

Será exibida a tela abaixo. Clique em “Go:”

[![Instalação IPPlan](/wp-content/uploads/2012/06/tela1.png "Tela 1")](/wp-content/uploads/2012/06/tela1.png)

Se tudo correr bem, você deverá ver uma tela igual a esta:

[![](/wp-content/uploads/2012/06/tela2.png "tela2")](/wp-content/uploads/2012/06/tela2.png)[  ](/wp-content/uploads/2012/06/tela2.png)

Ok, já temos o IPPlan instalado. Vamos agora para a configuração básica.

## 6. Configuração básica

Acesse: **http://localhost/ipplan**

[![](/wp-content/uploads/2012/06/tela3.png "tela3")](/wp-content/uploads/2012/06/tela3.png)

Primeiro, criaremos o usuário que irá gerenciar a estrutura de endereçamento IP. Vá em Admin – Users – Create a new user. Preencha as informações referentes ao usuário:

[![](/wp-content/uploads/2012/06/tela4.png "tela4")](/wp-content/uploads/2012/06/tela4.png)

Agora criaremos um grupo para inserirmos este usuário nele. Vá em Admin – Groups – Create a new group e preencha as informações.

[![](/wp-content/uploads/2012/06/tela5.png "tela5")](/wp-content/uploads/2012/06/tela5.png)

Agora com usuário e grupo criados, precisamos criar o “Cliente”, ou seja, um nome qualquer para o ambiente onde a estrutura de endereços está configurada.

Vá em Customers > Create a New Customer/Autonomous System. Será solicitado um login e senha de acesso, e você deverá informar o usuário que criou.

Preencha pelo menos o primeiro campo (o único obrigatório). Informe o nome do cliente e em seguida clique em Submit:

[![](/wp-content/uploads/2012/06/tela6.png "tela6")](/wp-content/uploads/2012/06/tela6.png)

O próximo passo é configurar o range da nossa rede. Vá em Network > Hierarchy > Create a new Network Range/Supernet:

[![](/wp-content/uploads/2012/06/tela7.png "tela7")](/wp-content/uploads/2012/06/tela7.png)

Preencha o campo “Range Address” e “Range size” de acordo com o seu ambiente:

[![](/wp-content/uploads/2012/06/tela8.png "tela8")](/wp-content/uploads/2012/06/tela8.png)[  ](/wp-content/uploads/2012/06/tela8.png)

Agora precisamos criar as subredes. Vá em Network -&gt; Subnets -&gt; Create Subnet:

[![](/wp-content/uploads/2012/06/tela9.png "tela9")](/wp-content/uploads/2012/06/tela9.png)[  ](/wp-content/uploads/2012/06/tela9.png)

[![](/wp-content/uploads/2012/06/tela10.png "tela10")](/wp-content/uploads/2012/06/tela10.png)[  ](/wp-content/uploads/2012/06/tela10.png)

Preencha os campos conforme o seu ambiente e neste ponto, você já terá o IPPlan instalado e com a configuração básica feita.

Para maiores detalhes, confira o manual online do IPPlan em <http://iptrack.sourceforge.net/documentation/README.html>

Até a próxima!
