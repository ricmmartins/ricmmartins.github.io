---
slug: "implementando-a-stack-elk-elasticsearch-logstash-kibana-no-centos"
title: 'Implementando a stack ELK (ElasticSearch, Logstash e Kibana) no CentOS'
date: '2014-06-02T17:47:12-04:00'
tags:
    - elasticsearch
    - linux
categories:
    - Linux
description: "A stack ELK nada mais é que o conjunto formado pelas ferramentas ElasticSearch, Logstash e o Kibana. O uso destas três ferramentas em conjunto, provê uma"
---

## O que é a stack ELK?

A stack ELK nada mais é que o conjunto formado pelas ferramentas ElasticSearch, Logstash e o Kibana. O uso destas três ferramentas em conjunto, provê uma excelente ferramenta para análilse de dados em tempo real.

Aqui iremos fazer um teste simples com os logs de uma máquina com o CentOS. Este artigo pode te ajudar a começar a enterder as peculiaridades de cada uma delas, e testá-las.

De modo geral, você faz um parsing dos dados com o Logstash diretamente no ElasticSearch. O ElasticSearch vai realizar um tratamento nestes dados, e o Kibana vai exibir os dados para você.

## ElasticSearch

O [ElasticSearch](http://www.elasticsearch.org/ "ElasticSearch") é uma engine de busca com foco na análise de dados em tempo real, baseado na arquitetura [RESTful](http://stackoverflow.com/questions/671118/what-exactly-is-restful-programming). É bastante similar ao [Solr](http://lucene.apache.org/solr/) e ao [CloudSearch](http://aws.amazon.com/pt/cloudsearch/) (Amazon)

Ele possui compatibilidade com a funcionalidade de pesquisa de texto completo padrão, mas também diversas opções poderosas de realização de queries. O ElasticSearch é baseado em documentos orientados e você pode armazenar tudo o que quiser no formato [JSON](http://pt.wikipedia.org/wiki/JSON). Isto o torna mais poderoso, simples e flexível.

Foi desenvolvido sobre o Apache [Lucene](http://lucene.apache.org/core/) e por default roda na porta 9200.

## Logstash

O [Logstash](http://logstash.net/) é uma solução para gerenciamento e agregação de logs. Você consegue agregar logs de máquinas, sistemas operacionais e aplicações distintas em um único lugar. O Logstash permite pegar dados ou qualquer outro registro baseado em tempo, de onde quiser, processar e analisar exatamente como você quiser. O formato estruturado do JSON é o padrão, e também é a forma como o ElasticSearch vai tratá-lo. Existem diversas opções de filtros e funcionalidades similares que você pode experimentar. É muito útil para agilizar a leitura dos logs, compreensão e filtragem.

Plus: Cookbooks para o Logstash: <http://cookbook.logstash.net/>

## Kibana

O [Kibana](http://www.elasticsearch.org/overview/kibana/) é o frontend do nosso stack, que irá apresentar os dados armazenados pelo Logstash no ElasticSearch, em uma interface altamente customizável com histograma e outros painéis que irão te dar um excelente overview sobre os seus dados. Muito bom para análises em tempo real e pesquisa de dados que você tenha parseado no ElasticSearch.

Ele permite transformar os logs em informações úteis, pois permite realizar correlação de eventos, filtrar logs por origem, hosts, e N outras combinações.

## Adicionando o Redis em nossa Stack

Geralmente a stack ELK é composta apenas pelos três componentes já citados. Porém para melhorar nossa performance, vou incluir o Redis.

O [Redis](http://redis.io/) é um storage de dados, projetado para armazenar dados na memória RAM e permitir acesso fácil e rápido de qualquer informação via uso de APIs. A principal vantagem dele sobre o [Memcached](http://memcached.org/) é que ele implementa alguns recursos adicionais como [transactions](http://redis.io/topics/transactions) e [publish-subscribe-pattern](http://en.wikipedia.org/wiki/Publish%E2%80%93subscribe_pattern), que permite um uso mais robusto e versátil em vários contextos de aplicação.

Como é um serviço de rede, ele trabalha sobre IP:Porta. Assim é importante atentar para regras básicas de segurança (regras de iptables, bind para localhost, etc.). No entanto o Redis possui uma funcionalidade interessante que habilita a autenticação antes da execução de queries. [Neste link](http://redis.io/topics/security) você encontra boas práticas de segurança para o Redis.

Bora botar isso pra funcionar!

## Habilitar repositório EPEL e os repositórios dos pacotes à serem instalados

```bash
# rpm -Uvh http://mirror.1000mbps.com/fedora-epel/6/i386/epel-release-6-8.noarch.rpm
```

```bash
# vim /etc/yum.repos.d/logstash.repo
```

```bash
[logstash]  
name=logstash repository for 1.4.x packages  
baseurl=http://packages.elasticsearch.org/logstash/1.4/centos  
gpgcheck=1  
gpgkey=http://packages.elasticsearch.org/GPG-KEY-elasticsearch  
enabled=1
```

```bash
# vim /etc/yum.repos.d/elasticsearch.repo
```

```bash
[elasticsearch]  
name=Elasticsearch repository for 1.0.x packages  
baseurl=http://packages.elasticsearch.org/elasticsearch/1.0/centos  
gpgcheck=1  
gpgkey=http://packages.elasticsearch.org/GPG-KEY-elasticsearch  
enabled=1

```bash  
# vim /etc/yum.repos.d/nginx.repo
```

```bash
[nginx]  
name=nginx repo  
baseurl=http://nginx.org/packages/centos/$releasever/$basearch/  
gpgcheck=0  
enabled=1
```

## Instalar os pacotes necessários

```bash
# yum -y install elasticsearch redis nginx logstash
```

## Instalando e configurando o Kibana

```bash
# wget https://download.elasticsearch.org/kibana/kibana/kibana-3.1.0.tar.gz  
# tar -xvzf kibana-3.1.0.tar.gz  
# mv kibana-3.1.0 /usr/share/kibana3
```

Agora precisamos informar ao Kibana onde encontrar o ElasticSearch. Abra o arquivo de configuração e modifique o parâmetro correspondente:  

```bash
# vim /usr/share/kibana3/config.js
```

Procure pelo parâmetro “elasticsearch:” e modifique de acordo com seu ambiente. Note que no neste post, eu estou usando como exemplo o servidor abaixo, rodando Centos 6.4:

elk.ricardomartins.com.br (192.168.33.100)  

```bash
elasticsearch: "http://192.168.33.100:9200"
```

Você também precisa modificar o parâmetro da rota padrão para que o Dashboard do Logstash seja utilizado por padrão ao invés da tela de boas vindas do Kibana:  

```bash
default_route : ‘/dashboard/file/logstash.json’,
```

E por fim, precisamos colocar o Kibana disponível no Nginx. O Elasticsearch tem um arquivo de exemplo que você pode usar para habilitar o Kibana:  

```bash
# wget https://github.com/elastic/kibana/blob/kibana3/sample/nginx.conf  
# mv nginx.conf /etc/nginx/conf.d/  
# mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.off
```

Agora vamos abrir o arquivo de configuração e alterar o parâmetro “server_name” de acordo com nosso ambiente de teste:  

```bash
# vim /etc/nginx/conf.d/nginx.conf
```

```bash
server_name elk.ricardomartins.com.br;
```

Vamos alterar também o nome do arquivo de log:  

```bash
access_log /var/log/nginx/elk.ricardomartins.com.br.access.log;
```

## Configurando o Redis

Vamos configurar o Redis para ouvir na interface de rede correta:  
```bash
# vim /etc/redis.conf  
bind 192.168.33.100
```

## Configurando o Logstash

Agora vamos criar nossa configuração do Logstash. Basicamente o que ela faz:

- Fazer a leitura do /var/log;
- Abrir a porta 5544 para habilitar o recebimento de mensagens de syslog remotas;
- Informar ao Logstash para usar nossa instalação do ElasticSearch ao invés da instalação que vem nele.

```bash
# vim /etc/logstash/conf.d/logstash-complex.conf
```

```bash
input {  
file {  
type => “syslog”  
path => [ “/var/log/*.log”, “/var/log/messages”, “/var/log/syslog” ]  
sincedb_path => “/opt/logstash/sincedb-access”  
}

redis {  
host => “192.168.33.100”  
type => “redis-input”  
data_type => “list”  
key => “logstash”  
}

syslog {  
type => “syslog”  
port => “5544”  
}  
}

filter {  
grok {  
type => “syslog”  
match => [ “message”, “%{SYSLOGBASE2}” ]  
add_tag => [ “syslog”, “grokked” ]  
}  
}

output {  
elasticsearch { host => “elk.ricardomartins.com.br” }  
}
```

Hora do Teste!

## Iniciando e habilitando os serviços

```bash
# service redis start; chkconfig redis on  
# service elasticsearch start; chkconfig –add elasticsearch; chkconfig elasticsearch on  
# service logstash start; chkconfig logstash on  
# service nginx start; chkconfig nginx on
```

Verificando se todos os serviços subiram conforme esperado:  

```bash
# lsof -i tcp:9200,80,5544,6379
```

Se todas as portas estiverem escutando corretamente, você deverá ver algo assim:  

```bash
COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME  
redis-ser 9777 redis 4u IPv4 32483 0t0 TCP elk.ricardomartins.com.br:6379 (LISTEN)  
redis-ser 9777 redis 5u IPv4 32859 0t0 TCP elk.ricardomartins.com.br:6379->elk.ricardomartins.com.br:48889 (ESTABLISHED)  
java 9803 elasticsearch 88u IPv6 32763 0t0 TCP *:wap-wsp (LISTEN)  
java 9826 logstash 19u IPv6 32858 0t0 TCP elk.ricardomartins.com.br:48889->elk.ricardomartins.com.br:6379 (ESTABLISHED)  
java 9826 logstash 42u IPv6 32863 0t0 TCP *:5544 (LISTEN)  
nginx 9882 root 7u IPv4 32800 0t0 TCP *:http (LISTEN)  
nginx 9885 nginx 7u IPv4 32800 0t0 TCP *:http (LISTEN)
```

Para o rsyslog, você pode adicionar estas linhas ao /etc/rsyslog.conf  

```bash
# ### begin forwarding rule ###  
# The statement between the begin … end define a SINGLE forwarding  
# rule. They belong together, do NOT split them. If you create multiple  
# forwarding rules, duplicate the whole block!  
# Remote Logging (we use TCP for reliable delivery)  
#  
# An on-disk queue is created for this action. If the remote host is  
# down, messages are spooled to disk and sent when it is up again.  
$WorkDirectory /var/lib/rsyslog # where to place spool files  
$ActionQueueFileName fwdRule1 # unique name prefix for spool files  
$ActionQueueMaxDiskSpace 1g # 1gb space limit (use as much as possible)  
$ActionQueueSaveOnShutdown on # save messages to disk on shutdown  
$ActionQueueType LinkedList # run asynchronously  
$ActionResumeRetryCount -1 # infinite retries if host is down  
# remote host is: name/ip:port, e.g. 192.168.0.1:514, port optional  
*.* @@192.168.33.100:5544  
# ### end of the forwarding rule ###
```

```bash
# /etc/init.d/rsyslog restart
```

Se você seguiu cuidadosamente os passos, tudo irá iniciar sem problemas.

Agora aponte seu browser para o endereço IP do seu servidor e veja a tela do Kibana com os arquivos de log do seu /var/log*

Usando esta configuração, você pode receber as mensagens de syslog dos seus servidores remotos também. Estas mensagens serão recebidas pelo logstash diretamente, omitindo a passagem pelo Redis.

[![kibana, elasticsearch, logstash](/media/Screen-Shot-2014-06-02-at-17.01.40.png)](/media/Screen-Shot-2014-06-02-at-17.01.40.png)

Até este ponto, você já tem seu ELK Stack totalmente funcional. No primeiro acesso, mais abaixo você imediatamente as informações mais recentes coletadas nos logs do /var/log*. No meu caso, são mensagens dos acessos no Nginx:

[![kibana](/media/Screen-Shot-2014-06-02-at-17.18.01.png)](/media/Screen-Shot-2014-06-02-at-17.18.01.png)

## Plus: Criando uma configuração específica para logs do Nginx

Ok, agora vamos fazer um teste mais objetivo. Que tal ter os logs do seu servidor Web em uma tela amigável como a do Kibana? Vamos lá:  

```bash
# vim /etc/rsyslog.d/logstash-nginx.conf
```

```bash
]# Teste com os logs de acesso do Nginx

$ModLoad imfile

$InputFileName /var/log/nginx/elk.ricardomartins.com.br.access.log  
$InputFileTag nginx-accesslog:  
$InputFileStateFile state-nginx-accesslog  
$InputRunFileMonitor

$InputFilePollInterval 10  
if $programname == ‘nginx-accesslog’ then @@192.168.33.100:5544  
if $programname == ‘nginx-accesslog’ then ~
```

```bash
# /etc/init.d/rsyslog restart
```

Veja como podemos pegar agora as mensagens específicas dos logs de acesso do Nginx:

Busque por \*.nginx na barra de pesquisa:

[![Kibana](/media/Screen-Shot-2014-06-02-at-17.20.50.png)](/media/Screen-Shot-2014-06-02-at-17.20.50.png)

Ou ainda:

Clique em **program**, e escolha **nginx-accesslog**, que neste caso foi a tag que definimos quando fizemos nossa configuração no rsyslog logo acima.

[![Kibana](/media/Screen-Shot-2014-06-02-at-17.22.47.png)](/media/Screen-Shot-2014-06-02-at-17.22.47.png)

[![Kibana](/media/Screen-Shot-2014-06-02-at-17.22.25.png)](/media/Screen-Shot-2014-06-02-at-17.22.25.png)

Da mesma forma, você pode criar para qualquer tipo de log desejado. Vamos fazer um teste com os logs do Yum:

Criaremos o arquivo logstash-yum.conf e inserimos o conteúdo abaixo:  

```bash
# vim /etc/rsyslog.d/logstash-yum.conf
```

```bash
# Teste com os logs do Yum

$ModLoad imfile

$InputFileName /var/log/yum.log  
$InputFileTag yum-log:  
$InputFileStateFile yum-log  
$InputRunFileMonitor

$InputFilePollInterval 10  
if $programname == ‘yum-log’ then @@192.168.33.100:5544  
if $programname == ‘yum-log’ then ~
```

```bash
# /etc/init.d/rsyslog restart
```

Procure por *.yum:

[![Kibana](/media/Screen-Shot-2014-06-02-at-17.31.11.png)](/media/Screen-Shot-2014-06-02-at-17.31.11.png)

Será gerada uma lista com todos os eventos registrados pelo yum:

[![Kibana](/media/Screen-Shot-2014-06-02-at-17.36.39.png)](/media/Screen-Shot-2014-06-02-at-17.36.39.png)Escolha uma das entradas e verifique o conteúdo da mensagem na íntegra.

Um outro exemplo pode ser pesquisar por programas instalados. Basta usar o campo de pesquisa e procurar por ***installed***

[![Kibana](/media/Screen-Shot-2014-06-02-at-17.39.31.png)](/media/Screen-Shot-2014-06-02-at-17.39.31.png)

Agora nos resultados exibidos na parte inferior você terá apenas eventos registrados que possuam a palavra ***installed:***

[![Captura de tela: Shot 2014](/media/Screen-Shot-2014-06-02-at-17.41.06.png)](/media/Screen-Shot-2014-06-02-at-17.41.06.png)

Note que as informações foram registradas na configuração que criamos chamada yum-log. Observe o campo ***program*** acima.

Abra uma das mensagens e descubra mais detalhes sobre a instalação realizada:

[![Kibana](/media/Screen-Shot-2014-06-02-at-17.44.26.png)](/media/Screen-Shot-2014-06-02-at-17.44.26.png)

Olha aí a instalação do wget que eu fiz!

Por enquanto ficamos por aqui. Ainda estou descobrindo melhor sobre o uso destas ferramentas, e isto é tudo que sei por enquanto.

Lembre-se que se você tiver um firewall rodando, você precisa liberar as portas correspondentes. Abaixo a relação de portas necessárias:

- 80 (para a interface web);
- 5544 (para receber mensagens de syslog remotas);
- 6379 (para o Redis);
- 9200 (para a interface web acessar o elasticsearch)

> Referências:
> 
> - <http://michael.bouvy.net/blog/en/2013/11/19/collect-visualize-your-logs-logstash-elasticsearch-redis-kibana/>
> - <http://www.linuxfunda.com/2013/09/27/log-management-using-logstash-and-kibina-on-centos-rhel-ubuntu/>
> - <http://www.ericvb.com/archives/getting-started-on-centralized-logging-with-logstash-elasticsearch-and-kibana>
> - <http://www.chriscowley.me.uk/blog/2014/03/21/logstash-on-centos-6/>
> - <http://www.jaddog.org/2014/01/16/openstack-logstash-elasticsearch-kibana/>
> - <http://www.denniskanbier.nl/blog/logging/installing-logstash-on-rhel-and-centos-6/>
> - <http://blog.basefarm.com/blog/how-to-install-logstash-with-kibana-interface-on-rhel/>
