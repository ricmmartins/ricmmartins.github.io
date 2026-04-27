---
slug: "como-bloquear-pendrive-definitivamente"
title: 'Como bloquear pendrive definitivamente'
date: '2010-08-20T23:52:19-04:00'
tags:
    - scripts
    - windows
description: "Recentemente, fiz um post aqui citando um programa para fazer o bloqueio/desbloqueio de pendrives. Este post você pode conferir aqui:"
cover:
  image: "/og/como-bloquear-pendrive-definitivamente.png"
  alt: ""
  hidden: true
---

Recentemente, fiz um post aqui citando um programa para fazer o bloqueio/desbloqueio de pendrives. Este post você pode conferir aqui: <http://ricardomartins.com.br/como-bloquear-pendrive/>

Hoje descobri que este programa tem um problema que é o seguinte: Ele só funciona, fazendo o bloqueio do pendrive, caso o pendrive já tenha sido plugado na máquina antes. Caso seja um pendrive novo, ele não funciona.

Isso mesmo! Se você pegar um pendrive que nunca tenha sido ligado na máquina onde tenha utilizado o software para bloquear, ele é reconhecido normalmente.

O que ocorre é que ao clicar em “Lock” no software, ele altera o valor da seguinte chave no registro: HKEY\_LOCAL\_MACHINESYSTEMCurrentControlSetServicesUSBSTORStart. No caso, muda o valor de 3 para 4 de modo a bloquear. Mas ao plugar um pendrive que ainda não tenha sido utilizado na máquina em questão, o Windows volta o valor da chave para 3, deixando desbloqueado.

Isso porque ao conectar um pendrive, ele é detectado pelo arquivo C:Windowssystem32DRIVERSUSBSTOR.SYS e caso ele já “conheça” esse pendrive, ele mantém o valor da chave como está. Caso ele não conheça, ele altera o valor da chave no registro para 3, para poder instalar o driver do pendrive.

Assim acaba desfazendo a modificação feita pelo software. Por esta razão, o ideal continuava sendo o método tradicional ( já postado aqui também – <http://ricardomartins.com.br/bloqueando-pendrives-no-windows-facil-facil/>), que consiste em negar permissões nos arquivos usbstor.inf, usbstor.pnf e usbstor.sys e alterar a chave do registro citada acima.

Para resolver este problema e facilitar a minha vida, hoje eu fiz um script em vbs, que muda o valor da chave do registro, e altera as permissões dos arquivos. Assim, ao invés de ter que ir em cada arquivo e mecher nas permissões, o script faz tudo pra mim.

Eu fiz dois scripts, um para bloquear e outro para desbloquear. Eu poderia criar um script, que perguntasse o que fazer, no caso, bloquear ou desbloquear, e ele executar as ações necessárias de acordo com a resposta. No entanto como não sou nenhum expert em programação vbs, este já está muito bom para a minha necessidade.

Abaixo o código. Basta copiar e colar no notepad e salvar como “Bloqueia.vbs” e “Desbloqueia.vbs”

É um script simples, onde utilizo o cacls para alterar as permissões. Para quem não conhece, o cacls é um comando nativo do Windows, para mudar permissões de arquivos via console.

Você também poderá notar que eu configurei para mudar as permissões para os usuários TODOS e EVERYONE. Isto não é uma redundância desnecessária. É que assim não tenho problemas com o idioma do SO. Caso seja pt\_br, irá funcionar pelo TODOS, caso contrário, pelo EVERYONE.

**Abaixo o código do “Bloqueia.vbs”:**

```bash
'Script para Bloquear Pendrive - Ricardo Macedo Martins'
'Inicio do script'
Set WshShell = WScript.CreateObject("WScript.Shell")
WshShell.RegWrite "HKLMSYSTEMCurrentControlSetServicesUSBSTORStart",4,"REG_DWORD"
WshShell.Run "cacls c:windowsinfUsbstor.inf /E /P EVERYONE:N", 0 , True
WshShell.Run "cacls c:windowsinfUsbstor.inf /E /P TODOS:N", 0 , True
WshShell.Run "cacls c:windowsinfUsbstor.inf /E /P SYSTEM:N", 0 , True
WshShell.Run "cacls c:windowsinfUsbstor.pnf /E /P EVERYONE:N", 0 , True
WshShell.Run "cacls c:windowsinfUsbstor.pnf /E /P TODOS:N", 0 , True
WshShell.Run "cacls c:windowsinfUsbstor.pnf /E /P SYSTEM:N", 0 , True
WshShell.Run "cacls C:Windowssystem32driversusbstor.sys /E /P EVERYONE:N", 0 , True
WshShell.Run "cacls C:Windowssystem32driversusbstor.sys /E /P TODOS:N", 0 , True
WshShell.Run "cacls C:Windowssystem32driversusbstor.sys /E /P SYSTEM:N", 0 , True
MsgBox "Pendrive Bloqueado!",0,"Informacao"
'Fim do script'
```

**Abaixo o código do “Desbloqueia.vbs”:**

```bash
'Script para Bloquear Pendrive - Ricardo Macedo Martins'
'Inicio do script'
Set WshShell = WScript.CreateObject("WScript.Shell")
WshShell.RegWrite "HKLMSYSTEMCurrentControlSetServicesUSBSTORStart",3,"REG_DWORD"
WshShell.Run "cacls c:windowsinfUsbstor.inf /E /P EVERYONE:F", 0 , True
WshShell.Run "cacls c:windowsinfUsbstor.inf /E /P TODOS:F", 0 , True
WshShell.Run "cacls c:windowsinfUsbstor.inf /E /P SYSTEM:F", 0 , True
WshShell.Run "cacls c:windowsinfUsbstor.pnf /E /P EVERYONE:F", 0 , True
WshShell.Run "cacls c:windowsinfUsbstor.pnf /E /P TODOS:F", 0 , True
WshShell.Run "cacls c:windowsinfUsbstor.pnf /E /P SYSTEM:F", 0 , True
WshShell.Run "cacls C:Windowssystem32driversusbstor.sys /E /P EVERYONE:F", 0 , True
WshShell.Run "cacls C:Windowssystem32driversusbstor.sys /E /P TODOS:F", 0 , True
WshShell.Run "cacls C:Windowssystem32driversusbstor.sys /E /P SYSTEM:F", 0 , True
MsgBox "Pendrive Desbloqueado!",0,"Informacao"
'Fim do script'
```

Até a próxima!
