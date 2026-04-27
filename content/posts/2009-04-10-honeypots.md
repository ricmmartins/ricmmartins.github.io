---
slug: "honeypots"
title: Honeypots
date: '2009-04-10T17:45:49-04:00'
tags:
    - segurança
description: "Autor: Pedro Augusto de O. Pereira / Introdução aos honeypots"
---

Autor: Pedro Augusto de O. Pereira / <http://augusto.pedro.googlepages.com/>

**Introdução aos honeypots**  
Honeypots são uma forma barata e simples de detectar atividades ilícitas na sua rede. Sua principal função é ser atacado (por pessoas, por vírus, por worms, etc), scaneado ou invadido para assim adquirir informações para que você consiga se proteger de forma mais eficiente conhecendo como seus hosts podem ser atacados. O conceito é simples: um honeypot não tem nenhum propósito de produção (não tem nenhum serviço real, não deve receber nenhuma conexão, ninguém deve interagir com ele), portanto qualquer interação com um honeypot é possivelmente uma atividade ilícita (proposital ou não). Por esse motivo, os honeypots tem um baixo número de falso-positivo e geram pouco log, facilitando a leitura e fazendo com que o administrador detecte ataques com mais facilidade.

  
Com ele você consegue agir pró-ativamente em relação à segurança. Tenha em mente que honeypots não vão consertar os problemas de segurança da sua rede e têm pouco valor se usados sozinhos (num ambiente ideal, eles são usados com ferramentas como NIDS). Eles são uma ferramenta para que você consiga capturar informações sobre potenciais problemas de segurança e tomar providências antes que eles se tornem problemas maiores. Veja bem: quem vai consertar os problemas identificados é você e não o software de honeypot.  
É um conceito relativamente novo, tendo como um de seus maiores estudiosos Lance Spitzner.  
Os honeypots podem ser divididos em 2 tipos: os de produção e os de pesquisa.

**Honeypots de produção**  
O papel de um honeypot de produção é ajudar a mitigar prejuízos causados por falhas de segurança em uma organização, adicionando valor à solução de segurança. Seu papel é detectar atividades maliciosas e avisar o administrador de redes sobre isso (e não impedir que atacantes não cheguem à sua rede). Geralmente são honeypots de baixa interatividade, ou seja, o atacante não consegue “invadir” o honeypot pois o software não deixa, o que ele faz é emular um serviço ou shell (por exemplo, ele pode emular uma máquina Windows XP e sofrer ataques de vírus e worms destinados à esse sistema, mostrando outras máquinas infectadas na sua rede), e obter informações um pouco limitadas sobre os dados trocados e um pouquinho da interação do atacante com o host. Consegue também guardar informações sobre este ataque e sua origem (informações extremamente úteis). Geralmente são posicionados dentro da rede interna da empresa.  
Eles funcionam emulando vários serviços para enganar o atacante enquanto loga em arquivos as informações que consegue capturar, fornecendo uma visão do que está acontecendo. Com ele você facilmente consegue pegar um micro infectado por um vírus, um usuário malicioso, etc.  
Lembre-se sempre: qualquer interação com um honeypot é uma interação não-autorizada (ninguém deve saber que existe o honeypot e ninguém tem motivos para tentar estabelecer uma conexão com um), portanto é possivelmente uma interação maliciosa (gerada por um humano ou por um micro infectado por um vírus ou worm).

**Honeypots de pesquisa**  
Honeypots de pesquisa são geralmente de alta-interatividade, ou seja, ela é uma máquina mal configurada que possui várias ferramentas para monitoração (como keyloggers) que verifica o que o atacante fez para conseguir invadir e o que fez depois que conseguiu o acesso. Nela o atacante interage com o Sistema Operacional da máquina e não com um software que emula shells e sistemas. Geralmente se usa um servidor de logs com este tipo pois não se pode confiar nos logs presentes no host já que o atacante pode alterá-los.  
Este tipo de honeypot consegue captar mais informações (como dados trocados, consegue identificar novas ferramentas e capturar o que foi digitado pelo atacante), porém aumenta sifgnificativamente o risco da rede. Por isso geralmente não é colocado dentro de uma rede empresarial: é utilizado somente em institutos de pesquisa em redes que são monitoradas o tempo todo para que não sejam lançados ataques à partir deste host, entre outras ameaças. Essas soluções são bem complexas de serem implementadas exigindo bastante experiência do analista, porém capturam muito mais informações que os honeypots de produção.

As duas soluções expostas acima vão te ajudar a melhorar a segurança da sua rede. Você deve escolher qual usar se baseando no que você quer monitorar e descobrir sobre seu atacante. Leve também em consideração os ponteciais riscos aos quais você está expondo a sua rede.

**Vantagens dos honeypots**  
Os honeypots trazem grandes vantagens, abaixo exponho algumas delas:

- Poucos dados são capturados, porém são dados muito importantes: Os honeypots, ao contrário de várias outras ferramentas, capturam pouquíssimos dados. Porém os dados capturados são muito importantes para o administrador de sistemas. Ao invés de capturar Gigabytes de dados (sendo que a grande parte é inútil) o honeypot vai capturar apenas alguns Megabytes de informações extremamente importantes, também não são gerados milhares de alertas por dia (assim diminui a ocorrência de falso-positivo aumentando a credibilidade da ferramenta. Lembra da história do menino que sempre enganava os outros gritando “Socorro! Socorro!”??). Além disso, gerando poucos dados, é mais provável que o administrador cheque esses dados mais frequentemente (vai me dizer que você nunca ficou com preguiça de ler os logs infinitos que são gerados por algumas ferramentas?), aumentando as chances de identificar um ataque rapidamente. Além disso, por analisar poucos dados, não perde pacotes importantes para a análise como uma ferramenta de IDS perderia se começassem a chegar muitos pacotes da rede em um determinado momento.
- Descobertas de novas ferramentas e de novas táticas: Utilizando os honeypots você consegue ver como o atacante agiu, que ferramentas usou e como se proteger delas. Se as ferramentas (ou exploits) usados para invadir o seu honeypot nunca foram usadas antes (conhecidas como 0 day), você conseguirá descobrir e em pouco tempo já conseguirá se proteger delas, ficando vulnerável por menos tempo.
- Uso mínimo de recursos: Os honeypots são extremamente econômicos nos requisitos mínimos para sua execução. Como só analisam o tráfego direcionado a eles, usam pouquíssima banda da sua rede e como são softwares bem leves, exigem o mínimo do hardware, fazendo com que aquela sua máquina PII com 64MB de RAM consiga monitorar uma rede com um desempenho razoavelmente bom.
- Dados criptografados: Ao contrário de outras ferramentas, os honeypots conseguem trabalhar com os dados criptografados que são direcionados à ele.
- Simplicidade: Honeypots são extremamente simples: sem algoritmos complexos, sem tabelas de informações para manter, etc. Sendo tão simples assim, é bem menos provável que alguém cometa um erro ao implantá-las em suas redes.

**Desvantagens dos honeypots**  
Todas as ferramentas tem desvantagens, por isso honeypots não trabalham sozinhos: eles complementam outras ferramentas.

- “Alcance” limitado: Honeypots só conseguem analisar os dados que são direcionados à eles. Se nenhum pacote chegar para ele analisar, não será gerado nenhum dado e não se terá o que analisar para melhorar a segurança da sua rede. Para mitigar este problema, se usam ferramentas que monitoram a rede como um NIDS (um exemplo deste tipo de software seria o Snort).
- Risco: Todo software adiciona riscos à rede. Os honeypots não são diferentes de nenhum outro software. O seu honeypot, por exemplo, corre o risco de ser invadido por alguém (dependendo do nível de interação, como dito anteriormente) e, à partir dele, lançar ataques a outros hosts ou até redes.

**O projeto “Brazilian Honeypots Alliance”**  
O Brasil tem um projeto muito bom relacionado aos Honeypots, é o Brazilian Honeypots Alliance. Este projeto é formado por estudiosos de segurança de institutos como o INPe. O objetivo é formar uma grande honeynet no espaço de endereços do Brasil para analisar e divulgar resultados coletados por honeypots espalhados pelo país.  
Neste projeto são utilizados honeypots de baixa interatividade. Você pode conhecer mais sobre este projeto acessando a URL [http://www.honeynet.org.br](http://www.honeynet.org.br/).

**Conclusão**  
Honeypots são uma ferramenta extremamente útil para auxiliar na melhoria da segurança da sua rede ou para aprender novos recursos e ataques utilizados por seus inimigos. O principal objetivo deste texto foi te dar uma visão bem básica e sem muitos detalhes da teoria de honeypots. Muitos textos com sugestões de softwares para usar, análises mais profundas de softwares, entre outros, podem ser encontrados aos montes na Internet (geralmente em inglês). Qualquer dúvida, entre em contato comigo!
