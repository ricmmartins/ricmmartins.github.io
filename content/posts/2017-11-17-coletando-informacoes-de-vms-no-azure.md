---
slug: "coletando-informacoes-de-vms-no-azure"
title: 'Coletando informações de VMs no Azure'
date: '2017-11-17T12:01:03-05:00'
tags:
    - azure
description: "Recentemente precisei acessar um ambiente para coletar informações sobre VMs e estou compartilhando aqui os comandos usados (pode ser útil no futuro)."
cover:
  image: "/og/coletando-informacoes-de-vms-no-azure.png"
  alt: ""
  hidden: true
---

Recentemente precisei acessar um ambiente para coletar informações sobre VMs e estou compartilhando aqui os comandos usados (pode ser útil no futuro).

### Listar subscriptions:

```bash
az account list
Tecnologia - TI           AzureCloud   35e10abf-9270-4hse-85ff-3895b959e820  Enabled
Tecnologia - Arq          AzureCloud   83e30abf-2981-4die-88jw-4095b960e790  Enabled
```

### Alternar para determinada subscription:

```bash
az account set -s 35e10abf-9270-4hse-85ff-3895b959e820
```

### Listar VMs pelo nome, estado de execução, tamanho, tipo de sistema operacional e localização:

```bash
az vm list --show-details --query '[].{Name:name,PowerState:powerState,VMSize:hardwareProfile.vmSize,OSType:storageProfile.osDisk.osType,Location:location}' -o table
 
Name          PowerState    VMSize       OSType    Location
------------  ------------  -----------  --------  -----------
vmexemplo1    VM running    Standard_A2  Linux   brazilsouth
```
