---
slug: "como-instalar-o-jenkins"
title: 'Como instalar o Jenkins'
date: '2015-08-12T14:53:20-04:00'
tags:
    - devops
    - jenkins
description: "A idéia deste post é criar um “mini-howto” da instalação do Jenkins. Eu não vou entrar em muitos detalhes sobre o que é o Jenkins. Se você quiser saber um"
cover:
  image: "/og/como-instalar-o-jenkins.png"
  alt: ""
  hidden: true
---

A idéia deste post é criar um “mini-howto” da instalação do Jenkins.

Eu não vou entrar em muitos detalhes sobre o que é o Jenkins. Se você quiser saber um pouco mais sobre ele, separei os dois links abaixo, que são uma excelente documentação:

<http://imasters.com.br/desenvolvimento/serie-integracao-continua-deploy-automatizando-jenkins-tomcat/>

<http://www.infoq.com/br/presentations/turbinando-testes-com-jenkins>

A parte de configuração também pode variar muito, e dependerá muito das necessidades do time de desenvolvimento da sua empresa. Por esta razão vamos dar foco apenas na instalação mesmo. Vamos lá:

Neste caso, estou usando uma instância na Amazon, que utiliza o Amazon Linux (CentOS Based):

```bash
# wget -O /etc/yum.repos.d/jenkins.repo http://pkg.jenkins-ci.org/redhat-stable/jenkins.repo
# rpm --import http://pkg.jenkins-ci.org/redhat-stable/jenkins-ci.org.key
# yum install jenkins
# service jenkins start
# chkconfig jenkins on
```

Por fim, acesse no browser:

http://ip.do.seu.servidor:8080
