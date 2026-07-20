---
slug: "conhecendo-as-opcoes-para-containers-no-azure"
title: "Conhecendo as opções para containers do Azure"
date: '2019-01-19T01:32:22-05:00'
tags:
    - azure
---

O Azure é uma excelente plataforma de computação em nuvem com muitos recursos e funcionalidades interessantes, sendo as opções para containers realmente incríveis. Porém uma coisa que percebo em muitos clientes hoje são dúvidas e desconhecimento sobre detalhes destas opções. Pensando nisso estou escrevendo esse artigo para esclarecer um pouco sobre este assunto.


![](/wp-content/uploads/2019/01/docker-azure-new-1024x260.png)

Atualmente, as opções mais interessantes para containers no Azure são oferecidas nas soluções PaaS, que serão o objetivo deste post. Logo, não irei entrar nos detalhes sobre uso de containers em IaaS por ser o modelo mais tradicional e possuir a mesma forma de implementação independente do cloud provider.

 Neste artigo, a base das demonstrações será nessa aplicação de exemplo: <https://github.com/ricmmartins/simple-php-app>. Iremos transformá-la em um container e fazer o deployment nas quatro principais opções para containers no Azure:

- [Azure Container Instance](https://docs.microsoft.com/en-us/azure/container-instances/)
- [Azure WebApp for Containers](https://docs.microsoft.com/en-us/azure/app-service/containers/)
- [Azure Kubernetes Service](https://docs.microsoft.com/en-us/azure/aks/)
- [Azure Service Fabric](https://docs.microsoft.com/en-us/azure/service-fabric/)

Para facilitar a compreensão, antes de tudo vou mostrar como seria o deploy desta aplicação no Azure Webapp hospedada no **Azure App Service**, onde teremos a aplicação implantada exatamente como ela foi desenvolvida. Para isso, vamos entender o que é o Azure App Service.

## **O que é o Azure App Service?**

O [App Service](https://docs.microsoft.com/en-us/azure/app-service/overview) é o serviço PaaS indicado quando você **não** precisar ter controle total sobre a infraestrutura para rodar sua aplicação ou sobre o runtime escolhido. Neste cenário, você pode se concentrar apenas no desenvolvimento da sua aplicação e fazer o deploy dela. Ela será executada sem que você precise administrar recursos de IaaS como sistema operacional, rede, storage, atualizações de sitema, etc. O App Service é onde estarão hospedadas as suas aplicações de acordo com o tipo de aplicação. Elas podem ser hospedadas escolhendo a categoria mais apropriada.

Algumas categorias do App Service:

- [Web Apps](https://azure.microsoft.com/en-us/services/app-service/web/) para hospedar aplicações web ou [APIs](https://azure.microsoft.com/en-us/services/app-service/api/);
- [Web Apps ](https://azure.microsoft.com/pt-br/services/app-service/containers/)para Containers;
- [Mobile Apps](https://azure.microsoft.com/en-us/services/app-service/mobile/) para hospedar o back-end de aplicações móveis;
- [Function Apps](https://azure.microsoft.com/en-us/services/functions/) para execução do Azure Functions, que são pequenos trechos de código que escalam automaticamente e podem ser acionados por serviços externos;
- [Logic Apps](https://azure.microsoft.com/en-us/services/logic-apps/) nos quais você configura um fluxo de trabalho com triggers, conectores e condições. Estes também escalam automaticamente e podem ser acionados por serviços externos.

A principal vantagem de usar o App Service é que ele oferece muitos recursos adicionais prontos para uso, como auto-scalling, autenticação, slots de deployments (blue-green deployment), integração e entrega contínua, dentre muitos outros.

Em contrapartida, por ser um serviço PaaS você não possui controle sobre o que está instalado à nível de sistema operacional e não há uma maneira de acessar os servidores e fazer instalação manual de pacotes por exemplo.

## Azure WebApp

Antes de entrarmos no contexto de containers, conforme mencionei acima vamos ver como seria o deploy desta aplicação exatamente como ela foi desenvolvida dentro do Azure WebApp, rodando no App Service para que você possa ir se familiarizando com o mesmo.

O primeiro passo é clicar em **Create a resource** e buscar por **Web App**. Na sequência escolher conforme abaixo e clicar em **Create**:

![](/wp-content/uploads/2019/01/image-1-1024x490.png)

Neste exemplo, para criar vou escolher o nome da aplicação, a subscription a ser utilizada, o resource group à ser criado, fiz a escolha do sistema operacional onde quero que seja executado, informo que a publicação vai ser via código e não à partir de uma imagem Docker (ainda, veremos mais a frente) e por fim escolhi criar um [App Service Plan](https://docs.microsoft.com/en-us/azure/app-service/overview-hosting-plans) (S1 nesse caso).

![](/wp-content/uploads/2019/01/image-2.png)

Depois de clicar em **Create** o App Service Plan e o Web App são criados dentro do resource group:

![](/wp-content/uploads/2019/01/image-4.png)

Clicando no WebApp podemos ver alguns detalhes, dentre eles a URL:

![](/wp-content/uploads/2019/01/image-5-1024x168.png)

Ao acessar a URL (neste exemplo http://demoricardo.azurewebsites.net) temos o conteúdo default sendo exibido:

![](/wp-content/uploads/2019/01/image-6-1024x524.png)

Uma vez que queremos pegar o código fonte da aplicaçao no Github, o próximo passo é ir ao Deployment Center para fazer a configuração:

![](/wp-content/uploads/2019/01/image-7-1024x495.png)
  
Dentre as opções disponíveis, neste caso vou escolher Github. Note que no meu exemplo eu já fiz a autorização do Github no Azure então basta clicar para continuar. Essa autorização consiste em uma tela pedindo o usuário e senha do Github que ao aceitar, você permite que o Azure acesse o seu Github para ler o conteúdo.

Na tela seguinte, vamos escolher o Build Provider, nesse caso vou escolher o próprio Apache Kudu que já vem embutido no WebApp:

![](/wp-content/uploads/2019/01/image-8-1024x442.png)

Na próxima tela escolhemos o usuário do Github, repositório da aplicação e o branch a ser usado:

![](/wp-content/uploads/2019/01/image-9-1024x411.png)

Avançando é exibido um resumo, e depois basta clicar para finalizar:

![](/wp-content/uploads/2019/01/image-10-1024x468.png)

Uma vez finalizado, será iniciado o deployment e ao acessar a URL novamente já conseguimos ver a nossa aplicação rodando:

![](/wp-content/uploads/2019/01/image-11-1024x472.png)

## Trabalhando com containers

Agora vamos começar a falar mais sobre containers e as opções de uso no Azure.

Em linhas gerais, uma das razões para a escolha de trabalhar com containers, é quando ao contrário do uso do App Service, é **preciso** ter controle do runtime escolhido para rodar uma aplicação.

Eles permitem que você instale qualquer software ou dependência que sua aplicação precise para rodar, sendo que de forma muito mais rápida que se comparado à VMs já que containers podem fazer o spin-up e o start em questão de segundos.

A portabilidade dos containers, permite que você rode em máquinas virtuais ou em qualquer serviço PaaS com a garantia que o ambiente que você está trabalhando é o mesmo em qualquer lugar.

### Criando o container

Para criar o nosso container, o primeiro passo é fazer o clone da aplicação no Github.

```bash
git clone https://github.com/ricmmartins/simple-php-app.git
```

Entre no diretório **simple-php-app** e dentro dele crie o Dockerfile com o seguinte conteúdo

```bash
FROM debian
MAINTAINER Ricardo Martins - ricmart@microsoft.com

# Packages
RUN apt-get update
RUN apt-get install -y nginx
RUN apt-get install -y php7.0-fpm
RUN apt-get install -y git

# Nginx 
RUN ln -sf /dev/stdout /var/log/nginx/access.log
RUN ln -sf /dev/stderr /var/log/nginx/error.log
RUN rm /etc/nginx/sites-available/default
ADD ./default /etc/nginx/sites-available/default

# Build
RUN mkdir -p /var/www/app
WORKDIR /var/www/app
RUN git clone https://github.com/ricmmartins/simple-php-app.git
RUN mv simple-php-app/* /var/www/app  

EXPOSE 80 
CMD service php7.0-fpm start && nginx -g "daemon off;" 
```

No mesmo diretório crie o o arquivo de configuracão do Nginx que será adicionado ao container. Crie um arquivo com nome **default** com o seguinte conteúdo:

```bash
    server {
    listen   80;
    root /var/www/app;
    index index.php index.html;
    location ~ \.php$ {
        try_files $uri =404;
        fastcgi_split_path_info ^(.+\.php)(/.+)$;
        fastcgi_pass unix:/var/run/php/php7.0-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
} 
```

O próximo passo é fazer o build da imagem:

```bash
sudo docker build . -t simplephpapp
```

E em seguida colocar para rodar:

```bash
sudo docker run -d -p 8080:80 simplephpapp
```

Agora você pode verificar se está ok com o comando abaixo:

```bash
curl localhost:8080
```

Se tudo estiver ok, sua saída será similar à esta:

![](/wp-content/uploads/2019/01/image-13.png)

Agora basta fazer o push da imagem para o [Azure Container Registry ](https://docs.microsoft.com/en-us/azure/container-registry/)ou para o próprio Docker Hub que é como vou fazer aqui. Abaixo o procedimento:

```bash
sudo docker login
```

![](/wp-content/uploads/2019/01/image-14.png)

Agora vamos gerar uma tag para nossa imagem:

```bash
sudo docker tag simplephpapp rmartins/simplephpapp
```

E enfim enviá-la para o Docker Hub:

```bash
sudo docker push rmartins/simplephpapp
```

![](/wp-content/uploads/2019/01/image-22-1024x440.png)

Agora que já temos a imagem da nossa aplicação, vamos ver as opções para usá-las no Azure.

## Azure Container Instance

O [Azure Container Instance](https://docs.microsoft.com/en-us/azure/container-instances/) é a oferta mais leve do Azure para permitir que você execute containers que não precisem de orquestração. Você também não precisa provisionar nenhuma máquina virtual ou algum outro serviço de alto nível com a vantagem de pagar apenas pelo tempo que os containers criados estarão sendo executados.

> Caso você queria orquestrar containers que estejam no ACI, você pode usar o [Virtual Kubelet](https://github.com/virtual-kubelet/virtual-kubelet), que funciona como um conector do ACI para Kubernetes, então você pode utilizá-lo no Azure Kubernetes Services e gerenciar contaeiners do ACI com ele. Detalhes em:
> 
>  <https://azure.microsoft.com/en-us/resources/videos/using-kubernetes-with-azure-container-instances/>
> 
> [https://azure.microsoft.com/en-us/blog/azure-brings-new-serverless-and-devops-capabilities-to-the-kubernetes-community/ ](https://azure.microsoft.com/en-us/blog/azure-brings-new-serverless-and-devops-capabilities-to-the-kubernetes-community/) [](https://github.com/virtual-kubelet/virtual-kubelet)
> 
> <cite>Sobre orquestração de ACI com Virtual Kubelet</cite>

O ACI provê grupos de containers. Um grupo de containers é uma coleção de containers que são executados na mesma máquina host e compartilham o mesmo cilco de vida, rede e storage e isto é bastante similar ao conceito de pod’s do Kubernetes. Mais informações em <https://docs.microsoft.com/en-us/azure/container-instances/container-instances-container-groups>

O passo a passo da criação do ACI pelo portal está muito bem demonstrado [neste link](https://docs.microsoft.com/en-us/azure/container-instances/container-instances-quickstart-portal) e por isto não vou mostrar todas as telas aqui do procedimento. No meu caso vou usar o mesmo resource group criado anteriormente:

![](/wp-content/uploads/2019/01/image-15.png)

![](/wp-content/uploads/2019/01/image-16.png)

Depois de criar, imediatamente nossa aplicação já está disponível:

![](/wp-content/uploads/2019/01/image-17-1024x510.png)

## Azure WebApp for Containers

O [Azure WebApp for Containers ](https://docs.microsoft.com/en-us/azure/app-service/containers/)permite que você utilize containers baseados em Linux ou Windows para fazer o deploy da sua aplicação dentro do Azure WebApp.

Pelo portal, escolha a opção para criar um novo recurso e busque por **Web App for Containers.** Em seguida escolha a opção correspondente e clique para criar:

![](/wp-content/uploads/2019/01/image-18-1024x444.png)

O próximo passo é escolher o nome da app, a subscription a ser usada, o resource group (o mesmo que já estamos trabalhando), sistema operacional e criar um App Service Plan (P1v2 neste caso):

![](/wp-content/uploads/2019/01/image-19.png)

Na última opção de configuração do container, as opções exibidas são conforme a imagem abaixo:

![](/wp-content/uploads/2019/01/image-20-1024x235.png)

No meu caso escolhi a configuração de um único container e apontei para meu repositório no Docker Hub, mas repare que existem opções para uso do Docker Compose e Kubernetes também. Uma vez aplicada a configuração basta clicar para criar. Em alguns instantes já é possível acessar a URL da aplicação:

![](/wp-content/uploads/2019/01/image-21-1024x495.png)

## Azure Kubernetes Service

O [Azure Kubernetes Service](https://docs.microsoft.com/en-us/azure/aks/) é serviço gerenciado de Kubernetes que torna simples e rápido o deployment e gerenciamento de aplicações containerizadas, sem que seja preciso que você seja um expert na orquestração de containers. Além disso, você paga apenas pelos nós agentes, o nó master é gratuito.

O AKS é uma solução escalável *by desing*. Ele consegue atender as demandas de escalabilidade das aplicações e [neste link ](https://docs.microsoft.com/en-us/azure/aks/tutorial-kubernetes-scale)você encontra mais detalhes sobre o como escalar uma aplicação.

O procedimento de criação do AKS via portal também está muito bem documentado e [disponível aqui](https://docs.microsoft.com/en-us/azure/aks/kubernetes-walkthrough-portal#create-an-aks-cluster), por essa razão, vou entrar nos detalhes apenas da configuração da nossa aplicação dentro dele.

Basicamente uma vez criado o serviço, o que você precisa fazer é [conectar no cluster](https://docs.microsoft.com/en-us/azure/aks/kubernetes-walkthrough-portal#connect-to-the-cluster) e usar o [kubectl ](https://kubernetes.io/docs/reference/kubectl/overview/)para gerenciar o Kubernetes. Vamos ao nosso exemplo, e a primeira coisa a fazer é criar o arquivo yaml com as definições básicas da nossa aplicação:

```bash
vim simplephpapp.yaml
```

```bash
apiVersion: apps/v1 # for versions before 1.9.0 use apps/v1beta2
 kind: Deployment
 metadata:
   name: simplephpapp
 spec:
   selector:
     matchLabels:
       app: simplephpapp
   replicas: 2 
   template:
     metadata:
       labels:
         app: simplephpapp
     spec:
       containers:
       - name: simplephpapp
         image: rmartins/simplephpapp
         ports:
         - containerPort: 80
```

Em seguida vamos criar o deployment da aplicação:

```bash
ricardo@Azure:~$ kubectl create -f simplephpapp.yaml deployment.apps/simplephpapp created
```

Em seguida vamos verificar os detalhes do deployment criado:

```bash
ricardo@Azure:~$ kubectl describe deployment simplephpapp
 Name:                   simplephpapp
 Namespace:              default
 CreationTimestamp:      Sat, 19 Jan 2019 05:44:26 +0000
 Labels:                 
 Annotations:            deployment.kubernetes.io/revision=1
 Selector:               app=simplephpapp
 Replicas:               2 desired | 2 updated | 2 total | 2 available | 0 unavailable
 StrategyType:           RollingUpdate
 MinReadySeconds:        0
 RollingUpdateStrategy:  25% max unavailable, 25% max surge
 Pod Template:
   Labels:  app=simplephpapp
   Containers:
    simplephpapp:
     Image:        rmartins/simplephpapp
     Port:         80/TCP
     Host Port:    0/TCP
     Environment:  
     Mounts:       
   Volumes:        
 Conditions:
   Type           Status  Reason
   ----           ------  ------
   Available      True    MinimumReplicasAvailable
   Progressing    True    NewReplicaSetAvailable
 OldReplicaSets:  
 NewReplicaSet:   simplephpapp-67f946cb9c (2/2 replicas created)
 Events:
   Type    Reason             Age   From                   Message
   ----    ------             ----  ----                   -------
   Normal  ScalingReplicaSet  1m    deployment-controller  Scaled up replica set simplephpapp67f946cb9c to 2
```

Em seguida vamos expor a aplicação de forma balanceada:

```bash
ricardo@Azure:~$ kubectl expose deployment simplephpapp --port=80 --type=LoadBalancer
 service/simplephpapp exposed
```

Fazer a validação:

```bash
ricardo@Azure:~$ kubectl get services
 NAME           TYPE           CLUSTER-IP    EXTERNAL-IP      PORT(S)        AGE
 kubernetes     ClusterIP      10.0.0.1                 443/TCP        16m
 simplephpapp   LoadBalancer   10.0.120.71   104.209.196.76   80:31882/TCP   11m
```

E agora aumentar o número de réplicas:

```bash
ricardo@Azure:~$ kubectl scale --replicas=5 deployment/simplephpapp
 deployment.extensions/simplephpapp scaled
```

Conferindo:

```bash
ricardo@Azure:~$ kubectl get pods
 NAME                                          READY     STATUS             RESTARTS   AGE
 simplephpapp-67f946cb9c-6qxcz                 1/1       Running            0          35s
 simplephpapp-67f946cb9c-8j955                 1/1       Running            0          35s
 simplephpapp-67f946cb9c-q2zvv                 1/1       Running            0          35s
 simplephpapp-67f946cb9c-q48jr                 1/1       Running            0          8m
 simplephpapp-67f946cb9c-qrt9l                 1/1       Running            0          8m
```

Ao acessar pelo ip externo obtido no comando kubectl get services (**104.209.196.76**) já conseguimos acessar a nossa aplicação. Como temos 5 réplicas, se você acessar diversas vezes irá perceber o funcionamento do balanceamento, uma vez que essa aplicação de exemplo exibe o nome do host (nó) que está respondendo pelo request.

![](/wp-content/uploads/2019/01/image-23-1024x480.png)

Um outro teste manual que você pode fazer para validar o funcionamento do balanceamento é rodar o comando abaixo, que irá enviar 1000 requests ao serviço. Você também irá conseguir visualizar os diferentes nomes dos nós respondendo:

```bash
time curl -s "http://104.209.196.76 [1-1000]"  
```

## Azure Service Fabric

O [Service Fabric](https://azure.microsoft.com/services/service-fabric/) é mais uma opção para você rodar seus containers no Azure. Ele é a camada de mágica que roda debaixo de alguns dos principais serviços do Azure como Azure SQL Database e o próprio App Service há alguns anos e agora está disponível para que os clientes também possam utilizar. [Neste link ](https://docs.microsoft.com/en-us/azure/service-fabric/service-fabric-overview)existe uma excelente documentação sobre o Service Fabric.

Quando você faz o deploy de uma aplicação no Service Fabric, ela já ganha automaticamente balanceamento de carga, self-healing, auto-scalling e alta disponibilidade. E quando você faz o deploy de uma nova versão da sua aplicação, ele realiza o upgrade sem nenhum tipo de downtime, permitindo também que você faça rollback da mesma forma.

Tipicamente, o Azure Service Fabric é conhecido como uma ferramenta para executar arquiteturas de microserviços, no entanto, você pode fazer muito mais que isso, inclusive orquestrar containers e rodar qualquer tipo de executável dentro dele.

Ele é uma solução que está disponível como opensource, permitindo que você rode o[ Framework do Service Fabric](https://docs.microsoft.com/en-us/azure/service-fabric/) em [qualquer lugar](https://docs.microsoft.com/pt-br/azure/service-fabric/service-fabric-deploy-anywhere), seja no on-premises, no seu computador, no Azure e em qualquer outra cloud. Para dar uma uma olhada no projeto no Github, [clique aqui](https://github.com/Microsoft/service-fabric).

O procedimento de criação do cluster do Service Fabric no Azure, está completamente descrito [neste link](https://docs.microsoft.com/en-us/azure/service-fabric/service-fabric-cluster-creation-via-portal) da documentação oficial.

 Conforme comentei acima, o uso de [containers no Service Fabric ](https://docs.microsoft.com/pt-br/azure/service-fabric/service-fabric-containers-overview)é um cenário amplamente utilizado, e vamos detalhar abaixo sobre esta opção usando nossa aplicação de exemplo.

Uma vez criado o cluster e feita a instalação do certificado PFX para acessar a console, você verá algo assim:

![](/wp-content/uploads/2019/01/image-24-1024x367.png)
Dashboard do Service Fabric

![](/wp-content/uploads/2019/01/image-30-1024x300.png)
Informações sobre os nodes

![](/wp-content/uploads/2019/01/image-31.png)
Mapa do cluster

Para fazer o deploy da nossa aplicação no Service Fabric, vá até **Applications** e em seguida dentro do menu **Actions** escolha **Create Compose Application**:

![](/wp-content/uploads/2019/01/image-25-1024x167.png)
Visão geral das aplicações

![](/wp-content/uploads/2019/01/image-26.png)

Criando uma aplicação via compose file

![](/wp-content/uploads/2019/01/image-27.png)
Conteúdo do compose file

Abaixo o conteúdo do arquivo compose para você copiar:

```bash
version: '3'
 services:
   simplephpapp:
     image: rmartins/simplephpapp
     deploy:
       replicas: 3
     ports:
         - "80:80"
```

Após clicar para criar, será iniciado o deploy da aplicação de acordo com a configuração especificad no arquivo compose. Em seguida já temos a aplicação rodando dentro do Service Fabric e você pode explorar cada um dos detalhes apresentados:

![](/wp-content/uploads/2019/01/image-28-1024x397.png)
Dashboard com a aplicação já implantada

![](/wp-content/uploads/2019/01/image-29-1024x211.png)
Detalhe da aplicação

Acessando a aplicação:

![](/wp-content/uploads/2019/01/image-32-1024x500.png)

## E o Azure Container Service?

Um dos primeiros serviços para rodar containers orquestrados no Azure era o ACS (Azure Containers Service). O que ele faz na verdade é automatizar a criação de um cluster de Kubernetes, DC/OS ou Swarm em máquinas virtuais. Por essa razão eu não poderia deixar de falar sobre ele rapidamente.

Deste modo você não precisa entender como fazer este tipo de configuração, bastando apenas escolher qual orquestrador gostaria de usar e ele faz o trabalho de subir o cluster de forma automatizada usando templates do [Azure Resource Manager](https://docs.microsoft.com/en-us/azure/azure-resource-manager/).

Como ele é um “facilitador” para criação de clusters em cima de IaaS, depois de criadas as máquinas virtuais, você tem acesso à elas e precisa gerenciar também a questão de segurança, backup, atualizações e todas as atividades relacionadas com a administração de recursos IaaS.

Com a evolução do AKS, hoje o ACS ainda está disponível, porém apenas para criação de clusters com o DC/OS ou Docker Swarm como orquestradores.

Referências :

- <https://docs.microsoft.com/en-us/azure/container-service/kubernetes/container-service-kubernetes-walkthrough>
- <https://docs.microsoft.com/en-us/azure/container-service/dcos-swarm/ >

 Uma vez que se formos ao pé da letra a [definição do NIST ](https://www.nist.gov/sites/default/files/documents/itl/cloud/NIST_SP-500-291_Jul5A.pdf)sobre a definição de IaaS, PaaS e SaaS, o ACS está mais para IaaS, eu não vou detalhar aqui sohre o uso dele uma vez que meu objetivo nesse artigo é focar em PaaS.

## Conclusão

Espero ter esclarecido um pouco sobre as opções existentes para usar containers no Azure. Fique à vontade para deixar um comentário ou dúvida.

Aqui mais algumas referências interessantes:

- Decision tree for Azure compute services: <https://docs.microsoft.com/en-us/azure/architecture/guide/technology-choices/compute-decision-tree>
- Choosing Azure compute platforms for container-based applications: <https://docs.microsoft.com/en-us/dotnet/standard/modernize-with-azure-and-containers/modernize-existing-apps-to-cloud-optimized/choosing-azure-compute-options-for-container-based-applications>
- Orchestrating microservices and multi-container applications for high scalability and availability: <https://docs.microsoft.com/en-us/dotnet/standard/microservices-architecture/architect-microservice-container-applications/scalable-available-multi-container-microservice-applications>

## \*\* OpenShift spoiler Alert!\*\*

Para você que chegou até o fim deste post, compartilhando uma opção bastante interessante para uso de containers no Azure que em breve já estará totalmente disponível: [OpenShift on Azure](<https://docs.microsoft.com/en-us/azure/virtual-machines/linux/openshift-get-started#openshift-on-azure >)

 O OpenShift é uma plataforma de código aberto desenvolvida pela Red Hat que auxilia no processo de orquestração de containers baseada em Kubernetes e containers Linux de maneira independente da plataforma na qual os containers serão executados.

Conforme o anúncio do [Brendan Burns](https://twitter.com/brendandburns) (sim, ele mesmo, o co-founder do Kubernetes e agora funcionário da Microsoft) feito [neste link ](https://azure.microsoft.com/en-us/blog/openshift-on-azure-the-easiest-fully-managed-openshift-in-the-cloud/)a Microsoft está trabalhando em parceria com a RedHat em uma versão do OpenShift totalmente gerenciada dentro do Azure.

Na data de publicação deste artigo ela está em private preview. Mais detalhes em [https://docs.microsoft.com/en-us/azure/virtual-machines/linux/openshift-get-started#openshift-on-azure ](https://docs.microsoft.com/en-us/azure/virtual-machines/linux/openshift-get-started#openshift-on-azure)
