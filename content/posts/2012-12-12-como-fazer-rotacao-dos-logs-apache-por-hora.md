---
slug: "como-fazer-rotacao-dos-logs-apache-por-hora"
title: 'Como fazer rotação dos logs do Apache por hora?'
date: '2012-12-12T11:27:12-05:00'
tags:
    - apache
    - linux
description: "Então você tem um servidor com Apache instalado gerando centenas de MB para lotar seu disco, certo? Vamos lá…"
---

Então você tem um servidor com Apache instalado gerando centenas de MB para lotar seu disco, certo? Vamos lá…

Depois de muita pesquisa, não consegui usar o logrotate para fazer a rotação dos logs de hora em hora. Desconfio que não faça mesmo a rotação de arquivos de log por hora, então implementei outra solução que vou compartilhar aqui com vocês

Criei um script que é executado de hora em hora pelo cron. Para isto basta criá-lo em /etc/cron.hourly.  

```bash
[ricardo@martins]# vim /etc/cron.hourly/httpd_log_archive
```

Abaixo o conteúdo do script:  

```bash
#!/bin/bash  
cd /var/log/httpd  
mv *.log* ./archive/  
touch access.log  
touch error.log  
touch ssl_access.log  
touch ssl_error.log  
touch ssl_request.log  
service httpd reload  
cd /var/log/httpd/archive  
mv -f access.log access.log.`date +%Y-%m-%d_%H`  
mv -f error.log error.log.`date +%Y-%m-%d_%H`  
mv -f ssl_access.log ssl_access.log.`date +%Y-%m-%d_%H`  
mv -f ssl_error.log ssl_error.log.`date +%Y-%m-%d_%H`  
mv -f ssl_request.log ssl_request.log.`date +%Y-%m-%d_%H`  
gzip *.`date +%Y-%m-%d_%H`

for lista in `find /var/log/httpd/archive -mtime +30`; do  
rm -rf ${lista}  
done
```

Em seguida, permissões de execução nele!  

```bash
[ricardo@martins]# chmod a+x /etc/cron.hourly/httpd_log_archive
```
E por fim, criamos o diretório de trabalho do script, onde ele armazenará os arquivos para rodar os comandos do script:  

```bash
[ricardo@martins]# mkdir /var/log/httpd/archive
```

Agora vamos explicar o funcionamento do script. Cada número representa a linha do script:

1. Primeira linha de todo script shell, indicando que deve ser executado pelo bash  
2. Vamos até o diretório dos arquivos de log  
3. Movemos todos os arquivos *.log* para o diretório /var/log/archive  
4. Recriamos o arquivo access.log  
5. Recriamos o arquivo error.log  
6. Recriamos o arquivo ssl_access.log  
7. Recriamos o arquivo ssl_error.log  
8. Recriamos o arquivo ssl_request.log  
9. Recarregamos as configurações do Apache para forçar a começar a escrever o log nestes novos arquivos  
10. Vamos até o diretório de trabalho do script  
11. Renomeando o arquivo access.log para inserir a data e hora de execução do script. No caso, ficaria access.log.2012-12-12_09, informando que foi executado No ano de 2012, mês 12, dia 12, às 09 horas da manhã.  
12. Renomeando o arquivo error.log …  
13. Renomeando o arquivo ssl_access …  
14. Renomeando o arquivo ssl_error.log …  
15. Renomeando o arquivo ssl_request.log …  
16. Compactando com o gzip todos os arquivos acrescentando no final do nome a data e hora de execução do script. Por exemplo, ficaria assim: access.log.2012-12-12_09.gz  
17. Criando uma lista dos arquivos existente neste diretório com mais de 30 dias e armazenando na variável “lista”  
18. Apaga todos os arquivos contidos na variável “lista”.  
19. Sair do For e finaliza o script.

Pronto!
