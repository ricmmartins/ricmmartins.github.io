---
title: "AI on Azure: uma série em cinco partes para ajudar a escolher sua arquitetura"
slug: ai-no-azure-serie
description: "Publiquei uma série de cinco artigos no Startups at Microsoft sobre IA no Azure, de modelos hospedados e plataformas para apps até ML gerenciado e infraestrutura com GPUs."
summary: "Preciso treinar um modelo? Quais serviços do Azure usar? Um guia de leitura para os cinco artigos da minha nova série AI on Azure."
date: 2026-10-30
draft: false
categories:
  - Azure
  - AI
tags:
  - microsoft-foundry
  - azure-machine-learning
  - generative-ai
  - ai-agents
  - gpu
  - aks
translationKey: ai-on-azure-series
---

Acabei de publicar **AI on Azure**, uma série de cinco artigos no blog [Startups at Microsoft](https://techcommunity.microsoft.com/blog/startupsatmicrosoftblog).

Escrevi para desenvolvedores e times de engenharia que estão tentando responder perguntas como: precisamos treinar ou fazer fine-tuning de um modelo? Quais serviços usar para construir a aplicação? Quanto da infraestrutura faz sentido operar por conta própria?

Cada pergunta leva a uma decisão diferente. Consumir um modelo por API, construir um agente e executar um job de treinamento envolvem partes distintas do sistema. Organizei a série por essas camadas para ajudar a comparar as opções e entender o que fica sob responsabilidade do time.

Os cinco artigos originais estão em inglês. Abaixo, explico o que você encontra em cada um e por onde começar.

## 1. Comece pelos conceitos

[AI on Azure 101: training, fine-tuning, inference, and where everything lives](https://techcommunity.microsoft.com/blog/startupsatmicrosoftblog/ai-on-azure-101-training-fine-tuning-inference-and-where-everything-lives/4569066/)

O primeiro artigo explica treinamento e inferência, onde entra o fine-tuning e como prompting e retrieval diferem de alterar os pesos de um modelo. Uma aplicação fictícia de suporte conecta os conceitos: um modelo preditivo classifica a prioridade dos tickets, enquanto um modelo de linguagem ajuda a redigir respostas.

Também mostro onde Microsoft Foundry, Fireworks on Foundry e Azure Machine Learning entram na estrutura de recursos do Azure. É o ponto de partida para quem já ouviu os nomes dos serviços, mas ainda tem dúvidas sobre a função de cada um.

## 2. Escolha um modelo hospedado

[AI on Azure: models as a service](https://techcommunity.microsoft.com/blog/startupsatmicrosoftblog/ai-on-azure-models-as-a-service/4569083/)

Usar uma API de modelo ainda exige decidir quem hospeda a inferência, onde os requests são processados e quais termos se aplicam. Esta parte cobre as opções de modelos hospedados no Microsoft Foundry e os tipos de deployment que afetam capacidade e cobrança.

Leia se você quer consumir um modelo sem operar a infraestrutura de GPUs que atende as requisições. O artigo também explica o que continua com o time, incluindo avaliação, controle de acesso, planejamento de quotas e custos da aplicação.

## 3. Construa a aplicação ao redor do modelo

[AI on Azure: platforms for apps and agents](https://techcommunity.microsoft.com/blog/startupsatmicrosoftblog/ai-on-azure-platforms-for-apps-and-agents/4569086/)

O endpoint do modelo é um componente. A aplicação também pode precisar de busca, ferramentas, identidade e avaliação dos resultados.

Aqui explico como os serviços se combinam, incluindo Foundry Agent Service, Microsoft Agent Framework e Azure AI Search. Também discuto quando um fluxo determinístico resolve o problema e quando vale considerar um agente.

## 4. Treine e sirva modelos com plataformas gerenciadas

[AI on Azure: managed ML](https://techcommunity.microsoft.com/blog/startupsatmicrosoftblog/ai-on-azure-managed-ml/4569087/)

Para quem precisa de treinamento customizado ou adaptação de modelos, esta parte compara os papéis de Azure Machine Learning, fine-tuning e managed compute no Foundry, Azure Databricks, Microsoft Fabric Data Science e Anyscale no Azure.

Treinar e servir um modelo são decisões separadas. O artigo mostra quais etapas do ciclo de vida cada plataforma gerencia e quais responsabilidades continuam com o time.

## 5. Entenda quando operar a própria infraestrutura

[AI on Azure: when you own the infrastructure](https://techcommunity.microsoft.com/blog/startupsatmicrosoftblog/ai-on-azure-when-you-own-the-infrastructure/4569089)

A última parte trata dos workloads que precisam de controle sobre o hardware de GPU ou a stack de inferência. Cobre VMs com GPU, Kubernetes, Ray e planejamento de capacidade, além do trabalho operacional que acompanha essas escolhas.

É a leitura para quando você precisa escolher runtime, scheduler, rede ou storage por conta própria. Uma família de VMs e um framework de execução distribuída resolvem problemas diferentes; organizei as opções pelo papel de cada uma.

## Por onde começar

Se você está começando com IA no Azure, siga a ordem a partir da [parte 1](https://techcommunity.microsoft.com/blog/startupsatmicrosoftblog/ai-on-azure-101-training-fine-tuning-inference-and-where-everything-lives/4569066/). Se já tem um projeto, entre pela camada que precisa decidir: inferência hospedada na parte 2, aplicação na parte 3, ML customizado na parte 4 ou infraestrutura na parte 5.

Os artigos trazem links para a documentação e identificam recursos em preview. Disponibilidade de modelos, regiões e termos de suporte mudam, então confira a documentação atual antes de fechar uma arquitetura de produção.

A série também está na página de [Projetos](/projetos/), junto das outras publicações, e no [Activity Log](https://github.com/ricmmartins/activitylog).

[Read this post in English](https://rmmartins.com/ai-on-azure-series/).
