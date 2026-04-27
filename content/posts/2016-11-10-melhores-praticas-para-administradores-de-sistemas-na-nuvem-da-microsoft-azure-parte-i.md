---
slug: "melhores-praticas-para-administradores-de-sistemas-na-nuvem-da-microsoft-azure-parte-i"
title: 'Melhores práticas para administradores de sistemas na nuvem da Microsoft (Azure) &#8211; Parte I'
date: '2016-11-10T00:35:22-05:00'
tags:
    - azure
description: "Nesta série de artigos gostaria de compartilhar algumas boas práticas para quem administra ambientes no Azure, abordando temas como organização dos"
---

Nesta série de artigos gostaria de compartilhar algumas boas práticas para quem administra ambientes no Azure, abordando temas como organização dos recursos, monitoramento, backup, segurança, auditoria, alta disponibilidade, limites, permissionamento, automação, entre outros.

Nesta primeira parte vou abordar conceitos básicos como subscriptions, accounts, suas respectivas hierarquias e diretrizes de uso.

## Subscription e Azure Account

Primeiro é importante entender a diferença entre uma *subscription* e uma *azure account.*

Uma **Azure Account** é a conta disponibilizada aos usuários para utilização dos recursos que lhes são concedidos em sua **Subscription**. Com sua Azure Account, além de utilizar para logar no portal do Azure, você pode acessar <https://account.azure.com> e obter acesso aos seguintes recursos:

- Relatório de uso dos serviços;
- Tarifação dos serviços;
- Administração da conta e subscriptions.

Uma **Subscription**  é o que provê:

- Os serviços de maneira geral (Máquinas virtuais, Azure SQL, Azure AD, Redes Virtuais, etc);
- Controle sobre quem pode usar os recursos.

Você pode acessar sua subscription acessando o portal do Azure em <https://portal.azure.com>

## Entendendo a hierarquia entre Azure Account e Subscription

![Account - Melhores práticas para administradores de sistemas na nuvem da Microsoft (Azure) &#8211; Parte I](/wp-content/uploads/2016/11/account.png)

Uma conta pode ter múltiplas subscriptions e uma única subscription pode ter múltiplos serviços.

Se você é um cliente corporativo e possui um Enterprise Agreement (conhecido como contrato EA), então você pode associar múltiplas contas ao seu contrato EA. O principal benefício de ter um contrato EA é a possibilidade de ter maiores descontos no valor dos serviços que você venha a usar no Azure.

![Imagem do post Melhores práticas para administradores de sistemas na nuvem da Microsoft (Azure) &#8211; Parte I](/wp-content/uploads/2016/11/ea.png)

Se você possui um contrato EA você pode acessá-lo em <https://ea.windowsazure.com>

Em resumo:

- Clientes enterprise (grandes corporações) possuem um contrato EA e nestes casos, o contrato EA é o nível mais alto na hierarquia e está associado à uma ou mais contas;
- Para clientes sem um contrato EA, a Azure Account é o nível mais alto na hierarquia;
- As subscriptions estão associadas às contas (azure account), e podem haver uma ou mais subscriptions por conta. As informações de billing são registradas no nível da subscription.

## Diretrizes entre Azure Accounts e Subscriptions

Dependendo da sua empresa, podem haver diversas formar de organizar contas e subscriptions. Se a empresa é uma multinacional por exemplo, você pode ter uma conta por região e gerenciar as assinaturas à nivel da região. Por exemplo:

![Region - Melhores práticas para administradores de sistemas na nuvem da Microsoft (Azure) &#8211; Parte I](/wp-content/uploads/2016/11/region.png)

Então você pode usar a seguinte estrutura:

![Organization - Melhores práticas para administradores de sistemas na nuvem da Microsoft (Azure) &#8211; Parte I](/wp-content/uploads/2016/11/organization.png)

E no caso de uma região precisar ter mais de uma subscription associada a um determinado grupo/departamento, a convenção de nomenclatura deve incorporar uma forma de identificar os dados adicionais no nome da conta ou da subscription, por exemplo:

![Region2 - Melhores práticas para administradores de sistemas na nuvem da Microsoft (Azure) &#8211; Parte I](/wp-content/uploads/2016/11/region2.png)

E neste caso a organização poderia ser desta forma:

![Contoso Org](/wp-content/uploads/2016/11/contoso-org.png)

## Divisão por departamentos

Na hierarquia de organização existe a categoria intermediária chamada departamentos. Ela pode estar entre o EA e as Accounts conforme a imagem abaixo:

![Dapartamentos - Melhores práticas para administradores de sistemas na nuvem da Microsoft (Azure) &#8211; Parte I](https://ricardomartins9888.blob.core.windows.net/wordpress/2016/11/dapartamentos.png)

Ela é mais uma segmentação que você pode usar na sua estrutura de modo a ter uma organização mais eficiente.

Sendo assim, a divisão em Departamentos ou Accounts são dois níveis de hierarquia que você pode usar para segregar as suas Subscriptions dentro do EA.

Um link bastante interessante que você pode acessar para complementar seu estudo é este: <https://marckean.com/2016/06/03/azure-enterprise-enrollment-hierarchy/>

De posse destas informações você pode seguir as instruções contidas neste link (<https://azure.microsoft.com/en-us/documentation/articles/guidance-naming-conventions/>) como diretriz de nomenclatura para recursos no seu ambiente.

Se estiver interessado em mais diretrizes, abaixo uma lista com diretivas para a criação de recursos no Azure:

- Diretivas de infraestrutura: <https://azure.microsoft.com/en-us/documentation/articles/virtual-machines-windows-infrastructure-virtual-machine-guidelines/>
- Diretivas para contas e subscriptions: <https://azure.microsoft.com/en-us/documentation/articles/virtual-machines-windows-infrastructure-subscription-accounts-guidelines/>
- Diretivas para Resource Groups: <https://azure.microsoft.com/en-us/documentation/articles/virtual-machines-windows-infrastructure-resource-groups-guidelines/>
- Diretivas para Storage: <https://azure.microsoft.com/en-us/documentation/articles/virtual-machines-windows-infrastructure-storage-solutions-guidelines/>
- Diretivas para Rede: <https://azure.microsoft.com/en-us/documentation/articles/virtual-machines-windows-infrastructure-networking-guidelines/>
- Diretivas para Availability Set: <https://azure.microsoft.com/en-us/documentation/articles/virtual-machines-windows-infrastructure-availability-sets-guidelines>

Até a próxima!
