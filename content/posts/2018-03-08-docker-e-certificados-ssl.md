---
slug: "docker-e-certificados-ssl"
title: 'Docker e certificados SSL'
description: "Como habilitar SSL para aplicações Docker de forma rápida: proxy reverso Nginx com certificado. Dica prática e direta."
date: '2018-03-08T15:52:01-05:00'
categories:
  - DevOps
tags:
    - docker
    - linux
    - nginx
    - ssl
---

Este é um post rápido apenas para compartilhar uma forma de habilitar o uso de SSL para uma aplicação que esteja rodando em um container Docker.

Digamos que você tem uma aplicação docker exposta na porta 80 do seu servidor e precisa habilitar SSL para ela. Existem algumas maneiras de fazer isso, inclusive eu estive dando uma olhada nas opções abaixo:

- <https://github.com/SteveLTN/https-portal>
- <https://github.com/MarvAmBass/docker-nginx-ssl-secure>

São opções bastante interessantes, mas eu estava em busca de algo mais rápido para implementar. Então aqui vai a dica.

## Obter um SSL

Nesse caso as opções eram:

1. Comprar um certificado;
2. Usar Let’s Encrypt;
3. Usar CloudFlare.

Logo de cara a primeira opção já deixa de ser uma opção 😀

O [Let’s Encrypt](https://letsencrypt.org/) é uma excelente opção, mas acho chato ter que ficar renovando a cada 3 meses. Existem scripts pra automatizar isso eu sei, mas é mais uma variável no meio de tudo isso.

Então para isso eu usei o CloudFlare. Eles possuem um Free Universal SSL, que você pode usar gratuitamente. Dá uma olhada em: [https://support.cloudflare.com/hc/en-us/articles/200170516-How-do-I-add-SSL-to-my-site- ](https://support.cloudflare.com/hc/en-us/articles/200170516-How-do-I-add-SSL-to-my-site-)

De quebra ainda dá pra habilitar a CDN deles e ganhar proteção extra gratuitamente também. 😀

Uma vez que você já fez o cadastro no CloudFlare, habilitou seu DNS neles e finalizou essa parte, você pode baixar o arquivo key e o crt. Feito isso vamos lá.

## Configurando o Nginx

Neste caso eu optei por usar o Nginx fazendo proxy\_pass para o Docker. A única alteração no Docker foi a porta onde a aplicação estava exposta, uma vez que estava na 80 e agora defini que fosse exposta na porta 8080. Abaixo os comandos para instalação e configuração do Nginx no Ubuntu:

Instalando os pacotes:

```bash
sudo apt-get install nginx
sudo systemctl enable nginx
```

Criando o arquivo de configuração:

```bash
vim  /etc/nginx/sites-available/demoapp
```

Definindo as configurações:

Note que coloquei o Nginx escutando na porta 80, respondendo pelo nome [demoapp.azurelab.com.br](http://demoapp.azurelab.com.br). Todas as requests que chegarem na porta 80, são automaticamente redirecionadas para a porta 443. Mais ao fim, configuro o proxy\_pass de modo que ele repasse as conexões para http://localhost:8080, que é a porta onde está rodando a aplicação Docker.

```bash
server {
    listen 80;
    server_name demoapp.azurelab.com.br;
    return 301 https://$server_name$request_uri;
}
 
server {
    listen 443;
    server_name demoapp.azurelab.com.br;

    ssl_certificate           /etc/nginx/cert.crt;
    ssl_certificate_key       /etc/nginx/cert.key;

    ssl on;
    ssl_session_cache  builtin:1000  shared:SSL:10m;
    ssl_protocols  TLSv1 TLSv1.1 TLSv1.2;
    ssl_ciphers HIGH:!aNULL:!eNULL:!EXPORT:!CAMELLIA:!DES:!MD5:!PSK:!RC4;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://localhost:8080;
        proxy_read_timeout  90;
        proxy_redirect      http://localhost:8080 https://demoapp.azurelab.com.br;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Finalizando os ajustes, criando o link para os sites habilitados e removendo a configuração default:

```bash
ln -s /etc/nginx/sites-available/demoapp /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
```

Fazendo restart do serviço:

```bash
sudo systemctl restart nginx
```
Pronto, agora temos as requisições sendo redirecionadas para HTTPS e fazendo o proxy\_pass para a porta 8080 onde está exposta a aplicação Docker.

Até a próxima!
