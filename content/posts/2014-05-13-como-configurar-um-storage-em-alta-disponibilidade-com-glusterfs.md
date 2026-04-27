---
slug: "como-configurar-um-storage-em-alta-disponibilidade-com-glusterfs"
title: 'Como configurar um storage em alta disponibilidade com GlusterFS'
date: '2014-05-13T23:17:14-04:00'
tags:
    - storage
description: "Recentemente eu mostrei como configurar balanceamento de carga com o HAProxy. Caso você não tenha visto, pode acessá-lo aqui."
cover:
  image: "/og/como-configurar-um-storage-em-alta-disponibilidade-com-glusterfs.png"
  alt: ""
  hidden: true
---

## Aprenda a implementar esta excelente ferramenta.

![glusterfs](/media/orange-ant-glusterfs.png)

Recentemente eu mostrei como configurar balanceamento de carga com o HAProxy. Caso você não tenha visto, pode acessá-lo [aqui](http://www.ricardomartins.com.br/balanceamento-de-carga-com-haproxy/).

Nele eu demonstrei como configurar um servidor funcionando como balanceador, jogando as requisições para dois servidores, dividindo a carga entre eles. Muito útil para equilibrar a carga entre dois ou mais servidores, e/ou por exemplo garantir que um site continuará acessível no caso de falha em um dos servidores que compõem a arquitetura.

No cenário de teste, eu havia colocado um arquivo html em cada servidor web contendo o nome do servidor em cada caso. Por exemplo, o Server1, exibia o texto “Server1” e o Server2 o texto “Server2” sempre que respondia a uma requisição de acesso. Assim conseguia mostrar que de fato o balanceamento estava funcionando, pois ao realizar o acesso, o conteúdo exibido era alterado de acordo com o servidor que respondia. Foi a forma didática que encontrei para demonstrar o funcionamento do balanceamento.

No entanto em um cenário real, você irá desejar ter o mesmo conteúdo em todos os servidores web. Mas como fazer isto? Para fazer isso existe o **modo prático**, e digamos, o **modo profissional**.

O modo prático, porém não menos eficiente, é manter um cronjob fazendo o rsync do diretório do site (/var/www/html, por exemplo) entre os servidores a cada X minutos.

O modo profissional, é montar um cluster. Existem N ferramentas para trabalhar com Clusters, ([Linux-HA](http://www.linux-ha.org/), [OneSIS](http://onesis.org/), [Pacemaker](http://www.clusterlabs.org/), [Corosync](http://corosync.github.io/corosync/), [DRBD](http://www.drbd.org/)), mas eu vou demonstrar como fazer com o [GlusterFS](http://www.gluster.org/).

O GlusterFS permite a criação de diferentes tipos de configurações, muitas delas parecidas com os níveis de RAID. Neste post vou criar uma matriz de armazenamento redundante, ou seja, um sistema de arquivos distribuído. Será como um RAID espelhado pela rede onde cada servidor terá sua própria cópia dos dados, permitindo que os acessos sejam feitos de forma distribuída.

Eu vou usar o [Vagrant](http://www.vagrantup.com/) neste laboratório, e cada máquina terá dois discos. Um com 8GB contendo a instalação do sistema operacional (CentOS 6.4) e outro de 1GB que será usado como storage na nossa configuração de Cluster.

Laboratório usado:

server1.ricardomartins.com.br (192.168.1.110)  
server2.ricardomartins.com.br (192.168.1.120)  
client.ricardomartins.com.br (192.168.1.130)

/dev/sda – 8GB (Sistema Operacional)  
/dev/sdb – 1GB (Storage)

### Configuração do Storage

Criar partição:  

```bash
# cfdisk /dev/sdb  
 New > Primary > Size: (Deixe o padrão) > Write > Yes > Quit
```

Criar sistema de arquivos e formatar:  

```bash
# mkfs.ext4 /dev/sdb1
```

Criar diretório do cluster:  

```bash
# mkdir -p /dados/cluster
```

Configurar o Fstab:  

```bash
# vi /etc/fstab
```

Adicionar:  

```bash
/dev/sdb1 /dados/cluster ext4 defaults 1 2
```

Montar:  

```bash
# mount -a && mount
```

### Habilitar EPEL e o repositório do GlusterFS

```bash
# wget -P /etc/yum.repos.d http://download.gluster.org/pub/gluster/glusterfs/LATEST/EPEL.repo/glusterfs-epel.repo
```

### Instalação do GlusterFS

```bash
# yum install glusterfs-server
```

Iniciar o daemon de gerenciamento do GlusterFS  

```bash
# service glusterd start
```

Garantir que ele seja iniciado durante o boot  

```bash
# chkconfig glusterd on
```

Para evitar erros por conta de regras de Firewall e do Selinux, vamos desabilitá-lo:

Abra o /etc/sysconfig/selinux e deixe da seguinte forma:  

```bash
SELINUX=disabled
```

Agora faça um flush nas regras de iptables ou pare o serviço:  

```bash
# iptables -F
```

ou  

```bash
# /etc/init.d/iptables stop
```

### Configurar o Trusted Pool

Rodar o seguinte comando no Server1:  

```bash
# gluster peer probe server2
```

Rodar o seguinte comando no Server2:  

```bash
# gluster peer probe server1
```

> Nota: Uma vez que o pool já estiver conectado, apenas servidores “Trusted” podem adicionar novos servidores no Pool.

### Configurar o Volume do GlusterFS

Criar em ambos os servidores:  

```bash
# mkdir /dados/cluster/vg
```

Criar o volume em qualquer um dos servidores e iniciar o volume. Eu fiz no Server1  

```bash
# gluster volume create vg replica 2 server1:/dados/cluster/vg server2:/dados/cluster/vg  
```

```bash
# gluster volume start vg
```

Agora vamos confirmar o estado do volume criado:  

```bash
# gluster volume info
```

Caso o volume não for iniciado, as mensagens de erro estarão em /var/log/glusterfs em ambos os servidores.

### Testando nos clientes

Agora no Client, vamos testar. Instale o cliente do glusterfs:  

```bash
# yum install glusterfs-client
```

Em seguida vamos criar um diretório onde montaremos o cluster:  

```bash
# mkdir /clusterfs
```

E agora montamos o cluster nesse diretório:  

```bash
# mount -t glusterfs server1:/dados/cluster/vg /clusterfs
```

Para montar automaticamente, basta inserir no /etc/fstab da seguinte maneira:  

```bash
server1.ricardomartins.com.br:/dados/cluster/vg /cluster glusterfs defaults,_netdev 0 0
```

Agora vamos criar arquivos neste diretório:  

```bash
# cd /clusterfs
```

```bash
# touch arquivo{1..10}
```

Para validar, vamos em um dos outros servidores, e dê um ls no diretório do cluster. Os arquivos estarão lá!  

```bash
# ls /dados/cluster/vg
```

> Nota: Se você quiser testar dentro de um dos servidores, você precisa instalar o cliente do glusterfs (glusterfs-client) e usar o mesmo procedimento acima. Escrever diretamente em /dados/cluster/vg/ não irá replicar a configuração para o outro servidor.

Outros testes que você DEVE fazer para validar que realmente funciona:

- Logado no cliente, entre no diretório /clusterfs e crie alguns arquivos;
- Acesse um dos servidores e verifique a existência dos arquivos criados em /dados/cluster/vg;
- Desligue um dos servidores e crie novos arquivos pelo cliente. Verifique no outro servidor que os novos arquivos criados com um dos servidores delisgados estará lá;
- Ligue o servidor que desligou e verifique o conteúdo do /dados/cluster/vg. Os arquivos criados enquanto ele estava desligado estarão lá;
- Agora inverta, desligue o outro servidor e refaça o teste acima. Da mesma forma quando ligar ele novamente, os arquivos estarão sincronizados nele.

Se estiver tudo conforme acima, seu Raid via rede está totalmente funcional agora!

### Restringindo acesso ao volume

Agora que nós verificamos que nosso storage pool está disponível e replicando os dados entre as máquinas do cluster, nos podemos querer proteger nosso pool. Atualmente, qualquer computador cliente pode se conectar ao nosso storage sem nenhuma restrição. Nós podemos alterar isso definindo uma opção no nosso volume.

Em um dos servidores, digite:  

```bash
# gluster volume set volume1 auth.allow ip.do.cliente1,ip.do.cliente2
```

### Alguns comandos importantes do glusterfs

Obtendo informações sobre ós volumes:  

```bash
# gluster volume info
```

Obtendo informações sobre os nós integrantes do cluster que estão conectados ao servidor que você estiver logado:  

```bash
# gluster peer status
```

Se você quiser informações detalhadas sobre o que cada nó está fazendo, você pode traçar um perfil sobre o volume:  

```bash
# gluster volume profile nome_do_volume start
```

```bash
# gluster volume profile nome_do_volume info
```

Para obter uma lista de todos os componentes associados ao GlusterFS rodando em cada um dos nós (servidores):  

```bash
# gluster volume status
```

Para entrar no console de administração do GlusterFS  

```bash
# gluster
```

Um prompt de comandos será aberto. Digite “help” para ver todas as opções disponíveis para você. Para sair, digite “exit”.

### Plus: Conceitos de Storage

- Brick: Brick é basicamente qualquer diretório criado para ser compartilhado entre o trusted storage pool;
- Trusted Storage Pool: É a coleção destes arquivos e diretórios compartilhados, que são baseados no protocolo desenvolvido;
- Block Storage: Dispositivos através dos quais os dados são movidos entre os sistemas no formato de blocos;
- Cluster: Quando falamos de RedHat Storage, cluster e trusted storage pool remetem a mesma idéia de servidores de armazenamento baseados em um protocolo definido;
- Distributed File System: Sistema de arquivos no qual os dados são distribuídos entre diferentes nós (servidores), onde os usuários podem acessar os arquivos sem saber a localização real deles;
- Fuse: É um módulo do Kernel que pode ser carregado e permite aos usuários criarem sistemas de arquivos sobre o kernel sem envolver nenhum código de Kernel;
- Glusterd: É o daemon de gerenciamento do GlusterFS. Funciona como a espinha dorsal do sistema de arquivos que fica em execução em todo o tempo, sempre que os servidores estão no estado de ativos;
- Posix: Portable Operating System Interface, é o conjunto de normas definidas pelo IEEE como uma solução para compatibilidade entre o Unix e seus variantes na forma de APIs
- Raid: Redundant Array of Independent Disks, é uma tecnologia que dá maior confiabilidade em sistemas de armazenamento através de redundância;
- Subvolume: Um brick, depois de ter sido processado por ao menos um Translator;
- Translator: Um translator é aquele pedaço de código que executa as ações básicas iniciadas pelo usuário à partir do ponto de montagem. Ele se conecta com um ou mais subvolumes;
- Volume: Um volume é um conjunto lógico de bricks. Todas as operações são baseadas em diferentesd tipos de volumes criados pelo usuário.
