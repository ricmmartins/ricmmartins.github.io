---
slug: "nginx-configurando-como-load-balancer"
title: 'Nginx: Configurando como load balancer'
date: '2015-02-20T20:47:20-05:00'
tags:
    - nginx
description: "Hoje vou mostrar um recurso interessante do Nginx para balanceamento de carga. O Nginx possui suporte para três mecanismos de balanceamento de carga:"
---

Hoje vou mostrar um recurso interessante do Nginx para balanceamento de carga. O Nginx possui suporte para três mecanismos de balanceamento de carga:

– round-robin: As requisições são distribuidas no modelo round-robin onde a distribuição é feita de forma circular entre os parcicipantes do conjunto. Ou seja, se tivermos dois componentes, funciona assim: 1 – 2 – 1 – 2… Se tivermos três, temos o seguinte funcionamento: 1 – 2 – 3 – 1 – 2 – 3… O round-robin é o modelo padrão de funcionamento;

– least-connected: A próxima requisição é direcionada para o componente com o menor número de conexões ativas;

– ip-hash: Usado para distribuir as requisições entre os componentes de baseado no endereço IP do cliente que origina a requisição.

Eu não vou entrar em configurações mais complexas e caso esteja interessado em se aprofundar mais no assunto, e ver outras opções disponíveis como por exemplo atribuição de peso em servidores, slow start, persistência de sessão, limite de conexões, healthcheck e etc, visite: <http://nginx.com/resources/admin-guide/load-balancer/>

Um cenário real seria um servidor com o Nginx instalado servindo como loadbalancer, distribuindo a carga entre dois servidores web, como no exemplo abaixo:

[![lb](/wp-content/uploads/2015/02/lb.png)](/wp-content/uploads/2015/02/lb.png)

Como neste laboratório não temos dois servidores, cada um com seu respectivo endereço IP, vou direcionar as requisições feitas para loadbalancer.ricardomartins.com.br para dois outros sites via round-robin (no caso para distrowatch.com e br-linux.org) apenas para demonstrar o funcionamento.

Vou fazer assim pois não adiantaria criar outros dois hosts virtuais (server1.ricardomartins.com.br e server2.ricardomartins.com.br) na mesma máquina uma vez que o balanceamento não funcionaria por estarem sob o mesmo endereço IP do próprio loadbalancer.ricardomartins.com.br.

Em um cenário real, deveria apontar para outros dois servidores web com o mesmo conteúdo, para efetivamente distribuir a carga dois servidores que estejam servindo o mesmo site/conteúdo.

Abaixo a configuração do /etc/nginx/conf.d/loadbalancer.conf

```bash
server {  
  listen 80;  
  server_name loadbalancer.ricardomartins.com.br;  
  location / {  
  proxy_pass http://ricardo;  
  }   
}

upstream ricardo {  
  server br-linux.org;  
  server distrowatch.com;  
}  
```

Desta forma, quando chamar loadbalancer.ricardomartins.com.br, como estou usando a configuração padrão de round-robin, cada hora estarei sendo direcionado para um servidor, no nosso caso, para br-linux.org e distrowatch.com. Vejam o teste:

<iframe allow="autoplay; encrypted-media" allowfullscreen="" frameborder="0" height="281" loading="lazy" src="https://www.youtube.com/embed/uEyYDRWuWSg?feature=oembed" width="500"></iframe>

\* Caso queira saber como fazer balanceamento com o HAProxy, veja aqui: <http://www.ricardomartins.com.br/balanceamento-de-carga-com-haproxy/>
