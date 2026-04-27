---
slug: "python-usando-o-modulo-simplehttpserver"
id: 5364
title: 'Python: Usando o módulo SimpleHTTPServer'
date: '2015-03-02T18:45:44-05:00'
tags:
    - linux
    - python
description: "O SimpleHTTPServer é um módulo do python que representa uma alternativa simples e rápida para servir arquivos à partir de um diretório no seu sistema via"
---

O SimpleHTTPServer é um módulo do python que representa uma alternativa simples e rápida para servir arquivos à partir de um diretório no seu sistema via HTTP sem que seja necessário instalar o Nginx, Apache ou algum outro servidor web.

A principal vantagem ao utilizá-lo, é não precisar instalar nada no sistema para disponibilizar algum arquivo via HTTP, uma vez que quase todo sistema linux já vem com o interpretador Python instalado por padrão, e o SimpleHTTPServer é um módulo integrado do python.

Neste post vou mostrar um script em bash que você pode usar para disponibilizar acesso à arquivos contidos em quaisquer diretórios via HTTP.

### Primeiro passo: Criar o arquivo http-server

Neste exemplo vou colocar o script para usar a porta 8081 e listar o conteúdo do /var/log via HTTP:

```bash
# vim /tmp/http-server
```

```bash
#!/bin/bash

WWW_PORT=’8081′  
WWW_PATH=”/var/log/”

case $1 in  
start)  
cd $WWW_PATH  
nohup python -m SimpleHTTPServer $WWW_PORT >> /tmp/nohup.log 2>&1 &  
sleep 2  
stat=`netstat -tlpn | grep $WWW_PORT | grep “python” | cut -d”:” -f2 | cut -d” ” -f1`  
if [[ $WWW_PORT -eq $stat ]]; then  
sock=`netstat -tlpn | grep $WWW_PORT | grep “python”`  
echo -e “Server is running:n$sock”  
else  
echo -e “Server is stopped”  
fi  
;;

stop)  
pid=`ps -ef | grep “SimpleHTTPServer $WWW_PORT”| awk ‘{print $2}’`  
kill -9 $pid 2&gt;/dev/null  
rm -f /tmp/nohup.log  
stat=`netstat -tlpn | grep $WWW_PORT | grep “python”| cut -d”:” -f2 | cut -d” ” -f1`  
if [[ $WWW_PORT -eq $stat ]]; then  
sock=`netstat -tlpn | grep $WWW_PORT | grep “python”`  
echo -e “Server is still running:n$sock”  
else  
echo -e “Server has stopped”  
fi

;;

status)  
stat=`netstat -tlpn |grep $WWW_PORT| grep “python” | cut -d”:” -f2 | cut -d” ” -f1`  
if [[ $WWW_PORT -eq $stat ]]; then  
sock=`netstat -tlpn | grep $WWW_PORT | grep “python”`  
echo -e “Server is running:n$sock”  
else  
echo -e “Server is stopped”  
fi  
;;  
\*)  
echo “Use $0 start|stop|status”  
;;  
esac
```

### Em seguida vamos dar permissões de execução:

```bash
# chmod a+x /tmp/http-server  
```

### E finalmente vamos executar e verificar o status:

```bash
# /tmp/http-server start  
# /tmp/http-server stop  
```

Agora vamos ver o conteúdo do /var/log pelo browser:

[![python](/wp-content/uploads/2015/03/python.png)](/wp-content/uploads/2015/03/python.png)

Por padrão o módulo SimpleHTTPServer não exibe uma página web por exemplo. Ele cria apenas uma lista de arquivos e diretórios do path informado (no nosso caso pela variável WWW\_PATH — /var/log) para facilitar algum troubleshooting por exemplo. Se quiser exibir uma página web, basta inserir o arquivo index.html dentro do diretório em questão.

O script http-server também configura para que os logs do SimpleHTTPServer sejam escritos em um arquivo de log em /tmp/nohup.log. Caso queria ver os logs de acesso, basta olha este arquivo.

### Habilitando o http-server no boot.

No CentOS, basta criar a seguinte linha no /etc/rc.local antes da linha que contém “exit 0″:

```bash
/tmp/http-server start  
```

Para garantir que o rc.local esteja habilitado em sistemas debian, basta instalar o pacote sysv-rc-conf e em seguida rodar:

```bash
sysv-rc-conf rc.local on  
```
