---
slug: "bloqueando-pendrives-no-windows-facil-facil"
title: 'Bloqueando pendrives no Windows fácil, fácil'
date: '2009-04-10T18:08:38-04:00'
tags:
    - windows
description: "Esta dica é bem simples, e mostra como bloquear pendrives no seu windows. 1. Acesse a chave abaixo no registro:"
---

Esta dica é bem simples, e mostra como bloquear pendrives no seu windows.

1. Acesse a chave abaixo no registro:

HKEY_LOCAL_MACHINESYSTEM/CurrenControlSet/Services/USBSTOR/Start</span></span>

A dword “Start” possui valor default em 3. Mude para 4.

2. Os arquivos listados abaixo, devem ter todas as suas permissões negadas para todos os usuários, inclusive o usuário “System”.

C:Windowsinfusbstor.inf

C:Windowsinfusbstor.pnf

C:Windowssystem32driversusbstor.sys

