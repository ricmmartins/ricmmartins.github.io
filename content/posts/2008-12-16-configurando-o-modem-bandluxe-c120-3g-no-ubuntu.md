---
slug: "configurando-o-modem-bandluxe-c120-3g-no-ubuntu"
title: 'Configurando o Modem BandLuxe C120 (3G) no Ubuntu'
date: '2008-12-16T01:12:33-05:00'
tags:
    - linux
    - ubuntu
description: "Hoje vou postar sobre como configurar o Modem BandLuxe C120 no Ubuntu.Eu tenho o Velox 3G há cerca de 3 meses, e até então ainda não tinha conseguido"
cover:
  image: "/og/configurando-o-modem-bandluxe-c120-3g-no-ubuntu.png"
  alt: ""
  hidden: true
---

Hoje vou postar sobre como configurar o Modem BandLuxe C120 no Ubuntu.Eu tenho o Velox 3G há cerca de 3 meses, e até então ainda não tinha conseguido configurar o modem acima no meu Ubuntu.

Pesquisei bastante na internet, cheguei a ver sobre o [SmartConnect](http://smartconnect3g.wordpress.com/), porém este modelo não é suportado. Quando estava quase desistindo, botei o tico e teco para funcionar e a solução está nas linhas abaixo…

**O Windows me deu a dica para resolver essa…**

Quando plugo este modem no Windows, ele reconhece como um pendrive, onde dentro estão os drivers e arquivos de instalação do software de conexão. Notei que depois de ter os drivers e o software instalado, ao abrir o gerenciador de dispositivos e ir até “Controladores USB” pode-se verificar que o nome referente ao modem fica desabilitado. Ele funciona normalmente, mas não é reconhecido mais como pendrive e não exibe os arquivos contidos na memoria flash embutida nele.

Então pensei: “- E se eu desabilitar no linux o usb\_storage ?”

**Lá vai a dica:**

Pelo network-config do Ubuntu, eu não consegui nenhum resultado. Então instalei o gnome-ppp, que você pode baixar [clicando aqui](http://mirrors.kernel.org/ubuntu/pool/universe/g/gnome-ppp/gnome-ppp_0.3.23-1_i386.deb).

Para instalar o gnome-ppp, você pode dar duplo clique na interface gráfica mesmo. Após instalado, precisa executar como root, pois caso contrário dá um erro de permissão no wvdial.conf.

Para isto, aperte Alt+F2 (executar), e na tele que aparece digite gksu gnome-ppp. Agora vamos configurar a conexão.

Na aba Modem, configure o dispositivo como /dev/ttyUSB1. Depois configure o número a ser discado: \*99#

Existem outras opções, mas basta configurar estas.

**Agora vamos ao bizu-master:**

Antes de tentar se conectar, execute os seguintes comandos:

```bash
# mount /media/BandLuxeC120
```

```bash
# modprobe -r usb\storage
```

Pronto ! Agora é so mandar conectar ! Caso queira facilitar as coisas, basta inserir as linhas acima em um script shell para facilitar o processo.

Entendeu ?! É simples: Antes de conectar, você precisa que o recurso de usb\_storage do modem esteja desabilitado. Como geralmente ele já monta o dispositivo automaticamente durante o boot caso esteja plugado, você precisa desmontar antes de desativar o usb\_storage pois se não vai dar erro, pois o recurso está em uso.

Até a próxima.
