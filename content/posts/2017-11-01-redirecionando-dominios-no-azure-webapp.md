---
slug: "redirecionando-dominios-no-azure-webapp"
title: 'Redirecionando domínios no Azure WebApp'
date: '2017-11-01T16:07:26-04:00'
tags:
    - azure
    - webapps
---

Dica rápida para você que trabalha com Azure WebApps e já precisou trabalhar com redirecionamentos. O Azure WebApp pode ser configurado em um service plan Windows ou Linux.

> Saiba mais sobre o Azure Service Plan nos links abaixo:
> 
> <https://azure.microsoft.com/en-us/pricing/details/app-service/plans>
> 
> <https://docs.microsoft.com/en-us/azure/app-service/azure-web-sites-web-hosting-plans-in-depth-overview>

Em cada um dos casos a forma de configurar redirecionamentos é diferente. Para WebApps rodando em Service Plan Windows, que é baseado no IIS você precisa editar o arquivo **web.config** e em WebApps rodando em Service Plan Linux, baseado no Apache, você precisa editar o arquivo **.htaccess**.

Neste exemplo simples, vou mostrar como você faz para fazer um [redirecionamento permanente (301)](https://pt.wikipedia.org/wiki/HTTP_301) para uma página do facebook por exemplo.

Ao criar o WebApp em ambos os casos (Windows/Linux) ele vai ganhar um endereço no Azure que seria http://ricardolab.azurewebsites.net. Inicialmente é este endereço que vamos redirecionar para uma página no Facebook fictícia, por exemplo, http://www.facebook.com/RicardoLab.

### Service Plan Windows

Configurar o arquivo web.config conforme abaixo:

```bash
<configuration>
<system.webServer>
<httpRedirect enabled="true" destination="https://www.facebook.com/RicardoLab/" httpResponseStatus="Permanent"/>
</system.webServer>
</configuration>
```

### Service Plan Linux

Configurar o arquivo .htaccess conforme abaixo:

```bash
Options +FollowSymLinks
RewriteEngine on
RewriteRule (.*) https://www.facebook.com/RicardoLab/ [R=301,L]
```

Pronto, agora quando acessarem http://ricardolab.azurewebsites.net será redirecionado para a página http://www.facebook.com/RicardoLab

Se quiser trabalhar com domínios customizados não teria problema, funciona da mesma forma.Vamos ver abaixo como usar.

### Como criar um domínio customizado

A primeira coisa a se fazer é configurar o domínio customizado para ele responder por ricardolab.com.br. Para fazer isso você deve ajustar seu DNS que pode ser o [Azure DNS ](https://docs.microsoft.com/pt-br/azure/dns/dns-overview)ou outro qualquer que esteja usando.

Primeiro é preciso associar o domínio ricardolab.com.br com ricardolab.azurewebsites.net. Para isso crie um registro do tipo A apontando para o IP público do seu Service Plan e também um registro do tipo TXT apontando para ricardolab.azurewebsites.net.

Em seguida é preciso associar o subdominio www.ricardolab.com.br apontando para ricardolab.azurewebsites.net Para isso crie um registro do tipo CNAME apontando www.ricardolab.com.br para ricardolab.azurewebsites.net

Após criar estes registros no seu DNS você irá conseguir adicionar ricardolab.com.br e www.ricardolab.com.br como domínios customizados para o WebApp. Assim, quando alguém acessar estes endereços irá cair no conteúdo de ricardolab.azurewebsites.net.

Para mais detalhes sobre domínios customizados em WebApps, você pode dar uma olhada na documentação oficial: [https://docs.microsoft.com/en-us/azure/app-service/app-service-web-tutorial-custom-domain ](https://docs.microsoft.com/en-us/azure/app-service/app-service-web-tutorial-custom-domain)
