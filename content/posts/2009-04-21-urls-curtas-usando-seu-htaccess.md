---
slug: "urls-curtas-usando-seu-htaccess"
title: 'Urls curtas usando seu .htaccess'
date: '2009-04-21T20:03:52-04:00'

tags:
    - aleatórios
---

Um problema com as chamadas “redes sociais” são as URL’s muito compridas. São difícies de lembrar e você acaba sendo obrigado a mandar te procurarem pelo nome – vide orkut, ou você envia o link por e-mail, messenger, etc.

Por exemplo, algumas das minhas URL’s são:

- <http://www.orkut.com.br/Main#Profile.aspx?uid=5075637778557459393>
- <http://flickr.com/photos/rmartins>
- <http://www.bloglines.com/public/rmmartins >

Uma forma fácil de resolver este problema, é utilizar [redirecionamentos](http://en.wikipedia.org/wiki/301_redirect)[ permanentes](http://en.wikipedia.org/wiki/301_redirect) que sejam fáceis de lembrar, utilizando o .htaccess

Pode ser feito da seguinte maneira:

redirect 301 /nomedoatalho destino

Por exemplo:

```bash
redirect 301 /orkut http://www.orkut.com.br/Main#Profile.aspx?uid=5075637778557459393
redirect 301 /bloglines http://www.bloglines.com/public/rmmartins
redirect 301 /delicious http://delicious.com/rmartins
redirect 301 /flickr http://flickr.com/photos/rmartins
redirect 301 /twitter http://twitter.com/ricardommartins
redirect 301 /linkedin http://www.linkedin.com/in/rmmartins
```

E o resultado:

- <http://ricardomartins.com.br/orkut>
- <http://ricardomartins.com.br/bloglines>
- <http://ricardomartins.com.br/delicious>
- <http://ricardomartins.com.br/flickr>
- <http://ricardomartins.com.br/twitter>
- <http://ricardomartins.com.br/linkedin>

É algo muito fácil de fazer, e ainda pode fazer uma grande diferença: Url’s curtas, fáceis de lembrar, e a possibilidade de promover meu site cada vez que revelo estes endereços à alguém.
