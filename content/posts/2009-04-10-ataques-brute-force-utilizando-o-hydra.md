---
slug: "ataques-brute-force-utilizando-o-hydra"
title: 'Ataques brute force utilizando o Hydra'
date: '2009-04-10T17:51:57-04:00'
tags:
    - segurança
---

Autor: Pedro Augusto de O. Pereira / <http://augusto.pedro.googlepages.com/>

**Introdução**

Senhas são o ponto mais fraco em qualquer sistema de segurança. Isso acontece porque geralmente as senhas são definidas por seus usuários: pessoas que não tem idéia de como é fácil adivinhá-las e escolhem como senhas o nome da esposa/marido, o nome do cachorro, a data de casamento/nascimento, entre outros. Senhas que não usem caracteres especiais, números, letras maiúsculas e minúsculas, tenham uma quantidade grande de caracteres (com no mínimo 8 caracteres, por exemplo), correm o risco de serem quebradas por ataques de dicionário, também conhecidos como brute force.

Em ataques brute force, o atacante tenta adivinhar a senha por tentativa e erro testando várias combinações de usuários e senhas (disponíveis em listas que podem ser encontradas na Internet ou baseando suas tentativas em dados que conseguiu utilizando engenharia social ou por conhecer a vítima do ataque) para tentar logar em um determinado serviço no qual ele não tem autorização, obtendo um shell em um servidor por exemplo.

Efetuar este tipo de ataque é bem demorado e pode ser facilmente impedido por administradores que utilizem técnicas como limitar o número de tentativas erradas utilizando um determinado nome de usuário. Porém, existem várias ferramentas que fazem com que estes ataques sejam efetuados de modo mais eficiente.

**THC Hydra**  
A que eu mais gosto, é o [THC Hydra](http://www.thc.org/thc-hydra/), desenvolvido pelo Van Hauser do [THC](http://www.thc.org/).

O Hydra tem um desempenho muito bom (utiliza threads paralelas, dividindo as senhas e nomes de usuários entre estas threads diminuindo o tempo levado para ele conseguir adivinhar a senha) e consegue efetuar com sucesso ataques brute force nos protocolos TELNET, FTP, HTTP, HTTPS, HTTP-PROXY, SMB, SMBNT, MS-SQL, MYSQL, REXEC, RSH, RLOGIN, CVS, SNMP, SMTP-AUTH, SOCKS5, VNC, POP3, IMAP, NNTP, PCNFS, ICQ, SAP/R3, LDAP2, LDAP3, Postgres, Teamspeak, Cisco auth, Cisco enable, LDAP2, Cisco AAA. Além disso, está em constante desenvolvimento e é completamente gratuito com o código-fonte 100% disponível. Ele ainda possui uma interface gráfica, o HydraGTK. Ela é completamente independente do software e não precisa ser compilada para que você consiga utilizá-lo. Porém, sem ela você só poderá utilizá-lo através da linha de comando.

Você pode utilizar o Hydra em qualquer Unix como Linux, \*BSD, Solaris, etc; Mac Os/X; no Windows utilizando o [Cygwin](http://www.cygwin.com/); em dispositivos móveis que utilizem processadores ARM e Linux e em dispositivos que utilizem o PalmOS.

Seguem os links para que você possa fazer o download:

- Para Unix: [hydra-5.4-src.tar.gz](http://www.thc.org/releases/hydra-5.4-src.tar.gz)
- Para Windows/Cygwin: [hydra-5.4-win.zip](http://www.thc.org/thc-hydra/hydra-5.4-win.zip)
- Binário para o ARM: [hydra-5.0-arm.tar.gz](http://www.thc.org/thc-hydra/hydra-5.0-arm.tar.gz). Esta versão está um pouco desatualizada, mas em breve será disponibilizada uma nova versão.
- Binário para o Palm: [hydra-4.6-palm.zip](http://www.thc.org/thc-hydra/hydra-4.6-palm.zip). A versão para o Palm é desenvolvida de forma independente das outras, portanto nem todos os protocolos são suportados e os updates não são muito frequentes.

**Compilando e instalando**

Dependendo do pacote que você escolher, será necessário que você compile o software. Algumas releases como a disponível para Windows/Cygwin e ARM já contém tudo compilado e pronto para o uso, com todos os módulos (no port para o ARM você não poderá usar o módulo para SAP R/3).

Se você escolheu o pacote para Unix, você precisará instalar todas as bibliotecas necessárias para compilar os módulos corretamente. O serviço não é tão difícil, já que ao executar o *./configure*, já será mostrado um resumo dizendo as bibliotecas que faltam e onde encontrá-las. Seguem os passos necessários para compilar com sucesso o Hydra em qualquer \*nix.

Faça o download do pacote hydra-5.4-src.tar.gz e descompacte:

```bash
tar xzvf hydra-5.4-src.tar.gz
```

Acesse o diretório que acabou de ser criado e:

```bash
cd hydra-5.4-src
./configure
```

Quando você executa o configure, algumas bibliotecas que são necessárias para alguns módulos como SSHv2 e PostgreSQL (libssh e libpq, respectivamente) são checadas e se não estiverem instaladas no sistema você deverá instalá-las na mão. A boa notícia é que o script já informa o site de onde você pode fazer o download e a maioria dessas bibliotecas já vem com instruções de como compilar. Vale a pena lembrar que, se você não quiser utilizar os módulos que precisam das bibliotecas, pode continuar a compilação normalmente: os outros protocolos irão funcionar sem problemas.

Depois que o *./configure* terminar, só resta executar como root:

```bash
make && make install
```

Pronto! O Hydra já está instalado e pronto para ser usado!

**Wordlists**

Wordlists são, como o nome diz, listas gigantescas de palavras ou nomes de usuários que são utilizadas em ataques bruteforce. O Hydra não vem com nenhuma wordlist e não funciona sem uma, então você precisa dar um jeito nisso. Vou colocar alguns links com wordlists para você começar a brincar com o Hydra:

- <http://www.outpost9.com/files/WordLists.html>
- <http://wordlist.sourceforge.net/>
- [http://www1.harenet.ne.jp/~waring/vocab/wordlists/vocfreq.html](http://www1.harenet.ne.jp/%7Ewaring/vocab/wordlists/vocfreq.html)

Depois que você baixar as listas, junte todas em um único arquivo. No Hydra, você só pode especificar um único arquivo de wordlists para ser utilizado. Você pode usar o *cat*. Por exemplo:

```bash
cat <substitua isso por todos os arquivos de wordlists que você tem> >> wordlist2.txt
```

É útil também remover entradas duplicadas da sua wordlist, para não perder tempo tentando mais de uma vez uma senha que já não deu certo:

```bash
cat wordlist2.txt | sort | uniq > wordlistfinal.txt
```

Pronto, agora é só fazer o Hydra utilizar o arquivo wordlistfinal.txt como wordlist.

**Utilizando o Hydra**

O Hydra é bem fácil de ser utilizado. Você só precisa especificar o login (ou um arquivo com vários logins), a wordlist com senhas, o host e o protocolo. Se desejar pode fazer com que a saída do comando seja escrita em algum arquivo. Na linha a seguir, mostro o uso básico do Hydra:

```bash
hydra -l root -P ~/wordlistfinal.txt -o bruteforce.txt ftp.foo.bar ftp
```

A linha acima é bem simples. A opção -l diz que você quer fazer brute force em um usuário específico que você já sabe que existe (você poderia usar a opção -L para utilizar um arquivo com vários logins); a opção -P específica qual wordlist será usada para ler as senhas (você poderia usar -p se soubesse uma senha, mas não soubesse de qual usuário é); -o escreve a saída do comando no arquivo bruteforce.txt; ftp.foo.bar é o nome do host que iremos atacar e ftp é o protocolo que o Hydra deve usar.

Se você por algum motivo precisar interromper a sessão do Hydra, pode começar de onde parou utilizando a opção -R no mesmo diretório em que você interrompeu a execução anterior.

Outras opções úteis são:

- -s: Se o serviço estiver sendo executado em uma porta diferente, use esta opção para especificar a porta.
- -t: Indica a quantidade de conexões paralelas no servidor
- -M: Define uma lista de servidores a serem atacados

**Como se proteger**

Se proteger de ataques brute force não é tão difícil assim:

- Forçar utilização de senhas seguras nos seus servidores. Senhas com caracteres especiais, letras maiúsculas e minúsculas, números e um comprimento de pelo menos 8 caracteres.
- Determinar um número máximo de erros na tentativa de login.
- Sempre monitore os log’s procurando por tentativas de login que falharam muitas vezes.
- Onde puder, mude a porta padrão dos serviços sendo executados na sua máquina (por exemplo, se só você utilizar o SSH você pode mudar a porta dele de 22 para 45600, por exemplo. Isso diminui a incidência de ataques)
- Onde possível, especifique o IP de origem que pode estabelecer a conexão com determinados serviços

Como se vê, é bem simples melhorar a segurança de seus serviços. Isso é o mínimo necessário para não ter muita dor de cabeça com qualquer pessoa que saia usando o Hydra e seus similares por aí. Porém estas não são as únicas técnicas e também não excluem a necessidade de verificação contínua nos log’s e conexões estabelecidas no servidor procurando por atividades suspeitas.

**Conclusão**  
O Hydra é talvez a melhor ferramenta para ataques de brute force: tem um ótimo desempenho, é multiplataforma e várias opções úteis, além disso está em desenvolvimento constante e novas versões são lançadas frequentemente (não há um ciclo de release definido).

Vale a pena aprender a utilizar a ferramenta (o que não é difícil) e utilizá-la em seus servidores para identificar pontos-fracos antes que alguém faça isso por você
