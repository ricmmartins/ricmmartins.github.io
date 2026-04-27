---
slug: "tudo-sobre-o-ssh-parte-1"
title: 'Tudo sobre o SSH'
date: '2009-04-10T17:39:51-04:00'
tags:
    - networking
    - ssh
categories:
    - Networking
description: "Autor: Pedro Augusto de O. Pereira / Administrar máquinas remotamente é uma coisa extremamente comum não só nos últimos anos, mas desde que a Internet foi"
---

Autor: Pedro Augusto de O. Pereira / <http://augusto.pedro.googlepages.com/>

**Introdução**  
Administrar máquinas remotamente é uma coisa extremamente comum não só nos últimos anos, mas desde que a Internet foi concebida.

No início, existiam algumas opções para administrar remotamente uma máquina:

- **Telnet:** o Telnet (Teletype Network) é, talvez, a opção mais conhecida para este tipo de tarefa. Desenvolvido em 1969, é um protocolo de camada de Aplicação e está disponível para praticamente qualquer plataforma que você necessite. Utiliza a porta 23/TCP. Atualmente já caiu em desuso e sua utilização para interagir com qualquer tipo de host (em qualquer rede) é extremamente desencorajada, já que há opções melhores e mais seguras disponíveis atualmente, entretanto alguns dispositivos como switches e roteadores ainda permitem que o acesso ao seu console seja feito utilizando o Telnet (a grande maioria disponibiliza apenas o Telnet, porém alguns roteadores mais novos já permitem o uso do SSH). O protocolo está especificado na [RFC 854](http://tools.ietf.org/html/rfc854).
- **RSH:** O RSH (Remote Shell) tem um papel muito parecido com o do Telnet, porém foi feito exclusivamente para funcionar em sistemas Unix-like (como o 4.2BSD), em 1983. Ele lida melhor com a transferência do output do shell entre os hosts, sendo uma melhor opção que o antigo Telnet. Também não foi desenvolvido pensando na segurança: não criptografa nenhum dos dados transmitidos pela conexão estabelecida por ele. Utiliza a porta 514 do protocolo TCP. Ele é apenas parte de uma suíte de ferramentas utilizadas para interagir com um determinado host remotamente. Outros exemplos de ferramentas na suíte são rcp, rlogin. Você encontra mais informações sobre estes comandos neste [site](http://pangea.stanford.edu/computerinfo/unix/netcommands/rcommands.html) (em inglês).

Estas primeiras soluções eram um bom auxílio, mas representavam muitos riscos aos administradores que as utilizavam já que não ofereciam nenhum tipo de segurança. Por exemplo, todas as senhas utilizadas no processo de login eram enviadas em texto plano, sem cifragem nenhuma. Isso, obviamente, facilita muito a vida do atacante cuja única dificuldade é sniffar o tráfego entre o administrador que utiliza a ferramenta e o servidor onde ele irá se logar.

Quando o criador do protocolo SSH, Tatu Ylonen, teve sua rede invadida por utilizar estas ferramentas inseguras, percebeu que era necessário um protocolo que permita administração remota de um modo seguro. Assim, com segurança em mente, foi desenvolvido o SSH. Este é, ao mesmo tempo, um protocolo e um aplicativo, cuja principal vantagem é oferecer um modo de se conectar a uma máquina remota de modo seguro, causando menos riscos à segurança do sistema.

Nesta primeira parte de uma série de artigos, vou explicar o que é o SSH. Suas opções de configuração e linha de comando e também alguns exemplos de utilização serão mostrados na parte 2. Na parte 3, vou focar nas técnicas utilizadas para deixar o servidor SSH seguro.

Se restar qualquer dúvida após ler este artigo, se você quiser fazer uma sugestão ou correção entre em contato comigo utilizando o formulário de contato, que você encontra no menu à esquerda.

**O protocolo SSH**  
O SSH (Secure SHell) é ao mesmo tempo um protocolo e uma aplicação para acesso remoto. Os protocolos foram desenvolvidos em 1995 por Tatu Ylonen, fundador da empresa SSH Communications Security. O conjunto permaneceu livre até a sua versão 1.2.12, quando se tornou um produto proprietário desta empresa. Foi desta versão que se originou o aplicativo OpenSSH (uma implementação destes protocolos e várias ferramentas auxiliares), em 1999. Existem também várias outras opções comerciais de implementação do SSH porém, por ser livre, o OpenSSH é a mais popular.

O protocolo foi desenvolvido com a segurança em mente desde o princípio do projeto. Como consequência, ele é capaz de proteger o host de ataques de IP spoofing, IP source routing e DNS spoof. Basicamente, o atacante só consegue fazer com que o serviço seja interrompido, ele não é capaz de tomar conta da seção (e consequentemente da máquina) que está utilizando o software. Além disso, todo o tráfego transmitido por uma conexão SSH (as senhas e todo o conteúdo, como um arquivo sendo transmitido entre os hosts) é fortemente criptografado, sendo virtualmente impossível para um atacante sniffar e conseguir ler as mensagens trocadas entre os participantes da conexão (pelo menos em tempo hábil para que aquele conteúdo decifrado seja de alguma utilidade para ele).

A primeira versão, conhecida como SSH1, foi desenvolvida principalmente com a intenção de substituir os “comandos r”: rlogin (permite que o usuário logue no sistema remoto utilizando a porta 513/TCP), rsh (que permite executar comandos no shell remoto como outro usuário. Na ponta onde o usuário irá se conectar é necessário que o daemon rshd esteja sendo executado) e rcp (permite fazer uma cópia de arquivos entre sistemas remotos através da Internet). A segunda versão (SSH2, incompativel com a versão SSH1) tem o intuito de resolver falhas de segurança sérias encontradas na primeira versão e melhora o método de transferência de arquivos entre os hosts (através do SFTP).

Como a versão utilizada hoje em dia é a 2, é nela que irei focar.

O SSHv2 é descrito em 5 documentos principais: o [SSH Protocol Architecture – RFC 4251](http://www.snailbook.com/docs/architecture.txt) que descreve todo o design do protocolo de um modo geral, sem se aprofundar muito em detalhes de implementação.

O [SSH Transport Layer Protocol – RFC 4253](http://www.snailbook.com/docs/transport.txt) descreve como funcionará o protocolo da camda de transporte do SSH (o qual utiliza toda a infra-estrutura oferecida pela pilha de protocolos TCP/IP definindo como vai ser a privacidade, integridade, autenticação nos servidores, proteção contra ataques man-in-the-middle, criptografia forte, autenticação, proteção da integridade e, opcionalmente, compressão dos dados). O interessante do protocolo definido por esta RFC é que ele pode ser utilizado não apenas no SSH, mas também em qualquer outra aplicação que requeira segurança nas comunicações feitas através de redes inseguras (como a Internet).

O protocolo de autenticação é definido no documento [SSH Authentication Protocol – RFC 4252](http://www.snailbook.com/docs/userauth.txt). Ele descreve um framework do protocolo de autenticação e métodos de criação de chaves públicas, senhas e autenticação do cliente baseada no host, utilizados pelo SSH para a autenticação do usuário quando este tenta se conectar a algum servidor.

O protocolo de conexão é descrito no documento [SSH Connection Protocol – RFC 4254](http://www.snailbook.com/docs/connection.txt). Ele provê sessões interativas, execução remota de comandos, forward de conexões TCP/IP e de conexões X11 (você pode fazer um VNC mais seguro utilizando o SSH), tudo isso utilizando apenas um único túnel, por onde todas as conexões serão transmitidas. Este protocolo foi desenvolvido para ser executado utilizando as funções providas pelos protocolos de transporte e autenticação.

**O que é o OpenSSH?**  
O [OpenSSH](http://www.openssh.org/) é um projeto mantido pelos desenvolvedores do [OpenBSD](http://www.openbsd.org/) que tem como objetivo oferecer uma implementação completamente livre do protocolo SSH. Ele possui muitas vantagens sobre softwares como o Telnet, por exemplo: autenticação forte; todas as comunicações são automatica e transparentemente cifradas; qualquer porta TCP/IP pode ser redirecionada através de um túnel estabelecido pelo OpenSSH; deposita o mínimo de confiança no lado remoto da conexão; qualquer usuário pode criar qualquer número de chaves de autenticação RSA para utilizar ao conectar a outros servidores; as configurações podem ser específicas para cada usuário ou todos os usuários podem ser obrigados a obedecer uma configuração global; os dados transferidos podem ser compactados, aumentando o desempenho.

Como o OpenBSD, o OpenSSH é sustentado por doações e venda de algumas peças promocionais como camisetas e pôsteres. Por isso, se você perceber que sua empresa está realmente se beneficiando de todo o bom trabalho feito por este time (que se esforça ao extremo para desenvolver um software de altíssima qualidade, seguro e livre) você deveria fazer uma doação para garantir que o software continue com seu desenvolvimento contínuo.

O OpenSSH tem ferramentas que são substitutos seguros dos comandos “r”. Uma lista destes comandos segue:

- SSH: Substitui os programas rlogin e Telnet.
- SCP: Substitui o programa rcp.
- SFTP: Substitui o FTP.

Além disso, também estão inclusos no pacote o SSHd (o daemon servidor do SSH, que aceita as conexões de clientes), ssh-add que adiciona chaves RSA e DSA ao agente de autenticação, ssh-agent que é o agente de autenticação, ssh-keysign que é utilizado pelo SSH par gerar uma assinatura digital necessária durante a autenticação do host no SSHv2, ssh-keyscan que junta as chaves públicas dos hosts para auxiliar na construção dos arquivos ssh\_known\_hosts (arquivos com os hosts que já se conectaram pelo menos uma vez ao servidor ou aos servidores aos quais o cliente já se conectou), ssh-keygen que gera, gerencia e converte chaves de autenticação para o SSH (pode criar chaves RSA ou DSA, a escolha de qual tipo de chave será gerada é através da opção -t), sftp-server é o servidor de FTP seguro (este utilitário não deve ser utilizado diretamente, mas sim dentro do SSHd, o daemon do SSH, através da opção “Subsystem”).

O desenvolvimento do OpenSSH é feito por dois times distintos. Um deles se concentra em deixar o código o mais limpo possível para que seja utilizado no OpenBSD nativamente, sem a necessidade de qualquer “adaptação”. O outro time é responsável por portar o OpenSSH para outras plataformas, permitindo que vários outros sistemas operacionais também se aproveitem de todas as possibilidades que o OpenSSH oferece para seus usuários. Este código contém um pouco mais de sujeira que o código desenvolvido para o OpenBSD, porém, nem por isso é menos seguro. Estas versões podem ser identificadas pelo “p” em seus nomes, como em “OpenSSH 4.6**p**1?.

Atualmente, o OpenSSH pode ser utilizado em OpenBSD, NetBSD, FreeBSD, AIX, HP-UX, IRIX, Linux, NeXT, SCO, SNI/Reliant Unix, Solaris, Digital Unix/Tru64/OSF, Mac OS X e Cygwin (automaticamente também no Windows, já que o Cygwin pode ser utilizado neste sistema operacional. Se você não conhece o Cygwin, dê uma lida [neste](http://aurelio.net/cygwin/rdl/) artigo do Aurélio. É um ótimo guia para te apresentar esta poderosa ferramenta).

**Conclusão**  
Nesta primeira parte da série de artigos sobre segurança no SSH, quis focar mais na história do protocolo e como ele está estruturado. Também procurei dar uma visão geral sobre o OpenSSH, que é o software no qual focarei nas próximas partes desta série de artigos.
