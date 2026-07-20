---
slug: "como-instalar-o-nginx-com-php-fpm-e-wordpress-no-centos"
title: 'Como instalar o Nginx com PHP-FPM e WordPress no CentOS'
date: '2013-04-05T13:00:57-04:00'
tags:
    - linux
    - nginx
    - wordpress
---

Neste tutorial, vou mostrar como realizar a instalação do WordPress rodando sob o Nginx e PHP-FPM em um CentOS 6.3

Como tem algum tempo que não posto algo, preparei algo especial desta vez. Vou além da instalação do Nginx, WordPress e PHP-FPM. Faremos a instalação de algumas ferramentas que irão lhe auxiliar bastante na administração do seu servidor, além do Monit para monitorar seus processos e ainda lhe enviar e-mail no caso de algum problema.

No final ainda tem um script para rotação de logs, que de hora em hora é executado para compactar seus arquivos de log e remover os arquivos com mais de 30 dias. Então vamos começar!

## Adicionar o repositório oficial do Nginx

Vamos criar o arquivo nginx.repo:  

```bash
# vim /etc/yum.repos.d/nginx.repo
```

 ```bash
[nginx]  
name=nginx repo  
baseurl=http://nginx.org/packages/centos/6/$basearch/  
gpgcheck=0  
enabled=1  
priority=1
```

## Adicionar o repositório Epel

Criando o arquivo repel.repo:  

```bash
# vim /etc/yum.repos.d/epel.repo
```

```bash
[epel]  
name=Extra Packages for Enterprise Linux 6 – $basearch  
#baseurl=http://download.fedoraproject.org/pub/epel/6/$basearch  
mirrorlist=https://mirrors.fedoraproject.org/metalink?repo=epel-6&arch=$basearch  
failovermethod=priority  
enabled=1  
gpgcheck=0
```

## Adicionando ferramentas úteis

Eu costumo utilizar algumas ferramentas que facilitam a administração. Aqui vou abordar a instalação do Multitail, Iftop, Htop e o Monit. se não for interessante pra você pode pular esta parte.

Breve descrição de cada uma das ferramentas:

**Multitail**: Programa para monitorar múltiplos arquivos de log. – [http://www.vanheusden.com/multitail/](http://www.vanheusden.com/multitail/ "Multitail")

**Iftop**: Basicamente é uma ferramenta para visualizar o consumo de banda em determinada interface de rede, mas tem muitas outras utilidades. – [http://www.ex-parrot.com/pdw/iftop/](http://www.ex-parrot.com/pdw/iftop/ "Iftop")

**Htop**: É um top melhorado. Aliás, muito melhor. – [http://htop.sourceforge.net/](http://htop.sourceforge.net/ "Htop")

**Monit**: Uma ferramenta que permite monitorar programas, processos, arquivos, diretórios e filesystems. Dependendo de como for configurado, caso um processo morra, ele reinicia ele pra você! – [http://mmonit.com/monit](http://mmonit.com/monit "Monit")

O muultitail, iftop e htop, são utilitários do sistema e sua instalação não requer nenhum tipo de configuração. Então você pode instalar todos de uma vez:

```bash
# yum install multitail iftop htop
```

## Instalando o Monit

```bash
# yum install monit
```

Neste caso, quero que ele monitore os processos do Nginx e do PHP-FPM. Se por algum motivo estes processos parem de funcionar ele irá reiniciá-los e me enviar um e-mail informando sobre o status da situação.

Calma! Eu sei que ainda não instalamos o Nginx e o PHP-FPM, mas já podemos deixar configurado.

Criamos agora então o arquivo de configuração para monitoração do Nginx.  

```bash
# vim /etc/monit.d/nginx
```

```bash
check process nginx with pidfile /var/run/nginx.pid  
start program = “/etc/init.d/nginx start”  
stop program = “/etc/init.d/nginx stop”  
group nginx  
alert seuendereco@email.com  
mail-format {  
from: alerta@seudominio.com  
subject: nginx $ACTION on $HOST at $DATE  
message: This event occurred on $HOST at $DATE.  
Event: $EVENT  
Description: $DESCRIPTION  
Action: $ACTION  
}
```

E agora o arquivo de configuração do PHP-FPM  

```bash
# vim /etc/monit.d/php-fpm
```

```bash
check process php-fpm with pidfile /var/run/php-fpm/php-fpm.pid  
start program = “/etc/init.d/php-fpm start”  
stop program = “/etc/init.d/php-fpm stop”  
group php-fpm  
alert seuendereco@email.com  
mail-format {  
from: alerta@seudominio.com  
subject: php-fpm $ACTION on $HOST at $DATE  
message: This event occurred on $HOST at $DATE.  
Event: $EVENT  
Description: $DESCRIPTION  
Action: $ACTION  
}
```

## Configurando o envio dos alertas por e-mail

Vamos ao arquivo de configuração do monit, e informamos para utilizar a porta local 25. Você pode inserir a linha no final do arquivo.  

```bash
# vim /etc/monit.conf
```

```bash
set mailserver localhost port 25```

Agora instalamos o Exim e em seguida removemos o Sendmail (caso esteja instalado – no CentOS vem instalado por padrão). Apenas uma questão de preferência pessoal minha.  

```bash
# yum install exim
```

A configuração do exim é feita no arquivo /etc/exim/exim.conf. Porém como a configuração padrão atende ao que queremos fazer, não vou modificar nada.

Removendo o Sendmail:  

```bash
# yum remove sendmail
```

Aqui mais uma configuração útil para economizar espaço em disco. Deixar apenas as duas últimas versões de Kernel utilizadas. Isto evita ficar armazenando kernel antigo após algumas atualizações. Nada impede de deixar apenas a atual, fica a gosto do cliente:  

```bash
# package-cleanup –-oldkernels –-count=2
```

```bash
# vim /etc/yum.conf```

```bash
installonly_limit=2
```

Ajuste fino no Kernel. Adicione as linhas abaixo no final do arquivo:  

```bash
# vim /etc/sysctl.conf
```
```bash
net.ipv4.tcp_tw_reuse = 1  
net.ipv4.tcp_tw_recycle = 1
```

## Instalando e configurando o Nginx, PHP-FPM, etc…

```bash
# yum install nginx php-fpm php-gd php-mysqlnd php-mbstring php-xmlrpc php php-mysql
```

Criando o diretório onde estará hospedado o WordPress:  

```bash
# mkdir /usr/share/nginx/www
```

Configurando o PHP-FPM:  

```bash
# cd /etc/php-fpm.d  
# mv www.conf www.disabled
```

Criar o arquivo de configuração do Nginx no PHP-FPM:  

```bash
# vim /etc/php-fpm.d/nginx.conf
```

```bash
[nginx]  
listen = /var/run/php-fpm/php-fpm.sock  
listen.owner = nginx  
listen.group = nginx  
listen.mode = 0660  
user = nginx  
group = nginx  
pm = dynamic  
pm.max_children = 10  
pm.start_servers = 1  
pm.min_spare_servers = 1  
pm.max_spare_servers = 3  
pm.max_requests = 500  
chdir = /usr/share/nginx/www  
php_admin_value[open_basedir] = /usr/share/nginx/www/:/tmp
```

Ajustando parâmetros no PHP:  

```bash
# vim /etc/php.ini
```

```bash
cgi.fix_pathinfo=0  
upload_max_filesize = 64M
```

Inicializar o PHP-FPM:  

```bash
# service php-fpm start  
# chkconfig php-fpm on
```

Configurando o Nginx:

Você pode substituir o conteúdo original do arquivo por este. Se comparar com o original vai ver algumas diferenças. São modificações que fiz para melhorar a performance.  

```bash
# vim /etc/nginx/nginx.conf
```

```bash
user nginx;  
worker_processes 1;  
worker_rlimit_nofile 16384;  
error_log /var/log/nginx/error.log warn;  
pid /var/run/nginx.pid;  
events {  
worker_connections 16384;  
}  
http {  
include /etc/nginx/mime.types;  
default_type application/octet-stream;  
log_format main ‘$remote_addr – $remote_user [$time_local] “$request” ‘  
‘$status $body_bytes_sent “$http_referer” ‘  
‘”$http_user_agent” “$http_x_forwarded_for”‘;  
access_log /var/log/nginx/access.log main;  
sendfile on;  
keepalive_timeout 65;  
gzip on;  
include /etc/nginx/conf.d/*.conf;  
}
```

Removendo a configuração default:  

```bash
# rm -rf /etc/nginx/conf.d/default.conf  
# rm -rf /etc/nginx/conf.d/example_ssl.conf  
# rm -rf /usr/share/nginx/html
```

Colocando a configuração para nosso WordPress no Nginx  

```bash
# vim /etc/nginx/conf.d/www.conf
```

```bash
server {  
listen 80;  
server_name ricardomartins.com.br;  
root /usr/share/nginx/www/ ;

client_max_body_size 64M;

# Deny access to any files with a .php extension in the uploads directory  
location ~\* /(?:uploads|files)/.\*.php$ {  
deny all;  
}

location / {  
index index.php index.html index.htm;  
try\_files $uri $uri/ /index.php?$args;  
}

location ~\* .(gif|jpg|jpeg|png|css|js)$ {  
expires max;  
}

location ~ .php$ {  
try_files $uri =404;  
fastcgi_split_path_info ^(.+.php)(/.+)$;  
fastcgi_index index.php;  
fastcgi_pass unix:/var/run/php-fpm/php-fpm.sock;  
fastcgi_param SCRIPT_FILENAME  
$document_root$fastcgi_script_name;  
include fastcgi_params;  
}  
}
```

Alguns ajustes de Tunning para permitir grandes números de acessos:  

```bash
# vim /etc/security/limits.conf
```

```bash
nginx soft nofile 20000  
nginx hard nofile 20000
```

Criar o arquivo /etc/default/nginx com o valor de ulimit conforme abaixo, para aumentar a quantidade de conexões simultâneas abertas:  

```bash
# vim /etc/default/nginx
```

```bash
ulimit -a 65535
```

Inicializar os serviços e garantir que sejam iniciados no boot:  

```bash
# service nginx start  
# chkconfig nginx on
```

```bash
# service monit start  
# chkconfig monit on
```

```bash
# service exim start  
# chkconfig exim on
```

Se tudo estiver correto até aqui, seu Nginx já está rodando. Você pode acessar o ip do servidor para conferir. Provavelmente você vai receber uma mensagem de erro 403. Isto é normal, já que o diretório que definimos como raiz do site (/usr/share/nginx/www/), ainda não tem nada.

## Instalando e configurando o MySQL

```bash
# yum -y install mysql-server mysql  
# service mysqld start  
# mysqladmin -u root password ‘definaumasenhaparaorootnomysql’  
# chkconfig mysqld on
```

Agora vamos logar no mysql e criar um usuário. Este usuário, será o que vamos definir para ser utilizado pelo WordPress. Mais tarde vamos informar este usuário e senha para o WordPress  

```bash
# mysql -u root -p  
> create database wordpress;  
> grant all privileges on wordpress.\* to ‘usuarioquedesejacriarnomysql’@’localhost’ identified by ‘senhadousuarioquedesejacriarnomysql’;  
> exit
```

## Instalar e configurar o WordPress

```bash
# cd /tmp  
# wget http://wordpress.org/latest.zip  
# unzip -q latest.zip  
# mv wordpress/* /usr/share/nginx/www/  
# rm -rf wordpress latest.zip  
# cd /usr/share/nginx/www
```

Copiar o arquivo de modelo para o wp-config.php:  

```bash
# cp wp-config-sample.php wp-config.php
```

Editar o arquivo e informar o nome do database, usuário, senha e endereço do host:  

```bash
# vim wp-config.php
```

```bash
define(‘DB\_NAME’, ‘wordpress’);  
/** MySQL database username */  
define(‘DB_USER’, ‘seuusuariomysql’);  
/** MySQL database password */  
define(‘DB\_PASSWORD’, ‘senhadoseuusuariomysql’);
```

Finalizando a configuração do WordPress:

Acesse http://endereco-do-site/ e finalize as configurações definindo o título do site, usuário para administração, senha deste usuário e um endereço de e-mail.

## Configurar rotação de logs do Nginx

Finalizada a parte do WordPress, agora vamos criar um script, que será executado de hora em hora, para compactar os arquivos de log e remover arquivos de log antigos. No exemplo, a cada hora ele irá procurar arquivos de log criados há mais de 30 dias e apagá-los.  

```bash
# vim /etc/cron.hourly/log.nginx
```

```bash
#!/bin/bash  
cd /var/log/nginx  
rm -f access.log.`date +%H`.gz  
rm -f error.log.`date +%H`.gz  
mv -f access.log access.log.`date +%H`  
mv -f error.log error.log.`date +%H`  
kill -USR1 `cat /var/run/nginx.pid`  
sleep 2  
gzip access.log.`date +%H`  
gzip error.log.`date +%H`  
for lista in `find /var/log/nginx/*.gz -mtime +30`; do  
rm -rf ${lista}  
done
```

Ajustar permissões do script:  

```bash
# chmod 700 /etc/cron.hourly/log.nginx
```

## Para finalizar, vamos testar se está recebendo os alertas?

Faça o seguinte:  

```bash
# /etc/init.d/nginx restart
```

Você deverá receber um e-mail informando que o PID do processo do nginx foi alterado, ou seja, o Nginx foi reiniciado.

Por hoje é só. Espero que tenham gostado desse tutorial.
