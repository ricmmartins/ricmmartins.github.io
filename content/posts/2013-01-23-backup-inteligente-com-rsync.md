---
slug: "backup-inteligente-com-rsync"
title: 'Backup inteligente com RSync'
date: '2013-01-23T16:39:36-05:00'
tags:
    - backup
---

Existem milhares de scripts de backup por aí. Neste exemplo, eu vou mostrar como utilizar o rsync, para fazer backup do seu diretório /home em ou outro disco montado em /mnt/backup.

O [Rsync](http://en.wikipedia.org/wiki/Rsync) é uma ferramenta muito útil, extremamente flexível e com algumas características bem interessantes, como por exemplo:

– Verifica a integridade dos arquivos copiados;  
– Transfere apenas as diferenças dos arquivos (não transfere o arquivo inteiro, apenas os bits diferentes!);  
– Mantém cópias idênticas entre 2 diretórios distintos, apagando os “excessos”;  
– No caso de cópias remotas, pode usar compressão para diminuir o uso de banda;

Uma outra particularidade deste script é em relação à retenção do backup.

Utilizaremos a opção %u do comando date, para que o local de armazenamento do backup fique em uma pasta com o nome correspondente ao dia da semana em que foi criada.

Este parâmetro %u, utiliza uma numeração de 1 à 7 para cada dia da semana, sendo 1 para Domingo e assim por diante.

Neste exemplo, colocaremos o script em /etc/cron.daily, para que ele rode diariamente. Por padrão, o /etc/cron.daily é executado por padrão às 04:02 da manhã (confira no /etc/crontab – 02 4 \* \* \* root run-parts /etc/cron.daily)

Desta forma, quando o script rodar por exemplo, no domingo, ele vai armazenar o conteúdo em /mnt/backup/bkp_home/day-1. Assim , o backup será mantido até a próxima semana, quando ele rodar novamente e sobrescrever o conteúdo em mnt/backup/bkp_home/day-1, nos dando uma retenção de 7 dias.

A cada execução, é gerado um log da operação em /mnt/backup/logs, seguindo o mesmo padrão. Ou seja, em /mnt/backup/logs/day-1, estará o registro do backup realizado no Domingo, que só será sobrescrito no próximo domigo.

Vamos ao script:  

```bash
#!/bin/sh  
BKPHDMOUNT=”/mnt/backup”

if [ ! -d “$BKPHDMOUNT” ]; then  
echo “backup HD wasnt mounted”;  
exit 0;  
fi

date >> $BKPHDMOUNT/logs/backup_home.`date +day-%u`  
/usr/bin/rsync -av /home/ /mnt/backup/bkp_home/`date +day-%u` >> $BKPHDMOUNT/logs/backup_home.`date +day-%u` 2>&1
```

Explicando:

1. Primeiro, criamos a variável que aponta para /mnt/backup.

2. Em seguida temos um bloco com if, para verificar que realmente o HD esteja montado para evitar problemas. Caso não esteja montado, o script não é executado.

3. Escrevemos a data atual no arquivo de log salvo em /mnt/backup/logs/[dia-em-que-foi-executado]

4. Rodamos o Rsync. O parâmetro -v é para verbose, o -a é o modo de arquivamento. Se equivale às opções -rlptgoD. Para mais detalhes, #man rsync. No caso, estou fazendo backup do diretório /home para /mnt/backup/bkp_home/day-X, onde o X vai ser substituído pelo dia da semana em que rodou. Toda a operação é registrada no log em /mnt/backup/logs/backup_home.day-X.

Entendeu?! Qualquer dúvida entre em contato. Um abraço pessoal!
