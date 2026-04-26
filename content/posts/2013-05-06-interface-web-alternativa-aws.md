---
slug: "interface-web-alternativa-aws"
title: 'Configurando uma interface web alternativa para a AWS'
date: '2013-05-06T14:34:26-04:00'
tags:
    - aws
    - cloud
---

Atualmente a Netflix é um dos maiores heavy users dos serviços AWS no mundo. E eles possuem todo um conjunto de ferramentas desenvolvidas por eles mesmos para otimizar o trabalho que desenvolvem e a utlização dos serviços da Amazon. Diversas das ferramentas deles estão disponiblizadas no formato open source em <https://github.com/Netflix>

Hoje vou abordar a instalação do Asgard. Uma interface Web bastante interessante criada por eles, que pode ser usada plenamente para substituir o console web da Amazon.

A projeto está disponível em <https://github.com/Netflix/asgard>, o download em <https://netflix.box.com/asgard> e um quick start em <https://github.com/Netflix/asgard/wiki/Quick-Start-Guide>

Para começar, faça o download em <https://netflix.box.com/asgard>. Note que você precisa ter uma conta no serviço [Box.net](http://box.net).  
Escolha o arquivo **asgard-standalone.jar**

Agora vá em Propriedades do Sistema &gt; Configurações Avançadas do Sistema &gt; Propriedades do Sistema &gt; Variáveis de Ambiente. Em variáveis do sistema, adicione o valor abaixo para a variável Path:

**C:Program Files (x86)Javajre7bin**

Salve o arquivo que fez download em por exemplo, C:Asgard.

Agora vamos ao prompt de comandos. Entre no diretório acima e execute:

```
java -Xmx1024M -XX:MaxPermSize=128m -DskipCacheFill=true  -jar asgard-standalone.jar
```

Agora abra o browser e aponte para o endereço:

```
http://localhost:8080
```

Aqui você deve informar seu Access Key ID, Secret Access Key e seu AWS Account Number. Todas estas informações você encontra no link “Security Credentials”

Assim que abrir a url, você verá a tela abaixo:

[![asgard](wp-content/uploads/2013/05/19-1024x611.png)](/wp-content/uploads/2013/05/19.png)

Em alguns instantes será exibido os campos que devem ser preenchidos com as informações da sua conta.

Depois de preencher os campos, você verá a tela abaixo:

[![2](wp-content/uploads/2013/05/2-1024x611.png)](/wp-content/uploads/2013/05/2.png)

Visualizando minha instância:

[![3](/wp-content/uploads/2013/05/3-1024x611.png)](/wp-content/uploads/2013/05/3.png)

Clicando no “Instance ID” em azul acima, vamos para a próxima tela com todos os detalhes sobre ela.

[![4](/wp-content/uploads/2013/05/4-1024x611.png)](h/wp-content/uploads/2013/05/4.png)

Gostou? Tá esperando o que pra testar também?

Sugiro a você que utiliza os serviços AWS, a acompanhar o blog técnico do Netflix.

Tem muita informação valiosa lá. Confira: <http://techblog.netflix.com/>
