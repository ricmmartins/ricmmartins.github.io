---
slug: "arm-actions-nos-dashboards-do-portal-do-azure"
aliases:
  - "/posts/arm-actions-nos-dashboards-do-portal-do-azure/"
title: 'ARM Actions nos dashboards do portal do Azure'
description: "Aprenda a usar ARM Data e ARM Actions para customizar dashboards no Portal do Azure com visualizações e ações automatizadas."
date: '2018-08-03T17:33:14-04:00'
categories:
  - Azure
tags:
    - azure
    - monitoramento
---

Provavelmente você já sabe que o Portal do Azure é [totalmente customizável](https://docs.microsoft.com/en-us/azure/azure-portal/azure-portal-dashboards.), permitindo que você explore ao máximo as opções criando dashboards para atender as suas necessidades de visualização, organização e monitoramento.

Recentemente eu estava lendo [um post no blog do Azure](https://azure.microsoft.com/pt-br/blog/azure-portal-experience/) sobre isso e encontrei duas opções muito interessantes que eu não conhecia: ARM Data e ARM Actions.

Basicamente o ARM Data permite configurar a exibição de dados/informações sobre seus recursos, enquanto que o ARM Actions permite configurar a execução de ações de forma bastante simples.

Neste artigo eu vou demonstrar como criar ARM Actions para ligar/desligar máquinas virtuais. Para isto a primeira coisa que precisamos fazer é pegar o Resource ID da VM que vamos usar. O Resource ID está disponível em Propriedades da VM, conforme abaixo:

[![Imagem do post ARM Actions nos dashboards do portal do Azure](/wp-content/uploads/2018/08/1-1.png)](/wp-content/uploads/2018/08/1-1.png)

Note que o nome da VM é **armaction**, e o Resource ID: **/subscriptions/XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX/resourceGroups/armactions-resourcegroup/providers/Microsoft.Compute/virtualMachines/armaction**

Agora precisamos editar o dashboard:

[![Imagem do post ARM Actions nos dashboards do portal do Azure](/wp-content/uploads/2018/08/2.png)](/wp-content/uploads/2018/08/2.png)

Em seguida escolher a opção ARM Actions e inserir no dashboard:

[![Imagem do post ARM Actions nos dashboards do portal do Azure](/wp-content/uploads/2018/08/3.png)](/wp-content/uploads/2018/08/3.png)

Quando fizer isto, note que serão abertos os campos para edição do ARM Actions:

[![Imagem do post ARM Actions nos dashboards do portal do Azure](/wp-content/uploads/2018/08/4.png)](/wp-content/uploads/2018/08/4.png)

E você deve preencher conforme vou mostrar abaixo:

**Title**: ARM Actions  
**Subtitle**: Start VM  
**URI**: /subscriptions/XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX/resourceGroups/armactions-resourcegroup/providers/Microsoft.Compute/virtualMachines/armaction/<span style="font-weight: bold;">start?api-version=2017-12-01  
Action name: </span>Initialize VM

Note que a URI, é o Resource ID da VM seguido da ação que deseja executar na API correspondente. Neste caso: **start?api-version=2017-12-01**

No meu caso ficou assim:

[![Imagem do post ARM Actions nos dashboards do portal do Azure](/wp-content/uploads/2018/08/5.png)](/wp-content/uploads/2018/08/5.png)

> Repare que ele já mostra um preview de como ficará.

Fiz a mesma coisa para criar um botão para desligar a VM, no caso alterando na URI o <span style="font-weight: bold;">start?api-version=2017-12-01 </span>por<span style="font-weight: bold;"> powerOff?api-version=2017-12-01. </span>

> Você pode consultar a lista de opções das chamadas de API disponíveis para VMs em <https://docs.microsoft.com/en-us/rest/api/compute/virtualmachines>.

Ao fim, meu dashboard ficou assim:

[![Imagem do post ARM Actions nos dashboards do portal do Azure](/wp-content/uploads/2018/08/6.png)](/wp-content/uploads/2018/08/6.png)

E ao clicar em uma das opções após executar a ação você recebe as notificações também:

[![Imagem do post ARM Actions nos dashboards do portal do Azure](/wp-content/uploads/2018/08/7.png)](/wp-content/uploads/2018/08/7.png)

Até a próxima!
