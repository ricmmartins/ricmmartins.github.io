---
slug: "guia-para-arquitetura-de-aplicacoes"
title: "Guia para Arquitetura de Aplicações"
date: '2023-11-14T08:20:00-05:00'
tags:
    - azure
    - cloud
    - arquitetura
---

Se você estiver desenvolvendo seus aplicativos nativos em nuvem, recomendo fortemente que você consulte este guia mesmo que não esteja usando Azure especificamente.

## Estilos de arquitetura

- [N-tier: divide um aplicativo em camadas lógicas e camadas físicas](https://learn.microsoft.com/pt-br/azure/architecture/guide/architecture-styles/n-tier)
- [Web-queue-worker: frontend e backend dissociados por mensagens assíncronas](https://learn.microsoft.com/pt-br/azure/architecture/guide/architecture-styles/web-queue-worker)
- [Microserviços: serviços funcionalmente decompostos que chamam uns aos outros por meio de APIs](https://learn.microsoft.com/pt-br/azure/architecture/guide/architecture-styles/microservices)
- [Arquitetura orientada a eventos: produtor/consumidor. Visão independente por subsistema](https://learn.microsoft.com/pt-br/azure/architecture/guide/architecture-styles/event-driven)
- [Big data: divida um enorme conjunto de dados em pequenos pedaços. Processamento paralelo em datasets locais](https://learn.microsoft.com/pt-br/azure/architecture/guide/architecture-styles/big-data)
- [Big compute: alocação de dados para milhares de núcleos](https://learn.microsoft.com/pt-br/azure/architecture/guide/architecture-styles/big-compute)

## Escolhas tecnológicas

- [Escolha do serviço de computação](https://learn.microsoft.com/pt-br/azure/architecture/guide/technology-choices/compute-decision-tree)
- [Escolha do serviço de armazenamento de dados](https://learn.microsoft.com/pt-br/azure/architecture/guide/technology-choices/data-store-overview)
- [Escolha do serviço de mensagens assíncronas](https://learn.microsoft.com/pt-br/azure/architecture/guide/technology-choices/messaging)

## Design da arquitetura

- [Arquiteturas de referência: Cada arquitetura de referência inclui práticas recomendadas, juntamente com considerações sobre escalabilidade, disponibilidade, segurança, resiliência e outros aspectos do design](https://learn.microsoft.com/pt-br/azure/architecture/browse/)
- [Princípios de design: 10 princípios de design de alto nível que tornarão seu aplicativo mais escalonável, resiliente e gerenciável](https://learn.microsoft.com/pt-br/azure/architecture/guide/design-principles/)
- [Padrões de design: Esses padrões de design são úteis para construir aplicativos confiáveis, escaláveis e seguros na nuvem](https://learn.microsoft.com/pt-br/azure/architecture/patterns/)
- [Práticas recomendadas: abrangem diversas considerações de design, incluindo design de API, escalonamento automático, particionamento de dados, armazenamento em cache e assim por diante.](https://learn.microsoft.com/pt-br/azure/architecture/best-practices/api-design)
- [Melhores práticas de segurança: descreva como garantir que a confidencialidade, integridade e disponibilidade da sua aplicação não sejam comprometidas por agentes mal-intencionados.](https://learn.microsoft.com/pt-br/security/zero-trust/deploy/applications)

## Pilares de qualidade

 - [Microsoft Azure Well-Architected Framework](https://learn.microsoft.com/pt-br/azure/well-architected/)
  
 ## Mais detalhes

 - [Conceitos básicos de arquitetura de aplicações](https://learn.microsoft.com/pt-br/azure/architecture/guide/)

<img src="/assets/images/arquitetura.png" alt="image" width="50%" height="auto">
