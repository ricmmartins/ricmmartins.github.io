---
slug: "limitando-o-uso-de-storage-devices-pendrives-disquetes-cd-roms-no-windows"
aliases:
  - "/posts/limitando-o-uso-de-storage-devices-pendrives-disquetes-cd-roms-no-windows/"
title: 'Limitando o uso de Storage Devices (PenDrives, Disquetes, Cd-Rom’s) no Windows'
date: '2009-04-10T18:04:36-04:00'
tags:
     - segurança
categories:
    - Geral
description: "Este artigo mostra como realizar uma configuração no windows, de modo a bloquear o acesso à storage devices, que podem ser entendidos como pendrives"
---

Este artigo mostra como realizar uma configuração no windows, de modo a bloquear o acesso à storage devices, que podem ser entendidos como pendrives, disquetes e cd-roms, pelos usuários nas máquinas com Windows Xp. Desta forma, podemos diminuir drasticamente a incidência de vírus, spywares e malwares na sua rede.

O Windows possui uma ferramenta chamada Group Policy Editor, que permite que se façam alterações nas permições e políticas de segurança da máquina. Essa ferramenta permite ainda a criação de novos templates de segurança com um pouco de programação em que na sua maioria já se encontra pronta ou semi-pronta.

Primeiramente deve-se gerar um arquivo de template, que deve ser um arquivo do tipo Custom_Usb_Policy_Teste.adm, feito no bloco de notas e salvo neste formato com texto em UNICODE. O código dentro do arquivo é o que segue:

```bash
CLASS MACHINE
CATEGORY !!category
CATEGORY !!categoryname
POLICY !!policynameusb
KEYNAME “SYSTEMCurrentControlSetServicesUSBSTOR”
EXPLAIN !!explaintextusb
PART !!labeltextusb DROPDOWNLIST REQUIRED``VALUENAME "Start"
ITEMLIST
NAME !!Disabled VALUE NUMERIC 3 DEFAULT
NAME !!Enabled VALUE NUMERIC 4
END ITEMLIST
END PART
END POLICY
POLICY !!policynamecd
KEYNAME “SYSTEMCurrentControlSetServicesCdrom”
EXPLAIN !!explaintextcd
PART !!labeltextcd DROPDOWNLIST REQUIRED``VALUENAME "Start"
ITEMLIST
NAME !!Disabled VALUE NUMERIC 1 DEFAULT
NAME !!Enabled VALUE NUMERIC 4
END ITEMLIST
END PART
END POLICY
POLICY !!policynameflpy
KEYNAME “SYSTEMCurrentControlSetServicesFlpydisk”
EXPLAIN !!explaintextflpy
PART !!labeltextflpy DROPDOWNLIST REQUIRED``VALUENAME "Start"
ITEMLIST
NAME !!Disabled VALUE NUMERIC 3 DEFAULT
NAME !!Enabled VALUE NUMERIC 4
END ITEMLIST
END PART
END POLICY
POLICY !!policynamels120
KEYNAME “SYSTEMCurrentControlSetServicesSfloppy”
EXPLAIN !!explaintextls120
PART !!labeltextls120 DROPDOWNLIST REQUIRED``VALUENAME "Start"
ITEMLIST
NAME !!Disabled VALUE NUMERIC 3 DEFAULT
NAME !!Enabled VALUE NUMERIC 4
END ITEMLIST
END PART
END POLICY
END CATEGORY
END CATEGORY``[strings]
category=”Custom Policy Settings”
categoryname=”Restrict Drives”
policynameusb=”Disable USB”
policynamecd=”Disable CD-ROM”
policynameflpy=”Disable Floppy”
policynamels120=”Disable High Capacity Floppy”
explaintextusb=”Disables the computers USB ports by disabling the usbstor.sys driver”
explaintextcd=”Disables the computers CD-ROM Drive by disabling the cdrom.sys driver”
explaintextflpy=”Disables the computers Floppy Drive by disabling the flpydisk.sys driver”
explaintextls120=”Disables the computers High Capacity Floppy Drive by disabling the sfloppy.sys driver”
labeltextusb=”Disable USB Ports”
labeltextcd=”Disable CD-ROM Drive”
labeltextflpy=”Disable Floppy Drive”
labeltextls120=”Disable High Capacity Floppy Drive”
Enabled=”Enabled”
Disabled=”Disabled”
```

Feito isso, deve-se ir em START, RUN e digitar o seguinte comando : gpedit.msc  
Com isso a seguinte tela deverá aparecer:

![Editor de GPO - Limitando o uso de Storage Devices (PenDrives, Disquetes, Cd-Rom’s) no Windows](http://adminonline.files.wordpress.com/2007/06/gpoedit.jpg)

Clicando com o botão direito do mouse em Administrative Templates, e posteriormente em Add/Remove Templates, abre-se uma nova janela:

![Gpoedit2 - Limitando o uso de Storage Devices (PenDrives, Disquetes, Cd-Rom’s) no Windows](http://adminonline.files.wordpress.com/2007/06/gpoedit2.jpg)

Clicando em Add… e adicionando o arquivo criado anteriormente, a tela deve mudar para a seguinte:

![Gpoedit3 - Limitando o uso de Storage Devices (PenDrives, Disquetes, Cd-Rom’s) no Windows](http://adminonline.files.wordpress.com/2007/06/gpoedit3.jpg)

Feito isso, clica-se em Close e o menu do Group Policy Editor deve ser igual a este:

![Gpoedit41 - Limitando o uso de Storage Devices (PenDrives, Disquetes, Cd-Rom’s) no Windows](http://adminonline.files.wordpress.com/2007/06/gpoedit41.jpg)

Para que as opções apareçam corretamente deve-se clicar em View e desmarcar a opção que diz Only Show Policies That Can be Fully Managed. Com isso, agora fica muito mais fácil desativar e reativar o uso de pendrives, disquetes até mesmo o cd-rom. Basta entrar em cada uma das opções e fazer o seguinte :

![Gpoedit5 - Limitando o uso de Storage Devices (PenDrives, Disquetes, Cd-Rom’s) no Windows](http://adminonline.files.wordpress.com/2007/06/gpoedit5.jpg)

Vale lembrar que este método, bloqueia acesso apenas a dispositivos de storage e sendo assim, dispositivos USB, como mouses, teclados e etc, funcionam normalente.

Obs.: Este turorial foi testado no Windows XP Professional. Acredito que no Windows 2000 também funcione. Apenas no Windows XP Home, ele não funciona pois o mesmo não fornece acesso ao gpedit.msc.

Este tutorial, foi feito baseando se nas informações obtidas em: [http://www.petri.co.il/disable\_usb\_disks\_with\_gpo.htm](http://www.petri.co.il/disable_usb_disks_with_gpo.htm)
