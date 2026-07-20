---
slug: "melhores-praticas-para-administradores-de-sistemas-na-nuvem-da-microsoft-azure-parte-ii"
title: 'Melhores práticas para administradores de sistemas na nuvem da Microsoft (Azure) &#8211; Parte II'
date: '2016-11-23T15:47:45-05:00'
tags:
    - azure
---

## Criando e organizando os recursos

Nesta segunda parte vamos abordar os resource groups, tags, templates arm e controles

Agora que você já está familiarizado com os termos Azure Accounts e Subscriptions sabendo exatamente como segmentar seus departamentos de forma apropriada, o próximo ponto é entender como criar os recursos de uma maneira lógica e organizada através dos Resource Groups.

Importante destacar que associado ao uso dos resource groups, está o uso de tags. Os recursos podem ser “tageados” no formato chave/valor de modo a categorizar e permitir a visualização de recursos entre resource groups e/ou subscriptions distintos.

Saiba mais sobre **tags** em: <https://azure.microsoft.com/en-us/documentation/articles/resource-group-using-tags/>

De forma geral, abaixo estão dispostas as principais características dos resorce groups:

- Organização de múltiplos recursos de forma agrupada;
- Garantia de que recursos estarão presentes em apenas um resource group, não sendo possível ter um mesmo recurso criado em mais de um resource group;
- Resource groups podem conter recursos de regiões distintas;
- Resource groups podem conter tipos de recursos distintos.

![](/wp-content/uploads/2016/11/rg.png)

Visão geral sobre o Azure Resource Manager: <https://docs.microsoft.com/en-us/azure/azure-resource-manager/resource-group-overview>

Gerenciando recursos pelo portal: <https://azure.microsoft.com/en-us/documentation/articles/resource-group-portal/>

Começando a usar o Azure Resource Manager: [http://download.microsoft.com/download/E/A/4/EA4017B5-F2ED-449A-897E-BD92E42479CE/Getting\_Started\_With\_Azure\_Resource\_Manager\_white\_paper\_EN\_US.pdf](http://download.microsoft.com/download/E/A/4/EA4017B5-F2ED-449A-897E-BD92E42479CE/Getting_Started_With_Azure_Resource_Manager_white_paper_EN_US.pdf)

O portal v2 do Azure, também conhecido como [ARM ](https://docs.microsoft.com/pt-br/azure/azure-resource-manager/resource-manager-deployment-model)(Azure Resource Manager) dentre outras funcionalidades, trouxe esta implementação dos resource groups, facilitando bastante a organização dos recursos, gerenciamento e controle de identidade e acessos através do [RBAC ](https://docs.microsoft.com/pt-br/azure/active-directory/role-based-access-control-configure)(Role Based Access Control), além de trazer uma abordagem mais aprimorada para a gestão e controle de custos.

Além dos **Resources** (recursos gerenciados) e dos **Resource Groups** (grupos de organização lógica dos resources) temos ainda outros dois termos que você precisa conhecer no **Azure Resource Manager**:

– **Resource Provider**: Serviço que provê os recursos que você faz o deploy e gerenciamento através do resource manager. Cada resource provider oferece diferentes operações para trabalhar com os resources que estão sendo deployados. Exemplos de resource providers seriam o Microsoft.Compute, Microsoft.Storage, etc.

– **Resource Manager Template**: Arquivo **JSON** (JavaScript Object Notation) que define os recursos e suas dependências à serem “deployados” em um resource group. Estes templates podem ser usados para deployar os recursos de forma consistente e automatizada no Azure, indo de encontro às metodologias DevOps atuais onde você consegue usar o modelo de infraestrutura como código através do uso de templates, conhecidos como templates arm.

## Templates ARM

Os templates podem ser deployados no Azure à partir do próprio repositório onde estejam hospedados (Github, Bitbucket, entre outros), pelo próprio portal do Azure uma vez que você tenha adicionado à biblioteca ou ainda pelo Visual Studio, que além de permitir criá-los também faz o deployment dos mesmos.

Tudo que é criado no Azure possui seu arquivo JSON e estão disponíveis no próprio recurso e também nos resource groups, na opção conhecida como **Automation Scripts,** onde você pode fazer download, salvar na biblioteca no próprio azure e deployar novamente.

Se você quiser ver alguns templates prontos pra usar pode visitar o link <https://azure.microsoft.com/en-us/resources/templates/> ou o repositório do Azure no Github onde eles estão disponíveis: <https://github.com/Azure/azure-quickstart-templates>

Caso esteja interessado em ver e editar templates ARM, existe uma ferramenta online bastante interessante que você pode conhecer em <http://armviz.io>

E caso tenha se interessado pelo assunto, você pode se aprofundar mais em:

–[ https://docs.microsoft.com/en-us/azure/azure-resource-manager/resource-group-overview#template-deployment](https://docs.microsoft.com/en-us/azure/azure-resource-manager/resource-group-overview#template-deployment)

– <https://docs.microsoft.com/en-us/azure/azure-resource-manager/resource-group-authoring-templates>

Então tenha em mente que existem diversas formas de criar seus recursos no Azure, basta escolher a que funciona melhor para você, seja via portal, Visual Studio, sintaxe imperativa com PowerShell ou ainda sintaxe declarativa via templates JSON.

E se você tiver interesse em conhecer como funcionam as coisas por baixo do caput, conheça o Azure Resource Explorer, que é uma ferramenta para trabalhar com as APIs do Azure e pode ser acessada em [http://resources.azure.com. ](http://resources.azure.com)

Com ela você consegue além de trabalhar com as APIs do Azure, criar e editar recursos acessando diretamente o JSON do ambiente.

Saiba mais sobre ela no link <https://azure.microsoft.com/pt-br/blog/azure-resource-explorer-a-new-tool-to-discover-the-azure-api/>

## Controle no ARM

Conforme já vimos, uma das funcionalidades trazidas com o novo portal v2 (ARM) seria a parte de controle, então temos:

– **RBAC**

O controle de acesso basado em papéis faz a gestão de usuários dentro do Azure baseada na função que cada usuário/grupo precisa ter em determinado recurso/grupo de recursos permitindo acesso mais seguro e níveis de permissionamento mais granulares.

![](/wp-content/uploads/2016/11/rbac.png)

Lista de papéis/funções padrões: <https://docs.microsoft.com/pt-br/azure/active-directory/role-based-access-built-in-roles>

Como criar papéis/funções personalizados: <https://docs.microsoft.com/pt-br/azure/active-directory/role-based-access-control-custom-roles>

– **Logs de Auditoria**

Permitem registrar de forma centralizada todas as operações realizadadas no Azure. Conheça em detalhes aqui: <https://docs.microsoft.com/en-us/azure/azure-resource-manager/resource-group-audit>

– **Resource Locks**

O resource lock é uma forma de permitir que adminsitradores criem políticas para prevenir deleção acidental de recursos: <https://docs.microsoft.com/en-us/azure/azure-resource-manager/resource-group-lock-resources>

– **Resource Policy**

Resource policies previnem que usuários não utilizem padrões/convenções definidos no que diz respeito ao gerenciamento de recursos no Azure. Podem ser definidas em diversos escopos dentre eles subscriptions, resouce groups ou recursos individuais.  
Como exemplos de policies que podem ser criadas, é proibir que usuários criem recursos sem que estejam com tags ou ainda, garantir que todas as storages accounts criadas sejam de um único tipo, LRS por exemplo.

Leia mais em: <https://docs.microsoft.com/en-us/azure/azure-resource-manager/resource-manager-policy>

Até a próxima!
