---
slug: "como-converter-arquivo-exe-em-msi"
title: 'Como converter arquivo .exe em .msi'
date: '2010-08-25T23:10:04-04:00'
tags:
    - ferramentas
    - windows
description: "Hoje precisei converter um arquivo .exe em .msi para realizar testes de instalação via GPO."
---

Hoje precisei converter um arquivo .exe em .msi para realizar testes de instalação via GPO.

Nunca tinha feito isto, apenas tinha ouvido falar de um método usando um utilitário contido no <span class="bbli">CD</span> de instalação do Windows 2000.

Fiz uma pesquisa no Google e encontrei o “Como fazer” utilizando este método no Baboo. Realmente parece interessante. Pensei em fazer usando uma máquina virtual no Virtual PC, pois em suma, o procedimento consiste em pegar uma máquina limpa, instalar o utilitário e gerar uma “imagem” do sistema limpa. Em seguida instalar o programa que deseja criar o pacote .msi à partir do arquivo .exe.

Ao fim, gerar outra imagem usando o utilitário do Windows 2000. Assim ele irá comparar as duas imagens e com o que encontrar de diferente, devido à instalação do programa, ou seja, dll’s, executáveis, bibliotecas, etc, irá comparar as duas imagens e gerar um pacote.msi com as diferenças.

O link para o tutorial do Baboo é: [http://www.baboo.com.br/conteudo/modelos/MSI-Windows-Installer-Criando-seus-proprios-pacotes-MSI-para-distribuicao\_a4137\_z0.aspx](http://www.baboo.com.br/conteudo/modelos/MSI-Windows-Installer-Criando-seus-proprios-pacotes-MSI-para-distribuicao_a4137_z0.aspx)

Como este método parece ser bastante trabalhoso, continuei procurando na internet e encontrei uma ferramenta gratuita para criar arquivos .msi à partir de .exe.

Para a minha necessidade, serviu perfeitamente. Segue o link: <http://www.qwertylab.com/download/ExetomsiSetup.msi>
