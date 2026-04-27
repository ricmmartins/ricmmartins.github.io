---
slug: "habilitando-remote-desktop-atraves-do-registro-remotamente"
title: 'Habilitando Remote Desktop através do Registro remotamente'
date: '2009-03-18T23:54:18-04:00'
tags:
    - windows
    - rdp
description: "O Título parece estranho, mas logo vão entender melhor… Há alguns dias eu precisei acessar uma máquina remotamente, porém para seguir as tradições de"
cover:
  image: "/og/habilitando-remote-desktop-atraves-do-registro-remotamente.png"
  alt: ""
  hidden: true
---

O Título parece estranho, mas logo vão entender melhor…

Há alguns dias eu precisei acessar uma máquina remotamente, porém para seguir as tradições de Murphy, as máquinas mais distantes estão sempre com a opção de Área de trabalho remota desabilitada. Então eu comecei a fuçar o registro e encontrei uma maneira. Vamos lá:

O primeiro passo é abrir o regedit na sua máquina local. Depois abra o menu arquivo e escolha [“Conectar registro da rede”](/wp-content/uploads/2009/03/1.jpg)

Depois [insira](/wp-content/uploads/2009/03/2.jpg) o nome ou ip da máquina que deseja se conectar

Insira o nome de usuário e senha de administrador da máquina e ao dar OK, você estará no registro da máquina remota.

Agora vá até a [chave](h/wp-content/uploads/2009/03/3.jpg) HKLM/SYSTEM/CurrentControlSet/Control/Terminal Server e mude o valor do Dword fDenyTSConnections para 0

Feche o registro e agora à partir do prompt reinicie a máquina remotamente para que as alterações tenham efeito: shutdown -m 192.168.1.10 –r –t 0

Em seguida, pode conectar normalmente na máquina pelo Remote Desktop (mstsc.exe)

Observação importante: Você só conseguirá se conectar ao registro remotamente se o serviço “[Registro Remoto](/wp-content/uploads/2009/03/4.jpg)” estiver rodando. Se você ou algum usuário da máquina nunca mecheu nele, não se preocupe, pois por padrão ele já fica configurado para iniciar automaticamente. Caso contrário, não vai ter jeito, você vai precisar se deslocar até a máquina.  
[  ](/wp-content/uploads/2009/03/4.jpg)
