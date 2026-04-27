---
slug: "conhecendo-a-plataforma-azure"
title: 'Conhecendo a Plataforma Azure'
date: '2013-08-05T20:18:39-04:00'
tags:
    - azure
    - cloud
description: "Há algum tempo estou trabalhando com a Cloud da Amazon, mas até então ainda não tinha tido a oportunidade de testar a Cloud da Microsoft, a Azure. Há dois"
cover:
  image: "/og/conhecendo-a-plataforma-azure.png"
  alt: ""
  hidden: true
---

Há algum tempo estou trabalhando com a Cloud da Amazon, mas até então ainda não tinha tido a oportunidade de testar a Cloud da Microsoft, a Azure. Há dois meses atrás, eu comecei a preparar este post, mas ainda não tinha finalizado. A idéia aqui é mostrar como criar um site e uma máquina virtual nesta plataforma. Então vamos lá.

O primeiro passo é ir até <http://www.windowsazure.com>. Em seguida, clique na opçãoda Avaliação Gratuita. Você será direcionado para uma outra página, onde você deve escolher a opção “Teste agora”.

Na tela seguinte, entre com sua conta Microsoft e será exibida a tela abaixo com algumas informações sobre o que lhe será oferecido durante o período de teste:

[![1](/wp-content/uploads/2013/08/1.png)](/wp-content/uploads/2013/08/1.png)

Será solicitado um número de celular, para verificar sua conta. Preencha com o seu número e você receberá uma mensagem de texto. Depois de clicar em “Enviar mensagem de texto”, avance para a próxima tela para preencher o código recebido e depois de verificado o código, avance. Na tela seguinte preencha com os dados do seu cartão de crédito e sua conta estará criada:

[![2](/wp-content/uploads/2013/08/2.png)](/wp-content/uploads/2013/08/2.png)

## Criando um site

Clique em “Portal” e vamos criar nosso site na Azure:

Escolha Computação > Site > Criação Personalizada

[![3](/wp-content/uploads/2013/08/3.png)](/wp-content/uploads/2013/08/3.png)

Na próxima tela, escolha a url. No meu caso, ficará <http://rmartins.azurewebsites.net>

[![4](/wp-content/uploads/2013/08/4.png)](/wp-content/uploads/2013/08/4.png)

[![5](/wp-content/uploads/2013/08/5.png)](/wp-content/uploads/2013/08/5.png)

Neste ponto o site já estará pronto e você poderá ver o site padrão se acessar http://[nomeescolhido].azurewebsites.net

Voltando ao painel, verificamos mais opções. Tais como como obter ferramentas para administrar o site utilizando o WebMatrix, publicar um aplicativo no site, entre outros:

[![8](/wp-content/uploads/2013/08/8.png)](/wp-content/uploads/2013/08/8.png)

Opções de Monitoração:

[![9](/wp-content/uploads/2013/08/9.png)](/wp-content/uploads/2013/08/9.png)

## Criando um usuário FTP

Clique na opção de “Redefinir as credenciais de implantação” e informe o nome de usuário e senha desejados.

[![10](/wp-content/uploads/2013/08/10-1.png)](/wp-content/uploads/2013/08/10-1.png)

[![11](/wp-content/uploads/2013/08/11-1.png)](/wp-content/uploads/2013/08/11-1.png)

Uma vez criado o usuário, visualize na lateral direita as informação de acesso via FTP:

[![12](/wp-content/uploads/2013/08/12-1.png)](/wp-content/uploads/2013/08/12-1.png)

## Testando no Filezilla

Note a existência de duas pastas: LogFile e site.

[![13](/wp-content/uploads/2013/08/13-1.png)](/wp-content/uploads/2013/08/13-1.png)

Dentro da pasta site, temos as pastas deployments, diagnostics e wwwroot.

[![14](/wp-content/uploads/2013/08/14-1.png)](/wp-content/uploads/2013/08/14-1.png)

Vou apagar o arquivo hostingstart.html e substituir por um que vou criar chamado index.html

[![15](/wp-content/uploads/2013/08/15-1.png)](/wp-content/uploads/2013/08/15-1.png)

[![16](/wp-content/uploads/2013/08/16-1.png)](/wp-content/uploads/2013/08/16-1.png)

Agora ao acessar o http://[nomeescolhido].azurewebsites.net voc? verá o conteúdo personalizado contido no index.html

Para excluir o site, bata selecionar o site no Portal e clicar em Excluir:

[![17](/wp-content/uploads/2013/08/17-1.png)](/wp-content/uploads/2013/08/17-1.png)

[![18](/wp-content/uploads/2013/08/18-1.png)](/wp-content/uploads/2013/08/18-1.png)

## Criando uma máquina virtual

[![20](/wp-content/uploads/2013/08/20-1.png)](/wp-content/uploads/2013/08/20-1.png)

Através do Portal, selecione a opção correspondente (Máquinas Virtuais) > Computação > Máquina Virtual > Criação Rápida

Vou escolher a imagem a ser usada:

![19](/wp-content/uploads/2013/08/19-1.png)

Em seguida a configuração da máquina:

![21](/wp-content/uploads/2013/08/21.png)

Preenchemos então com o nome de usuário, senha, e localização:

[![22](/wp-content/uploads/2013/08/22-1.png)](/wp-content/uploads/2013/08/22-1.png)

[![23](/wp-content/uploads/2013/08/23-1.png)](/wp-content/uploads/2013/08/23-1.png)

Pronto, máquina criada:

[![24](/wp-content/uploads/2013/08/24-1.png)](/wp-content/uploads/2013/08/24-1.png)

Pequeno overview:

[![25](/wp-content/uploads/2013/08/25-1.png)](/wp-content/uploads/2013/08/25-1.png)

No menu à direita, informações sobre a máquina:

[![26](/wp-content/uploads/2013/08/26-1.png)](/wp-content/uploads/2013/08/26-1.png)

## Testando o acesso.

Ao clicar em “Conectar” será aberta a opção de salvar um arquivo.rdp com as configurações de conexão:

[![27](/wp-content/uploads/2013/08/27-1.png)](/wp-content/uploads/2013/08/27-1.png)

Uma vez salvo, clique duplo para conectar:

[![28](/wp-content/uploads/2013/08/28-1.png)](/wp-content/uploads/2013/08/28-1.png)

Preenchendo as credenciais:

[![29](/wp-content/uploads/2013/08/29-1.png)](/wp-content/uploads/2013/08/29-1.png)

[![30](/wp-content/uploads/2013/08/30-1.png)](/wp-content/uploads/2013/08/30-1.png)

Conectado:

[![31](/wp-content/uploads/2013/08/31-1.png)](/wp-content/uploads/2013/08/31-1.png)

No período de avaliação, você pode criar até 10 sites.

Até a próxima.
