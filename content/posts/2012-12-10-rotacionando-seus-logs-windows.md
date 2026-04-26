---
slug: "rotacionando-seus-logs-windows"
title: 'Rotacionando seus logs no Windows'
date: '2012-12-10T11:14:32-05:00'
tags:
    - windows
---

A dica de hoje é rápida: O que fazer com os logs de aplicativos que vivem lotando seu disco, mas que por outro lado você precisa tê-los armazenados por algum tempo?

Simples: Compacte tudo e envie para o S3 na Amazon de forma automatizada!

Para esta atividade, eu utilizarei duas ferramentas:

**– Forfiles:** uma ferramenta nativa em versões do Windows posteriores ao 7. Mais detalhes sobre ele, você encontra em um post antigo aqui do blog: <http://ricardomartins.com.br/2011/04/01/exluir-arquivos-com-mais-de-x-dias-de-idade/>

– **S3 Command Line Utility**: ferramenta para enviar arquivos para o S3 via linha de comando. Você encontra ele aqui: <http://s3.codeplex.com/>

Você vai precisar também de uma conta no Amazon S3, um bucket criado e um usuário com permissões neste bucket. Esta parte do S3 eu não vou entrar em detalhes sobre como fazer por enquanto, e vai ficar para um próximo post… 🙁

Neste exemplo eu utilizo aindo o 7Zip, um excelente compactador de arquivos opensource, que permite fazer tudo por linha de comando e ainda criar um arquivo.zip protegido por senha. Você pode pegar ele aqui: <http://www.7-zip.org/download.html>

Para isso criaremos um script.bat que faz tudo isso automaticamente em um horário agendado por você. Vamos ao script e no fim explico cada linha:

```bash
@ECHO OFF
SET LOGDIR=C:temp
hostname > tmpFile

SET /p LOGNAME= <tmpFile
del tmpFile
md %LOGDIR%Archive
For /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c%%b%%a)
For /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mm=%%a&set dd=%%b&set yyyy=%%c& (if "%%a:~0,1" gtr "9" set mm=%%b&setdd=%%c&set yyyy=%%d))
forfiles -p %LOGDIR% -d -7 -m *.svclog -c "cmd /c move *.svclog %LOGDIR%Archive"
cd %LOGDIR%Archive
"c:Program Files (x86)7-Zip7z.exe" a -pSENHA -tzip APPLOG_HOST_%LOGNAME%_%mydate%.zip *.svclog
del *.svclog
"C:Logrotates3.exe" auth AmazonAccesKeyID AmazonSecretAccessKey
"C:Logrotates3.exe" put BucketName/%yyyy%/ APPLOG_HOST_%LOGNAME%_%mydate%.zip
del APPLOG_HOST_%LOGNAME%_%mydate%.zip
```

Agora vou comentar as linhas do script…

**@echo off** : Esta linha faz com que o script execute tudo sem mostrar nada na tela. Bom para deixar o processo o mais transparente possível.

**SET LOGDIR=C:temp**: Aqui o diretório onde estão os logs gerados pela aplicação.

**hostname > tmpFile**: Aqui eu pego o nome da máquina e jogo em um arquivo chamado tmpFile

**SET /p LOGNAME= <tmpFile**: Aqui defino uma variável chamada LOGNAME com o conteúdo do arquivo tmpFile. No caso, o nome da máquina

**del tmpFile**: Deletando o arquivo tmpFile

**md %LOGDIR%Archive**: Criando um diretório chamado Archive, dentro do diretório dos logs da aplicação

**For /f “tokens=2-4 delims=/ ” %%a in (‘date /t’) do (set mydate=%%c%%b%%a)**: Pego a data corrente no formato AAAMMDD. Será usado no nome do arquivo compactado

**FOR /f “tokens=2-4 delims=/ ” %%a in (‘date /t’) do (set mm=%%a&set dd=%%b&set yyyy=%%c& (if “%%a:~0,1” gtr “9” set mm=%%b&setdd=%%c&set yyyy=%%d))**: Pego o ano corrente no formato AAAA. Sera usado para criar uma pasta no Bucket S3 com o nome do ano, para organizar o armazenamento dos logs

**forfiles -p %LOGDIR% -d -7 -m *.svclog -c “cmd /c move *.svclog %LOGDIR%Archive”**: Verificamos o diretório dos logs da aplicação em busca de arquivos com mais de 7 dias com a extensão *.svclog (No meu caso, é um log gerado pelo IIS). Ao encontrar estes arquivos, movemos eles para a pasta Archive.

**cd %LOGDIR%Archive**: Entrando na pasta Archive, no caso C:TempArchive

**“c:Program Files (x86)7-Zip7z.exe” a -pSENHA -tzip APPLOG_HOST_%LOGNAME%_%mydate%.zip *.svclog**: Como a transferência pode vir a não ser feita utilizando um canal criptografado e seguro, dependendo do grau de sigilo das informações contidas no log, recomento utilizar o 7zip para gerar um arquivo protegido por senha. Assim criamos um arquivo com a senha SENHA compactando todos os arquivos *.svclog. O arquivo gerado será chamado APPLOG_HOST_NOMEDAMAQUINA_DATACORRENTE.zip

Lembrando que a DATACORRENTE será no formato 20121210, ou seja Ano, Mês e Dia.

PS: Utilizei a senha SENHA para fins didáticos. É obvio que você precisa utilizar uma senha mais complexa. Eu costumo utilizar o KeePass para salvar senhas. Ele permite também gerar senhas complexas. Baixe aqui: <http://keepass.info/>

**del *.svclog**: Como já gerei o arquivo.zip, podemos então deletar os arquivos *.svclog

**“C:Logrotates3.exe” auth AmazonAccesKeyID AmazonSecretAccessKey**: Utilizamos o utilitário S3.exe, salvo dentro da pasta Logrotate, para autenticar o usuário que fará o envio dos arquivos para o bucket no S3. Substitua  **AmazonAccesKeyID e AmazonSecretAccessKey,** pelos gerados para o seu usuário. Observe que a autenticação é feita com o parâmetro **auth**

**“C:Logrotates3.exe” put BucketName/%yyyy%/ APPLOG_HOST%LOGNAME%%mydate%.zip**: Agora utilizamos o utilitário S3.exe para enviar o arquivo.zip para o nosso bucket. No caso substitua **BucketName** pelo nome do seu bucket. Observe a utilização da variável %YYYY%, citada acima para auxiliar na organização do armazenamento. Com ela, os arquivos serão enviados para uma pasta referente ao ano corrente dentro do bucket. Por exemplo Ricardo/2012, onde Ricardo é o nome do Bucket e 2012 a pasta referente ao ano, gerada pela variável %YYYY% definida na oitava linha do script.

Para facilitar a comrpeensão, um exemplo de como ficaria o path do arquivo no S3:

Ricardo/2012/APPLOG_HOST_SERVIDOR\20121210.zip

**del APPLOG_HOST_%LOGNAME%_%mydate%.zip**: Para finalizar, depois de enviar o arquivo para p S3, removemos ele do servidor.

Feito isso, basta criar uma tarefa agendada, para rodar este script com a conta de sistema em um horário específico. Temos ainda uma opção no S3, de expirar os arquivos depois de um período definido. No meu caso, preciso armazenar estes arquivos por um ano, então coloquei os arquivos para expirarem após 366 dias, o que fará com que eles sejam removidos após este período.

Por hoje é só pessoal!
