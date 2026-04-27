---
slug: "criando-uma-vm-linux-ubuntu-pelo-azure-cli"
title: 'Criando uma VM Linux (Ubuntu) pelo Azure CLI'
tags:
    - azure
    - linux
    - ubuntu
description: "Apenas compartilhando um vídeo que eu fiz mostrando como criar uma VM Linux (Ubuntu) pelo Azure CLI. No vídeo é explicado passo a passo do processo, no"
cover:
  image: "/og/criando-uma-vm-linux-ubuntu-pelo-azure-cli.png"
  alt: ""
  hidden: true
---

Apenas compartilhando um vídeo que eu fiz mostrando como criar uma VM Linux (Ubuntu) pelo Azure CLI. No vídeo é explicado passo a passo do processo, no entanto vou colocar abaixo os comando executados para caso você queira testar, possa copiar e colar os comandos e ganhar tempo:

```bash
az login
az group create -n mylab -l brazilsouth
az vm create --resource-group mylab --name mylabvm --image UbuntuLTS --generate-ssh-keys
```

Importante comentar que é necessário ter o Azure CLI instalado e uma assinatura do Azure válida. Caso precise instalar o Azure CLI, [aqui está o link ](https://docs.microsoft.com/pt-br/cli/azure/install-azure-cli)com o tutorial e para criar uma assinatura do Azure gratuitamente, [clique aqui.](https://azure.microsoft.com/pt-br/free/)

<iframe allow="autoplay; encrypted-media" allowfullscreen="" frameborder="0" height="281" loading="lazy" src="https://www.youtube.com/embed/yI5yh5ddtho?feature=oembed" width="500"></iframe>
