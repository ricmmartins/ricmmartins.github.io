---
slug: "porque-utilizar-os-servicos-aws"
title: 'Porque utilizar os serviços AWS?'
date: '2013-05-07T09:55:23-04:00'
tags:
    - aws
    - cloud
---

Recentemente estive conversando com um amigo sobre como motivar clientes para migrar para AWS. Como é um assunto interessante e muita gente pode ter interesse, montei este post, descrevendo algumas das principais vantagens.

Mas primeiro, para começar a explicar sobre AWS, você precisa compreender o que é **computação em nuvem**.

## E o que vem a ser Cloud Computing?

Segundo a Gartner, “**Cloud Computing** é um estilo de computação onde capacidades de escalabilidade e elasticidade são fornecidos aos clientes como um serviço usando tecnologias de Internet.”

Esses serviços, são recursos que incluem o poder de computação, armazenamento, banco de dados, mensagens entre outros.

Superficialmente, a cloud computing se assemelha a tendência de terceirização de negócios, pois fornece os benefícios aproveitando a experiência dos outros. No entanto, a computação em nuvem também fornece flexibilidade, escalabilidade, elasticidade e confiabilidade.

Um dos benefícios chave da computação em nuvem é a oportunidade de substituir diretamente gastos com a infraestrutura principal por preços variáveis baixos, que se ajustam de acordo com sua empresa. Com a Nuvem, as empresas não precisam mais planejar ou adquirir servidores, assim como outras infraestruturas de TI, com semanas ou meses de antecedência. Em vez disso, podem instantaneamente rodar centenas de milhares de servidores em minutos e oferecer resultados mais rapidamente.

Atualmente, a Amazon Web Services oferece na nuvem uma plataforma de infraestrutura altamente confiável, escalável e de baixo custo que potencializa centenas de milhares de empresas em 190 países ao redor do mundo.

## Principais características:

**– Flexibilidade:** A AWS é uma plataforma e um sistema operacional de linguagem independente. Você escolhe a plataforma de desenvolvimento ou o modelo de programação que faz mais sentido para o seu negócio. Você pode escolher os serviços que deseja usar, um ou vários, e escolher como usá-los. Essa flexibilidade permite que você se concentre na inovação, não na infraestrutura. Um ótimo documento com informações mais detalhadas, você encontra aqui:[ http://d36cz9buwru1tt.cloudfront.net/AWS\_Overview.pdf](< http://d36cz9buwru1tt.cloudfront.net/AWS_Overview.pdf>)

**– Custo Benefício:** Você paga apenas pelo que usa. Sem pagamentos iniciais, a longo prazo ou contratos. Visite este link para mais detalhes: <http://aws.amazon.com/pt/economics/>

**– Escalabilidade e Elasticidade**: Você pode adicionar ou remover os recursos para as suas aplicações de acordo com a sua demanda. Se você precisa de um servidor virtual ou de dezenas, se precisa deles por algumas horas ou todos os dias, ainda assim você só paga pelo que utiliza. Imagine levantar 20 sergidores em 30 segundos? E encerrar todos eles instantaneamente quando não necessitar mais? Na Amazon você pode. Confira: <http://aws.amazon.com/pt/architecture/>

**– Velocidade de Implantação:** Se você já foi cliente de algum serviço de hospedagem, sabe muito bem o que é essa dor. Geralmente podem levar de 2 a 12 horas para entregar seu servidor. Depois disso você ainda tem que passar algumas horas fazendo seus ajustes finos, tunning’s, testes… A AWS diminui este tempo para minutos. Se você utilizar o recurso de AMI (Amazon Machine Images) você pode ter uma máquina implantade e acessível em cerca de 5 minutos ou menos.

**– Performance:** Não há como negar a velocidade da AWS. Unidades computacionais do EC2 proporcionam um desempenho da classe de processadores Xeon e você paga um valor mínimo por hora de uso. A confiabilidade é melhor do que os data centers mais privados do mundo, e se houver um problema, você é geralmente permanece online, ainda que com capacidade reduzida.

Um grande exemplo disso é a recente “queda” que aconteceu no cluster AWS da Virginia do Norte, em um dos farms de servidores primários da Amazon nos EUA. Isso afetou Reddit, WordPress.com, e vários outros grandes sites. Estes sites permaneceram on-line, ainda que em espécie de “read-only”, pois a Amazon teve que desabilitar a escrita nos storages de backend até que pudessem resolver o problema.

Em um ambiente de hospedagem tradicional, isso provavelmente significaria diversos erros de inatividade e páginas 404. Mas em um ambiente realmente “cloud-hosted” como AWS, não há separação suficiente entre o processamento e armazenamento, o que permite que os sites possam permanecer on-line e gerando receita, mesmo com funcionalidade reduzida.

Mas o grande poder de desempenho da AWS é na armazenagem. A natureza distribuída da EBS e S3 produzem milhões operações de entrada/saída por segundo para todas as instâncias. Pense nisso como um RAID de discos SSDs conectados a um computador particular. Adicione uma largura de banda incrível, e você terá um sistema de armazenamento com grande capacidade de escalabilidade, com a confiabilidade de 99,999999999%.

**– Segurança:** Com o intuito de prover segurança e privacidade fim a fim, a AWS disponibiliza serviços de acordo com as melhores práticas de segurança. É uma plataforma de tecnologia segura, durável com auditorias e certificações reconhecidas pelo setor: PCI DSS nível 1, ISO 27001, FISMA Moderado, HIPAA e SSAE 16. Os datacenters e centros de serviços têm várias camadas de segurança física e operacional para garantir a integridade e a segurança dos dados. Conheça: <http://aws.amazon.com/pt/security/>

**– Experiência:** A Amazon possui mais de 15 anos de experêencia no fornecimento em larga escala de infraestrutura mundial, de forma segura e confiável.

## Algumas das soluções AWS

**– Hospedagem de aplicativos:** Use uma infraestrutura On Demand e confiável para potencializar seus aplicativos, desde aplicativos internos hospedados a ofertas de Software como serviço.

**– Backup e armazenamento:** Armazene dados e crie soluções de backup confiáveis usando os serviços de armazenamento de dados da AWS a um custo acessível.

**– Distribuição de conteúdo:** Distribua conteúdo de modo rápido e fácil para usuários finais de todo o mundo, a custos baixos e altas velocidades de transferência de dados.

**– Hospedagem Web:** Satisfaça suas necessidades de hospedagem de páginas de web dinâmicas com a plataforma de infraestrutura escalável da AWS.

**– TI Corporativa:** Hospede aplicativos de TI internos ou externos no ambiente seguro da AWS.

**– Bancos de dados:** Aproveite as vantagens de uma variedade de soluções de banco de dados escaláveis, desde software de banco de dados empresarial hospedado até soluções de banco de dados não relacional.

Para acompanhar as novidades, acompanhe o blog: <http://aws.typepad.com/>, o fórum: <https://forums.aws.amazon.com/index.jspa> e o site AWS Hub, uma iniciativa nacional, que reúne uma boa documentação sobre os serviços AWS: <http://awshub.com.br/>

Você pode também dar uma olhada neste excelente infográfico produzido pela Udemy: <https://www.udemy.com/aws-certified-solutions-architect/#beginner-guide>. Ele traz alguns dados muito interessantes sobre o uso da AWS, dentre eles:

- O investimento global de marketing com computação em nuvem para os próximos 10 anos é estimado em 200 bilhões de dólares
- 1 a cada 3 internautas visitam sites rodando na AWS todos os dias
- Nos EUA, a cada 3 pessoas, pelo menos 2 já ouviram falar de AWS
