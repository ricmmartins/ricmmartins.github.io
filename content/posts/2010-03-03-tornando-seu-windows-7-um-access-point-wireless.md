---
slug: "tornando-seu-windows-7-um-access-point-wireless"
title: 'Tornando seu Windows 7 um access point wireless'
date: '2010-03-03T19:25:22-05:00'
tags:
    - networking
    - windows
categories:
    - Networking
description: "A Microsoft adicionou algums funcionalidades ao Windows 7 para permitir que uma placa de rede wireless possa ser colocada em modo promíscuo e tornar-se um"
---

A Microsoft adicionou algums funcionalidades ao Windows 7 para permitir que uma placa de rede wireless possa ser colocada em modo promíscuo e tornar-se um verdadeiro AP Wireless

Pelo que andei lendo paresse que isto não funciona em todas as placas de rede wireless. Imagino que o driver e o hardware precisem suportar isto.

Existem duas maneiras de fazer isto:

- A primeira seria você usar uma ferramenta gratuita chamada Connectify. (esta é bem mais simples);
- A segunda é pelo próprio Windows (leia mais abaixo).

**Primeiro método**

Baixe a ferramenta em <http://www.connectify.me/>

Uma vez instalado, defina a placa de rede sem fio que você estará usando, o SSID e a senha:

![Connectify 201002](/wp-content/uploads/2010/03/Connectify-201002.jpg "Connectify 201002")

Clique em “Start Hotspot” e já estará pronto para funcionar. O melhor deste software é que ele é gratuito… pode conferir no site deles.

![Connectify Free 201002](/wp-content/uploads/2010/03/Connectify-Free-201002.jpg "Connectify Free 201002")

**Segundo método**

Ao invés de usar o Connectify, é dar alguns comandos no netsh pelo prompt de comando. Abra o prompt de comando como administrador e digite isto:

```bash
netsh wlan set hostednetwork mode=allow ssid=[ssid] key=[key]
```

Troque o [ssid] com o ssid da sua rede e a chave [key] pela chave WPA2 que você deseja usar.

O próximo passo é habilitar o compartilhamento de conexão com a internet. Para isso, você precisa acessar as propriedades da placa de rede que está conectada á internet. Vá então ao painel de controle e clique em “Rede e Internet”. Quando a próxima janela abrir vá em “Central de redes e compartilhamento”. Uma nova janela será exibida. Na lateral esquerda, clique no texto que diz “Alterar configurações do adaptador de rede”. Agora simplesmente clique com o botão direito nas propriedades da placa de rede que está conectada à internet.

Por fim, vá até a aba chamada “Compartilhamento” e habilite o compartilhamento de conexão. Pronto, você já pode começar a usar sua máquina com Windows 7 como um access point.

Apenas um detalhe para ambos os métodos: Você é forçado a usar encriptação WPA2 para a conexão, assim você pode ter problemas com dispositivos mais antigos, e sistemas operacionais que não suportam.
