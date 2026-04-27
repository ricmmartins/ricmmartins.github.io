---
slug: "liberar-instalacao-de-fontes-pelos-usuarios-no-windows-7"
title: 'Liberar instalação de fontes pelos usuários no Windows 7'
date: '2011-04-12T20:31:12-04:00'
tags:
    - windows
categories:
    - Windows
description: "Aqui no trabalho, dentre outras atividades, trabalhamos dando suporte e criando soluções para profissionais de criação. Sabe este povo criativo que usa"
---

Aqui no trabalho, dentre outras atividades, trabalhamos dando suporte e criando soluções para profissionais de criação. Sabe este povo criativo que usa Photoshop, 3DMax, After Effects? É uma tarefa divertida e ótima para tornar uma pessoa cartesiana em algo muito mais prático! Não que eu seja cartesiano.

Com o upgrade para o Windows 7, ganhamos um problema. É que este pessoal criativo, volta e meia precisa instalar novas fontes no Windows. O que antigamente, no Windows XP era simples, bastava que concedesse-mos permissões de Modificar para o grupo de usuários respectivo e eles mesmo instalavam as fontes sem a necessidade de nossa intervenção.

Já no Windows 7, não é tão simples assim, já que a aba de Segurança sequer aparece na pasta de Fontes do Windows. Porém agora isto já não é mais um problema, pois recentemente, depois de muita pesquisa, descobrimos como fazer para liberar a pasta de fontes para os usuários, e agora não precisam mais nos acionar toda vez que querem instalar uma fonte nova instalada.

Vamos então ao que interessa:

**Primeiro, desabilitar o UAC:**

Control Panel > User Accounts > Change User Account Control Settings, selecionar “Nunca Notificar”

**Depois liberar acesso ao diretório fontes:**

1. Abra o prompt de comando com privilégios de administrador (clique com o botão direito do mouse, executar como administrador)  
2. Digite “attrib –r –s c:WindowsFonts” (sem aspas), tecle Enter  
3. Clique com o botão direito do mouse na pasta Fonts e escolha propriedades  
4. Clique na aba segurança  
5. Clique em avançado  
6. Clique na aba proprietário  
7. Clique em editar  
8. Altere o proprietário atual para o administrador  
9. Marque a opção para substituir proprietário em subcontainers e objetos  
10. Clique em ok.

**Agora liberar chave do registro**

1. Execute o regedit  
2. Procure pela chave: HKEY_LOCAL_MACHINESOFTWAREMICROSOFTWINDOWS NTCURRENT VERSIONFONTS  
3. Clique com o botão direito em cima de Fonts, permissões e em seguida dar permissões de controle total para o grupo “usuários”

Reinicie o computador e agora sera possível definir as permissões NTFS concedendo as permissões de “modificar” para o grupo usuários em C:WindowsFonts. Isto irá permitir que usuários restritos instalem fontes.

Até a próxima.
