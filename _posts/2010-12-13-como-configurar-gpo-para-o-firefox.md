---
id: 2302
title: 'Como configurar GPO para o Firefox'
date: '2010-12-13T14:42:59-05:00'
author: rmmartins
layout: post
guid: 'http://ricardomartins.com.br/?p=2302'
permalink: /como-configurar-gpo-para-o-firefox/
bb-custom-tags:
    - 'servidor, firefox,'
    - 'servidor, firefox,'
    - 'servidor, firefox,'
    - 'servidor, firefox,'
    - 'servidor, firefox,'
    - 'servidor, firefox,'
    - 'servidor, firefox,'
    - 'servidor, firefox,'
    - 'servidor, firefox,'
    - 'servidor, firefox,'
    - 'servidor, firefox,'
    - 'servidor, firefox,'
    - 'servidor, firefox,'
    - 'servidor, firefox,'
    - 'servidor, firefox,'
    - 'servidor, firefox,'
views:
    - '11620'
    - '11620'
    - '11620'
    - '11620'
    - '11620'
    - '11620'
    - '11620'
    - '11620'
    - '11620'
    - '11620'
    - '11620'
    - '11620'
    - '11620'
    - '11620'
    - '11620'
    - '11620'
dsq_thread_id:
    - '3277904200'
    - '3277904200'
    - '3277904200'
    - '3277904200'
    - '3277904200'
    - '3277904200'
    - '3277904200'
    - '3277904200'
    - '3277904200'
    - '3277904200'
    - '3277904200'
    - '3277904200'
    - '3277904200'
    - '3277904200'
    - '3277904200'
    - '3277904200'
categories:
    - Uncategorized
tags:
    - '103'
    - '160'
    - '172'
    - firefox
    - gpo
    - Windows
---

Esses dias recebí um pedido inusitado: O cliente queria uma configuração de GPO no seu servidor, que impedisse os usuários de usar o recurso de salvar senha em formulários.

Fui eu para minhas máquinas virtuais realizar testes. No Internet Explorer, é facil, o problema maior foi configurar no Firefox, visto que não possui integração nenhuma com o Windows.

Para organizar melhor o post, vamos dividir em partes. Uma mostrando como configurar no Internet Explorer, e mais abaixo, como configurar no Firefox.

## No Internet Explorer:

Para desabilitar que sejam salvas senhas de autenticação de rede (Proxy):

Configuração de Computador &gt; Configurações do Windows &gt; Configurações de segurança &gt; Diretivas Locais &gt; Opções de segurança &gt; Acesso à rede: não permitir o armazenamento de senhas e credenciais para autenticação de rede.

Para desabilitar que sejam salvas senhas de páginas visitadas (Recurso AutoCompletar):

Configurações de usuário &gt; Modelos Administrativos &gt; Componentes do Windows &gt; Internet Explorer &gt; Não permitir que o AutoCompletar salve senhas

## No Mozilla Firefox:

Primeiro, você precisa baixar o arquivo compactado abaixo:

[FirefoxADM\_0.5.9.4.zip](http://sourceforge.net/projects/firefoxadm/)

Em seguida, crie uma nova GPO chamada Firefox. Nesta, configure um script de logon com o arquivo  
firefox\_startup.vbs contido no anexo.

[![](http://www.ricardomartins.com.br/wp-content/uploads/2010/12/script-300x240.png "script")](http://www.ricardomartins.com.br/wp-content/uploads/2010/12/script.png)

Depois, na mesma GPO, vá em “Configurações de Computador” e importe o modelo administrativo  
“firefoxlock.adm” também contido no anexo.  
Depois de importar o modelo administrativo, basta ir em Configurações do Computador &gt; Modelos  
Administrativos &gt; Mozilla Firefox &gt; Security &gt; Disable Password Remembering e habilitar.

[![](http://www.ricardomartins.com.br/wp-content/uploads/2010/12/modeloadm-300x240.png "modeloadm")](http://www.ricardomartins.com.br/wp-content/uploads/2010/12/modeloadm.png)

PS: Vocês poderão notar que no arquivo compactado, existe um arquivo PDF mostrando um overview sobre como fazer esta configuração. Porém eu resolví mostrar neste passo-a-passo como fazer.