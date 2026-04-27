---
slug: "pimpmylog-uma-ferramenta-web-para-visualizacao-de-logs"
title: 'PimpMyLog: Uma ferramenta web para visualização de logs'
date: '2015-04-01T16:11:54-04:00'
tags:
    - monitoramento
    - ferramentas
description: "Encontrei nesta semana uma ferramenta interessante, o PimpMyLog. Encontrei por acaso no Github, procurando uma ferramenta simples para visualizar logs via"
---

Encontrei nesta semana uma ferramenta interessante, o [PimpMyLog](http://pimpmylog.com/). Encontrei por acaso no [Github](https://github.com/potsky/PimpMyLog), procurando uma ferramenta simples para visualizar logs via browser. Precisava de algo simples, objetivo e funcional.

Vou mostrar como funciona. A princípio, por padrão ele já detecta logs do PHP, IIS, Apache e Nginx e nada precisa ser configurado para isso. Se você precisar visualizar logs de sistemas específicos, pode customizar e implementar.

Supondo que você já tem um servidor web instalado e funcionando, vamos lá. Lembrando que ele é feito em PHP, então você precisa estar com suporte ao PHP habilitado e funcionando. No meu caso, tenho um Nginx instalado e rodando a configuração padrão, como você pode visualizar aqui:

[![1](/wp-content/uploads/2015/04/1.png)](/wp-content/uploads/2015/04/1.png)

Ele está servindo arquivos contidos em /usr/share/nginx/html. Veja:

[![terminal](/wp-content/uploads/2015/04/terminal.png)](/wp-content/uploads/2015/04/terminal.png)

Como pode ser visto, acessei o diretório /usr/share/nginx/html, fiz um clone do repositório no Github. Uma vez feito isso, bastou acessar via brower: http://endereco.do.servidor/PimpMyLog:

[![2](/wp-content/uploads/2015/04/2.png)](/wp-content/uploads/2015/04/2.png)

Então clicamos em “Configure Now” e vamos à tela seguinte, onde será solicitada a criação de um usuário/senha:

[![3](/wp-content/uploads/2015/04/3.png)](/wp-content/uploads/2015/04/3.png)

E ele pede que seja dada permissão 777 no diretório para que ele consiga criar o arquivo config.auth.user.php, e por isso você notou este comando em uma das telas anteriores:

[![4](/wp-content/uploads/2015/04/4.png)](/wp-content/uploads/2015/04/4.png)

Depois de acertar as permissões, voltamos a tela de criação:

[![5](/wp-content/uploads/2015/04/5.png)](/wp-content/uploads/2015/04/5.png)

Então conseguimos definir um nome e senha:

[![6](/wp-content/uploads/2015/04/6.png)](/wp-content/uploads/2015/04/6.png)

Na tela seguinte, vamos informar qual log gostaríamos que ele procure, no meu caso, do Nginx:

[![7](/wp-content/uploads/2015/04/7.png)](/wp-content/uploads/2015/04/7.png)

E então ele encontrou os logs no diretório padrão (/var/log/nginx). Nos dá ainda a possibilidade de informar o path de outros logs customizados do Nginx:

[![8](/wp-content/uploads/2015/04/8.png)](/wp-content/uploads/2015/04/8.png)

Feito isso, configuração finalizada:

[![9](/wp-content/uploads/2015/04/9.png)](/wp-content/uploads/2015/04/9.png)

Vamos clicar agora em “Pimp my logs now!” e vamos para a proxima tela onde informamos o usuário e senha criados:

[![10](/wp-content/uploads/2015/04/10.png)](/wp-content/uploads/2015/04/10.png)

Depois do login, vejamos a interface da ferramenta:

[![11](/wp-content/uploads/2015/04/11.png)](/wp-content/uploads/2015/04/11.png)

Note onde alterar para o outro arquivo de log:

[![12](/wp-content/uploads/2015/04/12.png)](/wp-content/uploads/2015/04/12.png)

É possível fazer diversas configurações, como habilitar notificação no desktop para novas mensagens, configurar um tempo de refresh automático na tela, adicionar usuários, escolher os campos à serem exibidos, etc. Você pode fazer uma demonstração de uso no próprio site deles, em: <http://demo.pimpmylog.com/>

Enfim, uma ótima ferramenta, que atende muito bem ao que se propõe fazer.
