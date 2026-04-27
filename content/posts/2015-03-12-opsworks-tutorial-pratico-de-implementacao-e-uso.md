---
slug: "opsworks-tutorial-pratico-de-implementacao-e-uso"
title: 'OpsWorks: Tutorial prático de implementação e uso - Parte II/III'
date: '2015-03-12T17:27:58-04:00'
tags:
    - aws
    - opsworks
categories:
    - AWS
description: "[](/wp-content/uploads/2015/01/AWS_OpsWorks-512x320-1.png) Continuando o post anterior sobre o OpsWorks, vou mostrar neste post como criar uma instância"
---

[![AWS_OpsWorks-512x320](/wp-content/uploads/2015/01/AWS_OpsWorks-512x320-1.png)](/wp-content/uploads/2015/01/AWS_OpsWorks-512x320-1.png)

Continuando o[ post anterior](http://www.ricardomartins.com.br/opsworks-conhecendo-ferramenta-de-gerencia-de-configuracao-da-amazon/) sobre o OpsWorks, vou mostrar neste post como criar uma instância com Nginx hospedando um site estático bem simples, apenas para teste e demonstração.

Antes de começar, para entender um pouco mais sobre o conceito de cookbooks e recipes do OpsWorks, você pode dar uma lida aqui: [http://docs.aws.amazon.com/opsworks/latest/userguide/gettingstarted-db-recipes.html](http://docs.aws.amazon.com/opsworks/latest/userguide/getktingstarted-db-recipes.html)

O cookbook é o nosso livro de receitas, contendo todas as nossas recipes (receitas). Uma recipe é onde definimos como queremos que determinada coisa seja feita e/ou configurada no nosso sistema.

No OpsWorks é possível utilizar cookbooks default ou utilizar cookbooks customizadas. Primeiramente vou user cookbooks default, que já estão prontas e disponíveis no repositório de cookbooks do OpsWorks no GitHub (<https://github.com/aws/opsworks-cookbooks/>)

## Vamos criar nossa primeira stack para testes?

Então vamos à console do OpsWorks:

[![1](/wp-content/uploads/2015/03/1.png)](/wp-content/uploads/2015/03/1.png)

Clique em “Add Your First Stack” e na tela seguinte preencha as informações necessárias.

[![2](/wp-content/uploads/2015/03/2.png)](/wp-content/uploads/2015/03/2.png)

Note que no exemplo eu já tenho uma VPC e uma chave SSH para serem utilizadas.

Existe a opção Advanced, então vamos clicar nela e ver as opções disponíveis:

[![3](/wp-content/uploads/2015/03/3.png)](/wp-content/uploads/2015/03/3.png)

Ao clicar temos a opção de escolher a versão do Chef à ser utilizada. No caso podemos escolher se vamos utilizar cookbooks customizadas, JSON customizado e se vamos querer utilizar os security groups nativos ou não. Neste caso vou escolher não utilizar os security groups nativos do OpsWorks e iremos configurar o nosso manualmente, usando regras específicas.

Definidas as nossas opções, vamos em “Add Stack”

Criada a stack, você será direcionado para esta tela:

[![4](/wp-content/uploads/2015/03/4.png)](/wp-content/uploads/2015/03/4.png)

## Criando a layer:

Agora vamos criar nossa Layer. Clique em Layers e depois em “Add a layer”

[![5](/wp-content/uploads/2015/03/5.png)](/wp-content/uploads/2015/03/5.png)

Na tela seguinte vamos preencher conforme nossa necessidade. Note que neste instante você pode definir os detalhes da layer e também do RDS caso vá utilizar.

Algumas opções já são pré-definidas para layers de Load Balancers, App Servers, Databases, etc. Neste exemplo vou criar uma layer de um servidor web estático, então escolhemos Static Web Server, dentro de App Server.

O próximo passo é escolher o security group. Neste caso vou escolher um security group que eu já havia criado previamente chamado webserver, onde já tenho as portas 22 e 80 liberadas.

Poderíamos ainda ter criado previamente um ELB para esta layer e selecionar aqui. Neste caso não foi criado nenhum na VPC que estou usando.

[![6](/wp-content/uploads/2015/03/6.png)](/wp-content/uploads/2015/03/6.png)

Em seguida basta clicar em “Add Layer”. Em seguida você verá a tela abaixo, ainda sem instâncias iniciadas.

[![7](/wp-content/uploads/2015/03/7.png)](/wp-content/uploads/2015/03/7.png)

Conforme a imagem, temos algumas links para serem observados:

- Settings

[![8](/wp-content/uploads/2015/03/8.png)](/wp-content/uploads/2015/03/8.png)

- Recipes

[![9](/wp-content/uploads/2015/03/9.png)](/wp-content/uploads/2015/03/9.png)

Aqui é possível ver cada recipe configurada em cada ciclo de vida do Chef (Setup, Configure, Deploy, Undeploy, Shutdown). Em cada caso, você pode clicar e verificar o conteúdo da recipe dentro do repositório de cookbooks do OpsWorks no GitHub (<https://github.com/aws/opsworks-cookbooks/>)

- Network

[![10](/wp-content/uploads/2015/03/10.png)](/wp-content/uploads/2015/03/10.png)

Por padrão ela não virá com ip público ou EIP associado. Precisamos editar para que seja associado um ip público e ela consiga sair para a internet para fazer o download das dependências e fazer as instalações necessárioas. Clique em Edit e troque para YES no campo de Public IP addresses:

[![11](/wp-content/uploads/2015/03/11.png)](/wp-content/uploads/2015/03/11.png)

- EBS Volumes

[![12](/wp-content/uploads/2015/03/12.png)](/wp-content/uploads/2015/03/12.png)

Conforme podemos observar, não teremos volumes EBS, indicando que a instância utilizará discos efêmeros, que terão seu conteúdo perdido no instante que a instância for desligada.

- Security

[![13](/wp-content/uploads/2015/03/13.png)](/wp-content/uploads/2015/03/13.png)

Por fim, na parte de segurança visualizamos o security group associado com nossa instância, o perfil da instância e as roles com as quais ela possa estar associada.

## Criando a instância:

Clicando em Instances no menu lateral à esquerda temos a opção de adicionar a nossa primeira instância. Lembrando que podem ser 24/7, Time-Based ou Load-Based. 24/7 são instâncias que estarão ligadas o tempo todo. Time-Based são aquelas que estarão ligadas dentro de um intervalo de tempo especificado por você. Load Based são as instãncias que serão iniciadas ou terminadas de acordo com a configuração definida por você para uso de CPU, memória ou carga na aplicação entre as instâncias de uma layer.

Neste caso vou criar uma instãncia t2.micro 24×7 dentro de uma das subredes da minha VPC usando uma chave ssh que eu já tenho.

[![14](/wp-content/uploads/2015/03/14.png)](/wp-content/uploads/2015/03/14.png)

Depois de clicar em “Add Instance”, teremos a seguinte tela:

[![15](/wp-content/uploads/2015/03/15.png)](/wp-content/uploads/2015/03/15.png)

Basta clicar em Start e a instância será inicializada seguindo todos os passos do ciclo de vida do Chef visto acima.

## Criando um App

Neste exemplo não vou criar nenhum App para ser “deployado”, mas vou criar um conteúdo para ser “deployado” dentro do nosso Nginx e ser exibido quando nossa instância for acessada. Isto é apenas para fins didáticos. Em um ambiente de produção, você pode configurar uma aplicação específica para ser disponibilizada.

Dentro de Apss, vamos em “Add an app”

[![16](/wp-content/uploads/2015/03/16.png)](/wp-content/uploads/2015/03/16.png)

E vamos realizar nossa configuração:

[![17](/wp-content/uploads/2015/03/17.png)](/wp-content/uploads/2015/03/17.png)

Note que foi escolhido o tipo estático, e o source da aplicação é um index.zip dentro de um bucket no S3. É apenas um arquivo index.html customizado que criei.

## Realizando o deploy da app

Agora podemos fazer o deploy da nossa App:

[![18](/wp-content/uploads/2015/03/18.png)](/wp-content/uploads/2015/03/18.png)

Uma vez que tenha sido realizado deploy com sucesso, vamos ver o conteúdo disponibilizado:

[![19](/wp-content/uploads/2015/03/19-1.png)](/wp-content/uploads/2015/03/19-1.png)

[![20](/wp-content/uploads/2015/03/20.png)](/wp-content/uploads/2015/03/20.png)

## Verificando as configurações dentro da instância:

Caso você ache interessante, pode conectar na instância e verificar as configurações no Nginx:

```bash
[root@web1 /\]# cd /etc/nginx/sites-enabled
```

```bash
[root@web1 sites-enabled\]# ls -l  
total 0  
lrwxrwxrwx 1 root root 34 Mar 12 19:11 ricardo -> /etc/nginx/sites-available/ricardo
```

```bash
[root@web1 sites-enabled]# cat ricardo  
server {  
listen 80;  
server_name ricardo web1;  
access_log /var/log/nginx/ricardo.access.log;

location / {  
root /srv/www/ricardo/current/;  
index index.html index.htm index.php;  
}

# Block all svn access  
if ($request_uri ~\* ^.\*.svn.\*$) {  
return 404;  
}

# Block all git access  
if ($request_uri ~\* ^.\*.git.\*$) {  
return 404;  
}

location /nginx_status {  
stub_status on;  
access_log off;  
allow 127.0.0.1;  
deny all;  
}

}  
```

## Finalizando:

Para terminar a instância basta ir em Instances e em seguida ir STOP:

[![21](/wp-content/uploads/2015/03/21.png)](/wp-content/uploads/2015/03/21.png)

Note o alerta que todos os dados armazenados na instância serão destruídos, uma vez que não estamos usando volumes EBS.

É importante parar a instância por dentro da console do OpsWorks, pois como ela está com a função de Auto-Heal habilitada, se você por exemplo dar stop/terminate na isntância pela console do EC2 por exemplo, o Auto-Heal irá entender que a instância está com algum erro e irá substituir por outra. Fazendo pelo próprio OpsWorks ela será de fato parada e em seguida podemos excluí-la:

[![22](/wp-content/uploads/2015/03/22.png)](/wp-content/uploads/2015/03/22.png)

Lembrando apenas que esta é apenas uma demonstração muito básica e resumida à respeito do que o OpsWorks faz. É possível criar ambientes muito maiores e complexos, envolvendo várias aplicações, bancos de dados, load balancers, etc. O meu foco aqui é mostrar a ferramenta e abrir sua mente e entendimento sobre ela, além de despertar seu interesse para uso. Utilize sem moderação, e você verá como seu dia-a-dia como devop/sysadmin pode ser muito mais produtivo.

No próximo post vou criar algo semelhante, porém utilizando as nossas próprias receitas, utilizaremos “custom-cookbooks”. Ate lá!
