---
slug: "docker-um-engine-linux-container"
title: 'Docker: Um linux container engine - Parte I/III'
date: '2014-03-28T13:09:20-04:00'
tags:
    - docker
    - linux
description: "No cenário de constantes mudanças em ambientes web sempre surgem novas técnicas e ferramentas surpreendentes. Manter-se atualizado com todas as novidades"
---

No cenário de constantes mudanças em ambientes web sempre surgem novas técnicas e ferramentas surpreendentes. Manter-se atualizado com todas as novidades que surgem diariamente é um grande desafio, mas bastante emocionante.

No meu trabalho, eu sou confrontado diariamente com diversas ferramentas novas interessantes, e preciso seguir o fluxo me mantendo alinhado com tudo que surge. Ultimamente o Docker é o novo buzz do mundo web. Todo mundo está falando sobre ele.

O Docker é em essência, um produto que poderia tornar a vida de um sysadmin muito mais fácil. Foi desenvolvido pela dotCloud (que agora se chama Docker) e está recebendo um monte de elogios , artigos, e centenas de projetos no Github hoje estão sendo baseados no Docker.

### O que é o Docker?

Para entender melhor o que é o Docker, você precisa conhecer um pouco sobre como webapps ou sites normalmente são “deployados”. Os passos básicos para realizar o deploy de um webapp ou site são os seguintes:

1. O desenvolvedor cria uma aplicação ou site com um número de versão (versão 1.0 por exemplo) e os pacotes desta aplicação em um set (conjunto) de arquivos;
2. Um sysadmin pega estes arquivos e publica em um servidor com um serviço web (Apache, Nginx) e um banco de dados (o banco de dados algumas vezes pode estar em um servidor separado do servidor web);
3. O sysadmin configura a aplicação para que ela possa ser disponibilizada pelo servidor web e configura a aplicação para que ela possa conversar com o banco de dados;
4. O usuário pode então acessar a aplicação através do seu browser e ver o site/aplicação.

De modo geral, estas são as etapas envolvidas para disponibilizar uma aplicação na internet. Existem algumas grandes desvantagens no processo descrito acima. Embora pareça ser algo fácil e simples, muitas vezes não é. Entre a criação de um servidor web, banco de dados, etc, há muito tempo perdido na implementação e configuração destes serviços.

Além do fator tempo na criação e configuração de tudo isto, imagina o que acontece se o servidor apresenta alguma falha e você não tem um ambiente redundante? Você precisa configurar um novo servidor, refazer todas as configurações, testar, validar, etc. É neste ponto que o Docker pode facilitar a sua vida.

O Docker pode ser descrito como um container em um navio. Cada docker-container é um container que no caso mencionado acima, pode conter um ou vários dos seguintes serviços:

- Um servidor web;
- Um banco de dados;
- Uma aplicação.

Como um Linux Container Engine, utiliza Linux Containers ([lxc](https://linuxcontainers.org/ "LXC")) ao invés de métodos de virtualização tradicionais. O lxc utiliza o mesmo kernel do servidor host, tornando tudo muito rápido.

Um container é um processo isolado através de namespaces + chroot. Por isso que fazer o “start” de um container é muito rápido (é tão rápido quanto iniciar um processo novo).

<div>O fato de usar o o mesmo kernel do host, dá um bom ganho de performance. Porém ao criar um container novo, consiste em criar um novo “chroot” o que exige muito i/o, podendo tornar o processo lento. Justamente neste ponto que está o grande lance do Docker. Ele é uma ferramenta para simplificar e dar mais poderes aos containers. Então ele traz o conceito de imagem, fazendo com que cada novo container seja um “diff” de outro container base.</div>Para facilitar o entendimento, pense em uma máquina virtual, porém menor, mais rápida e com tempo de startup/shutdown praticamente zero.

<span style="line-height: 1.5em;">A grande vantagem é que você pode criar seu container uma vez e movê-lo praticamente para qualquer tipo de servidor (seja ele virtual ou um hardware dedicado). No caso de uma falha, você simplesmente configura um servidor com o Docker instalado e insere seu container nele. Em questão de minutos, você tem tudo funcionando novamente.</span>

> Entrando em detalhes:
> 
> O Docker utiliza Linux Containers ([LXC](https://linuxcontainers.org/ "LXC")), que rodam no mesmo sistema operacional do servidor host. Isto permite o uso compartilhado de diversos recursos do sistema operacional host. Ele também utiliza [AuFS](http://aufs.sourceforge.net/ "AuFS") para o sistema de arquivos. Ele gerencia a rede para você também.
> 
> AuFS é um sistema de arquivos em camadas, então você pode ter uma parte destinada para leitura, outra parte para escrita, podendo ainda fazer um merge entre elas. Você ainda pode ter partes em comum do sistema operacional apenas para leitura, que podem ser compartilhadas entre todos os seus containers e em seguida dar a cada container seu próprio ponto de montagem de escrita.
> 
> Então vamos dizer que você tem uma imagem de container com tamanho de 1 GB. Se você quiser usar uma máquina virtual completa, você precisa ter 1GB vezes x número de VMs que você deseja. Com LXC e AuFS você pode compartilhar o volume de 1GB e se você tem 1000 containers você ainda pode ter apenas um pouco mais de 1 GB de espaço para o sistema operacional do container, assumindo que todos eles estão rodando a mesma imagem do sistema operacional.
> 
> Um sistema totalmente virtualizado recebe seu próprio conjunto de recursos alocados, e faz um compartilhamento mínimo de recursos. Você recebe um isolamento maior, mas é mais difícil (requer mais recursos).
> 
> Com LXC você pode ter menos isolamento, mas eles são mais leves e exigem menos recursos. Você poderia facilmente rodar 1000 containers em um host, e ele não vai nem sentir. Tente fazer isso com um Hypervisor qualquer, e a menos que você tenha um servidor (host) muito parrudo, seria impossível.
> 
> Um sistema completamente virtualizado, geralmente pode levar alguns minutos para inicializar, enquanto containers LXC leva segundos, sendo algumas vezes menos de um segundo.
> 
> Existem prós e contras em cada tipo de sistema de virtualização. Se você deseja total isolamento com recursos garantidos, então um sistema completamente virtualizado pode ser a melhor solução. Mas se você deseja apenas isolar processos entre sí e executar centenas deles em um servidor com um tamanho razoável, o LXC pode ser um caminho melhor à seguir
> 
> Para maiores informações sobre como LXC trabalha, acesse este link: <http://blog.dotcloud.com/under-the-hood-linux-kernels-on-dotcloud-part>
> 
> Fazer o deploy de um ambiente de produção consistente não é algo tão trivial de ser feito. Mesmo se você usar ferramentas como o chef ou puppet, sempre há atualizações do sistema operacional e outras coisas que variam entre hosts e ambientes.
> 
> O que o Docker faz é lhe dar a capacidade de criar um snapshot do sistema operacional em uma imagem, o que torna simples o deploy em outros hosts Docker. Em ambiente local, dev, qa, prod, etc, todos podem usar a mesma imagem. É claro que você pode fazer isso com outras ferramentas, mas não tão fácil ou rápido.

### Open Source

Por ser um projeto opensource, significa que qualquer pessoa no mundo pode olhar o código, contribuir e implementar melhorias. A comunidade do Docker é muito grande e existem centenas de desenvolvedores contribuindo para o projeto.

### Animado?

Se você está animado com o Docker e gostaria de aprender a usá-lo, visite o site: [http://docker.io](http://docker.io "Docker").

Existe uma vasta documentação, inclusive um tutorial interativo bastante interessante.

Aqui também tem uma excelente apresentação: <http://www.slideshare.net/jpetazzo/introduction-docker-linux-containers-lxc>

Mais alguns links:

– <https://www.youtube.com/watch?v=ZzQfxoMFH0U>  
– <http://dockerbook.com/>  
– <http://stefanteixeira.com.br/2015/03/17/comandos-essenciais-docker-monitoramento-containers/>

**UPDATE:** Novo post com um tutorial mão na massa sobre docker em: <http://www.ricardomartins.com.br/docker-tutorial-mao-na-massa/>
