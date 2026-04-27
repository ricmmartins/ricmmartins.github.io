---
slug: "exluir-arquivos-com-mais-de-x-dias-de-idade"
title: 'Exluir arquivos com mais de X dias de idade'
date: '2011-04-01T20:44:58-04:00'
tags:
    - windows
categories:
    - Windows
description: "Todos nós, administradores de sistema, temos problemas com arquivos de log lotando o disco rígido. Mas agora você vai poder determinar que os arquivos com"
---

Todos nós, administradores de sistema, temos problemas com arquivos de log lotando o disco rígido. Mas agora você vai poder determinar que os arquivos com mais de X dias sejam deletados do seu sistema de forma simples.

Estou falando de uma ferramenta simples e gratuita da Microsoft, incluída em algumas versões do Windows chamada “Forfiles”

O Forfiles irá executar comandos em arquivos e pastas que correspontam à determinados critérios. Ele permite que você defina curingas, escolha apenas pastas, apenas arquivos, e o mais importante é que ele permite que você especifique algo como “Eu só quero os arquivos que tem mais de um dia de idade”

Primeiro, deixe-me mostrar os possíveis argumentos dele:

/P Path Name: Indica o path para iniciar a busca. A pasta padrão é a pasta de trabalho atual.

/M Search Mask: Pesquisa arquivos de acordo com uma máscara de busca. A máscara de pesquisa padrão é “\*”

/S SubDirectories: Orienta o Forfiles a fazer uma busca recursiva em sub-diretórios. Similar ao comando “dir /s” do DOS.

/C Command: Indica o comando à ser executado para cada arquivo. Cadeias de comandos devem ser inseridas em aspas duplas.

As seguintes variáveis podem ser utilizadas na cadeia de comandos:

@File – retorna o nome do arquivo.  
@Fname – retorna o nome do arquivo sem extensão.  
@Ext – retorna apenas a extensão do arquivo.  
@Path – retorna o caminho completo do arquivo.  
@Relpath – retorna o caminho relativo do arquivo.  
@Isdir – retorna “TRUE” se um tipo de arquivo é um diretório, e “falso” para arquivos.  
@Fsize – retorna o tamanho do arquivo em bytes.  
@Fdate – retorna a data da última modificação do arquivo.  
@Ftime – retorna o tempo da última modificação do arquivo.

Para incluir caracteres especiais na linha de comando, use o código hexadecimal para o caracter no formato 0xHH (ex.: 0x09 para um tab).

Comandos cmd.exe internos devem ser precedidos de “cmd c /”.

/D data seleciona arquivos em que a data da última modificação foram maior ou igual a (+), ou menor ou igual a (-), à data especificada usando o formato “yyyy/MM/dd”, ou seleciona arquivos com a data da última modificação seja maior ou igual a (+) data atual mais “dd” dias, ou menor ou igual a (-) data atual menos “dd” dias. São válidos quaisquer números “dd” no intervalo de 0 à 32768. O “+” é tomado como sinal padrão se não especificado.

Legal, então vamos ao que interessa:

Vamos começar com o caminho. Queremos que ele procure em c:windowstemp

```bash
forfiles  -p "c:windowstemp"
```

Quero incluir subpastas:

```bash
forfiles -p "c:windowstemp" -s
```

Usando a opção de data, eu quero qualquer coisa com mais de um dia de idade:

```bash
forfiles -p "c:windowstemp" -s -d -1
```

Eu só quero apagar os arquivos que terminam com .tmp:

```bash
forfiles -p "c:windowstemp" -s -d -1 -m *.tmp
```

E, finalmente, o comando que desejo executar nos arquivos encontrados, no caso é o DEL:

```bash
forfiles -p "c:windowstemp" -s -d -1 -m *.tmp -c "cmd /c del /f /q @path"
```

Observe o uso da variável @path – é uma das muitas variáveis que o Forfiles reconhece.

Então é isso – uma linha de comando que vai apagar arquivos da nossa pasta temp com mais de 1 dia de idade:

```bash
forfiles -p "c:windowstemp" -s -d -1 -m *.tmp -c "cmd /c del /f /q @path"
```

E pronto! Agora é só você criar uma tarefa agendada para rodar o comando acima uma vez por semana.

Se sua cópia do Windows não tem o Forfiles, você pode baixá-lo a partir do servidor FTP da Microsoft aqui:

[ftp://ftp.microsoft.com/ResKit/y2kfix/x86/](ftp://ftp.microsoft.com/ResKit/y2kfix/x86/)

Estou realmente impressionado com este pequeno utilitário e as suas infinitas possibilidades.

Apenas para deixar vocês informados:

Acredito que essas versões do Windows possuem por padrão:

Windows 2003  
Windows 2008  
Windows Vista  
Windows 7

Essas versões não:

Windows 2000  
Windows XP

Espero que ajude.
