---
slug: "como-impedir-o-uso-do-seu-sistema-usando-o-syskey"
title: 'Como impedir o uso do seu sistema usando o SYSKEY'
date: '2009-04-10T17:21:59-04:00'
tags:
    - segurança
    - windows
categories:
    - Windows
description: "Essa dica é de um amigo meu (Igor Humberto). Foi publicada em outro site, mas tive a autorização para publicar aqui."
---

Essa dica é de um amigo meu (Igor Humberto). Foi publicada em outro site, mas tive a autorização para publicar aqui.

**Cenário atual.**

Quem nunca teve problemas para impedir que uma pessoa usasse, sem a sua autorização, o computador em casa? Diversos recursos podem ser usados para tentar impedir que isso aconteça. Diversos métodos poderiam ser aplicados, dos quais podemos citar:

**– Senha no SETUP**: Configurar uma senha que liberasse o carregamento do sistema operacional através do setup da placa-mãe parece, a primeira vista, um método bastante eficaz para tentar impedir que uma pessoa não-autorizada usasse o sistema, porém não tem como impedir que o usuário mal-intencionado abra o gabinete e consiga aplicar um Clear CMOS na placa-mãe. Isso faria com que as opções de configuração padrão do setup fossem recarregadas e, dessa forma, removesse a senha configurada por você.

**– Configurar contas com senhas**: Também é um método interessante, porém, hoje em dia existe uma farta documentação na Internet que explica, passo-a-passo, como se faz para iniciar o computador usando um sistema que inicialize através do CD-ROM, tal como o ERD Commander e, no caso deste último, use o utilitário Locksmith para redefinir a senha do administrador do sistema. Nesse caso, como uma forma de te irritar, o usuário mal-intencionado poderia, inclusive, impedir o seu próprio acesso.

Bem, eu poderia ficar aqui citando diversos métodos para tentar impedir o acesso de pessoas não-autorizadas, porém, infelizmente, todos esses métodos são reversíveis.

**Usando o SYSKEY.**

A técnica que irei apresentar agora não impede o acesso às informações contidas no disco rígido do computador, mas funciona como um método eficaz para evitar que o sistema operacional seja carregado. Se você parar para pensar, esse recurso seria capaz de impedir que um usuário mal-intencionado usasse a sua máquina e, dependendo da situação, isso já seria suficiente, porque não adiantaria ter acesso aos arquivos, uma vez que um jogo, por exemplo, está instalado no sistema operacional, ou seja, seria necessário carregá-lo para poder jogar.

Explicando de uma forma bem simples o que essa ferramenta faz é o seguinte: Imagine o banco de dados de contas do sistema (**Gerenciador de contas de segurança – SAM**) como um baú que precisa de uma chave para abri-lo. Sem essa chave, não importa se você conhece as contas/senhas de todos os usuários do sistema, você não terá como acessá-las, correto?

Bem, o que o **SYSKEY** faz é exatamente proteger a chave que abre esse baú. Se você não passar por ele, não será capaz de carregar o sistema.

A utilização da ferramenta é bem simples. Na máquina que você deseja proteger, clique em Iniciar/Executar e digite SYSKEY &lt;ENTER&gt;. A janela do SYSKEY será aberta e você poderá observar que o recurso de criptografia está ativado e que não é possível removê-lo. Clique no botão Avançado, onde você poderá escolher entre as seguintes opções:

[![Clique para ampliar](http://adminonline.files.wordpress.com/2007/09/tabela.thumbnail.jpg) ](http://adminonline.files.wordpress.com/2007/09/tabela.jpg "tabela.jpg")

Bem, das opções oferecidas, a que cria a melhor relação proteção/facilidade de uso é a **Senha gerada pelo administrador, Inicialização da senha**, porque devemos considerar que: 1 – Muitos sistemas não possuem mais os drives de disquetes (No Windows Vista, para essa ferramenta, o suporte oferecido ainda é por disquete); 2 – Imagine o caos que seria caso o disquete fosse perdido?

Vale ressaltar que a senha é case sensitive e que, caso você a esqueça, nem a reinstalação do sistema irá permitir que o sistema seja carregado. Você poderá acessar os seus dados fazendo até um dual boot, mas não poderá carregar o referido sistema sem que antes você use a senha configurada previamente.

Esta solução está disponível no Windows 2000, XP, 2003 e Vista. No NT 4 já era possível usar essa solução, mas era necessário instalar o SYSKEY no sistema.

Bem, por hoje é só!

Autor: Igor Humberto  
E-mail: igorhumberto@gmail.com
