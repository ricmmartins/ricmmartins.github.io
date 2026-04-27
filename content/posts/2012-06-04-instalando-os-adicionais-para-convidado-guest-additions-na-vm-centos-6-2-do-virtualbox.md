---
slug: "instalando-os-adicionais-para-convidado-guest-additions-na-vm-centos-6-2-do-virtualbox"
title: 'Instalando os adicionais para convidado (Guest Additions) na VM CentOS 6.2 do Virtualbox'
date: '2012-06-04T14:35:42-04:00'
tags:
    - utilitários  
description: "Neste artigo demostro como instalar o Guest Additions no CentoS 6.2. Pode ser bastante útil se você tentou instalar e encontrou a mensagem de erro abaixo:"
cover:
  image: "/og/instalando-os-adicionais-para-convidado-guest-additions-na-vm-centos-6-2-do-virtualbox.png"
  alt: ""
  hidden: true
---

Neste artigo demostro como instalar o Guest Additions no CentoS 6.2. Pode ser bastante útil se você tentou instalar e encontrou a mensagem de erro abaixo:

> /tmp/vbox.0/Makefile.include.header:97: *** Error: unable to find the sources of your current Linux kernel. Specify KERN_DIR=<directory> and run Make again.

Os adicionais para convidado, também conhecidos como guest additions, são um conjunto de dispositivos de drivers e aplicativos de sistema que otimizam o sistema operacional convidado (guest) para um melhor desempenho e usabilidade.

Lembre-se que indepentende do sistema de virtualização em uso, é fundamental a instalação destas ferramentas, seja ele Guest Additions (VirtualBox), VMWare Utils (VMWare), Integration Services (Hyper-V)

Os adicionais para convidado oferece as seguinte funcionalidades:

• Integração de mouse: Não é necessário pressionar o Ctrl da direita no sistema convidado para ir pro sistema hospedeiro. O foco do mouse é detectado automaticamente apenas posicionando o mouse no sistema convidado.  
• Compartilhamento de pastas: Suporte a um compartilhamento entre o sistema convidado e o sistema hospedeiro.  
• Melhor suporte a vídeo: Suporte a altas resoluções e aceleração 2D/3D.  
• Janelas Seamless: Janelas do sistema convidado podem ser mapeadas no sistema hospedeiro. Desta forma podemos ter CentOS 6.2 e Windows (Host) na mesma janela.  
• Canal genérico de comunicação: Permite controlar aplicativos no sistema convidado pelo sistema hospedeiro.  
• Sincronização de data/hora: Garante que a data/hora entre os sistemas estejam sincronizados.  
• Compartilhamento de área de transferência: Ctrl+C no sistema convidado e Ctrl+V no sistema hospedeiro e vice-versa.  
• Logons automatizados: Credenciais são armazenadas em um master repositório e podem ser utilizadas para autenticar outros sistemas convidados.  
Os procedimento aqui descritos são aplicados no CentOS, mas podem ser utilizados com pequenas modificações para o Red Hat Enterprise Linux (RHEL) e Oracle Enterprise Linux (OEL).

Pacotes requeridos:

• gcc  
• kernel-devel  
• kernel-headers

```bash
[root@ricardo /root]# yum install gcc kernel-devel kernel-headers
```

Em seguida adicione a variável KERN\_DIR ao /etc/profile da seguinte forma:

```bash
[root@ricardo /root]# echo KERN_DIR=/usr/src/kernels/`uname -r`-`uname -m` >> /etc/profile
[root@ricardo /root]# echo export KERN_DIR >> /etc/profile
[root@ricardo /root]# mount /dev/cdrom /media/
[root@ricardo /root]# cd /media
[root@ricardo /root]# ./VboxLinuxAdditions.run
```

Depois de executar o script de instalação, basta reiniciar o sistema e pronto! Guest Additions instalado e funcionando!

Aproveitando o assunto, segue um link interessante sobre Virtualização de modo geral: <http://www.virtuatopia.com>
