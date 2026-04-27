---
slug: "coreos-o-que-e-e-como-funciona"
title: 'CoreOS: O que é e como funciona?'
date: '2015-05-05T19:05:52-04:00'
tags:
    - linux
description: "Em tempos de computação em nuvem, micro serviços e containers, o CoreOS é uma distribuição Linux que vem ganhando força. Neste post vou compartilhar um"
cover:
  image: "/og/coreos-o-que-e-e-como-funciona.png"
  alt: ""
  hidden: true
---

Em tempos de computação em nuvem, micro serviços e containers, o CoreOS é uma distribuição Linux que vem ganhando força. Neste post vou compartilhar um pouco do que tenho estudado e descoberto sobre ele com vocês.

O [CoreOS](https://coreos.com) é um sistema operacional Linux desenvolvido para ser tolerante à falhas, distribuído e fácil de escalar. Ele tem sido utilizado por times de operações e ambientes alinhados com a cultura DevOps.

A principal diferença do CoreOS para outras distribuições Linux minimalistas é o fato de ser desenvolvido para suportar nativamente o funcionamento em cluster, possuir poucos binários e não possuir um sistema de empacotamento (como apt-get ou yum). O sistema operacional consite apenas no Kernel e no systemd. Ele depende de containers para gerenciar a instalação de software e aplicações no sistema operacional, provendo um alto nível de abstração. Desta forma, um serviço e todas as suas dependências são empacotadas em um container e podem ser executadas em uma ou diversas máquinas com o CoreOS.

Atualmente o Docker é a ferramenta mais utilizada e indicada para trabalhar com Containers Linux no CoreOS.

> Se você quiser ler mais sobre Docker, faça uma visita nestes links:
> 
> <http://www.ricardomartins.com.br/docker-um-engine-linux-container/>  
> <http://www.ricardomartins.com.br/docker-tutorial-mao-na-massa/>  
> <http://www.ricardomartins.com.br/docker-criando-suas-proprias-imagens/>

O CoreOS já possui seu próprio runtime para containers, chamado **Rocket** (RKT – <https://github.com/coreos/rkt>). Neste link (<https://coreos.com/blog/rocket/>) existe uma explicação sobre os principais motivos para a construção do próprio container runtime pelo time de desenvolvimento do CoreOS.

Aqui também tem informações sobre o Docker x Rocket: <http://www.cloudtp.com/2015/05/08/docker-vs-coreos-a-container-battle-worth-waging/>

De modo geral, o RKT é um CLI para rodar containers de apps no Linux. É integrado com o systemd e com as ferramentas de orquestração de clusters do CoreOS (fleet, kubernetes) e totalmente compatível com outras ferramentas para containers linux, como por exemplo o Docker. Isso significa que o RKT pode executar imagens Docker.

Containers linux provêem benefícios similares à máquinas virtualizadas, mas com foco nas aplicações ao invés de hosts virtualizados. Como containers não executam seu próprio Kernel ou exigem um hypervisor, isso diminui a carga tornando-os muito performáticos. Desta forma, ganham densidade permitindo que menos recursos computacionais sejam necessários para execução.

A abordagem de uso também é diferenciada. Por exemplo, enquanto em uma outra distribuição Linux qualquer, para ter uma configuração LAMP rodando você teria que instalar as dependências (Apache ou Nginx, Mysql e PHP) na camada do sistema operacional, no CoreOS o que você precisa é criar uma estrutura de containers utilizando a sua ferramenta preferida (Docker por exemplo) contendo as dependências neles, para poderem ser utilizados por sua aplicação web.

## Funcionamento

Durante o boot, o CoreOS faz a leitura de um arquivo de configuração provido pelo usuário chamado “**cloud-config**” para executar configurações iniciais. Este arquivo possibilita que o CoreOS se conecte com outros membros do cluster, inicialize serviços essenciais e reconfigure parâmetros importantes. Esta é a forma como o CoreOS consegue fazer parte imediatamente de um cluster como um nó totalmente funcional desde sua criação.

Geralmente o que o arquivo “**cloud-config**” faz é informar para um host como se conectar à um cluster existente, realizar o boot e executar dois serviços chamados **etcd** e **fleet**. Estas três ações estão relacionadas e permitem que o novo host se conecte com os servidores existentes de modo a disponibilizar as ferramentas necessárias para configurar e gerenciar cada nó no cluster. Basicamente, estes são os requerimentos para realizar o bootstrap de uma instalação de um nó CoreOS em um cluster.

## Infraestrutura

O CoreOS utiliza o **etcd** (<https://coreos.com/etcd/>). Ele é um daemon que é executado em todos os servidores de um cluster provendo um registro de configuração dinâmico, permitindo que vários dados de configuração possam ser compartilhados de forma simples entre os membros do cluster.

Como os dados são armazenados no modelo chave-valor no **etcd**, eles são distribuídos e replicados automaticamente (com a eleição automática do servidor master). Todas as alterações nos dados armazenados são refletidas em todo o cluster.

O **etcd** também fornece um serviço de descoberta permitindo que aplicações “deployadas” anunciem entre os nós do cluster os serviços que elas disponibilizam.

A comunicação com o **etcd** é feita através de chamadas API, utilizando JSON sobre HTTP. A API pode ser usada diretamente (através de curl ou wget por exemplo), ou indiretamente através do **etcdctl**, que é um utilitário de linha de comando do CoreOS.

Como no CoreOS tudo está dentro de containers, ele possui o systemd para apenas duas funções: executar os containers Docker e permitir que os serviços sejam registrados no **etcd**. Você não utiliza o systemd para iniciar ou parar nenhum serviço por exemplo.

Overview geral da arquitetura do CoreOS:

[![coreos](/wp-content/uploads/2015/05/coreos.png)](/wp-content/uploads/2015/05/coreos.png)Para o gerenciamento de aplicações/serviços em um cluster CoreOS, existe o **Fleet** (<https://coreos.com/using-coreos/clustering>). Ele funciona como um sistema de inicialização “cluster-wide” que pode ser usado para orquestrar/gerenciar processos dentro de um cluster. Ele simplifica a configuração de aplicações em ambientes de alta disponibilidade assim como também o gerenciamento do cluster à partir de um único nó. Em outras palavras, seria como dizer que o **Fleet** funciona como uma interface para realizar o gerenciamento centralizado do systemd de cada nó do cluster.

Qualquer membro do cluster pode ser usado para gerenciar o cluster com a ferramenta **fleetctl**. Ela permite que você faça o agendamento de serviços, gerenciamento de nós e também permite verificar o estado geral dos seus sistemas.

Um outro recurso interessante do CoreOS é o que ele denomina como **FastPatch**. É um método de atualização atualmente muito comum para atualização de hardware e firmware em dispositivos como iPhones, roteadores de internet, etc. De modo geral ele possui duas partições no HD onde as atualizações são automaticamente baixadas para o sistema operacional na partição standby e caso a atualização venha a apresentar alguma falha, a outra partição continua funcionando sem problemas.

Ou seja, ao invés de atualizar pacotes de formas separadas, um por vez, o CoreOS faz o download do sistema de arquivos root todo de uma vez e instala na partição standby. Se nenhum problema for detectado, no próximo reboot o CoreOS vai bootar e passar a rodar a última versão. Mais detalhes você encontra aqui: <https://coreos.com/using-coreos/updates/>

Detalhes da arquitetura de funcionamento do **etcd** e do **fleet**:

[![CoreOS_Architecture_Diagram](/wp-content/uploads/2015/05/CoreOS_Architecture_Diagram-1024x786.png)](/wp-content/uploads/2015/05/CoreOS_Architecture_Diagram.png)Para a parte de rede, o CoreOS possui mais dois recursos interessantes. O **SkyDNS** e o **Flannel**.

O **SkyDNS** (<https://github.com/skynetservices/skydns>) usa o etcd como backend de storage de dados para a criação de um sistema DNS distribuído, permitindo que você implemente a resolução de DNS interno em um sistema distribuído baseado em containers de forma simples.

O **Flannel** (<https://github.com/coreos/flannel>) usa o etcd para armazenar os mapeamentos entre ips virtuais e endereços de host. Um dameon chamado flanneld é executado em cada host e é responsavel por verificar informações no etcd e rotear os pacotes.

Para um melhor entendimento, vamos tomar como exemplo o uso do Docker. No Docker cada container roda em uma porta e recebe um endereço IP que pode ser usado para se comunicar com outros containers no **mesmo host**.

No entanto para se comunicar pela rede com containers rodando em **outros hosts** (sabendo-se que os containters estão vinculados ao endereço ip do host), eles precisam fazer o mapeamento de portas para conseguir falar com um outro container em outro host.

Isto torna difícil para as aplicações em execução dentro dos containers anunciarem seus IPs externos e portas, já que estas informações não estão disponíveis para elas.

O **Flannel** resolve este problema fornecendo um IP para cada container, podendo ser usado na comunicação entre containers em diferentes hosts. Ele usa o encapsulamento de pacotes para criar uma rede virtual sobreposta que se estende por todo o cluster. Mais especificamente, o **Flannel** concede à cada host uma subrede IP (/24 por padrão) à partir da qual o daemon do Docker é capaz de alocar IPs para os containers individualmente.

[![Magic_meme](/wp-content/uploads/2015/05/Magic_meme.gif)](/wp-content/uploads/2015/05/Magic_meme.gif)

Em resumo, assim como o Docker, o CoreOS é mais uma ferramenta que está revolucionando os modelos tradicionais de infraestrutura de servidores, serviços e aplicações web.

Empresas como Red Hat, Canonical e Suse, podem vê-lo como um “problema em potencial” e vou explicar o motivo.

Algumas empresas que atuam no desenvolvimento de sistemas Linux, como a Red Hat em particular, construíram seus negócios procurando atender profissionais de operações/infraestrutura, não desenvolvedores.

Historicamente, sempre houve aquela grande separação entre times de desenvolvimento e operações, onde times de operações eram responsáveis pela infraestrutura dos servidores e times de desenvolvimento pelas aplicações que são executadas nestes servidores.

Assim, esta estratégia sempre funcionou muito bem, enquanto times de operações estavam no controle da infraestrutura dos servidores/serviços.

A questão é que hoje com o crescimento da cultura DevOps, a tendência é que cada vez menos existam barreiras impondo limites de atuação entre times de infraestrutura e desenvolvimento, fazendo com que cada vez estejam mais alinhados trabalhando em conjunto, cooperativamente.

Hoje podemos dizer que por exemplo, o RedHat Enterprise Linux é o que você tem quando questiona à times de operações o que eles esperam de um sistema operacional.

Em contrapartida, o Ubuntu é o que você tem quando questiona à times de operações o que eles pensam que times de desenvolvimento esperam de um sistema operacional.

Já o CoreOS é o que você tem quando questiona à times de desenvolvimento o que eles esperam em um sistema operacional.

Isto porque o CoreOS é o primeiro sistema operacional a surgir nativamente voltado para computação em nuvem. Ele é leve, pronto para uso e tenta incorporar práticas DevOps em sua arquitetura.

O RHEL por exemplo, está sempre ganhando mercado e posições adicionando novos recursos, novas funcionalidades, novos diferenciais, novos binários e novos pacotes. É o seu modelo de negócio.

Em contra-partida o CoreOS ganha mercado e valor, removendo coisas, se tornando leve, simples, altamente funcional e performático. Ele ganha mais valor, oferecendo menos, lhe dando a opção de fazer mais com menos. É como uma analogia bastante utilizada entre animais de estimação e gados, que você pode ler [aqui](http://www.theregister.co.uk/2013/03/18/servers_pets_or_cattle_cern) originalmente em diversos [outros lugares](https://www.google.com.br/search?q=pets+or+cattle).

A rápida adoção do CoreOS por times de desenvolvimento em todo o mundo indica que eles estão super satisfeitos com um Linux que inclui “nada” por padrão, o que diminui o valor de distribuições “tradicionais” fornecidas por empresas como a RedHat, Canonical ou Suse.

A questão é que se times de operações seguirem o exemplo aderindo à este modelo, você percebe que podemos estar falando de algo como “Linux as a Service”?

Este é um importante ponto de partida sobre como distribuições linux tradicionais funcionam, conforme Alex Polvi (CoreOS co-founder e CEO) [postou no Twitter](https://twitter.com/polvi/status/519666594692079616):

> “No RHEL, \[as atualizações\] estão automaticamente disponíveis, no CoreOS elas são automaticamente aplicadas”

Diante de tudo isso, a RedHat não está disposta a ser prejudicada pelo CoreOS e para combater este “risco em potencial”, lançou o Project Atomic – <http://www.projectatomic.io>

De acordo com o próprio site, o Project Atomic é um sistema operacional minimalista desenvolvido para rodar containers Docker, desenvolvido à partir do CentOS, Fedora e alguns pacotes do RHEL. Fornece todos os benefícios de uma distribuição baseada nestas distribuições, além da capacidade de realizar upgrades e downgrades atômicos provendo o melhor dos dois mundos: um modelo de atualizações moderno à partir de distribuições linux que você conhece e confia.

Com tudo isso, agora os olhares das grandes empresas do mundo Linux estão com os olhos voltados para os desenvolvedores também, e não mais apenas para os times de operações/infraestrutura.

O Project Atomic e outros similares mostram que as empresas estão começando a pensar fora da caixa, e dentro de containers Docker.

Um review interessante comparando o CoreOS com o Project Atomic está disponível em <https://major.io/2014/05/13/coreos-vs-project-atomic-a-review>

Em um próximo post, eu vou mostrar a instalação do CoreOS. Até lá!

Maiores informações:

<https://coreos.com/>  
<https://coreos.com/community/all/>  
<http://krenel.org/coreOS.html>  
<http://en.wikipedia.org/wiki/CoreOS>  
<https://www.digitalocean.com/community/tutorials/an-introduction-to-coreos-system-components>  
<http://pt.slideshare.net/romefort1/coreos-introduction-johann-romefort>  
<http://pt.slideshare.net/lorispack/using-coreos-flannel-for-docker-networking>  
<https://coreos.com/docs/cluster-management/setup/flannel-config/>  
<http://pt.slideshare.net/teemow1/coreos-intro>
