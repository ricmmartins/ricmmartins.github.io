---
slug: "videocast-registro-de-um-dominio-e-setup-completo-na-aws"
aliases:
  - "/posts/videocast-registro-de-um-dominio-e-setup-completo-na-aws/"
title: 'Videocast: Registro de um domínio e setup completo na AWS'
date: '2015-07-17T16:19:31-04:00'
tags:
    - apache
    - aws
    - cloud
    - wordpress
    - mysql
categories:
    - AWS
description: "Neste videocast fiz um laboratório prático de AWS. É demonstrado o registro de um domínio no registro.br, configuração deste domínio no route53 e em"
---

Neste videocast fiz um laboratório prático de AWS. É demonstrado o registro de um domínio no registro.br, configuração deste domínio no route53 e em seguida a criação de uma instância EC2 com o Apache, PHP e WordPress instalado. Em paralelo é criado um RDS com MySQL, para ser usado em conjunto com a instância EC2, criando nosso stack LAMP (Linux, Apache, MySQL e PHP).

Abaixo os comandos utilizados no vídeo:

```bash
#!/bin/bash
yum -y install httpd php php-common php-mysql php-gd php-mbstring php-xml php-xmlrpc
chkconfig httpd on
/etc/init.d/httpd start
cd /tmp
wget http://wordpress.org/latest.tar.gz
tar xzvf latest.tar.gz
mv wordpress/* /var/www/html/
chown -R apache:apache /var/www/html/
```

Se gostou, curta o vídeo e compartilhe nas redes sociais.

Até o próximo!

<iframe allowfullscreen="" frameborder="0" height="281" loading="lazy" src="https://www.youtube.com/embed/mVnt_-YOoPE?feature=oembed" width="500"></iframe>
