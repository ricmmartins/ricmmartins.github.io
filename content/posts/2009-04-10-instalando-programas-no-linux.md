---
slug: "instalando-programas-no-linux"
title: 'Instalando programas no Linux'
date: '2009-04-10T17:41:07-04:00'
tags:
    - linux
description: "Autor: Pedro Augusto de O. Pereira / A instalação de aplicativos no GNU/Linux é um dos pontos que mais causam confusão nos iniciantes por ser um pouco"
cover:
  image: "/og/instalando-programas-no-linux.png"
  alt: ""
  hidden: true
---

Autor: Pedro Augusto de O. Pereira / <http://augusto.pedro.googlepages.com/>

**Introdução**  
A instalação de aplicativos no GNU/Linux é um dos pontos que mais causam confusão nos iniciantes por ser um pouco diferente. Para fazer a instalação, nós temos 3 opções: o RPM (para distribuições baseadas na Red Hat como Fedora, Conectiva), a instalação através de código fonte (arquivos .tar.gz, .tar.bz2, etc), sendo que estes independem de distribuição e o apt-get, criado pela Debian.Vou tratar cada uma delas separadamente para que eu possa esclarecer as particularidades de cada uma.

**Instalação através de um tarball**

Esse é um dos tipos de instalação mais populares. Aqui o desenvolvedor empacota os arquivos fonte do programa e os disponibiliza para download, junto com alguns scripts para facilitar a instalação no computador do usuário.

Como o desenvolvedor lhe envia os códigos-fonte dos arquivos, será necessário compilá- los para que eles funcionem no seu computador. Para conseguir realizar a compilação de qualquer programa no seu sistema, você deve ter os pacotes de desenvolvimento instalados no seu micro (pacotes como a glibc, automake, etc) Falando assim pode parecer que para instalar aplicativos desse jeito é um bicho de sete cabeças, mas não chega nem perto disso =\] A compilação é um processo meio padronizado, ou seja, quase sempre você vai precisar digitar os mesmos comandos para instalar qualquer programa. Vou explicar cada um deles abaixo, lembrando que todos eles devem ser executados dentro do diretório criado quando você descompactou o tarball do programa:

```bash
./configure
```

O ./configure na verdade não é um comando, mas sim um shell script. Quando executado, ele verifica se seu sistema possui tudo o que é necessário para que o aplicativo que você está querendo instalar seja executado corretamente, sem nenhum problema. Além disso, ele também gera um arquivo chamado makefile. Este arquivo contém regras sobre a compilação do programa, sem este arquivo, o próximo comando não conseguirá executar pois não terá idéia do que será necessário fazer.

```bash
make
```

O make usa o makefile gerado pelo ./configure para realizar a compilação do programa.O makefile contém instruções para que o make compile tudo o que for necessário.

```bash
make install
```

Enquanto o make só compila o programa, o make install instala realmente o programa criando os diretórios necessários, colocando os binários no lugar certo, etc. Lembrando que o make é o único dos 3 comandos que requer permissões de root para ser executado, já que este escreve em lugares em que só o root tem permissão.

Então, para instalar um programa através de um tarball:


```bash
# tar -xzvf programa.tar.gz  
# cd dirdoprograma  
# ./configure  
# make  
# su – root  
# make install
```

Geralmente são esses os passos executados para que você instale um programa a partir do código fonte. A única coisa que pode variar é o nome do script (o primeiro “comando” digitado). Na maior parte das vezes é configure, mas o desenvolvedor pode colocar outro nome nele, como setup, por exemplo. Por isso, é muito recomendado que você leia o arquivo Readme para ter instruções exatas de como proceder para instalar o aplicativo.

Depois de instalado, os binários do aplicativo vão estar em /usr/local/bin. Preste atenção a um detalhe muito importante: se seu aplicativo só funcionar em um ambiente específico (o KDE, por exemplo) os binários dele vão para outro diretório: /usr/local/kde/bin.

Portanto, nunca se esqueça de adicionar esses diretórios na variável PATH de todos os usuários do sistema, para que eles também possam executar o programa.

Você deve estar pensando: “Bom instalar é fácil, mas como eu desinstalo um programa?”. Eu respondo: “É mais fácil ainda!”.

Você simplesmente vai ter que voltar ao diretório criado pelo tarball quando este foi descompactado e digitar:

```bash
# make uninstall
```

Bem fácil, né? E você achando que instalar e desinstalar programas através dos fontes era difícil.

**RPM**

O RPM (Red Hat Package Manager) é um dos modos mais inteligentes e fáceis de se instalar, desinstalar, monitorar o que está instalado, atualizar programas, etc. Ele ajuda muito o usuário iniciante pois é muito intuitivo e fácil de se usar. Vou lhe ensinar aqui como instalar, desinstalar, atualizar e verificar se algum pacote está instalado no seu sistema, se aprofundar no uso do RPM é com você.

**Instalando**

Os pacotes RPM são arquivos binários pré-compilados para uma certa distribuição. Por isso você sempre vai procurar por pacotes RPM feitos para a sua distribuição. Um ótimo lugar para se encontrar pacotes RPM é no site [www.rpmfind.net](http://www.rpmfind.net/ "www.rpmfind.net").

O processo de instalação é bem fácil. Vou usar como exemplo de instalação o SIM, um clone do ICQ para GNU/Linux.

Com o pacote em mãos, vá ao console e digite:

```bash
# rpm -ivh sim-0.9.2-1.rh90.i386.rpm
```

Explicando as opções:

- -i: instalar
- -v: modo verbose. Com esta opção ativada, o rpm irá te falar o que está fazendo.
- -h: mostra o progresso da instalação do pacote com caracteres #.

Opa! Tivemos uma mensagem de erro:

error: Failed dependencies:  
libsablot.so.0 is needed by sim-0.9.2-1.rh90  
sablotron &gt;= 1.0.1 is needed by sim-0.9.2.-1.rh90

Ó meu Deus! E agora??

Calma! O RPM está nos dizendo que para o SIM ser executado corretamente ele necessita do pacote sablotron com uma versão maior ou igual a 1.0.1. Portanto, simplesmente procuramos esse pacote (nesse caso é uma biblioteca) e o instalamos:

```bash
# rpm -ivh sablotron-1.0.1-1.rh90.i386.rpm
```

Depois de instalado, instalamos o pacote principal sim-0.9.2-1.rh90.i386.rpm:

```
# rpm -ivh sim-0.9.2-1.rh90.i386.rpm
```

Agora sim conseguimos instalar o SIM. Para executá- lo digite “sim” em um terminal.

**Atualizando**

Vamos supor que, depois de um tempo, é lançada uma nova versão do SIM e nós queiramos atualizar o nosso programa. Para isso nós utilizaremos a opção -U, assim:

```bash
# rpm -U sim-x.x.x-2.rh90.i386.rpm
```

Assim ele vai atualizar o SIM automaticamente, sem ter que desinstalar a versão antiga e instalar a nova.

**Desinstalando**

Para você desinstalar um pacote RPM qualquer, basta usar a opção -e:

```bash
# rpm -e sim-x.x.x-2.rh90.i386.rpm
```

**Verificando quais pacotes estão instalados**

Para você pesquisar se um certo pacote está instalado ou não, você pode usar a opção -qa. Com essas opções o sistema RPM vai consultar toda a base de dados de pacotes RPM e lhe mostrar todos os pacotes RPM que estão instalados no seu micro. É uma boa idéia usar o grep para consultar um pacote específico:

```bash
# rpm -qa | grep pacote
```

Assim, se o pacote estiver instalado, você verá o nome do pacote como única saída do comando. Caso o RPM não ache um pacote com o nome especificado ele simplesmente irá ficar quieto, não te dirá nada.

Bom, isso é o básico sobre RPM. Cabe a você se aprofundar mais no uso desta excelente ferramenta.

**APT-GET com suporte a RPM**

Conforme você vai usando o sistema RPM você vai perceber que ele tem um sério problema. Muitas vezes você tem que instalar vários pacotes para conseguir fazer um programa funcionar (esses pacotes extras são chamados dependências), e depois de um tempo isso vai começar a te chatear muito.

Pensando nisso, foi criado o sistema APT-GET.

Este sistema funciona como o RPM, mas um pouco mais melhorado. Com ele você pode instalar, desinstalar e atualizar pacotes no seu sistema.Você deve estar se perguntando:

“Mas qual a grande vantagem dele em cima do RPM?”

A maior vantagem do APT sobre o RPM é que ele resolve problemas de dependências automaticamente. Assim, se você tentar instalar um pacote o APT já vai instalar todas as dependências dele automaticamente.

Para instalar o APT você vai precisar baixar o pacote RPM dele e instalá- lo como foi explicado no tópico anterior. Depois de instalá- lo é hora de começar a usar! Digite “apt-get update” para que o apt atualize os pacotes necessários por ele. Lembre- se que neste passo você tem que estar conectado à Internet.

Depois que ele terminar o passo anterior, você já pode começar a usá- lo para instalar, desinstalar e atualizar seus pacotes.

Para instalar um pacote qualquer digite:

```bash
# apt-get install pacote
```

Com o comando acima ele vai instalar o pacote e qualquer dependência necessária.

Para que o apt cheque quais pacotes estão desatualizados no seu sistema e já os atualize digite:

```bash
# apt-get upgrade
```

Para remover algum pacote junto com suas dependências, use:

```bash
# apt-get remove pacote
```

Todas as fontes de onde o APT vai fazer download estão descritas no arquivo /etc/apt/sources.list. Se você quiser adicionar algum lugar de onde o APT deva fazer download de algum pacote, indique- o nesse arquivo. Uma fonte não precisa necessariamente ser um servidor FTP. Você pode adicionar os CD-ROMs da sua distribuição para poder instalar os pacotes contidos neles pelo APT. Você só vai precisar digitar o comando:

```bash
# apt-cdrom add
```

Se você não especificar onde está o seu drive, o APT vai usar as informações contidas no seu arquivo /etc/fstab.

Bom, sobre o APT é isso. Só te mostrei o básico pois o APT é uma ferramenta com muitos recursos. Para escrever esta parte do tutorial, me baseei no excelente arquivo disponível em [http://bazar.conectiva.com.br/~godoy/apt-howto/index.html](http://bazar.conectiva.com.br/%7Egodoy/apt-howto/index.html "http://bazar.conectiva.com.br/~godoy/apt-howto/index.html").

É isso! Aposto que agora você vai conseguir instalar qualquer programa (não importa a forma como ele apareça na sua mão!) no seu GNU/Linux. Espero que este artigo tenha te ajudado a esclarecer qualquer dúvida que você tivesse sobre instalação.
