---
slug: "conhecendo-o-terraform-packer-e-ansible"
title: 'Conhecendo o Terraform, Packer e Ansible'
date: '2017-03-06T10:34:27-05:00'
tags:
    - azure
    - devops
    - terraform
    - packer
    - ansible
description: "O movimento DevOps vem ganhando muita força nos últimos anos e ao mesmo tempo centenas de ferramentas relacionadas são lançadas dia após dia. Por outro"
---

![Iac - Conhecendo o Terraform, Packer e Ansible](/wp-content/uploads/2017/03/iac.png)

O movimento DevOps vem ganhando muita força nos últimos anos e ao mesmo tempo centenas de ferramentas relacionadas são lançadas dia após dia. Por outro lado com isto tem se tornado cada vez mais difícil escolher as ferramentas adequadas ainda que para as tarefas mais simples, uma vez que a diversidade de ferramentas é cada vez maior.

Então neste artigo eu vou comentar sobre a proposta do Terraform, Packer e o Ansible para implementação e gerenciamento de uma infraestrutura em nuvem. O objetivo será apresentar um método de utilização destas ferramentas de forma integrada.

# Terraform

O [Terraform ](https://www.terraform.io)é uma ferramenta que está licenciada sob a Mozilla Public License 2.,0 cujo o desenvolvimento é suportado pela [Hashicorp](https://www.hashicorp.com/). É uma ferramenta para implementações de infraestrutura como código nova, porém com uma comunidade basante ativa e trabalhando de forma correta na evolução técnica, melhorando a cada versão.

Ele permite descrever, em uma sintaxe simples baseada em JSON, sobre o provisionamento de infraestrutura em diferentes players. Note que a proposta não é uma abstração que possa ser portável entre os diferentes players, mas sim uma sintaxe descritiva comum entre os players.

Hoje já existem conectores para Azure, AWS, GCP e OpenStack. A infraestrutura em nuvem tende a precisar de integrações com fornecedores SaaS, assim como também com bancos de dados e serviços DNS, então por este motivo existem também dezenas de conectores disponibilizados pela comunidade para serviços como:

- Bancos de Dados (PostgreSQL, MySQL, RethinkDB)
- VMWare (vSphere e vCloud Director)
- CloudFlare
- CloudStack

Veja a lista completa em <https://www.terraform.io/docs/providers/index.html>

Uma vez que você descreveu sua infraestrutura, o Terraform pode implantá-la ou calcular a diferença entre a aplicação atual e o estado atual dela conforme definido nos descritores. Ele pode salvar estes planos de execução como arquivos, para consultá-los novamente antes de executá-lo e causar algum impacto em sua plataforma.

# Packer

Agora que já sabemos o que usar para ter a infraestrutura definida vamos em frente!

Muitas vezes temos que preparar as imagens dos servidores para economizar tempo de instalação e atualização inicial de um sistema. Então é aqui onde entra o [Packer](https://www.packer.io). A lógica dele é criar imagens dos servidores ou containers, estejam eles no Azure, AWS, Openstack, Docker e etc.

O princípio é muito simples, com alguns parâmetros em um arquivo JSON de build o Packer irá:

– Iniciar as vms/instâncias nos provedores configurados;  
– Aplicar neles uma sucessão de operações de configuração;  
– Criar um snapsthot e armazenar a imagem no provedor configurado (por exemplo no Azure Blob Storage)

Dentre as operações de configurações realizadas, podem ser via shell ou ansible-local. Mas minha sugestão é utilizar o shell minimamente: apenas para instalar o ansible na máquina. Uma vez que ele esteja instalado, você pode usar o provisionador ansible que irá fazer o upload dos playbooks e executá-los na máquina que esteja sendo provisionada.

# Ansible

O [Ansible ](https://www.ansible.com/)é uma ferramenta de orquestração que normalmente não precisa de introdução.

Mas por que Ansible em detrimento de outros, sabendo que o Packer fornece suporte a outros provisionadores como Puppet, Chef e Salt?

Se você já está habituado a utilizar outras ferramentas para gerenciamento de configuração, continue utilizando. Estamos falando de infraestrutura como código e manutenção dela ao longo do tempo e por isto, dominar suas ferramentas é essencial.

Mas se este não é seu caso, eu sugiro que você utilize o Ansible por ser uma ferramenta que:

- É simples como shell script: Portar um shell script para Ansible é simples e rápido de fazer. De forma geral, ele reduz o número de linhas, melhora e legibilidade do código e torna as coisas mais estruturadas;
- É fácil de aprender: Qualquer experiência de scripting é reutilizável, os mistérios do uso de roles podem vir mais tarde. Você pode começar a ser produtivo em poucas horas;
- Não requer o uso de agentes: Em termos de provisionamento, você pode tratar os playbooks do Ansible como scripts. Desta forma a complexidade de implementação é zero, basta executá-lo.

# IaC no Azure

Se você se interessou pelo o que poderia fazer com estas ferramentas para começar a trabalhar com infraestrutura como código, saiba que todas elas são suportadas no Azure.

Separei alguns links abaixo por onde você pode começar a estudar sobre o assunto e começar a fazer seus laboratórios:

- <https://www.terraform.io/docs/providers/azurerm/>
- <https://www.youtube.com/watch?v=LzXQsHQOkpM>
- <https://www.packer.io/docs/builders/azure-arm.html>
- [https://www.youtube.com/watch?v=qtpmn\_fRgCw](https://www.youtube.com/watch?v=qtpmn_fRgCw)
- [https://docs.ansible.com/ansible/guide\_azure.html](https://docs.ansible.com/ansible/guide_azure.html)
- [https://azure.microsoft.com/en-us/try/devops/?tool=ansible&amp;category=deploy](https://azure.microsoft.com/en-us/try/devops/?tool=ansible&category=deploy)

# DevOps no Azure

E se você quer conhecer sobre DevOps no Azure, alguns links:

- <https://www.microsoft.com/pt-br/cloud-platform/development-operations>
- <https://www.microsoft.com/en-us/download/details.aspx?id=53153>
- <https://azure.microsoft.com/pt-br/blog/topics/it-pro-devops/>
- [https://openedx.microsoft.com/courses/course-v1:Microsoft+DevOps200.1+2017\_T1/about](https://openedx.microsoft.com/courses/course-v1:Microsoft+DevOps200.1+2017_T1/about)
- <https://channel9.msdn.com/DevOps>
- <https://azure.microsoft.com/en-us/try/devops/>
- <https://customers.microsoft.com/pt-BR/story/devops-com-open-source-no-azure>
- <https://www.visualstudio.com/pt-br/devops/>
- [https://openedx.microsoft.com/courses/course-v1:Microsoft+DEVOPS200.5+2017\_T1/about](https://openedx.microsoft.com/courses/course-v1:Microsoft+DEVOPS200.5+2017_T1/about)
- [https://mva.microsoft.com/search/SearchResults.aspx#!q=devops&amp;lang=1033](https://mva.microsoft.com/search/SearchResults.aspx#!q=devops&lang=1033)
