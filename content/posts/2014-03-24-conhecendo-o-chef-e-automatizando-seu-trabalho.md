---
slug: "conhecendo-o-chef-e-automatizando-seu-trabalho"
title: 'Conhecendo o Chef e automatizando seu trabalho'
date: '2014-03-24T14:59:38-04:00'
tags:
    - chef
description: "Hoje em dia muito tem se falado sobre automatização de infraestrutura. Isto está bastante relacionado com o conceito de DevOps, que bem resumidamente"
---

Hoje em dia muito tem se falado sobre automatização de infraestrutura. Isto está bastante relacionado com o conceito de DevOps, que bem resumidamente posso dizer que é a integração entre desenvolvimento e operação na administração da infraestrutura de TI. Trabalhando juntos, devs e ops com foco no resultado com agilidade e desempenho. A infraestrutura passa a ser gerenciada e orquestrada via código utilizando ferramentas que viabilizam isto.

Como o objetivo deste post não é falar sobre DEVOPS, eu deixo um link que traz uma excelente explicação sobre o assunto. É sem dúvida o artigo mais completo que eu já lí sobre o tema, de autoria de [Guto Carvalho](http://gutocarvalho.net/octopress/curriculo/): <http://gutocarvalho.net/octopress/2013/03/16/o-que-e-um-devops-afinal/>

O [Chef](http://www.getchef.com/chef/) é uma das ferramentas que viabilizam o gerenciamento e orquestração automatizada. Existem outras ferramentas similares que você já deve ter ouvido falar, como [Puppet](http://puppetlabs.com/ "Puppet"), [Ansible](http://www.ansible.com/ "Ansible"), [Rex](http://www.rexify.org/ "Rex"), [Salt](http://www.saltstack.com/ "Salt") , [CFEngine](http://cfengine.com/ "CFEngine"), entre outras por aí.

O Chef utilizada receitas (cookbooks) para a execução das tarefas. Desta forma nos cookbooks estão todas as configurações necessárias para aplicar no seu servidor.

Assim como o Puppet por exemplo, o Chef pode trabalhar no modelo cliente-servidor e no modo apenas cliente, chamado Chef-Solo. Aqui vou abordar sobre o Chef-Solo.

No meu pequeno laboratório, eu utilizo [Vagrant](http://www.vagrantup.com/). É simples e rápido. Como usar o Vagrant fica pra outro post.

## 1. Instalando o Chef-Solo:

```bash
# curl -L https://www.opscode.com/chef/install.sh | bash
```

## 2. Baixando a estrutura básica do Chef:

```bash
# wget http://github.com/opscode/chef-repo/tarball/master  
# tar -zxvf master  
# mv opscode-chef-repo-f9d4b0c/ /opt/chef-repo  
# mkdir /opt/chef-repo/.chef
```

Verifique no diretório “/opt/chef-repo/” a estrutura criada.

Crie e configure o cookbook path, para isso execute o seguinte procedimento:  

```bash
# vi /opt/chef-repo/.chef/knife.rb
```

```bash
cookbook_path \[ ‘/opt/chef-repo/cookbooks’ ]
```

Configure o arquivo solo.rb:  

```bash
# vi /opt/chef-repo/solo.rb
```

Adicione as linhas abaixo:  

```bash
file_cache_path “/opt/chef-solo”  
cookbook_path “/opt/chef-repo/cookbooks”
```

Vamos criar nossa primeira receita de teste:  

```bash”
# cd /opt/chef-repo/cookbooks  
# knife cookbook create ricardo-nginx
```

Agora vamos abrir o arquivo recipes/default.rb da nossa receita:  

```bash
# vim /opt/chef-repo/cookbooks/ricardo-nginx/recipes/default.rb
```

Inclua as linhas abaixo:  

```bash
package “nginx” do  
action :install  
end
```

Crie o arquivo JSON para execução da receita (/opt/chef-repo/web.json) e adicione a seguinte linha:  

```bash
{ “run_list”: [ “recipe[ricardo-nginx]” ] }
```

Agora, basta executar a receita:  

```bash
# chef-solo -c /opt/chef-repo/solo.rb -j /opt/chef-repo/web.json

Conferindo:  

```bash
# ps fax | grep nginx
```

Testando via curl:  
```bash
# curl -I localhost
```

Este realmente foi um post bem básico. O Chef é uma das ferramentas que ainda estou estudando, e não tenho mesmo muito conhecimento e informação para compartilhar. Em breve novas posts com minhas novas descobertas 😀

Dica de leitura: <http://www.ibm.com/developerworks/br/library/a-devops2/>
