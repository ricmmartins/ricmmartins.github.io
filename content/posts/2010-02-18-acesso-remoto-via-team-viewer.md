---
slug: "acesso-remoto-via-team-viewer"
title: 'Acesso remoto via Team Viewer'
date: '2010-02-18T21:13:14-05:00'
tags:
    - windows
description: "Recentemente descobrí oTeamViewer. Aos poucos fui descobrindo como ele funciona e hoje é o que eu uso para acesso remoto. Uma poderosa ferramenta, que"
---

Recentemente descobrí o<span class="bbli">TeamViewer</span>. Aos poucos fui descobrindo como ele funciona e hoje é o que eu uso para acesso remoto. Uma poderosa ferramenta, que funciona sem ter problemas com firewall’s e etc.

Eu descobri o Teamviewer quando passei a trabalhar remotamente para uma das empresas onde faço consultoria e precisei de uma ferramenta rápida para acesso remoto, que não me desse problemas e nem mão de obra tendo que abrir porta em <span class="bbli">firewall</span>. Cheguei a usar diversas ferramentas como próprio Remote Desktop do Windows, CrossLoop, VNC e derivados (TightVNC, RealVNC, UltraVNC…), Logmein, Yugma e por aí vai.

Até que descobri o TeamViewer e meus problemas acabaram.É só configurar o ID e permitir que máquina seja acessada remotamente. Do outro lado, basta fornecer o ID da máquina e a senha de acesso. Pronto!

**Agora algo realmente interessante sobre ele:**

Na empresa citada no começo do artigo, eu tenho uma máquina que há cerca de uma semana era uma máquina com o Windows onde eu tinha o TeamViewer instalado e resolvia todos os problemas remotamente. Até que eu resolvi instalar o Linux nela.

Infelizmente o TeamViewer não tem versão para Linux. Tentei instalar pelo Wine, conseguí instalar, mas ao iniciar dá alguns erros de dll’s e eu não estava afim de ficar esquentando a cabeça para tentar resolver.

Então pensei em testar o TeamViewer rodando em uma máquina virtual com o Windows, e pasmem: funciona!

**Foi simples assim:**

Instalei o Virtualbox e configurei a placa de rede virtual em modo bridge (Assim ela fica no mesmo range de ip da máquina real e consigo acessar a rede e a internet do mesmo modo que no Linux).

Dei boot em uma virtual machine com o Windows e instalei o TeamViewer. Em seguida configurei como seria o acesso remoto nele, e configurei o ID e a senha de acesso.

Por fim, quando cheguei em casa, abri o TeamViewer da minha máquina e lá estava o Windows “virtual” rodando dentro do VirtualBox instalado no Linux, disponível para acesso. Cliquei e pronto! Tô Dentro!

Se você achou interessante, experimente: <http://www.teamviewer.com/pt/index.aspx>

Note que para a versão gratuita ou comercial, o instalador é o mesmo. No momento da instalação que você informa se irá usar para uso pessoal ou comercial. Escolha uso pessoal e todas as funcionaldades estarão disponíveis gratuitamente.
