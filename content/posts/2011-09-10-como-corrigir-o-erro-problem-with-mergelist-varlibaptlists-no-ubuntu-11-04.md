---
slug: "como-corrigir-o-erro-problem-with-mergelist-varlibaptlists-no-ubuntu-11-04"
aliases:
  - "/posts/como-corrigir-o-erro-problem-with-mergelist-varlibaptlists-no-ubuntu-11-04/"
title: 'Como corrigir o erro “Problem with MergeList /var/lib/apt/lists” no Ubuntu 11.04'
date: '2011-09-10T08:22:15-04:00'
tags:
    - ubuntu
categories:
    - Linux
description: "Se você estiver usando o gerenciador de pacotes ou tentando instalar algum problema pelo terminal, pode aparecer a seguinte mensagem de erro:"
---

Se você estiver usando o gerenciador de pacotes ou tentando instalar algum problema pelo terminal, pode aparecer a seguinte mensagem de erro:

E:Encountered a section with no Package: header,

E:Problem with MergeList /var/lib/apt/lists /br.archive.ubuntu.com\ubuntu\dists\natty\main\binary-i386\Packages,

E:The package lists or status file could not be parsed or opened.

Isto irá impossibilitar a instalacão ou atualizacão de qualquer aplicativo no Ubuntu 11.04, no entanto, é fácil resolver este problema,

No terminal, rode os seguintes comandos:

```bash
sudo rm /var/lib/apt/lists/* -vf
```

```bash
sudo apt-get update
```

Isto irá remover as entradas antigas e realizar o download das novas versões onde o erro não aparece mais.

Scripts sempre são bem vindos, então você poderia criar um script com o seguinte conteúdo:

```bash
#!/bin/bash  
# Corrigindo erros do apt no Ubuntu

echo “Isto ira corrigir os erros relacionados a mergelist”  
sudo rm /var/lib/apt/lists/* -vf  
sudo apt-get update
```

Salve como mergelist.sh ou algum outro nome relevante.

Garanta que sera possivel executar o script:

```bash
chmod a+x mergelist.sh
```

Finalmente execute o script ao invés de ficar digitando comandos:

```bash
./mergelist.sh
```

Nota: Se você já corrigiu o erro, não execute novamente, caso contrário irá limpar as listas que já fez download e baixá-las novamente desnecessariamente.
