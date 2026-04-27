---
slug: "sniffer-spoofing-ataques-monitorados"
title: 'Sniffer Spoofing: Ataques Monitorados'
date: '2009-12-10T11:56:33-05:00'
tags:
    - networking
    - segurança
description: "Neste post, irei iniciar uma série de artigos relacionados à segurança de redes. Para iniciar, escolhí este tema."
cover:
  image: "/og/sniffer-spoofing-ataques-monitorados.png"
  alt: ""
  hidden: true
---

Neste post, irei iniciar uma série de artigos relacionados à segurança de redes. Para iniciar, escolhí este tema.

**O que são os ataques monitorados?**

Os ataques por monitoração são baseados em softwares de monitoração de rede conhecido como “sniffer”, instalado sorrateiramente pelos invasores.

O sniffer grava os primeiros 128 bytes de cada sessão login, telnet e FTP session vista naquele segmento de rede local, comprometendo TODO o tráefgo de/para qualquer máquina naquele segmento, bem como o tráfego que passar por aquele segmento.

Os dados capturados incluem o nome do host destino, o username e o password. A informação é gravada em um arquivo posteriormente recuperado pelo invasor para ter acesso a outras máquinas.

Em muitos casos os invasores obtêm acesso inicial aos sistemas usando uma das seguintes técnicas:

- Obtêm o arquivo de passwords via TFTP em sistemas impropriamente configurados;
- obtêm o arquivo de password de sistemas rodando versões inseguras do NIS;
- Obtêm acesso ao sistema de arquivos local via pontos exportados para montagem com NFS, sem restrições;
- usam um nome de login e password capturada por um sniffer rodando em outro sistema.

Uma vez no sistema, os invasores obtêm privilégios de root explorando vulnerabilidades conhecidas, tal como rdist, Sun Sparc integer division e arquivos utmp passíveis de escrita por todo mundo ou usando uma password de root capturada.

Eles então instalam o software sniffer, registrando a informação capturada num arquivo invisível. Adicionalemtne , eles instalam cavalos de tróia em substituição dentre os seguintes arquivos do sistema, para ocultar sua presença:

/bin/login

/usr/etc/in.telnetd

/usr/kvm/ps

/usr/ucb/netstat

**O que é Spoofing?**

Certamente a fase que mais ouvimosde nossos pais quando somos criança – depois de “não faça isso” ou “não faça aquilo” é claro é: “não converse com estranhos”. Isso porque pessoas desconhecidas podem ter más intenções, ou querer se aproveitar de nós.

Num mundo de insegurança e guerras como o de hoje, confiar em quem conhecemos já é uma grande aventura, em quem nunca vimos então, é pedir demais.

Em networking (internet, ethernet, etc.), isso também acontece. Várias comunicações entre computadores se baseiam nesse princípio de “trusted hosts”, ou seja, “parceiros confiáveis”. Os computadores se comunicam sem a necessidade de uma constante verificação de autenticidade ente eles. Em certos sistemas, com a intenção de obter um melhor nível de segurança, o servidor de rede só libera a utilização de certos serviços a um número restrito e autenticado de usuários, que não são “estranhos” para ele. O método encontrado para furar este esquema é o de falsificar o remetente dos pacotes de dados que viajam na rede. Essa técnica é conhecida por spoofing.

Disfarce, é basicamente isto que o spoof faz. O ataque acontece quando o invasor fabrica um pacote contendo um falso endereço de origem, fazendo com que o host atacado acredite que a conexão está vindo de um outro local, geralmente se passando por um host que tem permissão para se conectar a outra máquina. Fica mais fácil com esse esquema:

> Acesso confiável
> 
> Servidor 1 —————- Servidor2
> 
> O invasor irá dizer ao Servidor 2 que seu DNS/IP é o do Servidor 1, tornando possível a conexão;
> 
> “Por que eu não ouví meus pais?”

**Vulnerabilidade**

Esse método de ataque funciona porque os serviços de confiança das redes se baseiam apenas na autenticação de endereços. Como o IP pode ser facilmente mascarado, não há muito problema em aplicar essa técnica.

> Todos os sistemas operacionais com TCP/IP podem ser vulneráveis a um spoofing. Mas MAC rodando A/UX e PCs rodando Linux podem estar vulneráveis sob certas circunstâncias: se estiverem utilizando o X-Window System, Serviços Remotos (R Services), ou algum tipo de NFS mal configurado.

A primeira etapa de um ataque por spoof é identificar duas máquinas de destino. Uma vez identificadas, o invasor tentará estabelecer uma conexão com o Servidor 2 de forma que ele acredite que ela vem do Servidor 1, quando na verdade vem de sua própria máquina, chamada de X. Isso é feito através da criação de um pacote falso (criado em X, mas com endereço do Servidor 1) solicitando conexão com o Servidor 2.

Depois de receber esse pacote, o Servidor 2 responderá com um pacote semelhante, que reconhece a solicitação e estabelece números de sequência. Essa é a parte mais trabalhosa do ataque, pois é preciso adivinhar o número de sequência que o servidor está esperando. Além disso, é preciso impedir que o pacote do Servidor 2 chegue até o Servidor 1.

Se isso acontecesse, o Servidor 1 negaria a conexão e o ataque falharia. Para isso, o invasor envia diversos pacotes a primeira vez para esgotar sua capacidade e impedir que ele responda a segunda vez. Uma vez que essa operação tenha chegado ao fim, a falsa conexão poderá acontecer.

**A preparação do spoofing.**

O spoofing só funciona se todas as máquinas participantes utilizem o FULL TCP/IP, esse ataque exige que os servidores rsh e rlogin e rexec estejam em execução no momento em que o IPSpoofing for realizado.

O Unix e suas variantes, como o Linux, oferecem estes serviços nativos no sistema operacional. Já o Windows não conta con nenhum destes serviços. Sendo assim, você deve utilizar o Linux em suas redes locais enquanto estiver experimentando o IPSpoofing.

Pode-se verificar se esses serviços estão disponíveis através de uma varredura de portas na máquina-alvo com os serviços:

512 – rexec

513 – rlogin

514 – rsh

Pode-se fazer esta varredura com o Nmap –[ http://nmap.org/](http://nmap.org/)

A sintaxe para utilização da varredura é

`Nmap -O -p512-515 IP_DA_MAQUINA`

Após o parâmetro -p, informe a porta a ser verificada. Já o parâmetro -O identifica o sistema operacional da máquina-alvo. Se for Windows, o IP não será usado neste método de ataque. Certamente não será possível realizar o spoofing através desta máquina. Um raro caso em que o Windows é mais seguro.

No caso de computadores que rodam Linux, ele identifica (com sucesso, na maioria das vezes) até mesmo a versão do kernel que está em operação. No entanto, um servidor bem configurado certamente irá identificar o IP de uma suposta invasão durante esse processo. Para evitar que isso aconteça, os hackers costumam usar os parâmetros -f durante o uso do nmap, de forma que o cabeçalho do endereço IP e os pacotes venham fragmentados, o que pode ser muito útil para que o hacker passe despercebido na hora de analisar um sistema.

**Tipos de Ataque Spoofing**

Os tipos de ataque que utilizam a técnica de spoofing mais conhecidos são:

- IP Spoofing
- ARP Spooging
- DNS Spoofing

– Arp Spoofing

Essa técnica é uma variação do ip spoofing, que se aproveita do mesmo tipo de vulnerabilidade, diferenciando apenas porque se faz na autenticação ARP, apesar de também ser address-based utiliza o endereço MAC (Media Access Control) ou o endereço físico do dispositivo, geralmente uma placa de rede.

– DNS Spoofing

Técnica muito simples, não requer grandes conhecimentos do TCP/IP. Consistem em alterar as tabelas de mapeamento de hostname-ipaddress dos servidores DNS, ou seja, seus registros do tipo host, de maneira que os servidores, ao serem perguntados pelos seus clientes sobre um hostname qualquer, informem o ip errado, ou seja, o do host que está aplicando o DNS spoofing.

**Como a máquina alvo é derrubada**

Isso pode ser feito através de várias maneiras, mas uma das mais utilizadas é o DoS (Denial of Service 0 Negação de Serviços). Este método consiste em sobrecarregar o computador alvo até que ele pare de responder. Por incrível que pareça esta é a parte mais complicada de todo o procedimento de spoofing. Uma vez que a máquina-alvo for retirada do ar fica fácil assumir seu enderço IP.

Uma das funções do DoS mais utilizadas é o smurf. Nesta técnica o invasor envia uma solicitação de ping em broadcast para a rede que será atacada. Nesse caso o que vale mesmo é a largura de banda, que precisa ser maior do que a da máquina-alvo. Por esse motivo, dificilmente um smurf parte de um único computador. Geralmente este procedimento necessita de um grupo de atacantes para concretizar a derrubada da máquina-alvo. Nem sempre um invasor dispõe de tanta ajuda assim para realizar um ataque. Para isto, utilizam-se de worms.

**Mas o que são worms?**

Os worms são pragas com código malicioso que se auto-propagam pela internet e adicionam entradas nos registros do Windows de usuários. Eles são transmitidos via e-mail, redes peer-to-peer, arquivos compartilhados infectados, messengers, etc. Tais oragas tiram proveito de backdoors e falhas de segurança em clientes de e-mail e sistemas operacionais para se multiplicarem pela internet.

Dentre as diversas formas de uso, no caso do smurf é utilizado da seguinte maneira: São espalhados pela internet, com instuções para dispararem comandos de ping em uma data e hora específica, realizando um ping em broadcast para a máquina-alvo, com o intuito de derrubá-la.

Outra técnica muito utilizada é o ataque pelo protocolo ICMP, que possui a vantagem em relação aos outros: não precisar de nenhum tipo de programação complexa. Através do Linux, em modo texto, é possível tirar uma máquina do ar com a linha de comando:

`ping -t-l 1024 ENDEREÇO_IP`

**O ataque**

A etapa mais difícil de ser realizada é a derrubada do alvo, uma vez que o IP da estação-alvo para de responder, é só rodar um programa que muda o endereço de sua requisição. Um exemplo desse tipo de software pe o Hijack.

Para utilizá-lo basta compilar o programa. É necessário que você tenha um compilador C (como o gcc, por exemplo) instalado em seu Linux. Confira agora como compilar:

**gcc -o hijack hijack.c**

Depois de fazer experiências de teste com o hijack, use o comando:

**hijack host\_confiável 23 endereço\_alvo**

Neste caso o host\_confiável nada mais é do que o endereço que foi derrubado. Já o numero 23, que aparece logo em seguida, é a porta Telnet. Ela é necessária para que o IPSpoofing seja realizada com sucesso. Por fim o endereço-alvo é o IP do computador que será invadido.

Sendo assim, tudo o que o invasor precisa fazer é alterar as configurações deste comando para os dados referentes a máquina-alvo, e pronto: o spoofing está feito.

**Como se proteger:**

O procedimento de IP Spoofing é bastante complexo e pode causar muitos problemas aos administradores de sistema. Por isso é altamente recomendável que você proteja a sua rede antes que ocorra algum ataque.

Não existe uma solução definitiva que proteja esse tipo de ataque, pois o IP Spoofingé uma característica do TCP/IP. Tudo que ela faz é se utilizar dos recursos deste protocolo e enganar a máquina com a qual o invasor está realizando a troca de pacotes.

Podemos mencionar duas soluções que podem ser muito úteis para que isso não aconteça. A primeira delas é não utilizar os serviços rexec, rlogin e rsh, exceto se forem extremamente necessários.

Ssses serviços geralmente não são utilizados, pois facilitam invasões. Se esses serviços realmente forem necessários, implante uma política de segurança eficiente com o auxílio de uma ferramenta criada especificamente para esse propósito, as IDS (Intrusion Detection System – Sistema de Detecção de Intrusos). Você pode saber mais sobre estes sitemas no site [www.snort.org](http://www.snort.org)

**Links para utilitários de spoofing**

<http://insecure.org/sploits/ttcp.spoofing.problem.html>

<http://www.deter.com/unix/>

<http://all.net/>

**Referências**

<http://www.unixcities.com/dos-attack/index1.html>

<http://www.rnp.br/newsgen/0003/ddos.html>
