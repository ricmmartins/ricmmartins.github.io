---
slug: "enviando-dados-externos-para-a-stack-elk"
title: 'Enviando dados externos para a stack ELK'
date: '2014-06-09T16:59:49-04:00'
tags:
    - elasticsearch
    - monitoramento
categories:
    - Geral
description: "No post anterior sobre como implementar a Stack ELK (ElasticSearch, Logstash e Kibana) fiz um setup default com todos os serviços no mesmo servidor"
---

No post anterior sobre [como implementar a Stack ELK](/implementando-a-stack-elk-elasticsearch-logstash-kibana-no-centos/) (ElasticSearch, Logstash e Kibana) fiz um setup default com todos os serviços no mesmo servidor. Aproveitando para fazer o marketing, o post foi rapidamente citado no blog oficial do ElasticSearch [nesta url.](http://www.elasticsearch.org/blog/2014-06-04-this-week-in-elasticsearch/) o/

Além disso foi incluído o [Redis](http://redis.io/) na stack, recebendo os dados e direcionando para o Logstash. Este é um recurso útil para ganho de performance.

Para facilitar o entendimento, vamos relembrar informações sobre a instalação da nossa stack:

Fizemos a instalação do Logstash, Elasticsearch, Nginx, Redis e do Kibana.

Inicialmente, fizemos o download do Kibana e configuramos ele no Nginx. Na configuração, especificamos onde estaria nossa instalação do ElasticSearch e em qual porta ele estaria configurado. No exemplo, estava na mesmo servidor onde as demais aplicações estariam instaladas, porém poderia estar em um servidor distinto. Além disto alteramos a rota padrão para que fosse utilizado o Dashboard do Logstash ao invés da tela de boas vindas do Kibana.

Em seguida foi feita a configuração do Redis, onde optamos por uma configuração mínima, apenas definindo o endereço IP no qual ele estaria respondendo às requisições.

O próximo passo foi realizar a configuração do Logstash. Em nossa configuração, definimos como input uma fila do Redis chamada **logstash** (key =&gt; “logstash”) e também os arquivos de log contidos em /var/log/\*.log, /var/log/messages e /var/log/syslog. Também habilitamos o recebimento de mensagens de syslog remotas na porta 5544, filtramos os dados com o [Grok](http://logstash.net/docs/1.4.1/filters/grok) e passamos o elasticsearch como output dos dados.

Desta forma, temos os dados chegando no Logstash de duas formas:

1. Pelo Redis na lista nomeada como logstash;
2. E os arquivos diretamente especificados contidos em /var/log/\*.log, /var/log/messages e /var/log/syslog.

Em seguida estes dados são lidos pelo Logstash, armazenados no ElasticSearch e lidos pelo Kibana. Em resumo, o fluxo é o seguinte:

[![fluxo](/media/Screen-Shot-2014-06-09-at-16.25.26.png)](/media/Screen-Shot-2014-06-09-at-16.25.26.png)

No nosso exemplo do post anterior, eu configurei o syslog da máquina para encaminhar os dados do syslog para o Logstash na porta 5544. Isto foi feito no nosso arquivo /etc/rsylog.conf. Por fim, tínhamos todos os dados de syslog disponíveis no Kibana.  
Adicionalmente foram feitos também dois testes com arquivos específicos: os logs do Nginx e do Yum.

Agora vamos fazer um novo teste, enviando os logs do Apache de um segundo servidor para a nossa stack.

Para fazer isto, basta você instalar o logstash na máquina via YUM, ou baixando o arquivo .tar.gz. Para deixar o post mais didático, vamos realizar a instalação manualmente com o arquivo .tar.gz:  

```bash
# cd /tmp  
# wget https://download.elasticsearch.org/logstash/logstash/logstash-1.4.1.tar.gz  
# tar xzvf logstash-1.4.1.tar.gz  
# mv logstash-1.4.1.tar.gz logstash  
# vim conf/shipper.conf  
input {  
file {  
path => “/home/ricmmart/logs/ricardomartins.com.br/http/access.log”  
type => “apache”  
}  
}  
filter {  
if [type] == “apache-access” {  
grok {  
add_tag => [“apache”, “grokked”]  
match => {  
“message” => “%{COMMONAPACHELOG}”  
}  
}  
}  
}  
output {  
stdout {  
codec => rubydebug  
}  
redis {  
host => “192.168.33.100”  
data_type => “list”  
key => “logstash”  
}  
}  
```

Conforme demonstrado acima, passamos o path do arquivo de log como input, informamos como deverá ser feita a filtragem dos dados, e por fim definimos o output direcionando para o Redis do nosso servidor com a stack instalada. Lembrando de informar a lista **logstash** através do parâmetro: key => “logstash”

Feito isto, vamos rodar o logstash passando o path do nosso arquivo de configuração:  

```bash
# bin/logstash -f conf/shipper.conf
```

Caso você receba uma mensagem de erro similar à esta:  

```bash
LoadError: Could not load FFI Provider: (NotImplementedError) FFI not available: null
```

Você precisa ajustar uma variável de ambiente. Insira o comando abaixo:  

```bash
# export _JAVA_OPTIONS=-Djava.io.tmpdir=/home/ricmmart/tmp
```

No caso, alterando o tmpdir para um path onde você tenha permissão de escrita.

Pronto! Imediatamente você comecará a ver as mensagens do log do seu apache na tela:

[![output logstash](/media/Screen-Shot-2014-06-09-at-16.42.18.png)](/media/Screen-Shot-2014-06-09-at-16.42.18.png)

E no Kibana teremos:

[![Screen Shot 2014-06-09 at 17.04.12](/media/Screen-Shot-2014-06-09-at-17.04.12.png)](/media/Screen-Shot-2014-06-09-at-17.04.12.png)

[![kibana](/media/Screen-Shot-2014-06-09-at-17.04.31.png)](/media/Screen-Shot-2014-06-09-at-17.04.31.png)

Agora sim! Você já tem como ter qualquer tipo de log no seu stack ELK.

Agradecimentos especiais ao meu amigo [Rafael Lopes](http://mpran.rafalop.es/), que colaborou bastante para este post sair.

Até a próxima!
