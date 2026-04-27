---
slug: "vpn-com-freeswan"
title: 'VPN com FreeS/WAN'
date: '2009-04-10T17:42:43-04:00'
tags:
    - networking
    - linux
description: "Autor: Pedro Augusto de O. Pereira / O FreeS/WAN é uma das várias implementações do IPSec (Internet Protocol Security) e IKE (Internet Key Exchange) para"
---

Autor: Pedro Augusto de O. Pereira / <http://augusto.pedro.googlepages.com/>

**Introdução**

O FreeS/WAN é uma das várias implementações do IPSec (Internet Protocol Security) e IKE (Internet Key Exchange) para GNU/Linux.

Utilizando estes dois serviços, você pode fazer um túnel seguro entre duas redes distantes com seus dados passando por redes inseguras (como a Internet). O IPSec consegue fazer com que os dados trafeguem de modo seguro através de uma rede insegura, pois tudo o que passará por este túnel é criptografado pelo gateway com IPSec instalado e só é descriptografado na outra ponta. No gateway que conhece a chave para realizar a descriptografia. Assim, você consegue estabelecer uma VPN (Virtual Private Network) entre vários locais diferentes, utilizando a Internet, de forma bastante segura.

Para descrever como estabelecer um túnel VPN criptografado, neste documento vou me basear na versão 2.06 do FreeS/WAN.

**Instalação**  
Para que você consiga usar o FreeS/WAN a partir dos RPM’s, você tem que necessariamente ter os pacotes freeswan-userland-xxx.rpm e freeswan-module-xxx.rpm. Você pode encontrar esses pacotes no seguinte site:

[http://www.freeswan.org/download.html](http://www.freeswan.org/download.html "http://www.freeswan.org/download.html")

Então, para instalar o FreeS/WAN a partir dos pacotes RPM, faça o seguinte:

```bash
# rpm -ivh freeswan-userland-xxx.rpm  
# rpm -ivh freeswan-module-xxx.rpm
```

Depois de instalar os dois pacotes, serão criados (entre outros) dois arquivos no seu diretório /etc: o ipsec.conf e o ipsec.secrets. Veremos mais adiante para que cada um deles serve.

**Gerando as chaves RSA – utilizando o arquivo ipsec.secrets**  

Antes de começar a configurar o serviço propriamente dito, vamos gerar as chaves para a autenticação dos nossos gateways. Para isso é só usar o comando ipsec_newhostkey. Por padrão, a chave gerada com este comando deve ir para o arquivo /etc/ipsec.secrets, porém você pode mudar o arquivo para qualquer um que você queira.

Então, vamos gerar a nossa chave:

```bash
# ipsec_newhostkey –output /etc/ipsec.secrets –bits 128 –hostname gateway_1
```

Com o comando acima, nós geramos a chave de autenticação do host gateway_1 de 128 bits e a guardamos no arquivo ipsec.secrets. Esse processo deve ser feito para o outro gateway que estabelecerá o túnel VPN com este gateway.

Tenha certeza absoluta de que o nome da máquina que você forneceu ao gerar a chave é o correto. Se este nome estiver errado, a chave será gerada de forma errônea e você não conseguirá estabelecer um túnel entre os gateways.

Como você já deve ter percebido, no arquivo ipsec.secrets só deve haver a chave do gateway que você está configurando. Por exemplo, se eu estou configurando o gateway gateway_1, no meu arquivo ipsec.secrets só deverá existir a chave deste host. Quando eu for configurar o gateway_2, no ipsec.secrets deste só deverá haver a chave do gateway_2.

**Configurando o serviço IPSec – utilizando o arquivo ipsec.conf**  

Depois que você gerou todas as chaves necessárias em todos os hosts, é hora de editar o arquivo ipsec.conf para configurar como será a nossa VPN.

Vou tentar deixar claro para que servem todas as opções neste arquivo (que não são muitas).

**interfaces=%defaultroute**

Essa opção necessariamente tem que estar certa sempre, ou praticamente nada irá dar certo!

Se o seu gateway for o caminho certo para a VPN, então pode deixar exatamente como está. Se não, altere para a placa de rede que terá a comunicação com a outra ponta da VPN. Por exemplo, se a VPN for estabelecida via a placa de rede eth0, então a linha deverá ficar:

**interfaces=”ipsec0=eth0?**

A opção interfaces=”ipsec0=eth0? vai ser o suficiente se a sua VPN for bem simples.

**klipsdebug=none  
plutodebug=none**

Estas opções geralmente são mais necessárias quando a sua VPN está com algum problema. Elas “medem” o nível de informação que será logado pelo serviço IPSec. Se você quiser o máximo de informações possível, é só mudar “none” para “all”.

**uniqueids=yes**

Esta opção faz com que uma conexão antiga seja encerrada quando uma nova, com a mesma ID, apareça.

Nas opções acima, será muito difícil você ter que alterar alguma coisa, a não ser que a sua VPN seja um caso um pouco mais específico.

**keyingtries=0**

Esta opção indica a quantidade de tentativas que devem ser feitas para se negociar uma conexão antes de desistir. Esta opção só tem efeito localmente, ou seja, o outro lado não precisa necessariamente ter o mesmo número de tentativas especificadas nesta opção. Para fazer com que o serviço não desista nunca, deixe com o “0? ou substitua por %forever (é recomendado que se deixe o “0? mesmo).

**disablearrivalcheck=no**

Habilita ou desabilita a checagem dos pacotes que acabam de chegar do túnel. É recomendado que você nunca desabilite esta opção, pois ela aumenta a segurança e confiabilidade do túnel e não atrapalha em nada.

**authby=rsasig**

Define como os gateways participantes da VPN irão autenticar-se. As opções são:

- secret, para senhas;
- rsasig, para assinaturas RSA (o padrão e melhor opção);
- secret|rsasig, para usar ambas as opções ou never, usado se você nunca for querer estabelecer a conexão ou não for aceitá- la.

Como já foi dito anteriormente, a melhor opção é usar assinaturas RSA (rsasig).

**leftrsasigkey=%dns  
rightrsasigkey=%dns**

Define como será encontrada a chave RSA. Os valores que podem ser usados são:

- %none = é o mesmo que não especificar um valor;
- %dnsondemand = é o valor padrão. Significa que a chave será lida do DNS quando for necessária;
- %dnsonload = com esta opção, a chave RSA será lida do DNS quando a conexão for ativada. Nas versões mais atuais do FreeS/WAN, esta opção será tratada como %none se right=%any ou %opportunistic;
- %dns = é tratado como %dnsonload. 
    - - tunnel = define uma conexão host a host, host a sub-rede ou sub-rede a sub-rede. Esta é a opção padrão;
        - passthrough = define que o IPSec não deve ser usado para estabelecer a conexão;
        - drop = define que todos os pacotes devem ser descartados;
        - reject = define que os pacotes devem ser descartados. 
        - start = define que a conexão será iniciada assim que o serviço IPSec for iniciado;
        - add = define que a conexão será feita manualmente. Para que se consiga estabelecer a conexão manualmente, deve- se usar o comando ipsec auto –up nome_da_conexão.
        - Os arquivos ipsec.conf devem ser iguais nas duas pontas do túnel;
        - Os arquivos ipsec.secrets devem sempre ser diferentes, cada um com a chave de seu respectivo host;
        - Um gateway não pinga outro gateway;
        - Uma estação não ping um gateway;
        - Uma estação pode pingar outra estação.
    
    
    **conn sample**Aqui começam as configurações dos túneis que serão estabelecidos. A linha “conn sample” é o nome da conexão. Você poderia mudá-la para qualquer nome, como “conn campinas”. Lembre-se que você não pode mudar o “conn”, apenas o nome que segue.
    
    **type=tunnel**
    
    Define o tipo da conexão a ser estabelecida. Você pode colocar os seguintes valores aqui:
    
    **left=210.xxx.xxx.xxx  
    right=200.xxx.xxx.xxx**
    
    Define qual será a ponta left (ou right) do seu túnel VPN. O FreeS/WAN trabalha do seguinte modo: cada host participante do túnel pode ser left ou right. Não importa qual seja o tipo da VPN a ser estabelecida, você sempre deve definir quem será o left e quem será o right. Nesta opção, deve ser definido o IP do host que você definiu que será o left. Não tem muita importância um host ser left ou right (na verdade, isso praticamente não importa) desde que você seja consistente na sua escolha, ou seja, se você definiu o host gateway1 como left, referencie- se a ele sempre como left.
    
    **leftsubnet=192.168.0.0/24  
    rightsubnet=192.168.0.0/24**
    
    Aqui é definido qual é o endereço da sub-rede (da rede que está “atrás”) do host. No exemplo é 192.168.0.0, que é um endereço de classe C. Se usássemos um endereço de classe A, deveríamos colocar /8; caso fosse classe B seria /16.
    
    **leftrsasigkey=0s$Pa%6…  
    rightrsasigkey=$#1@psoeKe~…**
    
    Aqui você deve colocar a chave RSA do host left para que o túnel seja estabelecido com sucesso. A chave que deve ser colocada aqui, é a chave que está no arquivo ipsec.secrets, mais especificamente a chave que está na linha “pubkey=…”, que foi gerada com o comando ipsec\_newhostkey explicado anteriormente. O mesmo vale para a opção rightrsasigkey encontrada mais adiante no ipsec.conf.
    
    **leftnexthop=200.xxx.xxx.xxx  
    rightnexthop=200.xxx.xxx.xxx**
    
    Aqui deve ser definido qual o endereço IP do gateway usado pelo host. Esta opção só tem importância localmente, ou seja, não necessariamente deve ser igual nas duas pontas do túnel.
    
    **auto=start**
    
    Define quando a conexão referenciada por esta opção será ativada. Alguns valores que podem ser colocados aqui são:
    
    **Testando os túneis**  
    Agora que nós já configuramos o serviço IPSec, podemos começar nossos testes. Alguns detalhes devem sempre ser observados:
    
    Tendo observado estes detalhes, tente pingar uma estação que esteja na sub-rede da outra ponta. Se tudo estiver correto, a outra estação irá responder a todos os pings.
    
    **Troubleshooting – corrigindo os inevitáveis erros**  
    Caso você não esteja conseguindo pingar as máquinas da sub-rede da outra ponta do túnel e o serviço IPSec tenha inicializado sem erro nenhum, verifique se as portas 500 do protocolo UDP estão abertas tanto para entrada quanto para saída (para o IKE) e as portas 50 também estejam abertas para entrada e saída. Deixar estas portas fechadas geralmente impede o IPSec de passar da primeira fase da negociação da conexão.
    
    Se você está tendo problemas ao iniciar o serviço IPSec, é bom que você entenda as etapas da negociação das conexões.
    
    As negociações do IKE possuem duas fases: Main Mode, STATE_MAIN.  
    As negociações do IPSec também possuem duas fases: Quick Mode, STATE_QUICK.
    
    Quando os passos anteriores são realizados com sucesso, serão mostradas as mensagens:
    
    “nome_da_conexão” STATE_MAIN_I4 (ISAKMP SA established…)  
    “nome_da_conexão” STATE_QUICK_I2 (sent QI2, IPSec SA established…)
    
    Quando você não consegue estabelecer o túnel de forma correta, geralmente estes passos não são atingidos. Assim, o comando:
    
    **# ipsec auto –status**
    
    Será muito útil, pois ele te mostrará o último estado da negociação que foi alcançado, mas não informa o estado atual, porém você pode deduzir qual o estado atual verificando se o último passo mostrado pelo comando foi finalizado com sucesso.
    
    Para que o IPSec mostre mais mensagens de erro para facilitar o troubleshoot, você pode usar o comando:
    
    **# ipsec auto –verbose –up nome_da_conexão**
    
    Assim ele irá mostrar mensagens sobre todos os passos da negociação da conexão especificada.
    
    É sempre bom lembrar que também é muito útil que se olhe os logs do seu sistema. Porém o nível de detalhes que serão logados dependerá do que você colocou nas opções “klipsdebug” e “plutodebug” do arquivo ipsec.conf. Se tiver problemas, coloque pelo menos uma delas para “all” para que você tenha uma base melhor para descobrir onde está o erro.
    
    Outro comando que também pode ajudar muito na hora de achar o erro de alguma conexão do FreeS/WAN é o barf. Ele imprime na tela várias informações relevantes sobre a encriptação e autenticação do IPSec. O uso dele é o seguinte:
    
    **# ipsec barf**
    
    Assim ele já imprime várias informações muito úteis. Porém, é melhor que se passe essas informações para um arquivo para que se possa observá-las com mais calma:
    
    **# ipsec barf >> conexão_com_problema.txt**
    
    Bom, estas são algumas dicas básicas para que você consiga resolver os problemas que por ventura apareçam por aí.
    
    **Fontes e conclusão Site oficial, com uma documentação extremamente detalhada:\* [http://www.freeswan.org](http://www.freeswan.org/ "http://www.freeswan.org"). Tutorial muito bom sobre o assunto:**
    
    * [http://www.linuxman.pro.br/vpn](http://www.linuxman.pro.br/vpn "http://www.linuxman.pro.br/vpn")
    
    Esta foi só uma olhada básica no serviço IPSec, que é extremamente útil em muitos casos. Espero que tenha sido de alguma ajuda para você.
