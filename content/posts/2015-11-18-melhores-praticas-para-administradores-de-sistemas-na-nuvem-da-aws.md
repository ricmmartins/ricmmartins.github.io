---
slug: "melhores-praticas-para-administradores-de-sistemas-na-nuvem-da-aws"
title: 'Melhores práticas para administradores de sistemas na nuvem da AWS'
date: '2015-11-18T21:20:30-05:00'
tags:
    - aws
---

A idéia deste artigo é compartilhar com vocês um pouco das práticas que eu adoto nos ambientes que administro na nuvem da AWS. Se você gostar e concordar com os pontos levantados aqui, compartilhe este artigo e ajude a divulgar estas informações para outras pessoas. Se você tiver mais sugestões, elas são bem vindas!

## Não use sua conta root da AWS

Ao criar sua conta na AWS, você tem acesso à sua conta root da AWS. Esta é a conta que você utiliza para fazer login informando seu email e senha criada no momento do cadastro.

Depois de criar sua conta, os passos que você deve seguir para proteger melhor sua conta são:

- Ativar o MFA na conta root;
- Criar um usuário administrativo no IAM;
- Criar um link de sign-in customizado para sua conta;
- Criar as contas dos seus usuários no IAM e utilizar o link de sign-in customizado para realizar o acesso na conta.

## Habilite o uso de Roles para instâncias EC2

Em alguns casos, você pode precisar que uma aplicação, acesse um bucket no S3. O ponto é que criar um usuário para uma aplicação, implica em gerar também uma credencial de segurança (Acccess Key/Secret Access Key) para ele, o que pode se tornar um ponto de insegurança.

Ao invés disso, você pode criar uma role para a instância EC2 onde esta aplicação irá rodar, de modo que esta role permita acesso ao bucket específico. Desta forma automaticamente a aplicação rodando nesta instância terá acesso ao bucket pela role concedida à instância.

Quando você usa roles desta forma, as credenciais de segurança da instância são temporárias e a própria AWS se encarrega de fazer o rotacionamento dela a cada cinco minutos! Você pode ler mais à respeito disso aqui: <http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/iam-roles-for-amazon-ec2.html>

## Seja organizado

Se você administra uma conta com vários ambientes, por exemplo, desenvolvimento, homologação e produção, você pode criar uma VPC para cada ambiente de modo a menter os ambientes isolados.

Com uma VPC para cada um dos ambientes, você terá subredes e tabelas de rotas distintas entre eles melhorando a segurança no seu ambiente, além de facilitar a gerência como um todo.

Se por algum motivo você precisar de algum tráfego entre seus ambientes, como por exemplo de uma VPN, você pode habilitar o [VPC Peering](http://docs.aws.amazon.com/AmazonVPC/latest/UserGuide/vpc-peering.html) e liberar o tráfego entre as VPCs.

Uma outra opção nos casos onde você não tenha que atender à alguns requisitos de [PCI-DSS](https://pt.pcisecuritystandards.org/security_standards/) por exemplo, seria ao invés de segmentar os ambientes por VPCs distintas, fazer o uso de subredes para estes ambientes tendo cada um deles em subredes diferentes. Além disso, use o recurso de tags. Coloque tags em tudo e simplifique a busca por recursos. Além das tags com os nomes dos recursos, você pode criar tags para projetos por exemplo, o que vai te dar maior eficiência sempre que precisar procurar por algo que esteja relacionado com um projeto em específico.

## Tenha controle total sobre seu ambiente

> “Se você não pode medir, você não pode gerenciar” (Peter Drucker)

Essa frase resume bem o principal ponto aqui: monitoramento.

Para ter total controle sobre um ambiente você precisa saber exatamente tudo o que acontece com ele. Você só vai ter isso, através de um monitoramento refinado.

Minhas sugestões são Zabbix ou New Relic. O Zabbix é uam ferramenta opensource, que permite ínumeras possibilidades de configurações de monitoramento. O New Relic é um monitoramento no modelo SaaS. Fornece opções para monitoramento de servidores e aplicações, sendo excelente para coleta de informações sobre performance de aplicações. Também possui diversos plugins para todo tipo de coisa, como node, nginx, php, java, etc. No entanto é uma ferramenta onde o único monitoramento gratuito, é o de servidores. As demais funções são pagas.

Uma outra ferramenta muito interessante que eu costumo usar é o [Monit](https://mmonit.com/monit/). Apenas como informação, a própria Amazon usa o Monit no OpsWorks. É uma excelente ferramenta para monitoramento de processos e serviços. Dentre as diversas coisas que faz, permite executar ações em resposta à eventos monitorados. Você pode conferir um pouco do que ele é capaz de fazer aqui: <https://mmonit.com/monit/#slideshow>

O próprio CloudWatch também é uma ferramenta espetacular que você deve ficar de olho. Além de centenas de métricas já definidas, você consegue configurar alertas para notificar quando algum parâmetro que esteja sendo monitorado seja alcançado.

Outros recursos muito interessantes são o Healthcheck e DNS Failover do Route53. Por exemplo, se você tem um load balancer com duas instâncias sob ele, você tem um healthcheck do próprio ELB que pode tirar uma instância do balanceamento caso ela não esteja saudável ou apresentando problemas na resposta do healtchcheck.

No entanto caso você tenha mais de um recurso com a mesma função, por exemplo, mais de um webserver para o mesmo site, mas não esteja com eles sob um ELB, você pode usar o recurso de healtcheck em cima da conexão http de cada um deles e caso um esteja fora, seu DNS não irá mais enviar os requests para o que não está funcionando corretamente.

Além disso pode usar o recurso de DNS Failover para responder à requests nos seus servidores usando algoritmos interessantes, tendo rotas definidas por peso, latência, localidade, etc.

## Mantenha atenção na segurança, sempre

Por último mas não menos importante, alguns detalhes sobre segurança. Aqui o ponto é: atenção aos seus security groups.

Em um ambiente bem planejado, você deve se preocupar em segmentar sua VPC com subredes públicas e privadas. Isso é importante já que você não vai querer sua instância onde está seu banco de dados com a porta 3306 exposta na internet e vulnerável à tentativas de ataques.

Para resolver isso, o que você faz:

Coloque na subrede pública, apenas os serviços essenciais que serão acessados pelos seus usuários na internet. De modo geral, você deverá ter apenas seu webserver exposto. Os demais serviços, que não são acessados por usuários, mas apenas por outros serviços, devem estar na subrede privada.

Adotando este conceito, apenas os seus servidores da subrede pública, precisarão ter IPs públicos. Todos os serviços da subrede privada podem ter apenas IPs privados dentro do range que você tenha definido na criação da sua VPC.

Para que isto funcione corretamente, você vai precisar colocar servidores NAT na sua rede pública, e na tabela de rotas da sua subrede privada configurar para que a rota para 0.0.0.0/0, saia pela instância de NAT.

Já na sua subrede pública, a rota para 0.0.0.0/0 é sair pelo IGW.

Ok, e você deve estar se questionando como fazer para acessar as instâncias que estiverem na rede privada, ja que elas não terão IPs públicos para que você possa se conectar…

Basta adicionar na sua subrede pública um servidor de VPN. Minha sugestão é usar o OpenVPN para isso. Feito isso, crie chaves de acesso VPN para seus usuários.

Digamos que o CIDR da sua VPC seja 10.0.0.0/16 e você tenha uma subrede privada no range 10.0.1.0/24 e uma subrede pública no range 10.0.0.0/24. Ao configurar seu servidor VPN, você pode configurar para que ele distribua endereços IPs no mesmo escopo da sua VPC evitando ter que criar novas rotas na tabela de rotas da subrede privada.

Assim, você pode configurar seu servidor VPN para distribuir endereços para os clientes VPN no range 10.0.10.0/24 por exemplo . Em seguida insira configurações adicionais de rotas para a sua subrede privada no OpenVPN. Veja:

```
push "route 10.0.0.0 255.255.255.0"
push "route 10.0.1.0 255.255.255.0"
push "dhcp-option DNS 8.8.4.4"
push "dhcp-option DNS 8.8.8.8"
```

Com essas configurações as conexões VPN dos clientes terão rotas para suas subredes e as configurações de DNS definidas para usar os DNS’s do Google. Assim caso precisem acessar à internet estando conectados na VPN, não terão problemas na resolução de nomes.

Voltando a falar um pouco sobre security groups agora, vou comentar sobre o que eu costumo fazer.

De modo geral, procuro sempre criar um security group por instância. A única excessão é nos casos onde você tem por exemplo dois servidores com a mesma função, onde neste caso, associo ambos à um mesmo security group.

Eu já ví por aí coisas como um único security group para tudo, todas as instâncias. Nunca faça isso! Além de acabar abrindo portas excessivamente para todas as instâncias, a gerência sobre isso fica muito complicada.

Tendo um security group para cada instância, você tem a opção de liberar o acesso para security groups específicos. Um detalhe interessante, é que liberando para o security group, ele libera para o IP interno da instância que está associada com este security group.

Por exemplo, voltando ao caso do nosso servidor mysql. Supondo que a instância do mysql possua um security group dela, e a instância do seu servidor web também possua um security group próprio, você pode ir no security group da instância do mysql e liberar o acesso da porta TCP 3306 para o security group da sua instância que é o servidor web.

Isto irá liberar o acesso TCP na porta 3306 do mysql para o ip privado do servidor web.

Para suas instâncias na subrede pública, como elas estarão expostas na internet você tem que ter um trabalho diferenciado para tratar ameaças.

Em geral, no caso de acesso SSH por exemplo, você deve restringir o acesso para seu range de ips privados. Assim, basta estar conectado à vpn, que você consegue acesso SSH nas instâncias.

Não é o ideal, mas se precisar deixar a porta SSH aberta para 0.0.0.0/0, use ao menos uma ferramenta como o Fail2Ban, para minimizar o impacto de tentativas de login inválidas.

No caso de um servidor Web, se ele estiver sob um ELB, uma boa prática é deixar o acesso do ELB liberado na porta 80 repassando as conexões para a porta 80 da instância e limitar o acesso à porta 80 da instância apenas ao security group do ELB.

Como a AWS já possui alguns mecanismos de controle e segurança, restringir que o acesso na porta 80 da instância seja liberado apenas para os requests que vierem do ELB, já minimiza boa parte dos problemas.

Enfim, estas são minhas dicas para você que assim como eu, administra ambientes na nuvem da AWS.

Se tiver sugestões à acrescentar, fique a vontade.
