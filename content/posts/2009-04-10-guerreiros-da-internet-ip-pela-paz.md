---
slug: "guerreiros-da-internet-ip-pela-paz"
aliases:
  - "/posts/guerreiros-da-internet-ip-pela-paz/"
title: 'Guerreiros da Internet - IP pela Paz'
date: '2009-04-10T17:55:21-04:00'
tags:
    - networking
categories:
    - Networking
description: "Produzido por Tomas Stephanson e Monte Reid – ERICSSON Medialab Site oficial: Warriors of The Net"
---

<div class="snap_preview">Produzido por Tomas Stephanson e Monte Reid – ERICSSON Medialab

Site oficial: [Warriors of The Net](http://www.warriorsofthe.net/)

Idioma: **Inglês | Legendas em português**

Tempo: **12:49**

**Texto do vídeo**

Manuscrito escrito por Tomas Stephanson, Monte Reid, translation to portuguese by **Leonel Morgado**  
Fonte: <http://www.abusar.org/tcp-ip3.html>

Guerreiros da Internet

Pela primeira vez na História, as pessoas e as máquinas trabalham em conjunto, tornando um sonho realidade. Um força congregadora que não conhece fronteiras geográficas. Sem olhar à etnia, religião ou raça. Uma nova era, onde a comunicação verdadeiramente une as pessoas.

Esta é a alvorada da Internet.

Quer saber como tudo funciona? Clique aqui para iniciar a viagem pela Internet.

Ora bem, o que é que realmente aconteceu quando clicou nessa ligação? Despoletou um fluxo de informação. As informações deste fluxo dirigem-se para a sua sala pessoal de correio, onde o Sr. IP as empacota, rotula e despacha. Hás limites ao tamanho de cada pacote. A sala de correio tem de decidir como processar as informações e empacotá-las.

A seguir, é preciso rotular o pacote IP, com informações importantes, tais como o endereço do remetente, o endereço do destinatário e de que tipo de pacote se trata. Como o pacote em causa se destina a ir para a Internet, também recebe o endereço do servidor proxy, que desempenha uma função muito especial, como veremos mais à frente.

O pacote é então lançado para a rede local. Esta rede é utilizada para ligar todos os computadores, routers, impressoras e outros equipamentos locais, situados dentro das paredes reais de um único edifício. A rede local é um sítio relativamente anárquico, onde infelizmente podem ocorrer acidentes.

A auto-estrada da rede local está apinhada com todo o tipo de informações: há pacotes IP, pacotes Novell, pacotes Apple Talk – âhm… que vão em contramão, como é costume. O router local lê os endereços dos pacotes e, se for necessário, recolhe os pacotes, lançando-os noutra rede.

Ah é verdade, o router. Um símbolo de controlo num mundo aparentemente desorganizado. Ele ali está..sistemático, insensível, metódico, conservador e, por vezes, não muito rápido. Mas é de grande precisão… geralmente.

Os pacotes que saiem do router embrenham-se na intranet da empresa, direitos ao switch de routers. Este é um bocadinho mais eficiente do que os routers, despachando despreocupadamente e depressa os pacotes IP, encaminhando-os habilmente em direcção ao destino. É, mais ou menos, uma espécie de craque digital dos flippers.

Conforme os pacotes vão chegado aos respectivos destinos, são apanhados pela interface de rede, que está preparada para os despachar para o nível seguinte. Neste caso, o proxy. O proxy é utilizado por muitas empresas como “intermediário”, para aliviar a carga da ligação à Internet. E também por questões de segurança. Podemos ver que os pacotes têm tamanhos diferentes, conforme o conteúdo de cada um.

O proxy abre o pacote e procura o endereço Web (conhecido por URL). Se o endereço for aceitável, o pacote é enviado para a Internet. No entanto, há alguns endereços que não obtêm a aprovação por parte do proxy (que o mesmo é dizer, não cumprem as directivas empresariais ou administrativas). E estes são eliminados sumariamente, pois não queremos disso por cá. Quanto aos que conseguem passar, fazem-se de novo à estrada.

Logo a seguir… o corta-fogo (firewall). A firewall da empresa existe por dois motivos: evita que algumas coisinhas nojentas que andam pela Internet entrem na intranet; e também evita que as informações confidenciais da empresa sejam enviadas para a Internet.

Uma vez passada a firewall, um router recolhe o pacote e coloca-o numa estrada (ou largura de banda, como costumamos dizer) muito mais estreita. Obviamente, a estrada não é suficientemente larga para que possam caber todos os pacotes.

É capaz de estar a pensar: “O que é que acontece aos pacotes que não chegam ao fim do caminho?” Bem, quando o Sr. IP não recebe uma confirmação de recepção de um dado pacote em tempo útil, limita-se a enviar um pacote para o substituir.

Estamos agora prontos a entrar no mundo da Internet, uma teia de aranha de redes interligadas que se estende por todo o planeta. Aqui, os routers e switches estabelecem ligações entre redes.

Ora bem, a Internet é um ambiente completamente diferente do que encontramos dentro das muralhas da rede local. Aqui fora, é um faroeste. Muito espaço, muitas oportunidades, muito para explorar muito aonde ir. Graças à existência de muito poucos controlos e regras, as ideias novas encontram aqui solo fértil para ir mais além. Mas devido a esta liberdade, também alguns perigos se escondem. Nunca se sabe quando é que pode parecer o terrível ping mortal. É uma versão especial de um pedido normal de ping, criada por algum imbecil, que descontrola os anfitriões incautos.

Os percursos dos nossos pacotes podem ser através de satélites, linhas telefónicas, comunicação aérea ou até mesmo cabo transoceânico. Nem sempre tomam o caminho mais rápido nem o mais curto, mas provavelmente chegarão ao destino, mais cedo ou mais tarde. É talvez por isto que às vezes falamos na World Wide Wait (”espera à escala mundial”). Mas quando tudo funciona como deve ser, pode-se dar 5 vezes a volta ao mundo, no tempo de um piscar de olhos (literalmente). E isto ao preço de uma chamada local – ou até por menos.

Quase ao chegar ao nosso destino, encontramos outra firewall. Conforme o ponto de vista do pacote de dados, a firewall pode ser um bastião de segurança ou um adversário temível. Tudo depende do lado em que se está e das nossas intenções.

A firewall foi concebida para deixar entrar só os pacotes que cumprem os critérios que tem definidos. Este corta-fogo está a trabalhar nos portos 80 e 25. Todas as tentativas de entrada por outros portos dão com a cara na porta.

O porto 25 é utilizado para pacotes de correio; já o porto 80 é a entrada para os pacotes da Internet destinados ao servidor Web.

Dentro da firewall, os pacotes são analisados com mais cuidado: alguns passam sem dificuldades por esta “alfândega”, enquanto que outros já oferecem dúvidas. O polícia da firewall não é enganado de qualquer maneira: por exemplo, está atento a pacotes do ping mortal, quando estes se tentam disfarçar de pacotes do ping “normal”.

Para os pacotes que têm a sorte de aqui chegar, a viagem está quase a terminar. Basta alinharem-se junto à interface, para serem erguidos até ao servidor Web.

Hoje em dia, um servidor Web pode estar a funcionar em muitos tipos de máquinas. Desde um grande sistema central a um computador pessoal, passando pelas câmaras para a Web. E porque não num frigorífico? Com a configuração adequada, pode-se descobrir se há ingredientes que cheguem para um Bacalhau à Brás, ou se é preciso ir às compras. Lembrem-se que estamos na alvorada da Internet: praticamente tudo é possível.

Um a um, os pacotes são recebidos, abertos e desempacotados. As informações que continham, que constituiem o nosso pedido de informações, é enviada para aplicação do servidor Web. Quanto ao pacote, este é reciclado, ficando pronto para nova utilização, após preenchido com as informações que solicitámos. É então endereçado e é-nos enviado.

Já de regresso, após passar pelas firewalls, routers e pela Internet. Passa novamente pela nossa firewall na empresa, bem como pela interface.

Está pronto a fornecer ao navegador da Web as informações solicitadas.

E é isto o filme.

Satisfeitos com o esforço que aplicaram, e cheios de confiança num mundo melhor, os nossos fiéis pacotes de dados cavalgam alegremente em direcção a mais um pôr do Sol, com a certeza de terem servido bem a seus amos.

E então, isto é ou não é um final feliz?

</div>
