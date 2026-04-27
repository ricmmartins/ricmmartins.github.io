---
slug: "aws-criando-ami-da-sua-instancia-usando-o-data-pipeline"
title: 'AWS: Criando AMI da sua instância usando o Data Pipeline'
date: '2015-02-24T21:38:37-05:00'
tags:
    - aws
    - cloud
categories:
    - AWS
description: "Depois do post demonstrando como criar uma AMI da sua instância utilizando um script shell de dentro de um bastion host (), neste post vou mostrar como"
---

Depois do post demonstrando como criar uma AMI da sua instância utilizando um script shell de dentro de um bastion host (<http://www.ricardomartins.com.br/aws-script-para-geracao-automatica-de-ami-de-instancia/>), neste post vou mostrar como utilizar o DataPipeline para fazer a mesma tarefa. O [Data Pipeline](http://aws.amazon.com/datapipeline/) é um serviço web que ajuda na automação de atividades de movimentação, integração e processamento de dados entre os recursos de computação e storage.

Em resumo o que faremos será criar um Pipeline que irá rodar os comandos necessários dentro do agendamento escolhido. Para isso o Data Pipeline irá iniciar uma instância t1.micro para executar o que definirmos e ao término ele irá terminar a instância. Com isto, você elimina por exemplo a necessidade de manter uma instância ligada 24 horas por dia apenas para executar scripts e/ou tarefas administrativas, reduzindo custos e automatizando tarefas. Basta você criar os scripts e configurar o Data Pipeline para executar nos horários determinados. Assim, você irá pagar apenas pela quantidade de horas que a instância estiver ligada para rodar os scripts. Levando em consideração que a execução é muito rápida e seus scripts rodariam em alguns poucos minutos, como é cobrada a hora cheia, digamos que você pagaria apenas pelo preço de uma hora de uma instância t1.micro.

Então vá ao menu, selecione o Data Pipeline e vamos criar nosso Pipeline. Escolha um nome e uma descrição e no campo “source” escolha a opção: Build using a template – Run AWS CLI command.

No campo de Parâmetros, em AWS CLI command informe a seguinte linha de comando:  
```bash
/opt/aws/bin/ec2-describe-instances –aws-access-key [sua-access-key] –aws-secret-key [sua-secret-key] –filter tag:Name=”[nome-da-sua-instancia]” | /bin/sed -e ‘/^INSTANCE/d’ -e ‘/^BLOCK/d’ -e ‘/^RESERVATION/d’ -e ‘/Description/d’ | /usr/bin/gawk ‘{ print $3,$5 }’ | /usr/bin/tail -1 | /usr/bin/gawk -v date=”$(date +”%d-%m-%Y”)” ‘{print $1,”–name”,$2,”-“,date,”–no-reboot”}’ | /usr/bin/gawk ‘{print $1,$2,$3 $4 $5,$6 $7}’ | /usr/bin/xargs -L 1 ec2-create-image && /opt/aws/bin/ec2-describe-images –aws-access-key [sua-access-key] –aws-secret-key [sua-secret-key] –owner [id-da-sua-conta] | /bin/grep [nome-da-sua-instancia]-$(date –date=’3 days ago’ ‘+%d-%m-%Y’) | /usr/bin/gawk ‘{print $2}’ | /usr/bin/xargs -L 1 ec2-deregister && /opt/aws/bin/ec2-describe-snapshots –aws-access-key [sua-access-key] –aws-secret-key [sua-secret-key] | grep [instanceid] | /usr/bin/gawk ‘{print $2,$5}’ | /usr/bin/gawk -F T ‘{print $1}’ | grep “$(date –date=’3 days ago’ ‘+%Y-%m-%d’)” | awk -F ‘{print $1}’ | /usr/bin/xargs -L 1 /opt/aws/bin/ec2-delete-snapshot  
```

* Atente para trocar os campos entre colchetes (access-key, secret-key, nome da instância e id da conta) pelos seus. E no caso, não insira entre colchetes – eu coloquei entre colchetes apenas para exemplificar.

Na parte de agendamento, configure da seguinte maneira:

Run: on a schedule  
Run every: 1 day  
Starting: [Defina o horário que precisa que seja executado diariamente]  
Ending: [Escolha Never caso queira que seja executado constantemente]

Na parte de Pipeline Configuration você pode deixar habilitado ou não o registro em log das atividades. Caso escolha deixar habilitado, você precisa definir um bucket no S3 para isto.

Em Security/Access, você pode deixar em Default ou caso tenha criado suas próprias roles para o Pipeline e a isntância que será criada, escolha Custom.

Em seguida, clique em Activate.

Por padrão a instância que será criada será terminada depois de 50 minutos. Caso queira, você pode editar o pipeline e dentro de “Resources” escolher um tempo menor, porém lembre-se que mesmo colocando para que seja terminada por exemplo 30 minutos depois de criada, será cobrado o valor da hora inteira.

Feito isto, você pode ir ao EC2 Dashboard &gt; Images &gt; AMIs e verificar a AMI criada.

** Lembrando que o comando ec2-deregister irá procurar por AMIs criadas há 3 dias atrás, então caso seja a primeira vez que você execute irá encontrar uma mensagem de erro como esta: Required parameter ‘AMI’ missing (-h for usage). Ela é gerada pois não encontrará nenhum arquivo criado há 3 dias atrás para remover. No entanto, isto não impede o funcionamento e da quarta vez que rodar em diante, irá encontrar o arquivo e não vai mais apresentar o erro.

Veja abaixo o vídeo de demonstração:

<iframe allow="autoplay; encrypted-media" allowfullscreen="" frameborder="0" height="281" loading="lazy" src="https://www.youtube.com/embed/-xmyqZDga68?feature=oembed" width="500"></iframe>
