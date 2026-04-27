---
slug: "descobrindo-os-tipos-de-vms-disponiveis-no-azure-por-regiao"
title: 'Descobrindo os tipos de VMs disponíveis no Azure por região'
date: '2017-07-13T13:47:04-04:00'
tags:
    - azure
description: "Este é um post rápido com o propósito de mostrar uma forma rápida de listar os tipos de VMs disponíveis em determinada região do Azure. O único"
cover:
  image: "/og/descobrindo-os-tipos-de-vms-disponiveis-no-azure-por-regiao.png"
  alt: ""
  hidden: true
---

Este é um post rápido com o propósito de mostrar uma forma rápida de listar os tipos de VMs disponíveis em determinada região do Azure. O único pré-requisito é ter o PowerShell instalado. [Clique aqui e faça o download.](https://www.microsoft.com/en-us/download/details.aspx?id=34595)

Em seguida você precisará rodar os comandos abaixo:

```bash
Login-AzureRMAccount
$resources = Get-AzureRmResourceProvider -ProviderNamespace Microsoft.Compute
Get-AzureRmVmSize -Location "East US" | Sort-Object Name | ft Name, NumberOfCores, MemoryInMB, MaxDataDiskCount -AutoSize
```

Dependendo da região da sua escolha, basta trocar o -Location “Brazil South” pela região que preferir. Veja:

[![List - Descobrindo os tipos de VMs disponíveis no Azure por região](/wp-content/uploads/2017/07/list.png)](/wp-content/uploads/2017/07/list.png)
