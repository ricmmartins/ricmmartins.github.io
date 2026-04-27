---
slug: "pendrive-bootavel-com-ghost"
title: 'Pendrive Bootável com Ghost'
date: '2010-05-16T17:11:01-04:00'
tags:
    - aleatórios
description: "A idéia deste artigo é mostrar como criar um pendrive bootável que contenha uma imagem do seu equipamento que permita a realização do auto-restore. Ou"
---

A idéia deste artigo é mostrar como criar um <span class="bbli">pendrive</span> bootável que contenha uma imagem do seu equipamento que permita a realização do auto-restore. Ou seja, basta plugar o pendrive, dar o boot e em 10 minutos seu sistema estará da mesma forma de quando você criou a imagem, automaticamente.

Eu não vou entrar em detalhes sobre como criar a imagem, visto que é pré-requisito para o que iremos fazer.

Este artigo surgiu em uma necessidade que tive de criar este tipo de sistema utilizando DVD’s, com o intuito de criar um sistema de <span class="bbli">DVD</span>-Restore, através do Ghost. Depois de uma longa maratona de testes e pesquisas na internet para fazer isto com DVD’s, consegui fazer após encontrar os dois links destacados abaixo. No entanto, depois de algum tempo percebí que utilizar um pendrive seria bem mais simples e desde então eu simplemente não utilizo nem recomendo a utilização de DVD’s para este fim.

Se você for levar em conta o preço de um pendrive de cerca de 8GB com espaço suficiente pra você fazer ghost de uma partição de sistema inteira, sem ter problemas com arranhões, etc, vai concordar em utilizar pendrive para isto…

Se mesmo assim ficou interessado em utilizar DVD’s, basta seguir o tutorial dos links abaixo:

> <http://users.telenet.be/satcp/ghostresq01.htm> – Este processo é mais simples.
> 
> [http://radified.com/Ghost/ghost\_1.htm](http://radified.com/Ghost/ghost_1.htm) – Processo um pouco mais complexo e detalhado mas funciona da mesma forma.

**Mãos à obra:**

Primeiro você vai precisar do <span class="bbli">HP</span> <span class="bbli">USB</span> Disk <span class="bbli">Storage</span>, para formatar o pendrive e configurá-lo como bootável. Execute o download em:

<http://pcworld.uol.com.br/downloads/2008/04/25/hp-usb-disk-storage-format-tool/>

A utilização é simples, primeiro você deve escoher o dispositivo, escolher o FileSystem (lembrando que para permitir que seja bootável deve ser FAT32 e **não NTFS**) e habilitar a opção de criar um disco de inicialização.

Nesta última opção, escolha “using DOS System files located at:” e então aponte para uma pasta contendo os arquivos command.com e io.sys.

> Você pode conseguí-los em um disquete de boot o Windows98. Baixe em <http://www.bootdisk.com/bootdisk.htm> e crie o seu.
> 
> Caso não possua um drive de disquete, baixe neste link <http://users.telenet.be/satcp/files/bootdisk.zip> e extraia o conteúdo do arquivo bootimage.ima utilizando o [WinImage](http://www.winimage.com/download.htm)

Por padrão, vem embutido no arquivo io.sys uma splashscreen do Windows98. Caso você não queira que ela apareça durante o boot do seu pendrive, basta criar um arquivo em qualquer editor de imagem (pode ser o paintbrush mesmo) com fundo todo preto, e com as resoluções em 320×400 e salvá-lo como logo.sys. Em seguida copiei também este arquivo para o pendrive.

Agora crie um arquivo chamado autoexec.bat com o seguinte conteúdo:

```bash
@ECHO OFF
ghost.bat
```

E agora crie um arquivo chamado ghost.bat com o seguinte conteúdo:

```bash
GHOST.EXE -clone,MODE=pload,SRC=imagem.gho:1,DST=2:1
```

Explicando:

Você cria um arquivo autoexec.bat que irá chamar o ghost.bat, que será quem efetivamente irá executar o ghost.exe com os parâmetros informados.

No caso, lembre-se que no campo SRC=imagem.gho, você deve substituir pelo nome do seu arquivo de imagem, e em DST=2:1, significa disco 2, partição 1, ou seja, eu quero restaurar o conteúdo de imagem.gho na primeira partição do segundo disco. Ajuste este valor para a sua necessidade

Por fim, copie os arquivos da sua imagem para dentro do pendrive e também o executável do ghost. Lembrando apenas que caso a sua imagem seja muito grande, você terá que utilizar a opção de split do próprio ghost para dividir a imagem em vários arquivos de cerca de 3.5GB. Isto é necessário pois o FAT32 tem uma limitação onde os arquivos não podem ser maiores que 4GB.

*Note que neste caso, será gerado um arquivo com a extensão .gho e os demais terão a extensão .ghs.*

Resumindo:

Arquivos que deverão ser copiados para dentro do pendrive:

- command.com
- io.sys
- autoexec.bat
- ghost.bat
- ghost.exe
- logo.sys
- arquivos de imagem

Agora que você leu até o final, vou dar o pulo do gato. Clique nos links abaixo e baixe os arquivos necessários:

– [Ghost.exe](http://www.klaer.org/files/ghost/Ghost/ghost.exe)

– [Insumos](/ricardo/arquivos/Insumos.zip)

Até a próxima!
