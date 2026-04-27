---
slug: "monit-monitoramento-de-aplicacoes-e-servicos-de-forma-inteligente"

title: 'Monit: Monitoramento de aplicações e serviços de forma inteligente'
date: '2015-06-26T17:04:55-04:00'
tags:
    - linux    
    - monitoramento
    - nginx       
categories:
    - Linux
description: "No post de hoje vou comentar um pouco sobre o Monit. Uma ferramenta extremamente útil e poderosa para monitoramento de aplicações e serviços."
---

No post de hoje vou comentar um pouco sobre o [Monit](https://mmonit.com/monit/). Uma ferramenta extremamente útil e poderosa para monitoramento de aplicações e serviços.

Com o monit, você pode monitorar praticamente tudo dentro de um ambiente linux. Cpu, processos, memória, uso de disco, checksum de arquivos, etc, e ainda tomar ações para que os problemas se resolvam de forma automática, sem interação manual.

Por exemplo, você pode monitorar um serviço, e caso seja detecta falha nele por um determinado período de tempo, automaticamente este serviço ser reiniciado. Se preferir, ainda pode receber um email de notificação informando o problema ocorrido e a solução aplicada.

Se interessou? Então vamos lá.

Neste cenário de teste, eu vou usar o [Vagrant](https://www.vagrantup.com/) para iniciar uma máquina virtual onde teremos o nosso laboratório rodando. Nesta máquina virtual, teremos um Nginx e uma aplicação em PHP rodando.

Vamos ter dois monitoramentos ativos, um do processo do Nginx, e outro do processo do PHP-FPM. No teste, vou parar o processo do PHP-FPM para que o Nginx comece à responder status code 502 (Bad Gateway, erro que geralmente aparece quando há um problema de configuração e/ou comunicação entre o servidor web e serviços de back-end. Neste exemplo, o Nginx fará um repasse das requisições PHP para o PHP-FPM, que age como um serviço de back-end e por esta razão ao dar stop nele, o site irá passar a responder com erro 502.)

O monitoramento do PHP-FPM será feito verificando a cada 30 segundos a resposta do servidor web, no caso o Nginx. Se o servidor responder com status code diferente de 200 (padrão de resposta para solicitações HTTP com sucesso), ele automaticamente irá fazer restart no processo do PHP-FPM e enviar um email de notificação.

Nossa máquina virtual terá as seguintes aplicações instaladas:

– Nginx (servidor web);  
– PHP-FPM (Uma alternativa em substituição ao FastCGI para implementações em PHP. Ele é mais performático que o FastCGI em sites com muitos acessos simultâneos além de ter mais funcionalidades);  
– Exim (Ferramenta MTA mais simples que sendmail e postfix para o envio de alertas/notificações).

Este laboratório foi feito em vídeo. Os arquivos de configuração utilizados, estão disponíveis neste link do Github: <https://github.com/rmmartins/lab-monit>

A aplicação em PHP está neste link: <https://github.com/rmmartins/simple-php-app>

Importante ressaltar que o Monit tem diversas outras formas de funcionamento. Veja a que funciona melhor para você e mais adequadamente dentro do seu ambiente ou do que precisa monitorar.

O próprio arquivo de configuração (/etc/monit.conf) possui diversos exemplos de uso, e você também encontra muitas informações na documentação no site oficial.

Abaixo o vídeo:

<iframe allowfullscreen="" frameborder="0" height="375" loading="lazy" src="https://www.youtube.com/embed/atuRvvft5xU?feature=oembed" width="500"></iframe>
