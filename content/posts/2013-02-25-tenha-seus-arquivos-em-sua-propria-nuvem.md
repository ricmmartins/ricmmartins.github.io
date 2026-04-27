---
slug: "tenha-seus-arquivos-em-sua-propria-nuvem"
title: 'Tenha seus arquivos em sua própria nuvem'
date: '2013-02-25T15:30:58-05:00'
tags:
    - utilitários
categories:
    - Geral
description: "Depois de resolver meu problema com o Dropbox de só conseguir sincronizar arquivos que estivessem dentro da própria pasta do Dropbox, comecei a pensar se"
---

Depois de resolver meu problema com o Dropbox de só conseguir sincronizar arquivos que estivessem dentro da própria pasta do Dropbox, comecei a pensar se haveria alguma forma de ter os meus arquivos hospedado onde eu quisesse, e não nos servidores do Dropbox.

Depois de muita pesquisa, cheguei à conclusão que no Dropbox não tem mesmo como fazer isso.

Encontrei inclusive muitas coisas legais, listadas abaixo:

<http://owncloud.org/>  
<http://sparkleshare.org/>  
<http://ifolder.com/>  
<http://qtdtools.doering-thomas.de/>

Mas as que mais me chamou a atenção foi o Owncloud. A vantagem dele, é que nele você tem o controle dos seus dados da melhor maneira possível. Por outro lado, ele não utiliza servidores espalhados pelo mundo como é o caso do Dropbox, que lhe garantiria maior disponibilidade. Isto faz com que a responsabilidade por manter o backup e integridade dos dados seja sua.

Você usa um servidor privado, que você tenha comprado em um serviço de hosting tradicional ou na Amazon. Seus arquivos poderão ser acessados à partir de qualquer dispositivo rodando em Linux, Windows, Mac OSX, e também em plataformas móveis como iOS e Android.

Como o serviço é de código aberto, é possível modificar o que for necessário. Além disso, há possibilidade de instalar plugins dentro do servidor, transformando-o até em uma estação de stream de música, por exemplo.

Eu instalei ele na minha hospedagem no DreamHost e gostei bastante.

Para instalar no Dreamhost, mesmo sem muito controle sobre o servidor (não tenho uma VPS lá, e sim um hosting compartilhado), a instalação foi bem tranquila. Então abaixo vou mostrar como instalar no Dreamhost e na Amazon, em uma instância de testes.

## Instalando no Dreamhost

1. Criar pasta onde vai ficar hospedado  

```bash
$ mkdir /var/www/html/owncloud
```

2. Baixar o arquivo de instalação  

```bash
$ cd /var/www/html/owncloud 
$ wget http://mirrors.owncloud.org/releases/owncloud-4.5.7.tar.bz2
```

3. Descompactar  

```bash
$ tar xjvf owncloud-4.5.7.tar.bz2
```

4\. Acertar permissões  

```bash
$ chmod -R 755 /var/www/html/owncloud/config
```

5. Acessar a interface web: http://www.teste.com.br/owncloud/

[![1](/wp-content/uploads/2013/02/1.png)](/wp-content/uploads/2013/02/1.png)

6. Note que é possível clicar na opção “Advanced” e escolher a pasta “data” e o o database à ser utilizado, no caso SQLite ou MySQL. Neste exemplo vou usar o padrão (SQLite)

[![3](/wp-content/uploads/2013/02/3.png)](/wp-content/uploads/2013/02/3.png)

7. Clicar em “Finish Setup”

8. Pronto. Está instalado. Você já pode enviar arquivos pela Web através do link de instalação, ou pelo cliente (**Como instalar o cliente será explicado abaixo**)

[![4](/wp-content/uploads/2013/02/4.png)](/wp-content/uploads/2013/02/4.png)

Como podemos ver na imagem acima, você pode ter arquivos, músicas, fotos, calendário e contatos nele, também com a opção de compartilhar com seus amigos.

## Instalando na Amazon (AWS)

No caso, utilizo a AMI com o Linux da Amazon (Centos 6.3)

1. Instalar repositório epel:  

```bash
[root@ip-10-212-102-166 yum.repos.d]# yum install http://dl.fedoraproject.org/pub/epel/6/x86\_64/epel-release-6-8.noarch.rpm
```  

2. Instalar Repositório do Owncloud  

```bash
[root@ip-10-212-102-166 yum.repos.d]# cd /etc/yum.repos.d/  
[root@ip-10-212-102-166 yum.repos.d]# wget http://download.opensuse.org/repositories/isv:ownCloud:community/CentOS_CentOS-6/isv:ownCloud:community.repo  
[root@ip-10-212-102-166 yum.repos.d]# yum install owncloud
```

3. Inicializar httpd  

```bash
[root@ip-10-212-102-166 yum.repos.d]# /etc/init.d/httpd start
```

4. Acessar a interface:

http://ec2-54-242-17-109.compute-1.amazonaws.com/owncloud/

As demais configurações são as mesmas citadas acima, onde abordei a instalação no Dreamhost.

5. Existe ainda uma opção interessante. Por padrão, o limite de uploads de arquivos via web é pequeno. No arquivo /etc/php.ini podemos buscar as linhas “upload_max_filesize” e “post_max_size” para deixar em um valor que achar adequado.

## Instalando o Cliente

1. Baixe o pacote em http://download.owncloud.com/download/owncloud-1.2.0-setup.exe

2. Depois de instalado, configure conforme à seguir.

[![5](/wp-content/uploads/2013/02/5.png)](/wp-content/uploads/2013/02/5.png)

* Lembre-se de alterar para a url do seu servidor

[![6](/wp-content/uploads/2013/02/6.png)](/wp-content/uploads/2013/02/6.png)

3. Se tudo estiver correto, será criada uma pasta em C:UsersusernameownCloud. Todos os arquivos que você colocar nesta pasta, serão sincronizados com seu servidor. E você ainda poderá acessá-los via web também, informando suas credenciais em http://ec2-54-242-17-109.compute-1.amazonaws.com/owncloud/ (No caso, troque pela sua URL)

Pronto, agora temos nosso próprio servidor de hospedagem com espaço "ilimitado" e livre!

Até a próxima,

Ricardo.
