---
slug: "quebrando-senhas-do-windows-e-do-linux-com-john-the-ripper"
title: 'Quebrando senhas do Windows e do Linux com John The Ripper'
date: '2009-04-10T17:50:53-04:00'
tags:
    - segurança
categories:
    - Geral
description: "Autor: Pedro Augusto de O. Pereira / Senhas, como já sabemos, são o ponto mais fraco de qualquer sistema de segurança pois geralmente são definidas por"
---

Autor: Pedro Augusto de O. Pereira / <http://augusto.pedro.googlepages.com/>

**Introdução**

Senhas, como já sabemos, são o ponto mais fraco de qualquer sistema de segurança pois geralmente são definidas por pessoas que não são devidamente instruídas e não imaginam que senhas fracas podem ser quebradas em, dependendo de quão fraca, menos de 10 minutos.

Por isso deve-se definir regras básicas sempre que se trabalha com senhas:

- Definir um tamanho mínimo de senhas de 8 ou 10 caracteres
- Utilizar letras maiúsculas e minúsculas
- Utilizar caracteres especiais como \* / = ! @, etc.
- Utilizar números
- Fazer com que estas senhas sejam trocadas em intervalos de tempo curtos (o intervalo é definido por você, mas no máximo a cada 20 dias é uma boa média para senhas fortes)
- Definir a quantidade de senhas já utilizadas que não poderão ser reaproveitadas. Por exemplo, o usuário não poderá trocar a senha atual por uma que ele já tenha utilizado há 5 trocas atrás.
- Educar os usuários para que eles não contem as senhas para ninguém
- Educar os usuários para que não anotem as senhas em lugar nenhum

Tomando estas providências extremamente simples pode-se impedir que algum atacante consiga quebrar a senha utilizando força bruta (com programas como Hydra ou o John The Ripper, o qual será abordado mais adiante) ou engenharia social. Mesmo que a senha consiga ser quebrada, é provável que esta já não seja mais válida, pois de acordo com sua política o usuário já a trocou, ou seja, o atacante precisará iniciar todo o processo novamente.

Quando o atacante tem acesso diretamente ao arquivo que contém as senhas (como o arquivo shadow do Linux, onde ficam as senhas de todos os usuários do sistema) ele pode utilizar um software que consiga quebrar a criptografia e descobrir a senha. Um destes softwares e talvez o mais popular é o John The Ripper.

**O John The Ripper**  

O John The Ripper é um software livre que consegue identificar automaticamente qual é o algoritmo de criptografia que foi utilizado para cifrar as senhas presentes no arquivo que você indicou para ele. Ele também possui uma versão paga, porém a versão livre não deixa nada a desejar. Neste artigo focaremos na sua versão livre.

Ele é multiplataforma, podendo ser executado em vários sistemas Unix-like, Windows, DOS, BeOS e OpenVMS. É desenvolvido pelo pessoal do projeto OpenWall, que além do JtR possuem vários outros ótimos softwares e até uma distribuição Linux, a OpenWall GNU/Linux (ou Owl). O site do projeto é [este](http://www.openwall.com/).

Possui vários módulos que aumentam sua funcionalidade, o que eu gostei mais foi um módulo que se integra ao PAM e faz uma monitoração pró-ativa das senhas do sistema, impedindo que usuários utilizem senhas fracas o que facilita a vida do atacante. Este módulo também oferece suporte a passphrases (que são frases ao invés de palavras sendo utilizadas como senha) e também pode gerar senhas, se integrando totalmente com o passwd. Além deste módulo, também foi desenvolvido um patch para o JtR para que ele se utilize de vários processadores em uma mesma máquina ou consiga utilizar um cluster de máquinas para coseguir quebrar as senhas. O nome do patch é MPI pode ser encontrado em <http://www.bindshell.net/tools/johntheripper>.

**Baixando e instalando**  
A instalação do JtR é extremamente fácil. Primeiro acesse o [site](http://www.openwall.com/john/) e faça o download da versão mais nova (1.7.0.2 no momento em que escrevo o texto). Após o download, descompacte o arquivo e acesse o diretório recém criado:  

 ```bash
tar xzvf john-1.7.0.2.tar.gz  
cd john-1.7.0.2
```

Neste diretório você irá encontrar o sub-diretório “src”, é nele que estão os fontes do software e é lá que você precisa ir para compilar o programa:  
 
 ```bash
cd src/
```

A compilação do JtR é feita baseada no processador que você usa na sua máquina para que ele seja mais bem otimizado e tenha um desempenho melhor enquanto tenta quebrar as senhas. Digite make e uma lista com todas as possibilidades será exibida para você. Escolha a mais adequada e:  
 
 ```bash
make clean linux-x86-mmx
```

Lembre-se de substituir o “linux-x86-mmx” pelo valor que mais se adequar ao seu hardware. Após digitar este comando terá início o processo de compilação, que deve levar menos de 5 minutos ![:)](http://adminonline.wordpress.com/wp-includes/images/smilies/icon_smile.gif)

Todos os binários resultantes da compilação serão colocados no diretório run, vá para lá:  
 
 ```bash
cd ../run
```

Para testar o binário que foi gerado e verificar se está tudo correto com ele, digite o comando:  
 
 ```bash
./john –test
```

Isso irá efetuar um teste de benchmarking com todos os algoritmos de criptografia que o JtR suporta. Se você quiser executar o benchmarking com um algoritmo em específico, faça o seguinte:  
 
 ```bash
./john –test –format=\[formato que você quer testar\]
```

O parâmetro format pode ser utilizado também quando você estiver tentando quebrar uma senha e souber qual é o formato dela. As opções são DES, BSDI, MD5, BF, AFS e LM.

Uma característica interessante do software é que você não precisa instalá-lo em outros diretórios do sistema: pode utilizar todas as opções e funcionalidades dele diretamente do diretório “run” que é criado quando você compila o programa. Isso não quer dizer que você não possa instalar o software no diretório que quiser: não há restrição nenhuma quanto a isso. Porém, de acordo com a documentação oficial do software instalar ele system-wide (instalar ele em diretórios como /usr/local/bin, por exemplo) é apenas para pessoas que desenvolvem pacotes do John para o ports de sistemas \*BSD ou distribuições do Linux. Fica à seu critério instalar system-wide ou simplesmente executar a partir do diretório “run”.

Se você observou direitinho o diretório run do pacote, você irá ver que vários arquivos além do binário do JtR estão presentes lá. São eles:

- Mailer: é um shellscript desenvolvido para enviar emails para os usuários cujas senhas são fracas e foram quebradas. Seu uso é opcional.
- john.conf: é o arquivo de configuração do JtR. Será explicado mais adiante.
- john: é o executável do software.
- password.lst: um arquivo com algumas senhas para serem utilizadas quando se está quebrando uma senha.
- \*.chr: são arquivos binários utilizados diretamente pelo JtR para quebrar as senhas.
- unsahdow: Quando você já tem acesso aos arquivos shadow e passwd, este script irá combinar ambos para o uso com o John. Recomenda-se utilizar esta opção com –show (explicado mais adiante).
- unafs: Pega hashes binário com banco de dados AFS e o coloca em um arquivo no estilo do arquivo /etc/passwd de sistemas Unix-like. Sua saída deve ser redirecionada para um arquivo.
- unique: Remove entradas duplicadas de uma wordlist sem modificar a ordem.

É isso, agora que o John já está instalado, vamos configurá-lo!

**Configurando o JtR**  

Toda a configuração do John é feita em um arquivo texto chamado john.conf em sistemas Unix ou john.ini no Windows, por exemplo. Neste arquivo você consegue definir regras para a descoberta de senhas, wordlists, parâmetros para os modos e até definir um novo modo de descoberta de senhas.

Este arquivo é dividido em várias seções. Todas as seções começam com uma linha com seu nome entre colchetes ( \[\] ). As opções destas seções são definidas em variáveis de modo bem simples, como em:  

 ```bash
variável = valor
```

Os nomes de seções e variáveis são case-insensitive, ou seja, SECAO1 e secao1 são a mesma seção e VAR1 e var1 são a mesma variável. Os caracteres # e ; são completamente ignorados, assim como linhas em branco.

Abaixo estão as explicações das opções dividas por seção:

*Options:*

- Wordlist: A wordlist a ser utilizada pelo JtR. O arquivo pode estar em qualquer lugar, basta especificar o caminho correto nessa variável.
- Idle: Configura o John para usar seu CPU quando este estiver inativo. Diminui o desempenho da quebra da senha porém não impacta tanto no desempenho de outros programas. O padrão desta opção é N (desabilitado).
- Save: Intervalo no qual o software irá gravar seu progresso para no caso de uma interrupção ele possa recomeçar novamente de onde havia parado.
- Beep: Emite um bip quando uma senha é quebrada.

*List.Rules:Single*  
Nesta seção ficam as regras default do software para a quebra das senhas. São regras como substituição de strings, escrita 1337 e outras ![:)](http://adminonline.wordpress.com/wp-includes/images/smilies/icon_smile.gif)

*List.Rules:Wordlist*  
Nesta seção ficam as regras de substituição de caracteres, modificações de palavras, etc quando se está usando uma wordlist para tentar quebrar as senhas do arquivo.

*List.Rules:NT*  
Nesta seção ficam as regras utilizadas quando se está quebrando senhas cifradas utilizando o algoritmo NTLM (Windows).

*Incremental\**  
Aqui ficam as regras para o tipo de quebra de senhas chamado Incremental (todos os “tipos” de tentativas de quebra de senha que o John utiliza serão explicados mais adiante neste documento).

*List.External:\**  
São alguns filtros pré-definidos para substituição de palavras, eliminação de caracteres indesejados, etc.

Quando você tiver mais experiência com o JtR será bastante útil dar uma lida nessas seções para entender como ele funciona e ter um conhecimento melhor dos algoritmos.

**Modos**  
O JtR utiliza alguns modos para que consiga otimizar a quebra da senha. Estes modos são explicados a seguir:

*Modo Wordlist*  
Para utilizar esse método você vai precisar de uma wordlist. Existem vários lugares na Internet que possuem milhares de wordlists disponíveis gratuitamente, é só dar uma olhada no Google que você irá encontrar várias. Para te ajudar, [aqui](http://www.pedroaugusto.eti.br/?q=node/46) no item “Wordlists” você encontra vários links para wordlists disponíveis na Internet. Lá você também encontra algumas dicas de como organizar a sua lista. Mas vale lembrar que não é bom que você tenha entradas duplicadas na sua lista, o JtR não vai fazer absolutamente nada com a sua wordlist antes de começar a testar as palavras que tem nela.

Este é o modo mais simples suportado pelo John. Para utilizá-lo você só especifica uma wordlist e algumas regras para ele fazer combinações das palavras que ele encontrar na lista que você especificou. Quando utilizando determinados algoritmos, o JtR se beneficiará se você colocar senhas com tamanhos mais ou menos parecidos perto umas das outras. Por exemplo, seria interessante você colocar as senhas com 8, 6 ou 9 caracteres perto umas das outras na sua wordlist. A wordlist padrão a ser utilizada pelo John é definida no arquivo john.conf.

*Modo Single Crack*  
É neste modo que você deveria começar a tentar quebrar uma senha. Aqui, além de várias regras de mangling serem aplicadas, o JtR vai utilizar mais informações como o nome completo do usuário e seu diretório home para tentar descobrir qual é a senha. Este modo é muito mais rápido que o modo “Wordlist”.

Se você utilizar vários arquivos com senha, provavelmente você irá conseguir quebrar mais senhas do que com apenas 1 arquivo sendo utilizado separadamente.

*Modo Incremental*  
Este é o modo mais poderoso do JtR. Nele serão tentadas todas as combinações possíveis de caracteres para tentar quebrar a senha cifrada. Dada a grande quantidade de combinações possíveis, é recomendável que se defina alguns parâmetros (como tamanho da senha ou conjunto de caracteres a serem utilizados) para que você não fique esperando pela senha ser quebrada por muito tempo. Todos os parâmetros para este modo são definidos no arquivo john.conf, nas seções começadas com Incremental no nome.

*Modo External*  
Esse modo é bastante complexo. Nele você pode definir regras próprias para o John seguir ao tentar quebrar uma senha. Tais regras são definidas em uma linguagem parecida com a C no arquivo de configuração do programa. Ao ser especificado este modo ao tentar quebrar uma senha na linha de comando, o JtR vai pré-processar as funções que você escreveu para este modo e utilizá-las. Repito: este modo é bastante complexo e leva um tempo até você conseguir aprendê-lo e fazer coisas úteis com ele. Se você está só começando, sugiro que utilize algum dos outros modos que foram mostrados anteriormente, mas se você quer se aventurar e tentar utilizar este modo a documentação oficial do software é um bom ponto de partida: [www.openwall.com/john/doc/EXTERNAL.shtml](http://www.openwall.com/john/doc/EXTERNAL.shtml).

Agora que você já tem um conhecimento geral de quais são os modos disponíveis, podemos passar às opções de linha de comando.

**Linha de comando**  
O John suporta várias opções de linha de comando, geralmente usadas para ativar determinados modos de uso do software. Preste bastante atenção no case das opções, o JtR é case-sensitive! Uma característica muito legal dele é que é possível abreviar as opções da linha de comando desde que não haja ambiguidade (mais ou menos da maneira como ocorre no shell de roteadores Cisco, por exemplo). Abaixo vou dar uma explicação básica das opções que o John suporta. Se você se esquecer de alguma opção quando estiver utilizando o JtR, é só digitar “john” no terminal e todas as opções serão impressas para você. As opções podem ser definidas utilizando — ou – e seus parâmetros são definidos utilizando = ou :.

- –single: Define o modo “single” para quebrar as senhas.
- –wordlist=ARQUIVO: Define o modo “wordlist” para quebrar as senhas e define o arquivo ARQUIVO como sendo de onde as senhas serão lidas. Aqui você pode utilizar também a opção –stdin para dizer que as palavras virão da entrada padrão.
- –incremental: Define que será utilizado o modo “incremental” para quebrar a senhas. Opcionalmente você pode definir que tipo de modo incremental será utilizado fazendo –incremental\[=MODO\].
- –external=MODO: Define que será utilizado o modo external.
- –rules: Habilita as regras para wordlist definidas em john.conf quando se utiliza o modo wordlist.
- –stdout\[=LENGTH\]: Quando utilizado, faz com que o JtR imprima as possíveis senhas direto na saída padrão ao invés de tentá-las contra um hash. Se você definir o parâmetro LENGTH só serão impressas senhas com caracteres até a quantidade especificada em LENGTH.
- –restore\[=NOME\]: Faz com que uma sessão que foi interrompida anteriormente continue de onde parou. Se você definir um nome diferente para a sessão, especifique o nome dela na linha de comando junto com esta opção. A sessão fica gravada na home do John, em um arquivo chamado john.rec.
- –session=NOME: Define o nome da sessão que pode ser utilizado com a opção restore. A esse nome será automaticamente adicionado a extensão .rec.
- –status\[=NOME\]: Mostra o status da última sessão ou, se definido o nome da sessão, da sessão especificada.
- –make-charset=ARQ: Gera um arquivo charset para ser utilizado no modo “incremental”.
- –show: Mostra as senhas do arquivo que você especificou para o JtR que já foram quebradas. Esta opção é especialmente útil quando você tem outra instância do JtR rodando.
- –test: Esta opção faz um benchmark de todos os algoritmos compilados no software e os testa para saber se estão funcionando corretamente. Esta opção já foi explicada anteriormente.
- –users=\[-\]Nome do usuário ou UID: Com esta opção você pode especificar para o JtR quais usuário você quer tentar quebrar a senha. Você pode utilizar o nome de usuário ou o UID dele e pode separar vários usuários utilizando uma vírgula. Utilizando o “-” antes do nome do usuário, você faz com que o John ignore aquele usuário ou UID.
- –groups=\[-\]GID: Faz com que o John tente quebrar apenas as senhas dos usuários participantes de um grupo especificado (ou ignorá-los, se você utilizar o “-”).
- –shells=\[-\]SHELL: Apenas tenta quebrar as senhas dos usuários cujas shells sejam iguais à que foi especificada por você na linha de comando. Utilizando o “-” você ignora as shells especificadas.
- –salts=\[-\]NUMERO: Deixa você especificar o tamanho das senhas que serão (ou não) testadas. Aumenta um pouco a performance para quebrar algumas senhas, porém o tempo total utilizando esta opção acaba sendo o mesmo.
- –format=FORMATO: Permite a você definir o algoritmo a ser usado para quebrar a senha, ignorando a detecção automática do software. Os formatos suportados atualmente são DES, BSDI, MD5, AFS e LM. Você também pode utilizar esta opção quando estiver utilizando o comando –test, como já foi explicado anteriormente neste texto.
- –save-memory=1, 2 ou 3: Esta opção define alguns níveis para dizer ao John com qual nível de otimização ele irá utilizar a memória. Os níveis variam de 1 a 3, sendo 1 a mínima otimização. Esta opção faz com que o JtR não afete muito os outros programas utilizando muita memória.

**Exemplos de uso do John**  
Aqui vou mostrar apenas o uso básico do John. Explorar todas as opções e otimizar o desempenho da descoberta de senhas é a parte mais legal, por isso vou deixar para você mesmo fazer isso.

Nos exemplos que vou mostrar abaixo, vou considerar que você está utilizando o /etc/passwd e o /etc/shadow da sua máquina. Junte estes arquivos utilizando o script unshadow. Também vale lembrar que, se você vai quebrar senhas Windows (LM ou NTLM), você vai precisar de uma ferramenta que faça dumps de hashes destes tipos de senhas. O JtR utiliza o dumper desenvolvido por Jeremy Allison, que pode ser encontrado [aqui](http://www.openwall.com/passwords/pwdump).

Ok, agora você já tem o arquivo com as senhas e usuários que você fez utilizando o unshadow vamos começar a brincar de cracker ![:)](http://adminonline.wordpress.com/wp-includes/images/smilies/icon_smile.gif)

O modo mais simples de se usar o John é especificar o arquivo que tem as senhas e usuário e deixar ele fazer tudo automaticamente. Ele irá começar com o modo single crack, depois irá passar para o modo wordlist e finalmente irá passar para o modo incremental. A linha de comando fica assim:  

```bash
./john senhas.txt
```

Se você, ao analisar o arquivo, achar que alguns usuários possuem shell inválidas como o /bin/false, você pode fazer com que o John não perca tempo tentando quebrar a senha de tais contas assim:  
 
```bash
./john –show –shells=-/bin/false senhas.txt
```

Assim, todo usuário que o John encontrar e que possuir a(s) shell(s) listada será ignorado e ele passará para o próximo.

Se você quiser quebrar a senha de vários arquivos ao mesmo tempo no modo single crack, por exemplo, utilize a seguinte linha de comando:  

 ```bash
./john –single senhas.txt senhas2.txt
```

Na linha acima, de acordo com as opções explicadas anteriormente, –single poderia ser abreviado para –si pois assim não haveria nenhuma ambiguidade em relação a este comando.

Se você quiser especificar o algoritmo a ser usado para quebrar as senhas:  
 
 ```bash
./john –show –format=DES –single senhas.txt
```

Substitua o DES pelo formato correto das senhas presentes no arquivo.

**Conclusão**  

Manter uma política de senhas fortes pode lhe poupar muita dor de cabeça com ataques brute force. Uma auditoria nas senhas de todos os seus usuários deve ser feita para garantir que você continua seguro e não corre muitos riscos utilizando senhas simples demais.

Tentei abranger o máximo possível das opções do John para que você tenha um bom entendimento do software e consiga utilizá-lo eficientemente para garantir a segurança de sua rede ou para melhorar o seu penetration testing. O que você vai fazer com o software é responsabilidade sua.

Caso você precise de mais informações sobre algum tópico que não foi coberto neste texto, consulte a documentação on-line do John. Ela é excelente, porém está disponível apenas em inglês. Acesse [este](http://www.openwall.com/john/doc/) site e dê uma lida nela!
