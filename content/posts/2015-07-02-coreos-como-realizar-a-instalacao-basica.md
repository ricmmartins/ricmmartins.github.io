---
slug: "coreos-como-realizar-a-instalacao-basica"
aliases:
  - "/posts/coreos-como-realizar-a-instalacao-basica/"
title: 'CoreOS: Como realizar a instalação básica em cluster'
date: '2015-07-02T15:30:56-04:00'
tags:
    - linux
categories:
    - Linux
description: "[](/wp-content/uploads/2015/05/coreos-logo.png) Conforme prometido, neste post vou mostrar a instalação do CoreOS fazendo uma continuação deste post"
---

[![coreos-logo](/wp-content/uploads/2015/05/coreos-logo-300x116.png)](/wp-content/uploads/2015/05/coreos-logo.png)

Conforme prometido, neste post vou mostrar a instalação do CoreOS fazendo uma continuação [deste post,](http://www.ricardomartins.com.br/coreos-o-que-e-e-como-funciona/) porém de forma mais prática mostrando os passos para instalação e configuração básica de um ambiente rodando em cluster.

Vou simular uma instalação Bare Metal através do VirtualBox. Note que no site do CoreOS estão relacionadas diversas opções de instalação para todo tipo de ambiente, seja Bare Metal (PXE, iPXE, diretamente em disco), em serviços Cloud (Amazon, Digital Ocean, Azure, Rackspace) ou em plataformas de virtualizalção (Vagrant, VMWare, QEUMU, OpenStack, Eucalyptus, etc). Para cada uma forma de instalação, existem modos diferentes de instalação.

O requerimento para este tutorial em particular, é que você tenha o VirtualBox instalado e um Live-CD de sua distribuição Linux preferida. Neste modelo de instalação, o CoreOS não pode ser instalado sem o uso de um Live-CD pois não permite que seja instalado no mesmo dispositivo que tenha sido realizado o boot. Por exemplo, se você botou uma máquina pelo HD, você não poderá instalar o CoreOS neste mesmo HD. Maiores informações aqui: (<https://coreos.com/docs/running-coreos/bare-metal/installing-to-disk/>)

Por esta razão, se faz necessário usar um Live-CD para instalar no HD do servidor que estiver usando. Você pode usar qualquer distribuição linux e dar o boot no ambiente do Live-CD para usar o script de instalação usado para realizar a instalação do CoreOS.

Lembrando que instalação “Bare Metal” é quando a instalação do SO é feita diretamente no hardware, sem virtualização. Pense em instalação Bare Metal como uma instalação do seu sistema operacional em um hardware tradicional, por exemplo, uma instalação do CentOS em um servidor Dell/HP.

A falta de um servidor físico para eu fazer este laboratório, me restringe a realizar esta instalação em uma máquina virtual criada no VirtualBox, simulando assim nosso ambiente Bare Metal.

O primeiro passo é criar a máquina virtual no Virtual Box e em seguida configurar para dar boot pelo arquivo ISO da distribuição escolhida. Uma vez tendo dado boot no ambiente “Live-CD”, mãos à obra.

Para incrementar o laboratório, além de instalar o CoreOS vamos configurar um Cluster entre dois “servidores”.

> Como sabemos, o CoreOS é uma distribuição voltada para executar containers que podem consumir bastante memória RAM, então seja generoso na quantidade de memória RAM disponibilizada para a máquina virtual.

Uma vez iniciado o ambiente Live, vamos ao site do CoreOS (<https://coreos.com>). Lá você nota o campo **“Try out CoreOS”**. Para nosso ambiente, vamos escolher “*Bare Metal – Install to Disk*“. Você será redirecionado para [este link](https://coreos.com/docs/running-coreos/bare-metal/installing-to-disk/) onde tem as informações sobre a instalação usando o “Install Script”. O script irá remover qualquer coisa existente no HD e instalar o CoreOS. Conforme descrito no site, ele basicamente irá fazer o download da imagem, verificar a integridade e copiar bit a bit para o disco.

O script está [disponivel no Github](https://raw.githubusercontent.com/coreos/init/master/bin/coreos-install) e você não precisa fazer nenhuma alteração. Basta copiar o conteúdo, salvar em um arquivo localmente, conceder permissão de execução e depois rodar com os parâmetros necessários.

Em seguida, é preciso criar um arquivo de configuração chamado **cloud-config.yaml**. O conteúdo dele define basicamente os parâmetros iniciais que você deseja configurar no seu servidor CoreOS. Toda configuração feita neste arquivo será carregada e configurada dentro do ambiente.

O acesso às máquinas, será feito por chaves SSH. Para gerar seu par de chaves, rode o comando abaixo:

```bash
# ssh-keygen -t rsa -b 2048  
```

Durante o processo, você pode informar onde quer que os arquivos sejam salvos, neste exemplo, vou salvá-los em /tmp. Deste modo basta informar /tmp/CoreOS

Depois de informar uma senha, serão gerados os dois arquivos abaixo dento do diretório /tmp:

- **CoreOS_rsa** (Chave Privada);
- **CoreOS_rsa.pub** (Chave Pública).

*O conteúdo do CoreOS_rsa.pub será utilizado no nosso arquivo cloud-config.yaml.*

No ambiente Live-CD do VirtualBox, vamos baixar do GitHub o script de instalação do CoreOS.

```bash
# wget https://raw.githubusercontent.com/coreos/init/master/bin/coreos-install -O coreos-install.sh  
# chmod a+x /tmp/coreos-install.sh  
```

Agora vamos criar o arquivo cloud-config.yaml, que será interpretado pela instalação do script de instalação. Por ser um [YAML](https://pt.wikipedia.org/wiki/YAML) você precisa tomar alguns cuidados na formatação e identação, pois caso contrário pode apresentar falha no parsing realizado. Para garantir que esteja correto, você pode validar seu arquivo neste link <http://coreos.com/validate>

```bash
# vim /tmp/cloud-config.yaml

#cloud-config  
hostname: CoreOS1

ssh_authorized_keys:  
– ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDXq2wdVv3PkauEjXTLcuAKFMhNTGvcSa2ChbcJacgnhpfzRpq1epfvX/M5078e/VDl3IQpjEQeutCJY0idwbD7ft2fNSA8xETYMlirit9AAqIduVWHkK2SDA8Q1JMcuNCopV6+6VkGYDyHufWvHp+WN5yawr4h5m4FawYlY0X02twJjs2eMGd3rZLUbq6wzuX5Lym/AkXGF5eCKOIEc/6bAKzg57qcGdqNTbRXdM7DQO2CstxUFM9m8pYUyp4I5x8zy9rYd8kztpVrd3CLAyVs8u9Sb87Hpnuo8dfPQ9WfJ/v/DMlZOWOdQYqfn44jtHriQfi9/tWCHM/Fc+38Dwij ricardo@martins

coreos:  
etcd:  
discovery: https://discovery.etcd.io/14b99e8be3992f0f700a818ee469c4a2  
addr: 192.168.1.130:4001  
peer-addr: 192.168.1.130:7001  
units:  
– name: etcd.service  
command: start  
– name: fleet.service  
command: start  
– name: static.network  
content: |  

[Match]
Name=enp0s3

[Network]  
Address=192.168.1.130/24  
Gateway=192.168.1.1  
DNS=8.8.8.8  
```

Observações:

- **ssh_authorized_keys**: Neste campo informe o conteúdo da sua chave pública. Se você utilizar a mesma que eu coloquei acima, não vai funcionar uma vez que você não tenha a chave privada correspondente. Importante acrescentar o **“-“** no começo da linha;
- **discovery**: Neste campo é informado o token gerado para seu cluster.

Todo cluster precisa ter um ID específico, um token. Como queremos que ambos o servidores integrem o mesmo cluster, ao criar o token para o primeiro servidor basta usar o mesmo token no arquivo de configuração do segundo servidor. Desta forma o segundo servidor será automaticamente adicionado ao cluster já existente.

Para gerar o token, basta ir ao endereço <http://discovery.etcd.io/new>. Ao abrir o link será exibido o token gerado automaticamente. Basta copiar o token e colar no campo **discovery** do arquivo cloud-config.yaml.

Uma vez com o cloud-config configurado, o próximo passo é executar o script de instalação passando os parâmetros necessários (dispositivo onde será instalado, a versão desejada e o path do cloud-config):

```bash
# /tmp/coreos-install.sh -d /dev/sda -C stable -c /tmp/cloud-config.yaml  
```

Mais opções de customização do cloud-config estão disponíveis na documentação: <https://coreos.com/docs/cluster-management/setup/cloudinit-cloud-config/>

Automaticamente será feito download da imagem, particionamento do disco, instalação do CoreOS e configurado o cluster com o token especificado.

Você pode notar alguma mensagem de erro dizendo que um componente chamado coreos-cloudinit não foi encontrado e por isto o arquivo de configuração não pôde ser validado. Isto ocorre porque de fato não temos o coreos-cloudinit instalado. Se quiser validar seu arquivo de configuração, basta acessar <http://coreos.com/validate> conforme dito anteriormente.

Ao término da instalação, basta fazer o restart da máquina virtual e acessar a máquina virtual com a chave SSH:

```bash
# ssh -i /tmp/CoreOS_rsa core@192.168.1.130  
```

Finalizada a instalação do primeiro servidor, basta criar o segundo servidor lembrando dos seguintes detalhes:

- Usar o mesmo token no cloud-config.yaml;
- Alterar o endereço IP para o correspondente do segundo servidor no cloud-config.yaml.

Terminada a instalação, basta logar em uma das máquinas e rodar os comandos abaixo. Estes comandos mostrarão os nós integrantes do cluster e a saúde de cada nó:

```bash
# fleetctl list-machines  
# etcdctl cluster-health  
```

Se você quiser conferir as configurações aplicadas pelo cloud-config, basta verificar o arquivo /run/systemd/system/etcd.service.d/20-cloudinit.conf

Por hoje ficamos por aqui. Lembrando que este é um tutorial básico e introdutório. Maiores detalhes e possibilidades, consulte a documentação oficial.

Abaixo o screencast de demonstração:

<iframe allowfullscreen="" frameborder="0" height="281" loading="lazy" src="https://www.youtube.com/embed/dEP31boZ9jU?feature=oembed" width="500"></iframe>
