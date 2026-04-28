---
slug: "como-configurar-o-windows-como-master-browser-para-a-rede"
aliases:
  - "/posts/como-configurar-o-windows-como-master-browser-para-a-rede/"
title: 'Como configurar o Windows como Master Browser para a Rede.'
date: '2009-07-24T18:00:16-04:00'
tags:
    - windows
    - networking
categories:
    - Networking
description: "Depois de um bom tempo sem postar nada por aqui, tenho uma dica interessante para compartilhar."
---

Depois de um bom tempo sem postar nada por aqui, tenho uma dica interessante para compartilhar.

Acredito que seja de conhecimento de todos o que é um [master browser](http://en.wikipedia.org/wiki/Domain_Master_Browser), portanto não entrarei em detalhes. A questão é: se o computador eleito como master browser da sua rede apresentar problemas, até outra máquina assumir o papel de master browser a sua rede ficará meio perdida, e você pode não conseguir visualizar os computadores da rede em “Meus locais de rede”, dando a impressão que a rede esteja fora do ar.

Se você souber os endereços IP’s ou o nome das máquinas, você consegue acessá-los normalmente através do “executar” no menu iniciar da seguinte forma:

```bash
IPdaMaquinaCompartilhamento
```

Mas para você não precisar ficar a mercê desta situação, você pode definir uma máquina para ser o Master Browser de sua rede, o que tornará mais facil resolver os problemas de uma rede sem master browser, caso esta apresente falha, pois você saberá qual máquina era o Master Browser, então bastará definir outra imediatamente.

Lá vai a dica:

Abra o regedit e vá até o caminho abaixo:

HKEY_LOCAL_MACHINE/SYSTEM/CurrentControlSet/Services/BrowserParameters

Crie uma nova chave do tipo Reg_SZ com nome *IsDomainMaster* e valor: *True*

Deve haver uma chave chamada *MantainServerList*, nesta você deve colocar o valor para Yes.

Pronto! Agora você sempre saberá quem é o seu Master Browser
