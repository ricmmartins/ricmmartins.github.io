---
slug: "conheca-o-microsoft-diagnostics-and-recovery-toolset-dart-7-0-beta"
id: 2847
title: 'Conheça o Microsoft Diagnostics and Recovery Toolset – DaRT 7.0 (Beta)'
tags:
    - windows
categories:
    - Windows
description: "Você já se deparou com algum problema onde foi preciso fazer a reinstalação do Windows para recuperar a máquina? Tela azul, arquivos corrompidos, volume"
---

Por [Marcelo Matias](http://marcelomatias.wordpress.com/)

Você já se deparou com algum problema onde foi preciso fazer a reinstalação do Windows para recuperar a máquina? Tela azul, arquivos corrompidos, volume danificado, hotfix que não pôde ser removido, malware persistente, driver ou serviço corrompido… Quanto tempo o seu cliente fica sem trabalhar quando um problema desses ocorre?

Se você infelizmente já passou por essa situação saiba que existe uma ferramenta da Microsoft feita especialmente para você: chama-se Diagnostics and Recovery Toolset (DaRT).

O DaRT é um produto que faz parte do [Microsoft Desktop Optimization Pack (MDOP)](http://bit.ly/w7mdop), mas teve sua origem como “ERD Commander” da antiga Wininternals ([adquirida pela Microsoft em 2006](http://www.microsoft.com/systemcenter/winternals.mspx)).

O DaRT é composto por 14 ferramentas que permitem principalmente manutenção em PCs que não conseguem carregar o Windows por algum motivo. Ele te ajuda a identificar o problema que ocasionou tela azul, trocar senha de usuário local, recuperar arquivos excluídos, editar o registro, controlar o startup de drivers e serviços, recuperar volumes danificados, acompanha antimalware off-line, e muito mais. Existem versões para Windows XP/Server 2003, Vista/Server 2008 e Windows 7/Server 2008 R2.

Atualmente com a versão 7.0 em fase beta (download já disponível), a grande novidade do DaRT é a possibilidade de suporte remoto (KVM remoto) diretamente pelo ambiente de recuperação (sem carregar o Windows), sem a necessidade de deslocamento físico do técnico de suporte.

Se você tem interesse em experimentá-lo (altamente recomendado) é preciso preencher o seguinte formulário para liberar ter acesso ao link para download: [http://go.microsoft.com/fwlink/?LinkID=213952](http://go.microsoft.com/fwlink/?LinkID=213952 "http://go.microsoft.com/fwlink/?LinkID=213952")

As formas de implementação do ambiente de recuperação do DaRT são bem flexíveis, suportando CD, DVD, boot PXE (ex.: Windows Deployment Services), USB (pendrive/HD), ou partição local de recuperação.

Você se lembra do artigo que escrevi sobre [como criar partição de recuperação do Windows 7](http://marcelomatias.wordpress.com/2011/01/06/particao-de-recuperacao-windows-7/)? Você pode incluir o DaRT 7 nesse processo, evitando ao máximo a reinstalação do PC.

Eu registrei abaixo alguns processos para que você possa conhecer:

- Instalação do DaRT
- Criação da mídia de recuperação
- Processo de suporte remoto (a grande novidade do DaRT 7.0)
- Visão geral das ferramentas

Clique nas imagens para exibição em tamanho real.

**Instalação do DaRT** (nos PCs dos técnicos de suporte).

[![image](http://marcelomatias.files.wordpress.com/2011/04/image_thumb.png?w=244&h=191 "image")](http://marcelomatias.files.wordpress.com/2011/04/image.png)[![image](http://marcelomatias.files.wordpress.com/2011/04/image_thumb1.png?w=244&h=191 "image")](http://marcelomatias.files.wordpress.com/2011/04/image1.png)

É basicamente Next, Next, Finish. Você só deve fazer essa instalação nas máquinas dos técnicos que vão criar a mídia de recuperação ou iniciar a sessão de suporte remoto.

Importante lembrar que para gerar a mídia de recuperação do DaRT ou fazer análise de dump de memória é preciso instalar o [Debugging Tools for Windows](http://msdn.microsoft.com/en-us/windows/hardware/gg463009).

**Criação da mídia de recuperação:**

Durante a criação você precisa indicar o caminho dos arquivos de instalação do Windows para que o DaRT possa reaproveitar o ambiente de recuperação que já vem no Windows, para a partir daí incluir suas ferramentas de diagnóstico e reparo.

[![image](http://marcelomatias.files.wordpress.com/2011/04/image_thumb2.png?w=244&h=166 "image")](http://marcelomatias.files.wordpress.com/2011/04/image2.png)[![image](http://marcelomatias.files.wordpress.com/2011/04/image_thumb3.png?w=244&h=166 "image")](http://marcelomatias.files.wordpress.com/2011/04/image3.png)

Você pode nesse momento escolher quais ferramentas farão parte dessa mídia de recuperação. Na tela seguinte você escolhe a opção de permitir ou não o suporte remoto nos PCs que forem iniciados a partir dessa mídia.

[![image](http://marcelomatias.files.wordpress.com/2011/04/image_thumb4.png?w=244&h=166 "image")](http://marcelomatias.files.wordpress.com/2011/04/image4.png)[![image](http://marcelomatias.files.wordpress.com/2011/04/image_thumb5.png?w=244&h=166 "image")](http://marcelomatias.files.wordpress.com/2011/04/image5.png)

Lembre-se de instalar o Debbuging Tools com antecedência, caso contrário você não vai conseguir avançar. Como o DaRT acompanha uma ferramenta antimalware (antispyware+antivírus) você tem a opção de baixar automaticamente a atualização via internet ou fazer isso manualmente.

[![image](http://marcelomatias.files.wordpress.com/2011/04/image_thumb6.png?w=244&h=166 "image")](http://marcelomatias.files.wordpress.com/2011/04/image6.png)[![image](http://marcelomatias.files.wordpress.com/2011/04/image_thumb7.png?w=244&h=166 "image")](http://marcelomatias.files.wordpress.com/2011/04/image7.png)

Se por algum motivo você tiver PCs que precisam de algum driver especial de disco ou rede esse é o momento para fazer essa inclusão. Na sequência você pode incluir outras ferramentas que farão parte da mídia de recuperação, deixando-a ainda mais poderosa.

[![image](http://marcelomatias.files.wordpress.com/2011/04/image_thumb8.png?w=244&h=166 "image")](http://marcelomatias.files.wordpress.com/2011/04/image8.png)[![image](http://marcelomatias.files.wordpress.com/2011/04/image_thumb9.png?w=244&h=166 "image")](http://marcelomatias.files.wordpress.com/2011/04/image9.png)

Ao final desse processo um arquivo .ISO será gerado. Consulte o próprio Help do DaRT para saber como reaproveitar esse arquivo em outros métodos de distribuição como citado anteriormente.

[![image](http://marcelomatias.files.wordpress.com/2011/04/image_thumb10.png?w=244&h=166 "image")](http://marcelomatias.files.wordpress.com/2011/04/image10.png)[![DaRT - gravar DVD](http://marcelomatias.files.wordpress.com/2011/04/dart-gravar-dvd_thumb.png?w=244&h=166 "DaRT - gravar DVD")](http://marcelomatias.files.wordpress.com/2011/04/dart-gravar-dvd.png)

Lembre-se que se você instalar o DaRT no Windows 7 x64 você só vai conseguir gerar mídia de recuperação 64-bits. Se você precisa gerar mídia de recuperação x86 você deve usar Windows 32-bits (pode usar máquina virtual para isso).

**Suporte Remoto quando o PC não consegue carregar o Windows**

Agora que você já criou a mídia de recuperação chegou a hora de usá-la. No meu caso eu aproveitei o .ISO para iniciar uma máquina virtual que tem o Windows 7 instalado.

Assim que o boot é realizado por essa mídia a instalação do Windows será identificada (se você não ver nada nessa tela é porque provavelmente você precisa incluir o driver da controladora do disco). Lembre-se que se o disco estiver protegido pela criptografia Bitlocker será preciso entrar com a senha de recuperação do disco antes de prosseguir com a manutenção.

[![image](http://marcelomatias.files.wordpress.com/2011/04/image_thumb11.png?w=244&h=184 "image")](http://marcelomatias.files.wordpress.com/2011/04/image11.png)

A tela a seguir mostra o ambiente de recuperação que já acompanha o Windows 7. Perceba que o DaRT incluiu mais uma opção no final dessa lista. Ao clicar nesse link você verá todas as ferramentas disponíveis.

[![image](http://marcelomatias.files.wordpress.com/2011/04/image_thumb12.png?w=244&h=184 "image")](http://marcelomatias.files.wordpress.com/2011/04/image12.png)[![image](http://marcelomatias.files.wordpress.com/2011/04/image_thumb13.png?w=244&h=184 "image")](http://marcelomatias.files.wordpress.com/2011/04/image13.png)

Para acionar o suporte remoto clique em “Remote Connection”. Anote o número do ticket, endereço IP e porta de comunicação. Se você precisa especificar IP fixo clique na ferramenta TCP/IP na tela inicial do DaRT. Se a placa de rede não foi reconhecida provavelmente você vai precisar incluir o driver no momento da criação da mídia.

[![image](http://marcelomatias.files.wordpress.com/2011/04/image_thumb14.png?w=244&h=183 "image")](http://marcelomatias.files.wordpress.com/2011/04/image14.png)

A partir de algum PC onde você instalou o DaRT carregue o “DaRT Remote Connections Viewer”

[![image](http://marcelomatias.files.wordpress.com/2011/04/image_thumb15.png?w=244&h=85 "image")](http://marcelomatias.files.wordpress.com/2011/04/image15.png)

Na tela de “Ticket Information” digite os dados anotados a partir da máquina a ser suportada e clique em “Connect”. Pronto, você já está controlando remotamente o PC. Na tela abaixo eu carreguei o Computer Management, que permite coletar informações da máquina, verificar informações do disco e controlar a inicialização de drivers, serviços e aplicativos.

[![image](http://marcelomatias.files.wordpress.com/2011/04/image_thumb16.png?w=244&h=241 "image")](http://marcelomatias.files.wordpress.com/2011/04/image16.png)[![image](http://marcelomatias.files.wordpress.com/2011/04/image_thumb17.png?w=244&h=205 "image")](http://marcelomatias.files.wordpress.com/2011/04/image17.png)

**Visão geral das ferramentas que compõem o DaRT:**

Solution Wizard: Assistente de solução de problemas para orientar qual a melhor ferramenta a ser usada com base no atual sintoma.

[![image](http://marcelomatias.files.wordpress.com/2011/04/image_thumb18.png?w=244&h=184 "image")](http://marcelomatias.files.wordpress.com/2011/04/image18.png)

TCP/IP Config: para definir IP fixo se necessário (IPV4 ou IPV6)

[![image](http://marcelomatias.files.wordpress.com/2011/04/image_thumb19.png?w=244&h=184 "image")](http://marcelomatias.files.wordpress.com/2011/04/image19.png)

ERD Registry Editor: caso você precise fazer alguma mudança no registro do Windows mas que por algum motivo não consegue, ou não deve, fazer com o Windows carregado.

[![Editor de Registro](http://marcelomatias.files.wordpress.com/2011/04/image_thumb20.png?w=244&h=184 "Editor de Registro")](http://marcelomatias.files.wordpress.com/2011/04/image20.png)

Locksmith: conhece aquele caso onde tiramos o PC do domínio e não sabemos a senha do usuário admin local? Pois é, essa ferramenta permite trocar essa senha, permitindo logon local no PC para fazer o reingresso ao domínio.

[![Troca de senha de usuário local](http://marcelomatias.files.wordpress.com/2011/04/image_thumb21.png?w=244&h=184 "Troca de senha de usuário local")](http://marcelomatias.files.wordpress.com/2011/04/image21.png)

Crash Analizer: Você indica o arquivo contendo o dump de memória e ele te mostra o que ocasionou a Tela Azul (no caso abaixo foi um driver). Você pode carregar o Computar Management do DaRT e controlar a inicialização desse driver, desabilitando-o. Você pode fazer o mesmo com serviços ou outros programas de carregamento automático.

[![image](http://marcelomatias.files.wordpress.com/2011/04/image_thumb22.png?w=244&h=184 "image")](http://marcelomatias.files.wordpress.com/2011/04/image22.png)

Disk Wipe: Ferramenta para remover todo o conteúdo do disco rígido, evitando que arquivos ou partições possam ser recuperados (usa um algoritmo do Departamento de Defesa Norte Americano). Muito útil quando você precisa se desfazer de algum PC antigo.

[![image](http://marcelomatias.files.wordpress.com/2011/04/image_thumb23.png?w=244&h=184 "image")](http://marcelomatias.files.wordpress.com/2011/04/image23.png)

Hotfix Uninstall: Sabe aquele hotfix que por algum problema não consegue ser removido a partir do Windows? Essa ferramenta permite removê-lo “na marra”. Como o Windows não está carregado a eficácia é maior.

[![image](http://marcelomatias.files.wordpress.com/2011/04/image_thumb24.png?w=244&h=184 "image")](http://marcelomatias.files.wordpress.com/2011/04/image24.png)

SFC Repair: Para reparar algum arquivo de sistema que pode ter sido corrompido ou substituído inadequadamente.

[![image](http://marcelomatias.files.wordpress.com/2011/04/image_thumb25.png?w=244&h=184 "image")](http://marcelomatias.files.wordpress.com/2011/04/image25.png)

Standalone System Sweeper: Para remover aquele spyware ou vírus que o antivirus tradicional não consegue remover por estar carregado em memória.

[![image](http://marcelomatias.files.wordpress.com/2011/04/image_thumb26.png?w=244&h=184 "image")](http://marcelomatias.files.wordpress.com/2011/04/image26.png)

Disk Commander: para reparar volumes danificados.

[![image](http://marcelomatias.files.wordpress.com/2011/04/image_thumb27.png?w=244&h=184 "image")](http://marcelomatias.files.wordpress.com/2011/04/image27.png)

File Restore: para recuperar arquivos excluídos

[![image](http://marcelomatias.files.wordpress.com/2011/04/image_thumb28.png?w=244&h=184 "image")](http://marcelomatias.files.wordpress.com/2011/04/image28.png)
