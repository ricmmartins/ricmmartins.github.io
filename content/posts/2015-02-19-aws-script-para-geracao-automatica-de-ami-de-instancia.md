---
slug: "aws-script-para-geracao-automatica-de-ami-de-instancia"
aliases:
  - "/posts/aws-script-para-geracao-automatica-de-ami-de-instancia/"
title: 'AWS: Script para geração automática de AMI de instância'
date: '2015-02-19T18:47:41-05:00'
tags:
    - aws
    - scripts
categories:
    - AWS
description: "Se você administra servidores na nuvem da AWS, certamente este script irá te auxiliar bastante a automatizar a geração da AMI da sua instância. O AMI é"
---

Se você administra servidores na nuvem da AWS, certamente este script irá te auxiliar bastante a automatizar a geração da AMI da sua instância. O AMI é uma imagem da sua instância que você pode utilizar em caso de recuperação de desastres.

Você pode utilizar uma instância com a função de bastion host para executá-lo. Um bastion host, pode ser utilizado como sua instância de administração de seu ambiente.

O primeiro passo é você criar um usuário para rodar o script no IAM. Uma vez criado o usuário, pode inserí-lo em um grupo de administração e adicionar uma “user policy” para ele.

Tome nota do Access Key ID e do Secret Access Key do usuário.

Abaixo o conteúdo da user policy:

```bash
{  
    “Version”: “2012-10-17”,  
    “Statement”: [  
    {  
      “Action”: “ec2:*”,  
      “Effect”: “Allow”,  
      “Resource”: “*”  
    }  
  ]  
}  
```

No seu ambiente de produção, recomendo restringir as ações. Note que neste exemplo estou permitindo qualquer ação (ec2:\*). Você pode usar este simulador para criar sua policy: <http://awspolicygen.s3.amazonaws.com/policygen.html>

Eu costumo usar o Amazon Linux cujo usuário padrão é o ec2-user e por isto vamos trabalhar no home deste usuário. Caso use Ubuntu, substituia para o home do usuário ubuntu.

A primeira coisa, é inserir as suas credenciais no .bashrc do usuário:

Então insira o seguinte conteúdo no /home/ec2-user/.bashrc:

```bash
export AWS_ACCESS_KEY=[insirasuachaveaqui]  
export AWS_SECRET_KEY=[insirasuasenhaqui]  
export EC2_URL=https://ec2.[insirasuaregiaoaqui].amazonaws.com
```

Agora crie o script em /home/ec2-user/scripts/create-ami:

```bash
#!/bin/bash

# Carrega as credenciais  
source /home/ec2-user/.bashrc

# Cria a AMI  
/opt/aws/bin/ec2-describe-instances –filter tag:Name=”[nomedasuainstancia]” | /bin/sed -e ‘/^INSTANCE/d’ -e ‘/^BLOCK/d’ -e ‘/^RESERVATION/d’ -e ‘/Description/d’ | /usr/bin/gawk ‘{ print $3,$5 }’ | /usr/bin/tail -1 | /usr/bin/gawk -v date=”$(date +”%d-%m-%Y”)” ‘{print $1,”–name”,$2,”-“,date,”–no-reboot”}’ | /usr/bin/gawk ‘{print $1,$2,$3 $4 $5,$6 $7}’ | /usr/bin/xargs -L 1 ec2-create-image

# Remove as AMI criadas há mais de três dias  
/opt/aws/bin/ec2-describe-images –owner [numeroiddasuaconta] | /bin/grep [nomedasuainstancia]-$(date –date=’3 days ago’ ‘+%d-%m-%Y’) | /usr/bin/gawk ‘{print $2}’ | /usr/bin/xargs -L 1 ec2-deregister

# Remove o snapshot gerado automaticamente durante a criação da AMI  
/opt/aws/bin/ec2-describe-snapshots | grep [instanceid] | /usr/bin/gawk ‘{print $2″_”$5}’ | /usr/bin/gawk -F T ‘{print $1}’ | grep “$(date –date=’3 days ago’ ‘+%Y-%m-%d’)” | awk -F ‘{print $1}’ | /usr/bin/xargs -L 1 /opt/aws/bin/ec2-delete-snapshot
```

Não esqueça de dar permissão de execução no script:

```bash
$ chmod 600 /home/ec2-user/scripts/create-ami
```

Para que rode todos os dias, vamos criar um crontab, de modo que execute diariamente às 20:00. Logado como ec2-user, rode o “crontab -e” e insira o conteúdo abaixo:  

```bash
00 20 \* \* \* /home/ec2-user/scripts/create-ami
```

Este script irá criar diariamente uma AMI desta instância sem fazer reboot nela e inserindo a data no nome da AMI no seguinte formato: [nomedasuainstancia]-dd-mm-yyyy. A cada execução ele irá pegar a AMI com data de 3 dias atrás e fazer o deregister da mesma, ou seja, excluir as AMIs com mais de três dias de criação e depois remover o snapshot que é gerado automaticamente durante a criação da imagem que também tiver mais de 3 dias

Nas três primeiras vezes que o script rodar, ele irá gerar dois alertas de erro. Um ao rodar o comando ec2-deregister, pois irá procurar pelo arquivo com data de 3 dias atrás e não encontrará obviamente. E outro ao rodar o comando ec2-delete-snapshot, pois também não encontrará um arquivo criado há mais de três dias. Estes alertas você verá apenas se executar manualmente ou se verificar o log do crontab após a execução. Os alertas serão similar à estes:

```bash
Required parameter ‘AMI’ missing (-h for usage)
```

```bash
Required parameter ‘SNAPSHOT’ missing (-h for usage)
```

À partir do quarto dia, ele irá começar a encontrar os arquivos com data de 3 dias atrás e não apresentará mais o alerta.

<span style="color: #ff0000;">**\*\* Atualização \*\***</span>

Criei um outro script, usando a [AWS CLI](http://aws.amazon.com/cli/) ao invés da [CLI Tool](http://docs.aws.amazon.com/AWSEC2/latest/CommandLineReference/set-up-ec2-cli-linux.html) utilizada neste post.

A AWS CLI é uma ferramenta mais nova, e mais interessante de utilizar. No Amazon Linux, já vem instalado, e você pode configurar rodando o comando “aws configure” e informar seu Access Key, Secret Access Key e sua Região.

Uma vez com ele configurado, você pode utilizar este novo script abaixo. Note que nele, ao invés de gerar a AMI pelo nome dado à instância, por questões de controle e maior segurança, é feito pelo instance-id. Você pode salvar o script em /etc/cron.daily/create-ami, dar permissão de execução, e o próprio sistema operacional se encarrega de executá-lo uma vez ao dia:

```bash
#!/bin/bash

INSTANCEID=”$(curl http://169.254.169.254/latest/meta-data/instance-id 2&gt;/dev/null $$ echo)”

# Cria AMI  
/usr/local/bin/aws ec2 describe-instances –filter Name=instance-id,Values=$INSTANCEID | grep $INSTANCEID | /usr/bin/gawk ‘{print $8}’ | /usr/bin/gawk -v date=”$(date +”%d-%m-%Y”)” ‘{print $1,”–name”,$1,”_”,date,”–no-reboot”}’ | /usr/bin/gawk ‘{print $1,$2,$3 $4 $5,$6 $7}’ | /usr/bin/xargs -L 1 /usr/local/bin/aws ec2 create-image –instance-id

# Remove AMI com mais de 3 dias  
/usr/local/bin/aws ec2 describe-images | grep $INSTANCEID\_$(date –date=’3 days ago’ ‘+%d-%m-%Y’) | /usr/bin/gawk ‘{print $4}’ | /usr/bin/xargs -L 1 /usr/local/bin/aws ec2 deregister-image –image-id

# Remove Snapshots criados há mais de 3 dias  
/usr/local/bin/aws ec2 describe-snapshots | grep $INSTANCEID | /usr/bin/gawk ‘{print $12″_”$13}’ | /usr/bin/gawk -F T ‘{print $1}’ | grep “$(date –date=’3 days ago’ ‘+%Y-%m-%d’)” | awk -F _ ‘{print $1}’ | /usr/bin/xargs -L 1 /usr/local/bin/aws ec2 delete-snapshot –snapshot-id  
```
