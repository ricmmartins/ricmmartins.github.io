---
slug: "opsworks-trabalhando-com-cookbooks-customizadas"
aliases:
  - "/posts/opsworks-trabalhando-com-cookbooks-customizadas/"
title: 'OpsWorks: Trabalhando com cookbooks customizadas - Parte III/III'
date: '2015-03-23T16:51:10-04:00'
tags:
    - aws
    - opsworks
categories:
    - AWS
description: "Finalizando a série de artigos sobre o OpsWorks, neste post veremos como utilizar cookbooks customizadas em nosso ambiente."
---

Finalizando a série de artigos sobre o OpsWorks, neste post veremos como utilizar cookbooks customizadas em nosso ambiente.

Para começar, entre na console do OpsWorks e vamos criar nossa segunda stack.

[![opsworks1](/wp-content/uploads/2015/03/opsworks1-1.png)](/wp-content/uploads/2015/03/opsworks1-1.png)

Clique em Add Stack e preencha os dados necessários:

[![opsworks2](/wp-content/uploads/2015/03/opsworks2.png)](/wp-content/uploads/2015/03/opsworks2.png)

Clique em advanced para abrir mais opções e definir que utilizaremos cookbooks customizadas. No caso, alterei o campo “Use custom Chef cookbooks” para yes. Neste caso, vou usar o S3 como repositório, então foi preenchido da seguinte forma:

[![opsworks3](/wp-content/uploads/2015/03/opsworks3.png)](/wp-content/uploads/2015/03/opsworks3.png)

* Note que eu ainda não criei a cookbook customizada e enviei para o S3, mas já posso definir o nome do arquivo e em qual dos meus buckets ela estará, no caso: https://s3.amazonaws.com/rmartins/cookbook.tar.gz Além disso informei o Access key ID e o Secret access key de um usuário com permissões neste bucket.

** Observe que também alterei para não utilizar os security groups padrões do OpsWorks, e usaremos um security group já criado previamente com apenas o acesso nas portas 80 e 22 liberados.

Note a opção de “Manage Berkshelf” que foi deixada em “No”. Desta forma a escolha da versão do Berkshelf utilizada será feita pelo próprio OpsWOrks. Caso prefira você mesmo escolher qual versão utilizar, coloque em YES e escolha a versão desejada.

De forma geral, o [Berkshelf](http://berkshelf.com/) é uam ferramenta utlizada para cuidar automaticamente das dependências dos cookbooks utilizados. Ou seja, caso sua receita faça a instalação de um utilitário ou aplicação que tenha dependência de alguma outra biblioteca ou coisa parecida, o Berkshelf se encarrega de automaticamente isntalar esta dependência para você.

Depois de clicar em Add stack, temos ela criada. Antes de criarmos a nossa layer e nossa instância de testes, vamos primeiro criar nosso cookbook customizado.

Vamos trabalhar em uma estrutura de diretórios conforme abaixo:

[![opsworkslab](/wp-content/uploads/2015/03/opsworkslab.png)](/wp-content/uploads/2015/03/opsworkslab.png)

```bash
# mkdir -p /opsworkslab/mycookbooks  
```

Dentro da pasta cookbooks, teremos as pastas com as nossas recipes. Cada recipe, com a seguinte estrutura:

[![opsworkslab1](/wp-content/uploads/2015/03/opsworkslab1.png)](/wp-content/uploads/2015/03/opsworkslab1.png)

O que vem a ser cada um destes diretórios e arquivos?

. **cookbookname**: O nome que você dará ao seu livro de receitas. Sua função é puramente organizacional.

. **attributes**: O diretório onde você pode armazenar atributos e/ou parâmetros de configurações. O uso é opcional. Por exemplo, se você deseja especificar que determinada aplicação terá por padrão os logs em um local específico:

```bash
default[:application][:dirlog] = “/var/log/application”  
default[:application][:oldlog] = “/var/log/application/old\_logs”  
```

Em seguida, na receita para criação da estrutura da sua aplicação, você definiria da seguinte forma:

```bash
directory “#{node[:application][:dirlog]}” do  
owner “root”  
group “root”  
mode 0755  
action :create  
recursive true  
end

directory “#{node[:application][:oldlog]}” do  
owner “root”  
group “root”  
mode 0755  
action :create  
recursive true  
end
```

. **recipes**: Diretório onde estarão as nossas receitas

. **templates**: Diretório onde estarão os nossos templates/modelos de configuração. Por exemplo, você poderia ter seu nginx.conf aqui dentro deste diretório.

. **metadata.rb**: Neste arquivo, você irá fornecer algumas informações sobre sua recipe.

Para facilitar o entendimento, vamos criar nossa primeira configuração. É uma configuração simples, que utilizo para ajustar o timezone e criar um cron de sincronismo de data com o ntp.br.

Uma vez que você já criou o diretório /opsworkslab/mycookbooks, vamos lá:

```bash
# cd /opsworkslab/mycookbooks  
```

Vamos criar a estrurtura de diretórios:

```bash
# mkdir -p systemconfig/{attributes/default/,recipes,templates/default}  
```

Este comando irá criar a seguinte árvore de diretórios dentro de /opsworkslab/mycookbooks:

[![opsworkslab2](/wp-content/uploads/2015/03/opsworkslab2.png)](/wp-content/uploads/2015/03/opsworkslab2.png)

* Note que os subdiretórios “attributes” e “templates” precisam ter os subdiretórios default dentro, uma vez que os atributos e templates podem variar de acordo com a distribuição utilizada. Por exemplo, sistemas RedHat-like podem ter locais diferentes dos sistemas Debian-like para arquivos e/ou aplicações.

Com a árvore de diretórios criada, mãos à obra. Vamos criar os arquivos destes diretórios.

```bash
# vim /opsworkslab/mycookbooks/systemconfig/metadata.rb  
```

Neste arquivo vamos passar algumas informações sobre a nossa receita. Insira o seguinte conteúdo no arquivo criado:

```bash
name “systemconfig”  
description “Default System Configurations”  
maintainer “Ricardo Martins”  
version “1.0.0”  
```

```bash
# vim /opsworkslab/mycookbooks/systemconfig/recipes/timezone.rb  
```

Adicione o seguinte conteúdo e salve o arquivo:

```bash
template “/etc/sysconfig/clock” do  
source “clock.erb”  
owner “root”  
group “root”  
mode 0644  
end

link “/etc/localtime” do  
to “/usr/share/zoneinfo/Brazil/East”  
action :create  
end

template “/etc/cron.daily/ntpdate” do  
source “ntpdate.erb”  
mode 0755  
owner “root”  
group “root”  
end  
```

```bash
# vim /opsworkslab/mycookbooks/systemconfig/templates/default/clock.erb
```


Adicione o conteúdo:

```bash
ZONE=”Brazil/East”  
UTC=true  
```

```bash
# vim /opsworkslab/mycookbooks/systemconfig/templates/default/ntpdate.erb  
```

Adicione o conteúdo:

```bash
/usr/sbin/ntpdate -u pool.ntp.br  
```

Pronto. Já temos nossa primeira receita criada. Agora vamos explicar passo a passo:

O Arquivo metadata.rb é onde fazemos nossos comentários. Podemos informar também se esta receita depende de alguma outra. Por exemplo, se dependesse da aplicação de alguma outra receita que tivéssemos, você poderia adicionar ao fim do arquivo o texto depends “nome da receita que depende”

O arquivo timezone.rb é possui o que iremos exatamente fazer. Ele diz para usar o arquivo clock.erb como modelo e colocá-lo em /etc/sysconfig/clock. Também define o dono e grupo do arquivo, além das permissões concedidas sobre ele.

Em seguida dizemos para criar o link /etc/localtime apontando para /usr/share/zoneinfo/Brazil/East.

E por fim dizemos para usar como modelo o arquivo ntpdate.erb e colocá-lo em /etc/cron.daily. Da mesma forma definimos dono, grupo e permissões do arquivo.

O arquivo clock.erb é o conteúdo que será inserido em /etc/sysconfig/clock.

O arquivo ntpdate.erb é o conteúdo do /etc/cron.daily/ntpdate, que será executado diariamente para fazer o sincronismo de data/hora.

Uma boa documentação sobre cookbooks pode ser encontrada aqui: <http://docs.aws.amazon.com/opsworks/latest/userguide/workingcookbook-installingcustom-repo.html>

Em seguida, vamos criar o nosso arquivo compactado e enviá-lo para o S3.

```bash
# cd /opsworkslab  
# tar czvf coobook.tar.gz mycookbooks  
```

Agora vamos abrir a console do S3 e enviar o arquivo para lá.

[![opsworks4](/wp-content/uploads/2015/03/opsworks4.png)](/wp-content/uploads/2015/03/opsworks4.png)

Agora que já temos o arquivo no S3, vamos criar a nossa layer no OpsWorks:

[![opsworks5](/wp-content/uploads/2015/03/opsworks5-1.png)](/wp-content/uploads/2015/03/opsworks5-1.png)

Vamos clicar em “Add a layer” e em seguida vamos preencher as informações necessárias:

[![opsworks6](/wp-content/uploads/2015/03/opsworks6.png)](/wp-content/uploads/2015/03/opsworks6.png)

Note que o tipo de Layer neste caso foi definido como Custom, uma vez que vou usar cookbooks customizadas. Escolhemos um nome, um shortname e defini um security group já existente, no caso, “webserver”.

Depois de criada a layer, precisamos ajustar alguns detalhes. Para isso na tela abaixo vamos primeiro clicar em Recipes:

[![opsworks7](/wp-content/uploads/2015/03/opsworks7.png)](/wp-content/uploads/2015/03/opsworks7.png)

Dentro de “Recipes”, podemos ver as receitas configuradas em cada ciclo de vida da Layer. Observe que inicialmente temos apenas as receitas chamadas “Built-in”, que são as já pre-configuradas pelo próprio OpsWorks para serem executadas.

[![opsworks8](/wp-content/uploads/2015/03/opsworks8.png)](/wp-content/uploads/2015/03/opsworks8.png)

Agora vamos editar o ciclo de vida da Layer e inserir as receitas que criamos, dentro de “Custom Chef Recipes”. Clique em Edit e você será direcionado para esta tela:

[![opsworks9](/wp-content/uploads/2015/03/opsworks9.png)](/wp-content/uploads/2015/03/opsworks9.png)

Verifique no campo “Repository URL” a existência da localização da nossa recipe criada anteriormente. Agora vamos informar em qual instante do ciclo de vida, queremos que o conteúdo da nossa receita seja aplicado na instância que irá compor esta Layer.

Nosso exemplo é um ajuste de configuração do timezone, então para organização vamos colocá-la no processo de Setup da instância. Sendo assim basta ir na opção correspondente, informar o cookbook e a receita à ser executada. No nosso caso, fica assim:

[![opsworks10](/wp-content/uploads/2015/03/opsworks10.png)](/wp-content/uploads/2015/03/opsworks10.png)

Feito isso basta salvar e veremos a tela da seguinte forma, com nossa recipe sendo executado no Setup da instância:

[![opsworks11](/wp-content/uploads/2015/03/opsworks11.png)](/wp-content/uploads/2015/03/opsworks11.png)

Agora voltamos no meu Layers, e vamos fazer um ajuste nas configurações de rede. Basta clicar em Network:

[![opsworks12](/wp-content/uploads/2015/03/opsworks12.png)](/wp-content/uploads/2015/03/opsworks12.png)

Dentro da parte de Network, clicamos em Edit e vamos configurar para que a instância obtenha um endereço ip público quando for iniciada:

[![opsworks13](/wp-content/uploads/2015/03/opsworks13-1.png)](/wp-content/uploads/2015/03/opsworks13-1.png)

Agora podemos adicionar nossa instância e em seguida ela será inicializada. No processo de setup terá nossa receita customizada aplicada.

Vamos no menu Instances e escolhemos a opção “Add an instance”:

[![opsworks14](/wp-content/uploads/2015/03/opsworks14.png)](/wp-content/uploads/2015/03/opsworks14.png)

Preencheremos as informações necessárias:

[![opsworks15](/wp-content/uploads/2015/03/opsworks15.png)](/wp-content/uploads/2015/03/opsworks15.png)

E por fim clicamos em “Add Instance”. Seremos direcionados para a tela seguinte, onde podemos dar start na instância:

[![opsworks16](/wp-content/uploads/2015/03/opsworks16.png)](/wp-content/uploads/2015/03/opsworks16.png)

Uma vez dado start, podemos acompanhar a atualização de status o processo de criação e inicialização da instância até que ela esteja totalmente operacional.

[![opsworks17](/wp-content/uploads/2015/03/opsworks17-1.png)](/wp-content/uploads/2015/03/opsworks17-1.png)

Uma vez a instância inicializada e configurada, vamos conectar nela e conferir a configuração:

[![opsworks18](/wp-content/uploads/2015/03/opsworks18.png)](/wp-content/uploads/2015/03/opsworks18.png)

[![opsworks19](/wp-content/uploads/2015/03/opsworks19-1.png)](/wp-content/uploads/2015/03/opsworks19-1.png)

Caso queria visualizar, as nossas receitas são copiadas para a instância dentro de /opw/aws/opsworks:

[![opsworks20](/wp-content/uploads/2015/03/opsworks20.png)](/wp-content/uploads/2015/03/opsworks20.png)

Com este útlimo post finalizo a série sobre o OpsWorks que gostaria de compartilhar com vocês. Como já disse anteriormente, o OpsWorks é uma ferramenta excepcional para gerenciar, versionar e controlar ambientes complexos inteiros. Espero que com estas informações básicas que disponibilizei por aqui, você já possa ter pensado algumas possibilidades de uso e aplicação em sua estrutura.

Gostaria de aproveitar para citar sobre uma atualização que foi lançada na última semana, onde agora já é possível gerenciar seu servidor dentro da sua estrutura on-premise através do OpsWorks, bastando instalar o AWS CLI no seu servidor, onde quer que ele esteja. Leia mais em <https://aws.amazon.com/blogs/aws/opsworks-on-prem-and-existing-instances/>

Abaixo uma boa referência com informações sobre como buscar conteúdo no S3 para deploy de artefatos via OpsWorks: <http://hipsterdevblog.com/blog/2014/06/22/retrieving-files-from-s3-using-chef-on-opsworks/>

Assim que tiver novas informações e descobertas, estarão por aqui também. Até a próxima!
