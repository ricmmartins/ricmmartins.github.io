---
slug: "criando-uma-vm-linux-e-configurando-raid-no-azure"
title: 'Criando uma VM Linux e configurando Raid no Azure'
date: '2017-10-24T22:19:22-04:00'
tags:
    - azure
    - linux
    - storage
description: "Neste post vou mostrar como criar uma VM Linux no Azure, associar três discos nesta VM e em seguida configurar um Raid 0 usando estes discos pelo CLI."
---

Neste post vou mostrar como criar uma VM Linux no Azure, associar três discos nesta VM e em seguida configurar um Raid 0 usando estes discos pelo CLI.

### Criando a VM

Criar o resource group:

```bash
rmartins@jarvis:~$ az group create --name rg-labraid --location eastus
```

Criar a máquina virtual na localização EastUS e gerar automaticamente as chaves ssh:

```bash
rmartins@jarvis:~$ az vm create --resource-group rg-labraid --name myVM --image UbuntuLTS --location eastus --generate-ssh-keys
```

Criar três discos de 10GB cada:

```bash
rmartins@jarvis:~$ az disk create -g rg-labraid -n MyDisk1 --size-gb 10
rmartins@jarvis:~$ az disk create -g rg-labraid -n MyDisk2 --size-gb 10
rmartins@jarvis:~$ az disk create -g rg-labraid -n MyDisk3 --size-gb 10
```

Anexar os três discos na VM:

```bash
rmartins@jarvis:~$ az vm disk attach --vm-name myVM --resource-group rg-labraid --disk MyDisk1
rmartins@jarvis:~$ az vm disk attach --vm-name myVM --resource-group rg-labraid --disk MyDisk2
rmartins@jarvis:~$ az vm disk attach --vm-name myVM --resource-group rg-labraid --disk MyDisk3
```

Obter o IP público da VM e conectar usando a chave SSH:

```bash
rmartins@jarvis:~$ az vm show --resource-group rg-labraid --name myVM -d --query publicIps -otsv
rmartins@jarvis:~$ ssh rmartins@[PublicIP] -i /home/rmartins/.ssh/id_rsa
```

### Configurar o Raid

Sabendo que a VM já vem com 2 discos (o disco de sistema (sda) e o disco temporário (sdb), podemos rodar o comando abaixo apenas para identificar os novos discos (sdc,sdd e sde):

```bash
rmartins@MyVM:~$ sudo fdisk -l
Disk /dev/sdb: 7 GiB, 7516192768 bytes, 14680064 sectors
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 4096 bytes
I/O size (minimum/optimal): 4096 bytes / 4096 bytes
Disklabel type: dos
Disk identifier: 0x4df5a995

Device Boot Start End Sectors Size Id Type
/dev/sdb1 128 14678015 14677888 7G 7 HPFS/NTFS/exFAT

Disk /dev/sda: 30 GiB, 32212254720 bytes, 62914560 sectors
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 4096 bytes
I/O size (minimum/optimal): 4096 bytes / 4096 bytes
Disklabel type: dos
Disk identifier: 0x90298f39

Device Boot Start End Sectors Size Id Type
/dev/sda1 * 2048 62914526 62912479 30G 83 Linux

Disk /dev/sdc: 10 GiB, 10737418240 bytes, 20971520 sectors
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 4096 bytes
I/O size (minimum/optimal): 4096 bytes / 4096 bytes

Disk /dev/sdd: 10 GiB, 10737418240 bytes, 20971520 sectors
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 4096 bytes
I/O size (minimum/optimal): 4096 bytes / 4096 bytes

Disk /dev/sde: 10 GiB, 10737418240 bytes, 20971520 sectors
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 4096 bytes
I/O size (minimum/optimal): 4096 bytes / 4096 bytes
```

Agora vamos criar as partições nos discos novos:

```bash
rmartins@MyVM:~$ sudo fdisk /dev/sdc
n - criar nova partição
p - criar uma partição primária
1 - definir como partição número 1
Type Enter - definir a posicao do primeiro setor do disco como padrão
Type Enter - definir a posição do último setor do disco como padrão
t - definir um tipo
fd - definir Linux Raid Auto
w - salvar as mudanças
```

```bash
rmartins@MyVM:~$ sudo fdisk /dev/sdd
n - criar nova partição
p - criar uma partição primária
1 - definir como partição número 1
Type Enter - definir a posicao do primeiro setor do disco como padrão
Type Enter - definir a posição do último setor do disco como padrão
t - definir um tipo
fd - definir Linux Raid Auto
w - salvar as mudanças
```

```bash
rmartins@MyVM:~$ sudo fdisk /dev/sde
n - criar nova partição
p - criar uma partição primária
1 - definir como partição número 1
Type Enter - definir a posicao do primeiro setor do disco como padrão
Type Enter - definir a posição do último setor do disco como padrão
t - definir um tipo
fd - definir Linux Raid Auto
w - salvar as mudanças
```

Criando o raid array:

```bash
rmartins@MyVM:~$ sudo mdadm --create /dev/md1 --level 0 --raid-devices 3 /dev/sdc1 /dev/sdd1 /dev/sde1
```

Criando o filesystem:

```bash
rmartins@MyVM:~$ sudo mkfs -t ext4 /dev/md1
```

Configurando o ponto de montagem do filesystem:

```bash
rmartins@MyVM:~$ sudo mkdir /data
rmartins@MyVM:~$ sudo /sbin/blkid | grep /dev/md1
/dev/md1: UUID="4342cd54-4d87-4ffa-b118-a52e2fbe2d1f" TYPE="ext4"
```

Abrir o arquivo /etc/fstab e adicionar a seguinte linha:

```bash
UUID=4342cd54-4d87-4ffa-b118-a52e2fbe2d1f /data ext4 defaults 0 2
```

\*\* No seu caso o UUID será diferente. Você deve adicionar o UUID gerado na sua VM no lugar deste acima

Montar o file system:

```bash
rmartins@MyVM:~$ sudo mount -a
```

Verificar:

```bash
rmartins@MyVM:~$ df -h | grep md1
/dev/md1 30G 44M 28G 1% /data
```

Caso queira visualizar a execução, gravei o vídeo abaixo do meu terminal:

<script async="" id="asciicast-143993" src="https://asciinema.org/a/143993.js"></script>
