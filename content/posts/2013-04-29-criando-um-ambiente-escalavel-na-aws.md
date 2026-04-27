---
slug: "criando-um-ambiente-escalavel-na-aws"
title: 'Criando um ambiente escalável na AWS'
date: '2013-04-29T12:46:50-04:00'
tags:
    - aws
    - cloud
description: "Nesse post vou abordar como escalar seu site na estrutura de cloud computing da AWS."
---

Nesse post vou abordar como escalar seu site na estrutura de cloud computing da AWS.

Para este procedimento, vamos assumir que já temos uma instância no ar em pleno funcionamento.

Caso você não tenha ainda uma instância rodando, dê uma passada no AWS Hub, neste link: [http://awshub.com.br/resources/amazon-web-services-hands-on-ec2-e-ebs/. ](http://awshub.com.br/resources/amazon-web-services-hands-on-ec2-e-ebs/)É um tutorial passo-a-passo sobre a criação da sua primeira instância na Amazon. Dê uma lida também em [http://aws.amazon.com/pt/free/.](http://aws.amazon.com/pt/free/)

Este segundo link fala sobre o AWS Free Tier, uma oferta da Amazon que lhe garante um ano de uso gratuito para que você possa se familiarizar e aprender mais sobre os serviços AWS. Este link descreve de forma bem detalhada o que está incluso nesta oferta gratuita.

Não se assuste, mas ao fazer seu cadastro você precisará informar seus dados de cartão de crédito. No entanto caso você utilize o s recursos dentro do que é oferecido no Free Tier, não será cobrado. Confira os termos de uso [aqui](http://aws.amazon.com/pt/free/terms/).

O próximo passo será criar uma imagem (AMI) desta instância. Esta imagem será utilizada para subir novas instâncias idênticas a que está em produção.

Em seguida criaremos um Load Balancer, e colocaremos nossa instância sob ele. Deste momento em diante, ele quem irá responder pelas requisições e direcionar para as máquinas que estiverem sob ele.

Por fim colocaremos nosso Auto Scaling em funcionamento, para subir novas instâncias de acordo com as regras que serão estabelecidas.

Parece interessante? Então confira!

## **Primeiro Passo**: Criar uma AMI da nossa instância.

Vamos então ao menu “**Instances**”

[![aws](/wp-content/uploads/2013/04/14.png)](/wp-content/uploads/2013/04/14.png)

Selecionamos nossa instância e com o botão direito escolhemos a opção correspondente:

[![1](/wp-content/uploads/2013/04/15.png)](/wp-content/uploads/2013/04/15.png)

Damos um nome e descrição para nossa ami e em seguida clicamos em “**Yes, Create**”. Note que caso não deseje que a máquina seja reiniciada, basta marcar a opção “**No Reboot**”

[![1](/wp-content/uploads/2013/04/16.png)](/wp-content/uploads/2013/04/16.png)

Será exibida a tela abaixo, onde já podemos notar a identificação dada à nossa ami (**ami-cd8deea4**). O processo é bastante rápido, e você pode verificar o andamento em Images >  AMI’s .

[![1](/wp-content/uploads/2013/04/18.png)](/wp-content/uploads/2013/04/18.png)

Acompanhando a criação da AMI:

[![1](/wp-content/uploads/2013/04/19.png)](/wp-content/uploads/2013/04/19.png)

Aguarde o status mudar de “**pending**” para “**available**”. Neste instante nossa AMI estará pronta para uso:

[![1](/wp-content/uploads/2013/04/111.png)](/wp-content/uploads/2013/04/111.png)

## **Segundo Passo**: Criar um LB

Acesse o console AWS em Network & Security escolha “**Load Balancers**”. Em seguida, “Create Load Balancer”

[![1](/wp-content/uploads/2013/04/112.png)](/wp-content/uploads/2013/04/112.png)

Defina um nome para o load balancer. Aqui escolhi meu nome: ricardomartins.

[![1](/wp-content/uploads/2013/04/113.png)](/wp-content/uploads/2013/04/113.png)

Na tela seguinte escolha o método de Health Check. Eu costumo fazer desta forma:

[![1](/wp-content/uploads/2013/04/114.png)](/wp-content/uploads/2013/04/114.png)

Em seguida adicione manualmente sua instância ao LB

[![1](/wp-content/uploads/2013/04/115.png)](/wp-content/uploads/2013/04/115.png)

Revise as configurações e avance para concluir e criar

[![1](/wp-content/uploads/2013/04/116.png)](/wp-content/uploads/2013/04/116.png)

Caso estivéssemos em um ambiente VPC (Virtual Private Cloud), o próximo passo seria definir um Security Group para nosso LB. Como estamos em ambiente EC2, não temos este passo para seguir e nossa configuração está pronta:

[![1](/wp-content/uploads/2013/04/118.png)](/wp-content/uploads/2013/04/118.png)

Para testar vamos pegar o endereço dado ao nosso LB e vamos acessar por ele. Como a máquina que está sob este LB está com o Nginx instalado, deveremos ver a página default do Nginx:

[![1](/wp-content/uploads/2013/04/119.png)](/wp-content/uploads/2013/04/119.png)

Pronto! Tudo funcionando!

## **Terceiro Passo**: Configurar o Auto Scalling.

Desde ponto em diante, precisamos das ferramentas AWS instaladas e configuradas. Caso você não tenha feito isto ainda, confira neste post como fazer: <http://www.ricardomartins.com.br/2013/04/26/configurando-as-ferramentas-aws-aws-tools/>

Rode o comando **ec2-describe-instances**. Ele irá trazer todas as informações sobre a sua instância:  

```bash
[root@ip-10-245-66-44 ec2-user\]# ec2-describe-instances  
RESERVATION r-6a0a9017 668485333633 rmartins  
INSTANCE i-12d7637a ami-3275ee5b ec2-54-234-36-94.compute-1.amazonaws.com ip-10-245-66-44.ec2.internal running rmartins 0 t1.micro 2013-04-05T14:32:28+0000 us-east-1a aki-88aa75e1 monitoring-disabled 54.234.36.94 10.245.66.44 ebs paravirtual xen HtOSq1365172347824 sg-47104b2f default false  
BLOCKDEVICE /dev/sda1 vol-42381204 2013-04-05T14:32:33.000Z true  
TAG instance i-12d7637a Name Ricardo\[/cc\]
```

### Criando o Launch Config

De posse destas informações, vamos criar nosso **Launch Config**  

```bash
as-create-launch-config lc-ricardomartins –image-id ami-cd8deea4 –instance-type t1.micro –key rmartins –group “sg-47104b2f” -region us-east-1
```
  
Explicando:

**as-create-launch-config**: comando que cria o launch config.

**lc-ricardomartins**: nome que será dado ao nosso launch config

**–image-id ami-cd8deea4**: ID da AMI que criamos no primeiro passo (ami-cd8deea4).

**–instance-type t1.micro**: Definimos o tipo de instância como t1.micro.

**–key rmartins**: O nome do par de chaves utilizado para acessar a instância. É definido sempre que você cria uma nova instância. No caso, o nome do par de chaves é **rmartins**.

**–group “sg-47104b2f”**: Identificação do security group que quero que as máquinas utilizem.

**-region us-east-1**: Por fim, a região da instância.

> Note que estas configurações são as que serão utilizadas nas novas instâncias que nosso Auto Scaling irá iniciar. São as mesmas configurações da instância que já temos no ar. Por este motivo rodei o comando **ec2-describe-instances** para que pudéssemos copiar exatamente as mesmas informações da máquina que temos em produção.
> 
> O launch config, é o arquivo que o Auto Scaling irá utilizar para saber quais configurações devem ser aplicadas às novas instâncias.

### Criando o Auto Scaling Group

Agora iremos criar nosso **Auto Scaling Group**  

```bash
as-create-auto-scaling-group asg-ricardomartins –launch-configuration lc-ricardomartins –availability-zones “us-east-1a” –min-size 1 –max-size 2 –load-balancers ricardomartins –tag “k=Name,v=rmartins_AS”
```

Explicando:

Primeiro rodamos o comando **as-create-auto-scaling-group** que é o comando que cria o ASG. Depois dou um nome para ele, “**asg-ricardomartins**”. Em seguida definimos qual Launch Config ele irá usar, neste caso o LC criado anteriormente: **lc-ricardomartins**.

Definimos então a zona de disponibilidade (–availability-zones), que é a mesma de onde está a outra instância: us-east-1a

No próximo passo informamos qual os valores mínimos e máximos que desejamos que sejam iniciadas pelo Auto Scaling (–min-size 1 –max-sixe2)

Por fim informamos o nome do Load Balancer que estas instâncias estarão (–load balancers ricardomartins) e um nome para as novas instâncias, que no caso chamaremos de rmartins_AS para diferenciar da outra que não faz parte de Auto Scaling.

Neste momento, já podemos ver o AS iniciando uma nova instância, uma vez que definimos o mínimo de instâncias do AS em 1:

[![1](/wp-content/uploads/2013/04/120.png)](/wp-content/uploads/2013/04/120.png)

### Criando as políticas de **Scale-Up** e **Scale-Down**

Estas regras definem quantas máquinas o AS irá subir e descer de acordo com as configurações criadas posteriormente. No nosso caso subimos e descemos de 1 em 1. Em caso de dúvidas sobre a sintaxe dos comandos, utilize o man. É muito bem detalhado.

**Políticas de ScaleUp**

```bash
as-put-scaling-policy ricardomartins-ScaleUpPolicy –auto-scaling-group asg-ricardomartins –adjustment=1 –type ChangeInCapacity –cooldown 120
```
  
O comando acima irá gerar a saída abaixo que será utilizado na criação do alarme no próximo tópico:  

```bash
arn:aws:autoscaling:us-east-1:668485333633:scalingPolicy:e69a6dd3-84bd-4b57-b906-10b64e1a3f69:autoScalingGroupName/asg-ricardomartins:policyName/ricardomartins-ScaleUpPolicy
```

**Políticas de ScaleDown**  

```bash
as-put-scaling-policy ricardomartins-ScaleDownPolicy –auto-scaling-group asg-ricardomartins –adjustment=-1 –type ChangeInCapacity –cooldown 120
```
  
O comando acima irá gerar a saída abaixo que será utilizado na criação do alarme no próximo tópico:  

```bash
arn:aws:autoscaling:us-east-1:668485333633:scalingPolicy:eaa54cd0-6407-4575-b0c7-5d47a81bca90:autoScalingGroupName/asg-ricardomartins:policyName/ricardomartins-ScaleDownPolicy
```

Estas saídas deverão ser anotadas, para serem utilizadas no próximo passo de **Criação** **dos Alarmes**, onde baseando na média de consumo de CPU iremos definir quando subir ou descer novas instâncias

**Alarme para subir instância**:  

```bash
mon-put-metric-alarm RicardoMartins-HighCPUAlarm –comparison-operator GreaterThanThreshold –evaluation-periods 2 –metric-name CPUUtilization –namespace “AWS/EC2” –period 60 –statistic Average –threshold 50 –alarm-actions arn:aws:autoscaling:us-east-1:668485333633:scalingPolicy:e69a6dd3-84bd-4b57-b906-10b64e1a3f69:autoScalingGroupName/asg-ricardomartins:policyName/ricardomartins-ScaleUpPolicy –dimensions “AutoScalingGroupName=asg-ricardomartins”
```

Explicando:

Criamos o alarme chamado RicardoMartins-HighCPUAlarm que a cada dois períodos de 60 segundos, ou seja, a cada 2 minutos, onde caso a porcentagem de CPU esteja superior à 50% ele irá utilizar a regra de ScaleUP criada anteriormente para subir novas instâncias no AutoScalingGroup chamado asg-ricardomartins.

> Note que o campo após o “–alarm-actions” é a saída gerada no comando anterior quando criamos a política de **ScaleUP**

Alarme para descer instância**:  

```bash
mon-put-metric-alarm RicardoMartinsLowCPUAlarm –comparison-operator LessThanThreshold –evaluation-periods 5 –metric-name CPUUtilization –namespace “AWS/EC2” –period 60 –statistic Average –threshold 20 –alarm-actions arn:aws:autoscaling:us-east-1:668485333633:scalingPolicy:eaa54cd0-6407-4575-b0c7-5d47a81bca90:autoScalingGroupName/asg-ricardomartins:policyName/ricardomartins-ScaleDownPolicy –dimensions “AutoScalingGroupName= asg-ricardomartins”
```

Explicando:

Criamos o alarme chamado RicardoMartins-LowCPUAlarm que a cada cinco períodos de 60 segundos, ou seja, a cada 5 minutos, onde caso a porcentagem de CPU esteja inferior à 20% ele irá utilizar a regra de ScaleDown criada anteriormente para descer as instâncias no AutoScalingGroup chamado asg-ricardomartins.

> Note que o campo após “–alarm-actions” é a saída gerada no comando anterior quando criamos a política de **ScaleDown**

Confira os nossos alarmes em Services &gt; CloudWatch

[![1](/wp-content/uploads/2013/04/121.png)](/wp-content/uploads/2013/04/121.png)

[![1](/wp-content/uploads/2013/04/122.png)](/wp-content/uploads/2013/04/122.png)

[![1](/wp-content/uploads/2013/04/123.png)](/wp-content/uploads/2013/04/123.png)

[![1](/wp-content/uploads/2013/04/125.png)](/wp-content/uploads/2013/04/125.png)

Pronto. Agora você já sabe como escalar seu site Web!

### Removendo o Auto Scaling Group e o Launch Config:

```bash
as-delete-auto-scaling-group asg-ricardomartins –force-delete
```

```bash
as-delete-launch-config lc-ricardomartins
```

Isto irá dar um “Terminate” nas instâncias iniciadas pelo AutoScaling.

Por hoje é só. Até a próxima pessoal!
