---
slug: "backup-de-mysql-no-azure-storage"
title: 'Backup de MySQL no Azure Storage'
date: '2016-10-24T14:22:23-04:00'
tags:
    - azure
    - storage
    - mysql
    - backup
description: "Post rápido mostrando como fazer o backup dos databases de um servidor MySQL em um blob storage no Azure."
cover:
  image: "/og/backup-de-mysql-no-azure-storage.png"
  alt: ""
  hidden: true
---

Post rápido mostrando como fazer o backup dos databases de um servidor MySQL em um blob storage no Azure.

O primeiro passo é desabilitar que o mysqldump solicite senha, e você deve fazer isto editando o arquivo my.cnf adicionando as seguintes linhas:

```bash
[mysqldump]
user=mysqluser
password=secret
```

*\* Substitua os valores mysqluser e secret pelo seu usuário e senha do mysql*

Em seguida instale o Azure CLI:

Neste caso, como usei CentOS, estou usando o yum para realizar a instalação. Caso prefira outra distribuição como Ubuntu por exemplo, utilize o apt-get.

```bash
rmartins@lab:~$ yum install nodejs
rmartins@lab:~$ install azure-cli -g
```

Agora vamos criar o script bkpmysql.sh. Eu vou criá-lo em /home/user/bkpmysql/bkpmysql.sh

```bash
#!/bin/sh

mkdir /home/user/bkpmysql/backups
export BACKUP_FILE=/home/user/bkpmysql/backups/db-backup.sql.gz
export DATABASE_SCHEMA_NAME=--all-databases
export AZURE_CONTAINER=YOUR_VALUE_HERE
export AZURE_STORAGE_NAME=YOUR_VALUE_HERE
export AZURE_KEY='YOUR_VALUE_HERE'
export AZURE_BLOB_NAME=db-production-$(date +%Y%m%d%H%M%S).sql.gz

/bin/mysqldump $DATABASE_SCHEMA_NAME > temp.sql
gzip temp.sql
rm -rf $BACKUP_FILE
mv temp.sql.gz $BACKUP_FILE
azure storage blob upload --container $AZURE_CONTAINER -f $BACKUP_FILE -b $AZURE_BLOB_NAME  -a $AZURE_STORAGE_NAME -k $AZURE_KEY
```

Por fim vamos dar permissão de execução no script e configurá-lo no cron para rodar diariamente às 00:00:

```bash
rmartins@lab:~$ chmod 755 /home/user/bkpmysql/bkpmysql.sh
rmartins@lab:~$ (crontab -l ; echo "0 0 * * * /home/user/bkpmysql/bkpmysql.sh") | sort - | uniq - | crontab -
```
