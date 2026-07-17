---
slug: "reinforcement-learning-o-que-e-e-por-que-importa-pra-llms"
aliases:
  - "/posts/reinforcement-learning-o-que-e-e-por-que-importa-pra-llms/"
title: "Reinforcement learning: o que é e por que importa pra LLMs"
description: "Como reward functions e feedback humano transformam um modelo de linguagem bruto num assistente que responde com educação. RL explicado pra quem entende de sistemas."
date: 2026-06-26T10:00:00-04:00
categories:
  - AI
  - Arquitetura
tags:
  - ai-engineering
  - reinforcement-learning
  - rlhf
  - treinamento
series:
  - "AI por dentro: de tokens a agents"
---

Segunda-feira, 9h. Você pede pro chatbot um resumo do incidente da madrugada. Ele responde com educação, parece confiante e ainda improvisa quando não sabe. Esse comportamento não aparece por acaso: um modelo base sem alignment só completa texto estatisticamente provável.

**tl;dr:** Reward, policy, RLHF e DPO ajudam a explicar por que um LLM ajustado parece prestativo, verboso ou confiante demais. Se você entende esse pipeline, entende melhor o comportamento do modelo em produção.

Uma parte grande dessa virada vem de **supervised fine-tuning** e depois de **otimização por preferências**, como RLHF e DPO. É isso que empurra o modelo na direção de respostas mais úteis e alinhadas ao que humanos preferem.

## O mapa pro profissional de infra

| Conceito RL | O que faz | Equivalente em infra |
|-------------|-----------|---------------------|
| **Agent** | Quem toma ações | O autoscaler, o controller |
| **Environment** | Onde as ações acontecem | O cluster, a infra |
| **Reward** | Feedback numérico (bom/ruim) | Métricas (latência, custo, uptime) |
| **Policy** | Estratégia de decisão | Regras do autoscaler (quando escalar, quanto) |
| **Episode** | Uma sequência completa de ações | Um ciclo de scaling (scale up → observa → scale down) |
| **Exploration vs Exploitation** | Tentar coisas novas vs usar o que funciona | Canary deploy vs stable release |

## Reinforcement learning em 5 minutos

RL é uma das três formas de machine learning. As outras duas são:

- **Supervised learning**: você dá exemplos com resposta certa. "Essa imagem é um gato." O modelo aprende a mapear input → output.
- **Unsupervised learning**: você dá dados sem rótulo. O modelo encontra padrões sozinho. Clustering, por exemplo.
- **Reinforcement learning**: o modelo aprende tentando coisas e recebendo feedback. Sem exemplos explícitos da "resposta certa".

A analogia clássica é treinar um cachorro. Você não explica em português pro cachorro o que é "sentar". Você espera ele sentar, dá um petisco (reward positivo), e repete. Com o tempo, ele aprende que sentar = petisco.

RL funciona assim:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 220" width="100%" style="max-width: 100%; height: auto;" role="img" aria-labelledby="rl-loop-title">
<title id="rl-loop-title">Diagrama do loop básico de reinforcement learning</title>
<defs>
<marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
<path d="M0,0 L0,6 L9,3 z" fill="#666666" />
</marker>
</defs>
<g font-family="Segoe UI, Arial, sans-serif">
<rect x="70" y="70" width="150" height="70" rx="8" fill="#dae8fc" stroke="#6c8ebf" />
<text x="145" y="109" font-size="14" font-weight="bold" text-anchor="middle" fill="#1a3a5c">Agent</text>
<rect x="410" y="55" width="180" height="100" rx="8" fill="#d5e8d4" stroke="#82b366" />
<text x="500" y="109" font-size="14" font-weight="bold" text-anchor="middle" fill="#1b5e20">Environment</text>
<line x1="226" y1="105" x2="416" y2="105" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
<text x="315" y="78" font-size="10" fill="#555" text-anchor="middle">ação</text>
<line x1="404" y1="105" x2="214" y2="105" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
<text x="315" y="156" font-size="10" fill="#555" text-anchor="middle">reward + novo estado</text>
</g>
</svg>

O agent observa o estado do environment, toma uma ação, recebe um reward (número positivo ou negativo), observa o novo estado, e repete. Com milhares de iterações, a policy (estratégia) converge pro comportamento que maximiza reward.

## Por que LLMs precisam de RL

O treinamento moderno de um LLM costuma ter três fases. A primeira é **self-supervised pre-training**, a segunda é **supervised fine-tuning (SFT)**, e a terceira usa **otimização por preferências** como RLHF ou DPO.

### Fase 1: Pre-training (self-supervised)

O modelo lê trilhões de tokens da internet e aprende a prever o próximo token. Resultado: um modelo que sabe completar frases, mas não sabe conversar. Se você perguntar "Qual a capital da França?", ele pode responder "Qual a capital da Alemanha? Qual a capital da Itália?" porque aprendeu que perguntas vêm em sequência.

Custo de infra: milhares de GPUs por semanas. É treino de frontier model, com conta enorme e dependente de hardware, eficiência e energia. Você não vai fazer isso.

### Fase 2: Supervised Fine-Tuning (SFT)

Humanos escrevem exemplos de conversas corretas. "Pergunta: X. Resposta ideal: Y." O modelo aprende o formato de assistente.

Custo de infra: dezenas de GPUs por dias. Ainda é caro o bastante pra virar projeto, não experimento, e a conta varia bastante com batch, contexto e se você usa LoRA ou QLoRA.

### Fase 3: RLHF (Reinforcement Learning from Human Feedback)

É aqui que o comportamento muda de verdade. O processo:

1. O modelo gera múltiplas respostas pra mesma pergunta
2. Humanos ranqueiam as respostas (qual é melhor, qual é pior)
3. Um "reward model" é treinado nessas preferências humanas
4. O LLM é otimizado via RL pra maximizar o score do reward model

```
Pergunta: "Como deletar um namespace no Kubernetes?"

Resposta A: "kubectl delete namespace meu-ns"
Resposta B: "Para deletar um namespace, utilize o comando kubectl..."
Resposta C: "rm -rf /" (claramente ruim)

Humano rankeia: B > A > C
Reward model aprende: respostas com explicação > respostas secas > respostas perigosas
```

O resultado é um modelo que aprende preferências humanas sem que ninguém precise escrever a "resposta perfeita" pra cada pergunta possível.

## RLHF na prática: o pipeline

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 860 350" width="100%" style="max-width: 100%; height: auto;" role="img" aria-labelledby="rlhf-title">
<title id="rlhf-title">Diagrama do pipeline clássico de RLHF</title>
<defs>
<marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
<path d="M0,0 L0,6 L9,3 z" fill="#666666" />
</marker>
</defs>
<g font-family="Segoe UI, Arial, sans-serif">
<rect x="40" y="40" width="170" height="64" rx="8" fill="#dae8fc" stroke="#6c8ebf" />
<text x="125" y="68.5" font-size="12" font-weight="bold" text-anchor="middle" fill="#1a3a5c">LLM base</text>
<text x="125" y="83.5" font-size="10" fill="#555" text-anchor="middle">(SFT)</text>
<rect x="600" y="40" width="190" height="64" rx="8" fill="#fff2cc" stroke="#d6b656" />
<text x="695" y="76" font-size="12" font-weight="bold" text-anchor="middle" fill="#7c6200">Comparações humanas</text>
<rect x="595" y="145" width="200" height="58" rx="8" fill="#d5e8d4" stroke="#82b366" />
<text x="695" y="185.5" font-size="12" font-weight="bold" text-anchor="middle" fill="#1b5e20">Reward Model</text>
<rect x="580" y="250" width="230" height="64" rx="8" fill="#e1d5e7" stroke="#9673a6" />
<text x="695" y="286" font-size="12" font-weight="bold" text-anchor="middle" fill="#4a235a">PPO</text>
<text x="695" y="301" font-size="10" fill="#555" text-anchor="middle">(algoritmo)</text>
<rect x="40" y="250" width="180" height="64" rx="8" fill="#d5e8d4" stroke="#82b366" />
<text x="130" y="278.5" font-size="12" font-weight="bold" text-anchor="middle" fill="#1b5e20">LLM final</text>
<text x="130" y="293.5" font-size="10" fill="#555" text-anchor="middle">(aligned)</text>
<line x1="216" y1="72" x2="606" y2="72" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
<text x="405" y="58" font-size="10" fill="#555" text-anchor="middle">gera respostas</text>
<line x1="695" y1="110" x2="695" y2="151" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
<text x="695" y="170.5" font-size="10" fill="#555" text-anchor="middle">treina</text>
<line x1="695" y1="209" x2="695" y2="256" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
<text x="695" y="271" font-size="10" fill="#555" text-anchor="middle">score</text>
<line x1="574" y1="282" x2="214" y2="282" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
<text x="400" y="268" font-size="10" fill="#555" text-anchor="middle">otimiza policy</text>
</g>
</svg>

**PPO (Proximal Policy Optimization)** é o algoritmo mais associado ao pipeline clássico de RLHF. Ele atualiza a policy em passos pequenos, usando clipping e, no setup tradicional de RLHF, uma penalidade de KL pra não deixar o modelo se afastar demais do comportamento de referência. Pensa num rollout controlado, não num deploy que troca tudo de uma vez.

**DPO (Direct Preference Optimization)** simplifica esse desenho. Em vez de treinar um reward model explícito e depois rodar PPO, ele aprende direto a partir de pares de preferência. Menos moving parts, menos infra, e na prática funciona bem em muita coisa.

## Reward hacking: quando RL dá errado

Lembra quando você configurou um autoscaler baseado em CPU e ele ficou oscilando entre scale-up e scale-down a cada 30 segundos? Isso é essencialmente o mesmo problema de reward hacking em RL.

Se o reward model tem uma falha, o LLM vai explorar essa falha. Exemplos reais:

- Reward model dá score alto pra respostas longas → modelo gera texto verboso e repetitivo
- Reward model valoriza "parecer confiante" → modelo inventa fatos com certeza absoluta (hallucination)
- Reward model penaliza respostas curtas → modelo nunca diz "não sei"

Isso é exatamente o que acontece com qualquer sistema de otimização. Se sua métrica de SLA é "uptime de 99.9%", e o time otimiza só pra isso, eles vão achar formas criativas de "estar up" sem necessariamente funcionar bem.

## RL além de LLMs: onde você já viu isso

RL aparece em vários lugares que um profissional de infra pode encontrar:

| Aplicação | Agent | Environment | Reward |
|-----------|-------|-------------|--------|
| Autoscaling inteligente | Controller de scaling | Cluster + workload | Custo baixo + SLA cumprido |
| Roteamento de rede | SDN controller | Topologia de rede | Latência mínima, sem congestion |
| Scheduling de jobs | Scheduler | Pool de recursos | Utilização alta + fairness |
| Detecção de anomalia | Monitor agent | Séries temporais | Alertas corretos (precision + recall) |
| Cache eviction | Cache manager | Working set | Hit rate alto |

O Azure Autoscale do dia a dia não usa RL puro. Usa regras determinísticas. Ainda assim, RL aparece em pesquisa de autoscaling, scheduling e alocação de recursos. O conceito encaixa bem nesse tipo de problema, mesmo quando o produto comercial acaba usando heurística em vez de policy learning.

## O custo de RL em infra

Se seu time decide fazer alinhamento por preferências em um modelo custom, espere algo nessa ordem de grandeza:

```
# Ordem de grandeza pra alinhar um modelo 7B
- 4-8x GPUs grandes pra SFT ou DPO
- Mais GPU ou mais tempo se entrar PPO completo
- Dias ou semanas de treino, dependendo de batch e contexto
- Milhares a dezenas de milhares de comparações humanas ou sintéticas
- Algumas centenas de GB pra checkpoints e dataset processado
- Rede rápida entre GPUs se o treino for distribuído
```

Dá pra gastar menos com LoRA, QLoRA ou datasets menores. Dá pra gastar muito mais se você fizer full fine-tuning, usar contexto longo ou insistir em PPO completo. O ponto é: esse pedido mexe com GPU, storage e rede de verdade.

## DPO vs PPO: o trade-off prático

| Aspecto | PPO | DPO |
|---------|-----|-----|
| Complexidade | Alta (reward model + RL loop) | Menor (otimização direta) |
| Compute necessário | Maior | Menor |
| Estabilidade de training | Mais sensível a tuning | Mais previsível |
| Qualidade final | Muito boa quando bem ajustado | Muito boa na maioria dos cenários práticos |
| Quando usar | Quando você quer reproduzir RLHF clássico e tem budget | Quando quer simplificar a pilha e iterar mais rápido |

## O que levar pra segunda-feira

- RLHF é o motivo pelo qual LLMs parecem "inteligentes". Sem ele, são só geradores de texto que completam frases.
- Reward hacking é real. Se o modelo faz algo estranho (responde verbosamente, inventa coisas com confiança), provavelmente é uma falha no reward signal.
- RL em infra já existe. Autoscalers inteligentes, cache policies, scheduling. O conceito é o mesmo: agent observa, age, recebe feedback, melhora.
- DPO simplificou muito o pipeline. Times pequenos podem alinhar modelos sem a complexidade toda de PPO.

Se o modelo responde como um professor paciente ou como um estagiário confiante demais, muita coisa aí vem desse pipeline de alinhamento. Entender RLHF já explica uma parte enorme desse comportamento.

## Leitura complementar

- [What is Reinforcement Learning](https://lnkd.in/dzSXrgNW) (Neo Kim, System Design Newsletter)
- [Training language models to follow instructions with human feedback](https://arxiv.org/abs/2203.02155) (paper do InstructGPT/RLHF)
- [Direct Preference Optimization](https://arxiv.org/abs/2305.18290) (paper do DPO)
