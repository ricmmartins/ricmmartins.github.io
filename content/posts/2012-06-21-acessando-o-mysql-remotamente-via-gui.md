---
slug: "acessando-o-mysql-remotamente-via-gui"
title: 'Como acessar o Mysql remotamente via GUI (Graphical User Interface)'
date: '2012-06-21T12:13:23-04:00'
tags:
    - mysql
description: "Como configurar e usar o acesso remoto ao Mysql? Neste post vamos ver como fazer a configuração do Mysql permitindo o acesso remoto e utilizar o HeidiSQL"
cover:
  image: "/og/acessando-o-mysql-remotamente-via-gui.png"
  alt: ""
  hidden: true
---

Como configurar e usar o acesso remoto ao Mysql? Neste post vamos ver como fazer a configuração do Mysql permitindo o acesso remoto e utilizar o HeidiSQL para acessar o MySQL via interface gráfica (GUI).

Eu não tenho muita experiência com Mysql. No entanto atualmente tenho feito muitas implementações envolvendo o Mysql, onde preciso criar databases, usuários, trocar senha de usuários.

Algumas vezes fazer tudo isso na unha, é trabalhoso, ainda mais quando você não tem muito domínio sobre isto.

Procurei então uma maneira de facilitar o trabalho, utilizando uma interface gráfica para fazer minhas alterações nos bancos de dados. O escolhido foi o [HediSQiL](http://www.heidisql.com).

O HeidiSQL é um programa para abrir, editar e criar bancos de dados do MySQL utilizando uma GUI.

O programa também possui recursos para exportar dados presentes nas tabelas com suporte para os formatos CSV, HTML, SQL e XML. Quando você abre o programa, ele solicita a conexão com o MySQL e para fazê-lo, basta preencher os dados solicitados e confirmar.

Você pode conhecer melhor a ferramenta em [http://www.heidisql.com/](http://www.heidisql.com).

No entanto, não basta instalar a ferramenta e sair usando. Você precisa liberar o acesso remoto no MySQL.

Então aqui vou dar um passo a passo simples envolvendo algumas etapas básicas, para que você que assim como eu não possui muito conhecimentos em bancos de dados, possa começar a entender um pouco sobre como funciona.

Passos:

– Instalação do mysql;  
– Criação da senha do usuário root;  
– Criação de um banco teste;  
– Criação de um usuário com permissões neste banco teste;  
– Liberação de acesso remoto para o usuário criado no banco teste;

## 1- Instalando o MySQL Server

```bash
[root@ricardo]# yum install mysql-server  
[root@ricardo]# chkconfig –level 345 mysqld on  
[root@ricardo]# service mysqld start
```

## 2- Criando a senha do usuário root no banco

Por default o usuário root vem sem senha, então se você executar o comando mysql -u root &lt;enter&gt; já estará dentro do banco. No exemplo abaixo, vou definir como **P@ssw0rd** a senha do usuário root:  

```bash
[root@ricardo]# mysqladmin -u root password P@ssw0rd
```

Pronto! se você quiser testar, utilize o comando abaixo e informe a nova senha criada (lembrando que o parâmetro -p é para que seja solicitada a senha, caso contrário você deve informá-la na linha de comando executada)  

```bash
[root@ricardo]# mysql -u root -p
```

## 3- Criando um database de teste

Depois de executar o comando acima, você já deve estar dentro do myql, então agora vamos criar um database chamado “meudb”.  

```bash
mysql> create database meudb;
```

## 4- Criando um usuário com permissões de total controle sobre o banco “meudb”

```bash
mysql> grant all privileges on meudb.* to ‘ricardo’@’localhost’ identified by ‘ricardopassword’;
```

Explicando: Criamos o usuário ricardo com a senha **ricardopassword**.  
Note que temos o usuário **root** com senha **P@ssw0rd** no **mysql**, e o usuário **ricardo** com senha **ricardopassword** no banco **meudb**.

Geralmente cada banco criado dentro do mysql, terá(ão) seu(s) respecitovo(s) usuário(s).

## 5- Liberando o acesso remoto para o usuário “ricardo” no banco “meudb”

Vamos ao mysql:  

```bash
[root@ricardo]# mysql -u root -p
```

Insira a senha do root, e rode os comandos abaixo:  

```bash
mysql> grant all privileges on meudb.* to ricardo@’192.168.10.200′ identified by ‘ricardopassword’;  
mysql> exit
```
No caso, foi dado acesso remoto com controle total ao usuário ricardo no banco meudb, à partir do IP **192.168.10.200**, que é o ip da **minha máquina**.

Agora reinicie o serviço do MySQL  

```bash
[root@ricardo]# /etc/init.d/mysqld restart
```

Agora um outro cenário. Se por exemplo você quisesse liberar acesso remoto com controle total para o usuário root em todos os databases dentro de um determinado servidor mysql, você poderia executar o seguinte comando:  

```bash
mysql> grant all privileges on *.* to root@’192.168.10.200′ identified by ‘P@ssw0rd’;
```
Onde fizemos:

**“conceda todos os privilégios em todos os databases (*.*) para o usuário root com acesso originado do endereço ip 192.168.10.200 utilizando a senha P@ssw0rd”**

## 6- Acessando remotamente pelo HeidiSQL

Abra o HeidiSQL e configure a conexão conforme a imagem abaixo:

(Troque as informações conforme seu ambiente)

[![1](/wp-content/uploads/2012/06/HeidiSQL1.png)](/wp-content/uploads/2012/06/HeidiSQL1.png)

Tela do Heidi logado no banco:

[![HeidiSQL2](/wp-content/uploads/2012/06/HeidiSQL2.png "HeidiSQL2")](/wp-content/uploads/2012/06/HeidiSQL2.png)

[  ](/wp-content/uploads/2012/06/HeidiSQL1.png)

Por hoje é só pessoal…

[  ](http://www.ricardomartins.com.br/wp-content/uploads/2012/06/HeidiSQL2.png)
