---
slug: "configurando-lvm-no-linux-rodando-no-azure"
title: 'Configurando LVM no Linux rodando no Azure'
description: "Configuração básica de LVM no Linux rodando no Azure: criação de discos, volumes físicos e lógicos. Com vídeo tutorial."
date: '2018-03-19T21:40:34-04:00'
categories:
  - Linux
tags:
    - azure
    - linux
    - storage
---

Este é um post rápido mostrando uma forma básica de configuração do LVM no Linux. É resultado de um laboratório que estive fazendo enquanto estudava para o exame [LFCS](https://training.linuxfoundation.org/certification/lfcs).

Vou assumir que você já tenha uma VM criada e rodando no Azure. Caso você não tenha uma VM criada, pode seguir [este tutorial](https://docs.microsoft.com/en-us/azure/virtual-machines/linux/tutorial-manage-vm).

Com a VM criada, o que você tem a fazer é criar um novo disco de dados e anexá-lo à sua VM. [Neste link](https://docs.microsoft.com/en-us/azure/virtual-machines/linux/attach-disk-portal) existe a documentação sobre como fazer isto, e você pode também ver este vídeo onde eu gravei especialmente para este post.

Note que crio um disco de 50GB chamado lvmdiskL

<div class="wp-video" style="width: 640px;"><video class="wp-video-shortcode" controls="controls" height="305" id="video-8746-1" preload="metadata" width="640"><source src="/wp-content/uploads/2018/03/lvmdisk.mp4?_=1" type="video/mp4"></source>[/wp-content/uploads/2018/03/lvmdisk.mp4](/wp-content/uploads/2018/03/lvmdisk.mp4)</video></div>Em seguida, vamos aos comandos que você precisa executar:

```bash
sudo cfdisk /dev/sdc

sudo pvcreate /dev/sdc1
sudo pvdisplay

sudo vgcreate test_vg /dev/sdc1
sudo vgdisplay

sudo lvcreate -L 5G -n lv01 test_vg
sudo lvdisplay

sudo mkfs.ext4 /dev/mapper/test_vg-lv01

sudo mkdir /lvm
sudo mount /dev/mapper/test_vg-lv01 /lvm

cd /lvm
df -h .
sudo umount /lvm

sudo lvextend -L +3G /dev/mapper/test_vg-lv01 /dev/sdc1
sudo lvdisplay

sudo e2fsck -f /dev/mapper/test_vg-lv01
sudo resize2fs /dev/mapper/test_vg-lv01

sudo mount /dev/mapper/test_vg-lv01 /lvm

cd /lvm
df -h .
```

Explicando as linhas:

Linha 1: Criando a partição no disco /dev/sdc. Como por padrão a VM já vem com um disco de sistema (sda) e um disco de dados (sdb), o terceiro disco associado à vm segue a ordem e fica alocado em sdc. Para listar os discos, você pode executa # ls /dev/sd\*. Neste caso, vamos criar uma partição primária de 10G do tipo Linux LVM (8e)

Linhas 3 e 4: Criando o volume físico na partição 1 criada e verificando o resultado;

Linhas 6 e 7: Criando o grupo de volumes chamado test\_vg e verificando o resultado;

Linhas 9 e 10: Criando o volume lógico com o tamanho de 5G chamado lv01 no grupo de volumes chamado test\_vg e verificando o resultado;

Linha 12: Criando o sistema de arquivos ext4 no dispositivo de bloco LVM criado (/dev/mapper/test\_vg-lv01). Saiba mais sobre device mapper [aqui;](https://en.wikipedia.org/wiki/Device_mapper)

Linhas 14 e 15: Criando o diretório /lvm e montando o dispositivo de bloco do LVM nele;

Linhas 17, 18 e 19: Entrando no diretório /lvm para verificar que foi criado com o tamanho especificado e em seguida desmontando o volume;

Linhas 21 e 22: Estendendo o tamanho do LVM em 3GB e verificando;

Linhas 24 e 25: Rodando o fsck para que seja possiível redimensionar o dispositivo de bloco. É obrigatória a execução do fsck antes do resize;

Linha 27: Montando novamente o dispositivo de bloco do LVM em /lvm

Linhas 29 e 30: Entrando no diretório para verificar que o resize foi feito corretamente.

Você pode ver a execução dos comandos em vídeo também:

<script async="" id="asciicast-169330" src="https://asciinema.org/a/169330.js"></script>

Note que neste caso, criamos o LVM usando um único disco, trabalhando apenas com as partições nele. No entanto existem cenários onde você deve trabalhar com um LVM usando mais de um disco. Nestes casos, você cria o volumes físico de cada disco (linhas 3 e 4), e cria o grupo de volumes (linhas 6 e 7) usando os demais discos. No nosso caso seria algo assim: vgcreate test\_vg /dev/sdc1 /dev/sdd1, onde o /dev/sdd1 é a partição 1 de um segundo disco que poderia ser usado.

Da mesma forma, podemos ter diversos volumes lógicos, utilizando o grupo de volumes. Apenas para eslcarecer o conceito, veja imagem abaixo:

![https://i.stack.imgur.com/PlrZd.png](https://i.stack.imgur.com/PlrZd.png)

Até a próxima.
