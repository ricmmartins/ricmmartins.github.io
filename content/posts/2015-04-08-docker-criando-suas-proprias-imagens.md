---
slug: "docker-criando-suas-proprias-imagens"
aliases:
  - "/posts/docker-criando-suas-proprias-imagens/"
title: 'Docker: Criando suas próprias imagens - Parte III/III'
date: '2015-04-08T20:02:43-04:00'
tags:
    - docker
    - linux
categories:
    - Containers
description: "O post de hoje é pra mostrar como criar suas imagens do docker, publicá-las no Docker Hub (Registry) e depois usar/disponibilizar onde precisar."
---

O post de hoje é pra mostrar como criar suas imagens do docker, publicá-las no Docker Hub (Registry) e depois usar/disponibilizar onde precisar.

O primeiro passo é instalar o docker:

```bash
[root@rmartins /]# yum install docker-io
Loaded plugins: fastestmirror
Setting up Install Process
Loading mirror speeds from cached hostfile
* base: mirror.nbtelecom.com.br
* epel: mirror.globo.com
* extras: mirror.nbtelecom.com.br
* updates: mirror.nbtelecom.com.br
Resolving Dependencies
--> Running transaction check
---> Package docker-io.x86_64 0:1.4.1-3.el6 will be installed
--> Finished Dependency Resolution

Dependencies Resolved

==============================================================================================================================================================================================================================================
Package Arch Version Repository Size
==============================================================================================================================================================================================================================================
Installing:
docker-io x86_64 1.4.1-3.el6 epel 4.5 M

Transaction Summary
==============================================================================================================================================================================================================================================
Install 1 Package(s)

Total download size: 4.5 M
Installed size: 19 M
Is this ok [y/N]: y
Downloading Packages:
docker-io-1.4.1-3.el6.x86_64.rpm | 4.5 MB 00:02
Running rpm_check_debug
Running Transaction Test
Transaction Test Succeeded
Running Transaction
Installing : docker-io-1.4.1-3.el6.x86_64 1/1
Verifying : docker-io-1.4.1-3.el6.x86_64 1/1

Installed:
docker-io.x86_64 0:1.4.1-3.el6

Complete!
```

Uma vez instalado, vamos iniciá-lo:

```bash
[root@rmartins /]# /etc/init.d/docker start
Starting cgconfig service: [ OK ]
Starting docker: [ OK ]
```

Agora vamos criar nosso diretório de trabalho

```bash
[root@rmartins /]# mkdir -p /docker/webserver
[root@rmartins /]# cd /docker/webserver
```

Dentro do nosso diretório de trabalho vamos criar dois arquivos para serem adicionados à nossa imagem pelo Dockerfile. Uma delas é um arquivo para ser configurado o repositório epel e outro é o conteúdo do index.html que será servido pelo nosso Nginx nesta demonstração:

O primeiro é o arquivo epel.repo:

```bash
cat <<'EOF' >> epel.repo
[epel]
name=Extra Packages for Enterprise Linux 6 - $basearch
baseurl=http://download.fedoraproject.org/pub/epel/6/$basearch
mirrorlist=https://mirrors.fedoraproject.org/metalink?repo=epel-6&arch=$basearch
failovermethod=priority
enabled=1
gpgcheck=0
EOF
```

O segundo o index.html:

```bash
cat <<'EOF' >> index.html
<center>Ricardo Martins | Docker Test</center>EOF
```

Em seguida vamos criar nosso Dockerfile:

```bash
[root@rmartins webserver]# vim Dockerfile
FROM centos:6
MAINTAINER Ricardo Martins <contato@ricardomartins.com.br>

ADD epel.repo /etc/yum.repos.d/

RUN yum update -y
RUN yum install -y nginx
RUN echo "daemon off;" >> /etc/nginx/nginx.conf
RUN rm -rf /usr/share/nginx/html/*

ADD index.html /usr/share/nginx/html/

CMD /usr/sbin/nginx -c /etc/nginx/nginx.conf

EXPOSE 80
```

O que fazem estas linhas de comando:

**FROM centos:6** = Indica que utilizaremos a imagem base do Centos 6, do repositório do CentOS no Dockerhub (Registry) ([https://registry.hub.docker.com/\_/centos/](https://registry.hub.docker.com/_/centos/))

**MAINTAINER Ricardo Martins &lt;contato@ricardomartins.com.br&gt;** = O nome e contato do mantenedor da imagem

**ADD epel.repo /etc/yum.repos.d/** = Adiciona o conteúdo do arquivo epel.repo dentro de /etc/yum.repos.d. Isto é necessário para que seja utilizado o repositório do Epel para a instalação do Nginx

**RUN yum update -y** = Atualiza o sistema

**RUN yum install -y nginx** = Instala o Nginx

**RUN echo “daemon off;” &gt;&gt; /etc/nginx/nginx.conf** = De acordo com o conceito de funcionamento do Docker, um container deve rodar apenas um serviço. Sendo assim, em vez de rodar serviços em background, devem rodar em foreground. Então este comando desabilita a execução do nginx como daemon.

**RUN rm -rf /usr/share/nginx/html/\*** = Remove o conteúdo de /usr/share/nginx/html/

**ADD index.html /usr/share/nginx/html/** = Adiciona o arquivo index.html em /usr/share/nginx/html/

**CMD /usr/sbin/nginx -c /etc/nginx/nginx.conf** = Informa o comando a ser executado ao iniciar o container

**EXPOSE 80** = Usado para informar qual porta o container docker irá “escutar”.

Agora vamos criar nossa imagem com o comando abaixo:

```bash
[root@rmartins webserver]# docker build -t=rmartins/nginx:teste .
```

Neste caso, estaremos criando a nossa imagem dentro do repositório rmartins/nginx com a tag teste. O “.” no final da linha informa para procurar o Dockerfile no diretório atual. A saída do comando está exibida abaixo, contendo todas as tasks realizadas:

```bash
Sending build context to Docker daemon 4.096 kB
Sending build context to Docker daemon
Step 0 : FROM centos:6
centos:6: The image you are pulling has been verified
511136ea3c5a: Pull complete
5b12ef8fd570: Pull complete
f6808a3e4d9e: Pull complete
Status: Downloaded newer image for centos:6
---> f6808a3e4d9e
Step 1 : MAINTAINER Ricardo Martins <contato@ricardomartins.com.br>
---> Running in 72bb3ca71976
---> 0e26bbc4a6fa
Removing intermediate container 72bb3ca71976
Step 2 : ADD epel.repo /etc/yum.repos.d/
---> 3238866cc178
Removing intermediate container f63fa4c5123b
Step 3 : RUN yum update -y
---> Running in 8d44ba718c35
Loaded plugins: fastestmirror
Setting up Update Process
Resolving Dependencies
--> Running transaction check
---> Package bind-libs.x86_64 32:9.8.2-0.30.rc1.el6_6.1 will be updated
---> Package bind-libs.x86_64 32:9.8.2-0.30.rc1.el6_6.2 will be an update
---> Package bind-utils.x86_64 32:9.8.2-0.30.rc1.el6_6.1 will be updated
---> Package bind-utils.x86_64 32:9.8.2-0.30.rc1.el6_6.2 will be an update
---> Package cyrus-sasl-lib.x86_64 0:2.1.23-15.el6_6.1 will be updated
---> Package cyrus-sasl-lib.x86_64 0:2.1.23-15.el6_6.2 will be an update
---> Package openssl.x86_64 0:1.0.1e-30.el6_6.5 will be updated
---> Package openssl.x86_64 0:1.0.1e-30.el6.8 will be an update
---> Package shadow-utils.x86_64 2:4.1.4.2-19.el6 will be updated
---> Package shadow-utils.x86_64 2:4.1.4.2-19.el6_6.1 will be an update
---> Package tzdata.noarch 0:2015a-1.el6 will be updated
---> Package tzdata.noarch 0:2015b-1.el6 will be an update
--> Finished Dependency Resolution

Dependencies Resolved

================================================================================
Package Arch Version Repository Size
================================================================================
Updating:
bind-libs x86_64 32:9.8.2-0.30.rc1.el6_6.2 updates 884 k
bind-utils x86_64 32:9.8.2-0.30.rc1.el6_6.2 updates 185 k
cyrus-sasl-lib x86_64 2.1.23-15.el6_6.2 updates 136 k
openssl x86_64 1.0.1e-30.el6.8 updates 1.5 M
shadow-utils x86_64 2:4.1.4.2-19.el6_6.1 updates 899 k
tzdata noarch 2015b-1.el6 updates 443 k

Transaction Summary
================================================================================
Upgrade 6 Package(s)

Total download size: 4.0 M
Downloading Packages:
--------------------------------------------------------------------------------
Total 583 kB/s | 4.0 MB 00:07
warning: rpmts_HdrFromFdno: Header V3 RSA/SHA1 Signature, key ID c105b9de: NOKEY
Retrieving key from file:///etc/pki/rpm-gpg/RPM-GPG-KEY-CentOS-6
Importing GPG key 0xC105B9DE:
Userid : CentOS-6 Key (CentOS 6 Official Signing Key) <centos-6-key@centos.org>
Package: centos-release-6-6.el6.centos.12.2.x86_64 (@CentOS/$releasever)
From : /etc/pki/rpm-gpg/RPM-GPG-KEY-CentOS-6
Running rpm_check_debug
Running Transaction Test
Transaction Test Succeeded
Running Transaction
Warning: RPMDB altered outside of yum.
Updating : openssl-1.0.1e-30.el6.8.x86_64 1/12
Updating : 32:bind-libs-9.8.2-0.30.rc1.el6_6.2.x86_64 2/12
Updating : 32:bind-utils-9.8.2-0.30.rc1.el6_6.2.x86_64 3/12
Updating : 2:shadow-utils-4.1.4.2-19.el6_6.1.x86_64 4/12
Updating : cyrus-sasl-lib-2.1.23-15.el6_6.2.x86_64 5/12
Updating : tzdata-2015b-1.el6.noarch 6/12
Cleanup : tzdata-2015a-1.el6.noarch 7/12
Cleanup : 32:bind-utils-9.8.2-0.30.rc1.el6_6.1.x86_64 8/12
Cleanup : 32:bind-libs-9.8.2-0.30.rc1.el6_6.1.x86_64 9/12
Cleanup : openssl-1.0.1e-30.el6_6.5.x86_64 10/12
Cleanup : 2:shadow-utils-4.1.4.2-19.el6.x86_64 11/12
Cleanup : cyrus-sasl-lib-2.1.23-15.el6_6.1.x86_64 12/12
Verifying : openssl-1.0.1e-30.el6.8.x86_64 1/12
Verifying : tzdata-2015b-1.el6.noarch 2/12
Verifying : 32:bind-utils-9.8.2-0.30.rc1.el6_6.2.x86_64 3/12
Verifying : cyrus-sasl-lib-2.1.23-15.el6_6.2.x86_64 4/12
Verifying : 2:shadow-utils-4.1.4.2-19.el6_6.1.x86_64 5/12
Verifying : 32:bind-libs-9.8.2-0.30.rc1.el6_6.2.x86_64 6/12
Verifying : cyrus-sasl-lib-2.1.23-15.el6_6.1.x86_64 7/12
Verifying : openssl-1.0.1e-30.el6_6.5.x86_64 8/12
Verifying : 32:bind-utils-9.8.2-0.30.rc1.el6_6.1.x86_64 9/12
Verifying : 2:shadow-utils-4.1.4.2-19.el6.x86_64 10/12
Verifying : 32:bind-libs-9.8.2-0.30.rc1.el6_6.1.x86_64 11/12
Verifying : tzdata-2015a-1.el6.noarch 12/12

Updated:
bind-libs.x86_64 32:9.8.2-0.30.rc1.el6_6.2
bind-utils.x86_64 32:9.8.2-0.30.rc1.el6_6.2
cyrus-sasl-lib.x86_64 0:2.1.23-15.el6_6.2
openssl.x86_64 0:1.0.1e-30.el6.8
shadow-utils.x86_64 2:4.1.4.2-19.el6_6.1
tzdata.noarch 0:2015b-1.el6

Complete!
---> 0382a281fc73
Removing intermediate container 8d44ba718c35
Step 4 : RUN yum install -y nginx
---> Running in 45996a2b3d05
Loaded plugins: fastestmirror
Setting up Install Process
Determining fastest mirrors
* base: centos.ufms.br
* epel: mirror.uta.edu.ec
* extras: centos.ufms.br
* updates: centos.ufms.br
Resolving Dependencies
--> Running transaction check
---> Package nginx.x86_64 0:1.0.15-11.el6 will be installed
--> Processing Dependency: nginx-filesystem = 1.0.15-11.el6 for package: nginx-1.0.15-11.el6.x86_64
--> Processing Dependency: perl >= 5.006001 for package: nginx-1.0.15-11.el6.x86_64
--> Processing Dependency: perl(warnings) for package: nginx-1.0.15-11.el6.x86_64
--> Processing Dependency: perl(strict) for package: nginx-1.0.15-11.el6.x86_64
--> Processing Dependency: perl(constant) for package: nginx-1.0.15-11.el6.x86_64
--> Processing Dependency: perl(XSLoader) for package: nginx-1.0.15-11.el6.x86_64
--> Processing Dependency: perl(Exporter) for package: nginx-1.0.15-11.el6.x86_64
--> Processing Dependency: perl(:MODULE_COMPAT_5.10.1) for package: nginx-1.0.15-11.el6.x86_64
--> Processing Dependency: nginx-filesystem for package: nginx-1.0.15-11.el6.x86_64
--> Processing Dependency: libxslt.so.1(LIBXML2_1.0.18)(64bit) for package: nginx-1.0.15-11.el6.x86_64
--> Processing Dependency: libxslt.so.1(LIBXML2_1.0.11)(64bit) for package: nginx-1.0.15-11.el6.x86_64
--> Processing Dependency: gd for package: nginx-1.0.15-11.el6.x86_64
--> Processing Dependency: GeoIP for package: nginx-1.0.15-11.el6.x86_64
--> Processing Dependency: libxslt.so.1()(64bit) for package: nginx-1.0.15-11.el6.x86_64
--> Processing Dependency: libperl.so()(64bit) for package: nginx-1.0.15-11.el6.x86_64
--> Processing Dependency: libgd.so.2()(64bit) for package: nginx-1.0.15-11.el6.x86_64
--> Processing Dependency: libexslt.so.0()(64bit) for package: nginx-1.0.15-11.el6.x86_64
--> Processing Dependency: libGeoIP.so.1()(64bit) for package: nginx-1.0.15-11.el6.x86_64
--> Running transaction check
---> Package GeoIP.x86_64 0:1.5.1-5.el6 will be installed
---> Package gd.x86_64 0:2.0.35-11.el6 will be installed
--> Processing Dependency: libpng12.so.0(PNG12_0)(64bit) for package: gd-2.0.35-11.el6.x86_64
--> Processing Dependency: libpng12.so.0()(64bit) for package: gd-2.0.35-11.el6.x86_64
--> Processing Dependency: libjpeg.so.62()(64bit) for package: gd-2.0.35-11.el6.x86_64
--> Processing Dependency: libfreetype.so.6()(64bit) for package: gd-2.0.35-11.el6.x86_64
--> Processing Dependency: libfontconfig.so.1()(64bit) for package: gd-2.0.35-11.el6.x86_64
--> Processing Dependency: libXpm.so.4()(64bit) for package: gd-2.0.35-11.el6.x86_64
--> Processing Dependency: libX11.so.6()(64bit) for package: gd-2.0.35-11.el6.x86_64
---> Package libxslt.x86_64 0:1.1.26-2.el6_3.1 will be installed
---> Package nginx-filesystem.noarch 0:1.0.15-11.el6 will be installed
---> Package perl.x86_64 4:5.10.1-136.el6_6.1 will be installed
--> Processing Dependency: perl(version) for package: 4:perl-5.10.1-136.el6_6.1.x86_64
--> Processing Dependency: perl(Pod::Simple) for package: 4:perl-5.10.1-136.el6_6.1.x86_64
--> Processing Dependency: perl(Module::Pluggable) for package: 4:perl-5.10.1-136.el6_6.1.x86_64
---> Package perl-libs.x86_64 4:5.10.1-136.el6_6.1 will be installed
--> Running transaction check
---> Package fontconfig.x86_64 0:2.8.0-5.el6 will be installed
---> Package freetype.x86_64 0:2.3.11-15.el6_6.1 will be installed
---> Package libX11.x86_64 0:1.6.0-2.2.el6 will be installed
--> Processing Dependency: libX11-common = 1.6.0-2.2.el6 for package: libX11-1.6.0-2.2.el6.x86_64
--> Processing Dependency: libxcb.so.1()(64bit) for package: libX11-1.6.0-2.2.el6.x86_64
---> Package libXpm.x86_64 0:3.5.10-2.el6 will be installed
---> Package libjpeg-turbo.x86_64 0:1.2.1-3.el6_5 will be installed
---> Package libpng.x86_64 2:1.2.49-1.el6_2 will be installed
---> Package perl-Module-Pluggable.x86_64 1:3.90-136.el6_6.1 will be installed
---> Package perl-Pod-Simple.x86_64 1:3.13-136.el6_6.1 will be installed
--> Processing Dependency: perl(Pod::Escapes) >= 1.04 for package: 1:perl-Pod-Simple-3.13-136.el6_6.1.x86_64
---> Package perl-version.x86_64 3:0.77-136.el6_6.1 will be installed
--> Running transaction check
---> Package libX11-common.noarch 0:1.6.0-2.2.el6 will be installed
---> Package libxcb.x86_64 0:1.9.1-2.el6 will be installed
--> Processing Dependency: libXau.so.6()(64bit) for package: libxcb-1.9.1-2.el6.x86_64
---> Package perl-Pod-Escapes.x86_64 1:1.04-136.el6_6.1 will be installed
--> Running transaction check
---> Package libXau.x86_64 0:1.0.6-4.el6 will be installed
--> Finished Dependency Resolution

Dependencies Resolved

================================================================================
Package Arch Version Repository Size
================================================================================
Installing:
nginx x86_64 1.0.15-11.el6 epel 404 k
Installing for dependencies:
GeoIP x86_64 1.5.1-5.el6 epel 21 M
fontconfig x86_64 2.8.0-5.el6 base 186 k
freetype x86_64 2.3.11-15.el6_6.1 updates 361 k
gd x86_64 2.0.35-11.el6 base 142 k
libX11 x86_64 1.6.0-2.2.el6 base 586 k
libX11-common noarch 1.6.0-2.2.el6 base 192 k
libXau x86_64 1.0.6-4.el6 base 24 k
libXpm x86_64 3.5.10-2.el6 base 51 k
libjpeg-turbo x86_64 1.2.1-3.el6_5 base 174 k
libpng x86_64 2:1.2.49-1.el6_2 base 182 k
libxcb x86_64 1.9.1-2.el6 base 110 k
libxslt x86_64 1.1.26-2.el6_3.1 base 452 k
nginx-filesystem noarch 1.0.15-11.el6 epel 7.9 k
perl x86_64 4:5.10.1-136.el6_6.1 updates 10 M
perl-Module-Pluggable x86_64 1:3.90-136.el6_6.1 updates 40 k
perl-Pod-Escapes x86_64 1:1.04-136.el6_6.1 updates 32 k
perl-Pod-Simple x86_64 1:3.13-136.el6_6.1 updates 212 k
perl-libs x86_64 4:5.10.1-136.el6_6.1 updates 578 k
perl-version x86_64 3:0.77-136.el6_6.1 updates 51 k

Transaction Summary
================================================================================
Install 20 Package(s)

Total download size: 35 M
Installed size: 87 M
Downloading Packages:
--------------------------------------------------------------------------------
Total 363 kB/s | 35 MB 01:37
Running rpm_check_debug
Running Transaction Test
Transaction Test Succeeded
Running Transaction
Installing : freetype-2.3.11-15.el6_6.1.x86_64 1/20
Installing : fontconfig-2.8.0-5.el6.x86_64 2/20
Installing : 1:perl-Pod-Escapes-1.04-136.el6_6.1.x86_64 3/20
Installing : 1:perl-Module-Pluggable-3.90-136.el6_6.1.x86_64 4/20
Installing : 4:perl-libs-5.10.1-136.el6_6.1.x86_64 5/20
Installing : 1:perl-Pod-Simple-3.13-136.el6_6.1.x86_64 6/20
Installing : 3:perl-version-0.77-136.el6_6.1.x86_64 7/20
Installing : 4:perl-5.10.1-136.el6_6.1.x86_64 8/20
Installing : libX11-common-1.6.0-2.2.el6.noarch 9/20
Installing : libjpeg-turbo-1.2.1-3.el6_5.x86_64 10/20
Installing : libxslt-1.1.26-2.el6_3.1.x86_64 11/20
Installing : 2:libpng-1.2.49-1.el6_2.x86_64 12/20
Installing : nginx-filesystem-1.0.15-11.el6.noarch 13/20
Installing : GeoIP-1.5.1-5.el6.x86_64 14/20
Installing : libXau-1.0.6-4.el6.x86_64 15/20
Installing : libxcb-1.9.1-2.el6.x86_64 16/20
Installing : libX11-1.6.0-2.2.el6.x86_64 17/20
Installing : libXpm-3.5.10-2.el6.x86_64 18/20
Installing : gd-2.0.35-11.el6.x86_64 19/20
Installing : nginx-1.0.15-11.el6.x86_64 20/20
Verifying : 3:perl-version-0.77-136.el6_6.1.x86_64 1/20
Verifying : freetype-2.3.11-15.el6_6.1.x86_64 2/20
Verifying : libXau-1.0.6-4.el6.x86_64 3/20
Verifying : GeoIP-1.5.1-5.el6.x86_64 4/20
Verifying : 1:perl-Pod-Simple-3.13-136.el6_6.1.x86_64 5/20
Verifying : 1:perl-Module-Pluggable-3.90-136.el6_6.1.x86_64 6/20
Verifying : libXpm-3.5.10-2.el6.x86_64 7/20
Verifying : nginx-filesystem-1.0.15-11.el6.noarch 8/20
Verifying : fontconfig-2.8.0-5.el6.x86_64 9/20
Verifying : libxcb-1.9.1-2.el6.x86_64 10/20
Verifying : 2:libpng-1.2.49-1.el6_2.x86_64 11/20
Verifying : 4:perl-5.10.1-136.el6_6.1.x86_64 12/20
Verifying : nginx-1.0.15-11.el6.x86_64 13/20
Verifying : 4:perl-libs-5.10.1-136.el6_6.1.x86_64 14/20
Verifying : libxslt-1.1.26-2.el6_3.1.x86_64 15/20
Verifying : libjpeg-turbo-1.2.1-3.el6_5.x86_64 16/20
Verifying : 1:perl-Pod-Escapes-1.04-136.el6_6.1.x86_64 17/20
Verifying : libX11-1.6.0-2.2.el6.x86_64 18/20
Verifying : libX11-common-1.6.0-2.2.el6.noarch 19/20
Verifying : gd-2.0.35-11.el6.x86_64 20/20

Installed:
nginx.x86_64 0:1.0.15-11.el6

Dependency Installed:
GeoIP.x86_64 0:1.5.1-5.el6
fontconfig.x86_64 0:2.8.0-5.el6
freetype.x86_64 0:2.3.11-15.el6_6.1
gd.x86_64 0:2.0.35-11.el6
libX11.x86_64 0:1.6.0-2.2.el6
libX11-common.noarch 0:1.6.0-2.2.el6
libXau.x86_64 0:1.0.6-4.el6
libXpm.x86_64 0:3.5.10-2.el6
libjpeg-turbo.x86_64 0:1.2.1-3.el6_5
libpng.x86_64 2:1.2.49-1.el6_2
libxcb.x86_64 0:1.9.1-2.el6
libxslt.x86_64 0:1.1.26-2.el6_3.1
nginx-filesystem.noarch 0:1.0.15-11.el6
perl.x86_64 4:5.10.1-136.el6_6.1
perl-Module-Pluggable.x86_64 1:3.90-136.el6_6.1
perl-Pod-Escapes.x86_64 1:1.04-136.el6_6.1
perl-Pod-Simple.x86_64 1:3.13-136.el6_6.1
perl-libs.x86_64 4:5.10.1-136.el6_6.1
perl-version.x86_64 3:0.77-136.el6_6.1

Complete!
---> c33cc1e02349
Removing intermediate container 45996a2b3d05
Step 5 : RUN echo "daemon off;" >> /etc/nginx/nginx.conf
---> Running in a2529e48704f
---> 8c4764c39165
Removing intermediate container a2529e48704f
Step 6 : RUN rm -rf /usr/share/nginx/html/*
---> Running in f009613f9586
---> 7367163ddf6b
Removing intermediate container f009613f9586
Step 7 : ADD index.html /usr/share/nginx/html/
---> 6991229431d0
Removing intermediate container ea6eee679788
Step 8 : CMD /usr/sbin/nginx -c /etc/nginx/nginx.conf
---> Running in 406af26140ad
---> 2be3b2ad822b
Removing intermediate container 406af26140ad
Step 9 : EXPOSE 80
---> Running in 539a5bb88ce1
---> 1601aa313bde
Removing intermediate container 539a5bb88ce1
Successfully built 1601aa313bde
```

Uma vez finalizado, podemos ver as imagens disponíveis no nosso cache local:

```bash
[root@rmartins webserver]# docker images
REPOSITORY TAG IMAGE ID CREATED VIRTUAL SIZE
rmartins/nginx teste 1601aa313bde 2 minutes ago 398.3 MB
centos 6 f6808a3e4d9e 5 weeks ago 215.7 MB
```

Note que temos duas imagens: 1601aa313bde e f6808a3e4d9e. A primeira é a que acabamos de gerar. A segunda é a que foi usada para gerar a nossa, uma vez que especificamos para utilizar uma imagem base do CentOS 6. O que aconteceu é que o docker baixou do repositório do CentOS no Dockerhub (Registry) e a imagem base do CentOS 6.

O próximo passo é publicar a nossa imagem no repositório do Dockerhub (Registry), uma vez que por enquanto ele existe apenas localmente. Para isso, você deve ter um usuário e senha previamente cadastrados em <http://hub.docker.com>. Depois de criar seu usuário, rode o comando de login e informe seus dados. No meu caso:

```bash
[root@rmartins webserver]# docker login
Username: rmartins
Password: -------
Email: contato@ricardomartins.com.br
Login Succeeded
```

Feito isso você já está logado no Dockerhub (Registry), então basta fazer o push da sua imagem no seu repositório:

```bash
[root@rmartins webserver]# docker push rmartins/nginx
The push refers to a repository [rmartins/nginx] (len: 1)
Sending image list
Pushing repository rmartins/nginx (1 tags)
511136ea3c5a: Image already pushed, skipping
5b12ef8fd570: Image already pushed, skipping
f6808a3e4d9e: Image already pushed, skipping
0e26bbc4a6fa: Image successfully pushed
3238866cc178: Image successfully pushed
0382a281fc73: Image successfully pushed
c33cc1e02349: Image successfully pushed
8c4764c39165: Image successfully pushed
7367163ddf6b: Image successfully pushed
6991229431d0: Image successfully pushed
2be3b2ad822b: Image successfully pushed
1601aa313bde: Image successfully pushed
Pushing tag for rev [1601aa313bde] on {https://cdn-registry-1.docker.io/v1/repositories/rmartins/nginx/tags/teste}
```

Feito isso, você já pode conferir a imagem no repositório. Neste caso, acesse em <https://registry.hub.docker.com/u/rmartins/nginx/>

Agora a imagem do nosso container já está disponibilizada para todos na internet. Aos interessados em usar, basta rodar o comando abaixo depois de instalar o docker:

```bash
[root@rmartins webserver]# docker run -d -p 80:80 rmartins/nginx:teste
c985f8c73207ff3ac1b61881b9cdc95657af5109557ca9156e3be7873e1ac27
```

Por padrão o docker irá procurar informada em cache. Neste caso encontrou pois criamos esta imagem localmente, porém se estivesse apenas testando uma imagem disponibilizada por alguem no Dockerhub (Registry), o docker iria realizar o download para a máquina e em seguida rodar o container desta imagem.

Conferindo a execução do container:

```bash
[root@rmartins webserver]# docker ps

CONTAINER ID IMAGE COMMAND CREATED STATUS PORTS NAMES
c985f8c73207 rmartins/nginx:teste "/bin/sh -c '/usr/sb 38 seconds ago Up 35 seconds 0.0.0.0:80->80/tcp boring_wilson
```

Ao acessar http://ip.do.host será visualizado o nginx rodando, com o index.html customizado:

[![Docker1](/wp-content/uploads/2015/04/Docker1.png)](/wp-content/uploads/2015/04/Docker1.png)

Fazendo alterações:

Se quiser, você pode acessar o shell do container e realizar alterações:

```bash
[root@rmartins webserver]# docker exec -it c985f8c73207 bash
```

Seremos direcionados para dentro do container:

```bash
[root@c985f8c73207 /]#
```

Então vou alterar o arquivo index.html, inserindo uma linha a mais, conforme abaixo:

```bash
[root@c985f8c73207 /]# vi /usr/share/nginx/html/index.html
<center>Ricardo Martins | Docker Test</center><center>Testando alteracoes</center>
```

Agora vamos sair do container (basta escrever “exit” – sem aspas) e visualizar as alterações:

```bash
[root@rmartins webserver]# docker diff c985f8c73207
C /usr
C /usr/share
C /usr/share/nginx
C /usr/share/nginx/html
C /usr/share/nginx/html/index.html
C /root
A /root/.bash_history
C /var
C /var/log
C /var/log/nginx
A /var/log/nginx/access.log
A /var/log/nginx/error.log
C /var/lib
C /var/lib/nginx
C /var/lib/nginx/tmp
A /var/lib/nginx/tmp/client_body
A /var/lib/nginx/tmp/fastcgi
A /var/lib/nginx/tmp/proxy
A /var/lib/nginx/tmp/scgi
A /var/lib/nginx/tmp/uwsgi
C /var/run
A /var/run/nginx.pid
```

E por fim criar uma nova imagem baseando-se no container atual:

```bash
[root@rmartins webserver]# docker commit c985f8c73207 rmartins/nginx-alterado
9ece9e81425f2727976aa3b2e239c5a30d140413f3f546cf948becb328891eb9
```

Publicando no Dockerhub (Registry) a imagem alterada:

```bash
[root@rmartins webserver]# docker push rmartins/nginx-alterado
The push refers to a repository [rmartins/nginx-alterado] (len: 1)
Sending image list
Pushing repository rmartins/nginx-alterado (1 tags)
511136ea3c5a: Image already pushed, skipping
5b12ef8fd570: Image already pushed, skipping
f6808a3e4d9e: Image already pushed, skipping
0e26bbc4a6fa: Image already pushed, skipping
3238866cc178: Image already pushed, skipping
0382a281fc73: Image already pushed, skipping
c33cc1e02349: Image already pushed, skipping
8c4764c39165: Image already pushed, skipping
7367163ddf6b: Image already pushed, skipping
6991229431d0: Image already pushed, skipping
2be3b2ad822b: Image already pushed, skipping
1601aa313bde: Image already pushed, skipping
9ece9e81425f: Image successfully pushed
Pushing tag for rev [9ece9e81425f] on {https://cdn-registry-1.docker.io/v1/repositories/rmartins/nginx-alterado/tags/latest}
```

Note que não informei uma tag específica, então esta imagem ganha uma tag padrão, chamada latest.

Agora vou dar stop no container em execução:

```bash
[root@rmartins /]# docker stop c985f8c73207
c985f8c73207
```

E subir nossa outra imagem alterada:

```bash
[root@rmartins /]# docker run -d -p 80:80 rmartins/nginx-alterado
236204839ae3680f21c6c9cc4bfe2d2493732a24b2b5b2edbe071379f00ec501
```

Acessando:

[![Docker2](/wp-content/uploads/2015/04/Docker2.png)](/wp-content/uploads/2015/04/Docker2.png)

Mais um teste para finalizar. Identificando o container em execução com o nginx alterado:

```bash
[root@rmartins /]# docker ps
CONTAINER ID IMAGE COMMAND CREATED STATUS PORTS NAMES
2b1cf57a7ad9 rmartins/nginx-alterado:latest "/bin/sh -c '/usr/sb 3 minutes ago Up 3 minutes 0.0.0.0:80->80/tcp fervent_colden
```

Dando stop nele:

```bash
[root@rmartins /]# docker stop 2b1cf57a7ad9
2b1cf57a7ad9
```

Iniciando o container com a imagem do Nginx original:

```bash
[root@rmartins /]# docker run -d -p 80:80 rmartins/nginx:teste
0ab61e5085d8a0bbf820fe0e21d0d7f500215d90c898150876391a05b4cccfbb
```

Validando:

[![Docker3](/wp-content/uploads/2015/04/Docker3.png)](/wp-content/uploads/2015/04/Docker3.png)

Conferindo os dois no Dockerhub (Registry):

[![Docker4](/wp-content/uploads/2015/04/Docker4.png)](/wp-content/uploads/2015/04/Docker4.png)

Até a próxima!
