---
slug: "instalando-a-ferramenta-lrzsz"
title: 'Instalando a ferramenta lrzsz do protocolo ZModem'
date: '2013-08-09T18:21:07-04:00'
tags:
    - linux
description: "O protocolo zmodem permite realizar de modo simples, downloads e uploads para um servidor linux pelo console. Abaixo vou mostrar como realizar a"
cover:
  image: "/og/instalando-a-ferramenta-lrzsz.png"
  alt: ""
  hidden: true
---

O protocolo zmodem permite realizar de modo simples, downloads e uploads para um servidor linux pelo console. Abaixo vou mostrar como realizar a instalação da ferramenta.

## Vamos à instalação:

```bash
wget http://ohse.de/uwe/releases/lrzsz-0.12.20.tar.gz  
tar -xzvf lrzsz-0.12.20.tar.gz  
cd lrzsz-0.12.20  
make  
make install  
cd /usr/bin  
ln -s /usr/local/lrzsz/bin/lrz rz  
ln -s /usr/local/lrzsz/bin/lsz sz
```

Pronto!

## Usando no Putty

Para que ela funcione no Putty, você precisa:

1. Baixar o LePutty em <http://leputty.sourceforge.net/>. O LePutty tem a mesma cara do Putty, mas com as funcionalidades do ZModem habilitadas. inclusive o nome do executavel é Putty.exe mesmo;  
2. Abra o Putty, vá em Config > SSH > ZModem e aponte corretamente para os arquivos rz.exe e sz.exe;  
3. Configure onde será sua pasta de Downloads;  
4. Abra o Puty e faça uma conexão SSH.  
5. Agora para enviar um arquivo para o servidor, execute o comando rz. Em seguida, clique com o botão direito na barra superior do Putty e escolha a opção ZModem upload. NAvegue até o arquivo que deseja enviar e clique em OK.  
6. Para fazer um download, execute o comando sz “arquivo”. No caso, sem aspas. Em seguida vá até a barra superior, clique direito do mouse e escolha ZModem Download. Seu arquivo será baixado na pasta que você definiu como Download.

Ou então fazer como eu, usando o XShell.

## Usando no XShell

Fazendo Uploads:

Se você estiver no XShell, basta executar agora o comando rz que ele irá abrir uma tela para você escolher o arquivo que deseja enviar para o servidor.

Fazendo Downloads:

No XShell, execute sz “arquivo”, sem aspas. Assim ele irá abrir uma janela para você escolher onde quer que o download do arquivo escolhido seja salvo.
