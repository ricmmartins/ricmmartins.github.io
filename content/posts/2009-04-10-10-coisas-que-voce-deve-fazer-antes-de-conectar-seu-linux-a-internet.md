---
slug: "10-coisas-que-voce-deve-fazer-antes-de-conectar-seu-linux-a-internet"
title: '10 coisas que você deve fazer antes de conectar seu Linux à Internet'
date: '2009-04-10T17:49:44-04:00'
tags:
    - linux
    - segurança
description: "Este texto é uma tradução. O texto original está disponível no site http://www.builderau.com.au/program/linux/soa/10_things_you_should_do_to…?feed=rss"
cover:
  image: "/og/10-coisas-que-voce-deve-fazer-antes-de-conectar-seu-linux-a-internet.png"
  alt: ""
  hidden: true
---

Este texto é uma tradução. O texto original está disponível no site [http://www.builderau.com.au/program/linux/soa/10\_things\_you\_should\_do\_to…?feed=rss](http://www.builderau.com.au/program/linux/soa/10-things-you-should-do-to-a-new-Linux-PC-before-exposing-it-to-the-Internet/0,339028299,339274586,00.htm "http://www.builderau.com.au/program/linux/soa/10_things_you_should_do_to_a_new_Linux_PC_before_exposing_it_to_the_Internet/0,339028299,339274586,00.htm")  
Não coloquei algumas partes do texto nas quais o autor focava muito no Mandriva. Tentei deixar o texto um pouco generalizado, podendo ser usado para qualquer distribuição que você queira.

**Finalidade**  
O Linux, assim como o Windows, é apenas um sistema operacional. Quando falo com colegas que estão usando o Linux pela primeira vez, esta é a primeira coisa que deixo clara. O Linux não é uma varinha de condão que pode ser utilizada para resolver todos os problemas da informática. O Linux tem vários problemas, assim como o Windows. Não há um sistema operacional perfeito ou completamente seguro. Essa máquina vai ser um servidor ou uma estação de trabalho? Pensando nisso, vários problemas são evitados.

**Instalação**  
Diferente do Windows, o Linux não tem uma versão específica para servidores, outra para estações de trabalho, etc. Durante uma instalação típica, a escolha sobre quais softwares serão instalados é sua. Portanto, de acordo com os softwares que você instala, você define o papel da máquina: servidor ou estação de trabalho. Por isso, você deve saber muito bem quais são os pacotes que o instalador da sua distribuição está instalando para você. Por exemplo, algumas distribuições irão instalar e configurar um servidor Samba ou um servidor de email como parte da instalação básica. Dependendo da finalidade do seu computador e do nível de segurança que você quer, esses serviços podem ser desnecessários ou indesejados. Tirando um tempinho para se familiarizar com o instalador da sua distribuição pode evitar muitas dores de cabeça e reinstalações.

**Instalar e configurar um firewall**  
Um firewall provê uma camada a mais de segurança em qualquer rede. Estes softwares permitem que você filtre o tráfego que chega no seu PC, evitando problemas. O software Shorewall (que utiliza o IPTables/Netfilter como backend) simplifica a configuração de um firewall pessoal (um outro pacote bastante interessante é o KMyFirewall, que utiliza o Qt). Instalando e configurando firewalls para sua estação o quanto antes, você pode restringir ou bloquear determinados tipos de tráfego, tanto entrando quanto saindo do seu PC.  
Bloquear ou permitir determinados tipos de tráfego da rede é apenas uma camada de segurança, mas como você pode adicionar mais segurança (além das regras do firewall) para um serviço que você realmente precisa que usuários da internet ou intranet utilizem no seu computador? Segurança baseada em hosts é mais uma camada de segurança.

**Configurando os arquivos /etc/hosts.deny e /etc/hosts.allow**  
Na seção anterior, vimos como configurar um firewall para permitir conexões de outros hosts aos serviços que a nossa máquina está provendo utilizando um firewall. Para aumentar a segurança contra tráfego indesejado ou atacantes, podemos limitar os hosts que se conectam a determinados serviços. Os arquivos /etc/hosts.deny e /etc/hosts.allow nos permitem fazer isso.  
Quando um computador tenta acessar um serviço como o SSH, por exemplo, os arquivos /etc/hosts.deny e /etc/hosts.allow são processados e o acesso será permitido ou negado de acordo com as regras destes arquivos. Geralmente, se você esta instalando uma estação de trabalho, é útil se colocar a seguinte linha no /etc/hosts.deny:  
`<br></br>ALL:ALL<br></br>`  
Isso vai negar o acesso de qualquer host a qualquer serviço. Parece muito restritivo à primeira vista, mas depois disso você pode adicionar hosts no arquivo /etc/hosts.allow para permitir o acesso aos serviços. Abaixo você encontra um exemplo que permite a alguns hosts conectar ao SSH:  
`<br></br>sshd: 192.168.0.1 #permite o host 192.168.0.1 acessar o SSH<br></br>sshd: foo.bar.com #permite o acesso do host foo.bar.com ao SSH<br></br>`  
Estes dois arquivos oferecem uma filtragem muito boa baseada em hosts.

**Desabilite ou remova serviços não utilizados**  
Assim como no Windows, no seu Linux podem haver serviços rodando em background que você não tem conhecimento ou que não queria que estivesse lá. Utilizando o comando chkconfig (em distribuições baseadas em Red Hat) ou entrando no diretório /etc/rc.d (no Slackware), você pode verificar quais serviços são inicializados e que você não quer e desabilitá-los. Serviços que não estão rodando não oferecem riscos à segurança e não consomem recursos da máquina.

**Aumente a segurança de serviços necessários**  
Se a sua máquina tem alguns serviços que devem receber conexões da Internet, tenha certeza de que você conhece muito bem todas as opções de configuração destes serviços. Por exemplo, se você precisa utilizar o SSH, tenha certeza de que você verificou todos os detalhes do arquivo /etc/ssh/sshd\_config antes de habilitar o serviço. O mínimo que você deve fazer é desabilitar o login do root. Toda máquina Linux tem um usuário root que pode logar via SSH, quando você desabilita este usuário, você inibe ataque de brute force pois o atacante ainda não sabe qual usuário é valido nessa máquina. Se você deixar o login remoto do root habilitado, o atacante só vai precisar descobrir a senha.

**Configure as opções de rede do kernel**  
O prórpio kernel Linux pode oferecer algumas opções de segurança para a rede. Se familiarize com as opções disponíveis no arquivo /etc/sysctl.conf e as configure conforme necessário. As opções deste arquivo controlam, por exemplo, que tipo de informações sobre a rede são logadas nos logs do sistema.

**Conecte o PC a um roteador**  
Um roteador (mesmo que doméstico) é um hardware bem comum hoje em dia. Ele é a primeira camada de segurança para qualquer rede, seja ela doméstica ou corporativa e permite que vários computadores utilizem o mesmo endereço IP para o acesso à Internet. Isso geralmente dificulta a ação de um atacante ou programa malicioso pois ele bloqueia qualquer tráfego que você não permitiu. Roteadores domésticos são apenas versões mais enxutas de roteadores corporativos que empresas utilizam para separar sua rede da Internet.

**Atualize**  
Sempre mantenha o software do seu computador atualizado com os últimos patches de segurança seja qual for o sistema operacional que você está utilizando. A sua distribuição irá sempre lançar patches de segurança regularmente e estes devem sempre ser aplicados. Como no Windows, esta deve ser a sua primeira tarefa do dia :).

**Outros softwares**  
Você também deve instalar outros softwares que aumentem a segurança do seu sistema.  
Bastille-Linux ([http://www.bastille-linux.org/](http://www.bastille-linux.org/ "http://www.bastille-linux.org/")) é um programa que pode ser usado para aumentar a segurança de certos aspectos do Linux. Ele desenvolve uma política de segurança que é aplicada ao sistema e produz relatórios sobre potenciais problemas de segurança. Além disso, é uma ótima ferramenta para se aprender sobre detalhes da segurança do seu Linux.  
O Tripwire ([http://sourceforge.net/projects/tripwire](http://sourceforge.net/projects/tripwire "http://sourceforge.net/projects/tripwire")) é um software que monitora os binários do seu sistema procurando por modificações não autorizadas. Frequentemente um hacker modifica os binários do seu sistema para dificultar a detecção de uma intrusão. Os programas modificados lhe fornecem informações falsas permitindo que o hacker mantenha o controle sobre seu sistema sem que você perceba.
