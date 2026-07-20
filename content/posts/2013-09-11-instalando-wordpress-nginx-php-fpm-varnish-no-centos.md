---
slug: "instalando-wordpress-nginx-php-fpm-varnish-no-centos"
title: 'Instalando o WordPress sobre Nginx, PHP-FPM e Varnish no Centos'
date: '2013-09-11T18:11:23-04:00'
tags:
    - linux
    - nginx
    - wordpress
---

Olá pessoal, o Varnish é um excelente acelerador HTTP para sites dinâmicos com alto volume de conteúdo . Em contraste com outros aceleradores HTTP, muitos dos quais começaram a ser projetados como proxies do lado cliente ou servidores gerais, o Varnish foi projetado desde o início como um acelerador HTTP.Ele tem uma séria limitação de não trabalhar com SSL, mas se isto não for um problema para o seu caso, recomendo fortemente sua utilização. Então mãos à obra:

[![varnish-cache](/media/varnish-cache.jpeg)](/media/varnish-cache.jpeg)

## Instalação do Varnish, Nginx e Php-Fpm

```bash
yum install varnish nginx php-fpm
```

## Configuração do PHP-FPM

```bash
cd /etc/php-fpm.d/  
mv www.conf www.disabled
```

```bash
vim /etc/php-fpm.d/nginx.conf
```

```bash
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
chdir = /var/www/html/
```

 ```bash
mkdir -p /var/www/html  
chkconfig php-fpm on  
/etc/init.d/php-fpm start
```

## Configuração Nginx

```bash
mv /etc/nginx/nginx.conf /etc/nginx/nginx.conf.disabled
```
```bash
vim /etc/nginx/nginx.conf
```
```bash
user nginx;  
worker_processes 1;  
worker_rlimit_nofile 16384;  
error_log /var/log/nginx/error.log warn;  
pid /var/run/nginx.pid;  
events { worker_connections 16384;  
}  
http {  
include /etc/nginx/mime.types;  
default_type application/octet-stream;  
log_format main ‘$remote_addr – $remote_user  
[$time_local] “$request” ‘  
‘$status $body_bytes_sent “$http_referer” ‘  
‘”$http_user_agent” “$http_x_forwarded_for”‘;  
access_log /var/log/nginx/access.log main;  
sendfile on;  
keepalive_timeout 65;  
gzip on;  
include /etc/nginx/conf.d/*.conf;  
}
```

```bash
vim /etc/nginx/conf.d/teste.conf
```

```bash
server {  
listen 8080;  
server_name teste.com.br;  
root /var/www/html;  
access_log /var/log/nginx/teste.com.br.access_log;  
error_log /var/log/nginx/teste.com.br.error_log;  
client_max_body_size 64M;  
# Deny access to any files with a .php extension in the uploads directory  
location ~\* /(?:uploads|files)/.\*.php$ {  
deny all;  
}  
location / {  
index index.php index.html index.htm;  
try_files $uri $uri/ /index.php?$args;  
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

## Removendo a configuração default

```bash
rm -rf /etc/nginx/conf.d/default.conf  
rm -rf /etc/nginx/conf.d/example_ssl.conf  
rm -rf /usr/share/nginx/html
```
```bash
chkconfig nginx on  
/etc/init.d/nginx start
```

## Configuração do Daemon do Varnish

(Comentar da linha 96 até a 103 e substituir pelo conteúdo abaixo)  

```bash
vim /etc/sysconfig/varnish
```
```bash
DAEMON_OPTS=”-a :80  
-T localhost:6082  
-f /etc/varnish/default.vcl  
-u varnish -g varnish  
-S /etc/varnish/secret  
-s file,/var/lib/varnish/varnish\_storage.bin,2G”
```

## Configuração do Varnish para Nginx e WordPress

Note que as três primeiras linhas já constam no arquivo, porém a linha da especificação da porta do Backend por padrão vem definida para 80.

Atentar para a necessidade de troca para 8080, que é a porta que o nosso Backend (Nginx) está rodando. Nesta configuração básica, iremos dizer ao Varnish para cachear qualquer requisição GET por 30 segundos.  

```bash
vim /etc/varnish/default.vcl
```

```bash
backend default {  
.host = “127.0.0.1”;  
.port = “8080”;  
}

sub vcl_recv {  
if (req.request == “GET”) {  
return (lookup);  
}  
}

sub vcl_fetch {  
set beresp.ttl = 30s;  
return (deliver);  
}
```  

```bash
/etc/init.d/nginx restart  
/etc/init.d/varnish start
```

## Testando

```bash
curl -I http://ec2-23-20-111-223.compute-1.amazonaws.com
```

* Note que fiz o teste em uma instância da Amazon, por esta razão este FQDN.

Resposta:  

```bash
HTTP/1.1 403 Forbidden  
Server: nginx/1.2.9  
Content-Type: text/html  
Content-Length: 168  
Accept-Ranges: bytes  
Date: Wed, 11 Sep 2013 18:49:28 GMT  
X-Varnish: 1487051254  
Age: 0  
Via: 1.1 varnish  
Connection: keep-alive
```

Repare estas linhas:

> Server: nginx/1.2.9  
> X-Varnish: 1487051254

## Instalação do PHP

```bash
yum install -y php php-opcache php-gd php-mcrypt php-dom php-bcmath php-devel php-enchant php-fpm php-mbstring php-mysql php-pecl-memcache php-xmlrpc
```

```bash
/etc/init.d/php-fpm restart
```

## Ajustes no PHP

```bash
vim /etc/php.ini
```

```bash
cgi.fix_pathinfo=0  
upload_max_filesize = 64M
```

## Instalação do Mysql

```bash
yum -y install mysql-server mysql  
service mysqld start  
mysqladmin -u root password ‘senhadoroot’  
chkconfig mysqld on
```

```bash
mysql -u root -p  
create database wordpress;  
grant all privileges on wordpress.\* to ‘ricardo’@’localhost’ identified by ‘senhadoricardo’;  
exit
```

## Instalação do WordPress

```bash
cd /tmp  
wget http://wordpress.org/latest.zip  
unzip -q latest.zip  
mv wordpress/\* /var/www/html
```

## Configuração do WordPress

Basta acessar a Url do servidor (http://ec2-23-20-111-223.compute-1.amazonaws.com/), e em seguida seguir os passos mostrados pelo próprio instalador do WordPress, que consiste em primeiro informar os dados de conexão ao banco de dados, e em seguida realizar a instalação do próprio.

## Vendo o que está passando no Varnish

No servidor execute o comando “varnishlog” e navegue pelo site. Você irá ver tudo que está passando Varnish.

Se quiser saber o que está fazendo cache ou não, podemos customizar o comando, com passagem de parâmetros. Vamos lá:  

```bash
[root@ip-10-137-16-34]# varnishncsa -F ‘%h %l %u %t “%r” %s %b “%{Referer}i” “%{User-agent}i” “%{Cookie}i” “%{Varnish:hitmiss}x” “%{Varnish:time\_firstbyte}x”‘
```
  
O que estiver em cache, você vai ver como HIT. Conteúdo que não está mais em cache e o browser do cliente foi pegar no disco, você vê como MISS.

## Mais um teste

Conforme a nossa configuração, dissemos para o Varnish cachear qualquer requisição GET por 30 segundos. E ele está fazendo apenas isso. Vamos fazer um teste:  

```bash
[root@ip-10-137-16-34]# wget -O /dev/null -S http://localhost
```

A saída foi:  

```bash
[root@ip-10-137-16-34]# wget -O /dev/null -S http://localhost  
–2013-09-11 20:28:42– http://localhost/  
Resolving localhost (localhost)… 127.0.0.1  
Connecting to localhost (localhost)|127.0.0.1|:80… connected.  
HTTP request sent, awaiting response…  
HTTP/1.1 200 OK  
Server: nginx/1.2.9  
Content-Type: text/html; charset=UTF-8  
X-Powered-By: PHP/5.3.27  
X-Pingback: http://ec2-23-20-111-223.compute-1.amazonaws.com/xmlrpc.php  
Transfer-Encoding: chunked  
Date: Wed, 11 Sep 2013 20:28:42 GMT  
X-Varnish: 162097824  
Age: 0  
Via: 1.1 varnish  
Connection: keep-alive  
Length: unspecified [text/html]  
Saving to: /dev/null
```
 
Note que há uma linha começando com “Age: “. Este Age é o cabeçalho HTTP que o Varnish coloca indicando quanto tempo ele está no cache. Quando é 0, significa que o Varnish não tinha a página em cache e por isso teve que buscar no servidor Web.

Agora utilize o comando a seguir para executar o mesmo wget infinitamente, com intervalos de 1 segundo, e preste atenção na linha do cabeçalho Age. Olhe por pelo menos 1 minuto e você deve entender:  

```bash
[root@ip-10-137-16-34]# while true; do wget -O /dev/null -S http://localhost/; sleep 1; done
```

Viu? A cada segundo, o cabeçalho Age vai aumentando, quando chega no número 30, ele zera novamente. Isso quer dizer que o Varnish só busca a página no servidor Web no mínimo de 30 em 30 segundos.

O Varnish tem diversas ferramentas de monitoramento das suas atividades, como o varnishncsa, varnishlog, varnishhtop e varnishstat. Abaixo um comando para você monitorar apenas os dados de Hit ou Miss:  

```bash
[root@ip-10-137-16-34]# watch -n 1 -d “varnishstat -1 -f cache\_hit,cache\_miss”
```
Saída:  

```bash
Every 1.0s: varnishstat -1 -f cache_hit,cache_miss

cache_hit 97 0.11 Cache hits  
cache_miss 76 0.08 Cache misses
```

Até a próxima!

Referências:  
https://www.varnish-cache.org/docs/2.1/tutorial/

> [CentOS :: Setting Varnish, Nginx for WordPress](https://blackonsole.org/centos-setting-varnish-nginx-for-wordpress/)

<iframe class="wp-embedded-content" data-secret="8ZB7HdoXYD" frameborder="0" height="282" marginheight="0" marginwidth="0" sandbox="allow-scripts" scrolling="no" security="restricted" src="https://blackonsole.org/centos-setting-varnish-nginx-for-wordpress/embed/#?secret=8ZB7HdoXYD" style="position: absolute; clip: rect(1px, 1px, 1px, 1px);" title="“CentOS :: Setting Varnish, Nginx for WordPress” — Linux Tutorial" width="500"></iframe>  
http://www.devin.com.br/uma-introducao-ao-varnish/  
http://www.devin.com.br/varnish-logs/
