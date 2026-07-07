---
slug: "conceitos-de-llms-o-deep-dive-que-faltava"
aliases:
  - "/posts/conceitos-de-llms-o-deep-dive-que-faltava/"
title: "Conceitos de LLMs: o deep dive que faltava"
description: "Tokens, embeddings, attention, context window. Tudo que você precisa entender sobre Large Language Models pra parar de tratar isso como caixa preta."
date: 2026-06-23T10:00:00-04:00
categories:
  - AI
  - Arquitetura
tags:
  - ai-engineering
  - llm
  - tokens
  - embeddings
  - transformers
series:
  - "AI por dentro: de tokens a agents"
---

Sexta-feira, 17h. Você recebe um ticket do time de data science: "O modelo está retornando respostas cortadas. Parece que o context window encheu. Pode aumentar?"

Você olha pro ticket. Context window? Aumentar como? Isso é configuração de infra ou limitação do modelo? É memória? É disco? Onde isso vive?

Se você já passou por isso, esse post é pra você. Aqui dentro: o que cada peça de um Large Language Model faz, explicado pra quem entende de sistemas. Não pra virar ML engineer, mas pra ter vocabulário e contexto pra resolver problemas reais no dia a dia.

## De infra pra AI: o mapa mental

Antes de entrar nos conceitos, vamos ancorar o vocabulário novo em coisas que você já conhece.

| Conceito AI | O que faz | Seu equivalente em infra |
|-------------|-----------|--------------------------|
| **Token** | Unidade mínima de texto processada | Pacote de rede (unidade mínima de transmissão) |
| **Embedding** | Representação numérica de significado | Hash de um objeto (representação compacta de dados) |
| **Context window** | Quantidade máxima de tokens que o modelo "vê" | RAM disponível pro processo |
| **Attention** | Mecanismo que decide o que é relevante | Load balancer decidindo pra onde rotear |
| **Temperature** | Controle de aleatoriedade na resposta | Jitter em retry policies |
| **Inference** | Gerar uma resposta | O request/response do modelo (o "GET /predict") |
| **Fine-tuning** | Retreinar com dados específicos | Customizar uma imagem Docker base |

## Tokens: a unidade fundamental

Quando você manda um texto pra um LLM, ele não vê palavras. Ele vê **tokens**. Um token é um pedaço de texto, geralmente 3-4 caracteres em inglês (em português tende a ser menos eficiente, 2-3 caracteres por token).

A frase "Kubernetes é complicado" vira algo assim:

```
["Kub", "ern", "etes", " é", " complic", "ado"]
```

Seis tokens. Cada um tem um ID numérico no vocabulário do modelo.

Por que isso importa pra você? Porque **tudo no LLM é cobrado por token**. Input tokens (o que você manda) e output tokens (o que o modelo gera). Quando o time de data science pede "aumenta o context window", eles estão pedindo um modelo que aceita mais tokens simultâneos. Isso não é knob de configuração. É característica do modelo.

```bash
# Exemplo: contar tokens antes de mandar pro modelo (Python com tiktoken)
python -m pip install tiktoken

python -c "
import tiktoken
enc = tiktoken.encoding_for_model('gpt-4o')
texto = 'Kubernetes é complicado mas funciona'
tokens = enc.encode(texto)
print(f'Texto: {texto}')
print(f'Tokens: {len(tokens)}')
print(f'IDs: {tokens}')
"
```

### Limites de context window por modelo

| Modelo | Context window | Equivalente em texto |
|--------|---------------|---------------------|
| GPT-4o | 128K tokens | ~96K palavras (~300 páginas) |
| GPT-4o mini | 128K tokens | ~96K palavras |
| Claude Sonnet 4.5 | 200K tokens | ~150K palavras |
| Meta Llama 3.1 405B Instruct | 131.072 tokens | ~98K palavras |

Quando o context window enche, o modelo simplesmente não consegue processar mais input. Não é erro de memória no sentido de OOM kill. É limitação arquitetural. O modelo foi treinado com uma janela fixa.

## Embeddings: transformando texto em matemática

Um embedding é um vetor (array de números) que representa o significado de um texto. Pensa assim: é como um hash, mas em vez de ser único por conteúdo, é **similar para conteúdos com significado parecido**.

```
"Kubernetes" → [0.23, -0.45, 0.87, 0.12, ...]  (1536 dimensões)
"K8s"        → [0.22, -0.44, 0.86, 0.13, ...]  (muito similar!)
"Banana"     → [-0.91, 0.33, -0.12, 0.78, ...] (completamente diferente)
```

Na prática, embeddings são a base de busca semântica. Quando alguém fala "RAG" (que é o tema do post 4 dessa série), o que está acontecendo por baixo é: transformar a pergunta do usuário em embedding, buscar documentos com embeddings similares, e mandar tudo pro modelo como contexto.

```bash
# Gerar embedding usando Azure OpenAI
curl -X POST "https://SEU_RECURSO.openai.azure.com/openai/deployments/meu-deployment-embedding/embeddings?api-version=2025-04-01-preview" \
  -H "Content-Type: application/json" \
  -H "api-key: $AZURE_OPENAI_KEY" \
  -d '{
    "input": "Como configurar autoscaling no AKS"
  }'
```

Se o deployment apontar para `text-embedding-3-small`, a resposta vem com 1536 floats por padrão. No `text-embedding-3-large`, o default é 3072, e os modelos de terceira geração aceitam o parâmetro `dimensions` para reduzir esse tamanho.

## Attention: o mecanismo que mudou tudo

Em 2017, o paper "Attention Is All You Need" criou a arquitetura Transformer, que é a base de todo LLM moderno. O conceito central é simples de entender por analogia.

Imagina que você está lendo um parágrafo de documentação sobre Terraform. Quando vê a palavra "resource", seu cérebro automaticamente dá mais peso às palavras ao redor que são relevantes: "azurerm_virtual_network", "name", "address_space". Você ignora os "the", "is", "a".

Attention faz exatamente isso, mas com matemática. Pra cada token no input, o modelo calcula um score de relevância com todos os outros tokens. Tokens mais relevantes ganham peso maior na hora de gerar a resposta.

O problema? Attention é O(n²). Se o context window tem 128K tokens, o modelo precisa calcular relações entre **cada par** de tokens. Isso é 128K × 128K = 16 bilhões de operações de attention. É por isso que modelos com context window grande precisam de tanta GPU.

### Por que isso importa pra infra

Quando seu time pede "inferência mais rápida", existem poucos knobs:

1. **Reduzir input** (menos tokens = menos cálculos de attention)
2. **GPU mais rápida** (mais FLOPS pra computar attention)
3. **Batch requests** (processar múltiplos requests em paralelo na mesma GPU)
4. **Quantização** (reduzir precisão dos pesos, menos memória, mais throughput)

Não existe "adicionar mais réplicas" como num web server stateless. Cada request precisa do modelo inteiro carregado em memória de GPU. Um modelo de 70B parâmetros ocupa ~140GB em FP16. Isso é mais que uma A100 de 80GB. Você precisa de tensor parallelism entre múltiplas GPUs.

## Temperature e sampling: controlando a aleatoriedade

Temperature é um float entre 0 e 2 que controla quão "criativo" o modelo é.

- **Temperature 0**: sempre escolhe o token mais provável. Determinístico. Bom pra tarefas factuais.
- **Temperature 0.7**: introduz variação. Bom pra texto criativo.
- **Temperature 1.5+**: muito aleatório. Respostas podem ficar incoerentes.

Pra quem é de infra, pensa em temperature como o **jitter** que você adiciona em retry policies. Sem jitter (temperature 0), todos os clients fazem retry ao mesmo tempo. Com jitter (temperature > 0), você distribui as respostas.

Na prática, quando o time configura temperature no código da aplicação, não é problema de infra. Mas quando perguntam "por que o modelo dá respostas diferentes pra mesma pergunta?", a resposta é temperature.

## Inference: o request/response do modelo

Inference é simplesmente rodar o modelo pra gerar output. É o equivalente ao request HTTP na sua API. Mas com características bem diferentes:

| Aspecto | API tradicional | Inference LLM |
|---------|----------------|---------------|
| Latência típica | 50-200ms | 1-30 segundos |
| Uso de recursos | CPU/RAM | GPU/VRAM |
| Escalabilidade | Horizontal (mais pods) | Vertical (mais GPUs) ou horizontal limitado |
| Caching | HTTP cache, CDN | Semantic cache, KV cache |
| Métricas chave | RPS, p99 latency | Tokens/segundo, TTFT, TPM |

Três métricas que você precisa conhecer:

- **TTFT (Time To First Token)**: quanto tempo até o primeiro token da resposta. Equivalente ao TTFB de HTTP.
- **TPS (Tokens Per Second)**: velocidade de geração. Pra streaming responses.
- **TPM (Tokens Per Minute)**: throughput total. É o rate limit do Azure OpenAI.

```bash
# Verificar quota disponível na região
az cognitiveservices usage list \
  --location eastus2 \
  --output table

# Ver deployments existentes no recurso Azure OpenAI
az cognitiveservices account deployment list \
  --name meu-openai-account \
  --resource-group meu-rg \
  --output table
```

## Fine-tuning vs. prompt engineering vs. RAG

Três formas de customizar o comportamento do modelo. Cada uma tem trade-offs que afetam infra:

| Abordagem | O que é | Custo de infra | Quando usar |
|-----------|---------|---------------|-------------|
| **Prompt engineering** | Instruir o modelo via texto no input | Nenhum adicional | Sempre tente primeiro |
| **RAG** | Buscar docs relevantes e incluir no contexto | Vector DB + search infra | Dados atualizados, domínio específico |
| **Fine-tuning** | Retreinar o modelo com seus dados | GPU pra training + hosting | Estilo/formato específico, latência crítica |

Fine-tuning é como criar uma imagem Docker customizada a partir de uma base. Você pega o modelo base, treina com seus dados, e gera um modelo novo que precisa ser hospedado separadamente. Custa compute de training (GPUs por horas) e depois compute de inference (hosting do modelo customizado).

RAG não modifica o modelo. Adiciona contexto em runtime. É como montar um volume com dados atualizados no container. O modelo continua o mesmo, mas recebe informação extra.

## A arquitetura Transformer resumida

Sem entrar em álgebra linear, o fluxo de um LLM é:

```
Input texto
    ↓
Tokenização (texto → IDs numéricos)
    ↓
Embedding layer (IDs → vetores na dimensão interna do modelo)
    ↓
N camadas de Transformer (cada uma com attention + feed-forward)
    ↓
Output layer (vetor → probabilidades de próximo token)
    ↓
Sampling (temperatura + top-p → escolhe o token)
    ↓
Repeat até gerar token de parada
```

Cada "camada de Transformer" é onde o modelo aprende padrões. Modelos maiores tendem a ter mais camadas e estados internos maiores. Em modelos fechados como GPT-4o, a arquitetura exata não é pública. O ponto prático é outro: cada camada precisa estar na memória da GPU durante inference.

## O que levar pra segunda-feira

Quando o time de data science falar algo que parece grego, agora você tem o mapa:

- "Context window encheu" → O input ficou grande demais pro modelo processar. Solução: reduzir input, trocar pra modelo com janela maior, ou implementar RAG pra selecionar apenas o relevante.
- "Inference tá lenta" → Olha TTFT e TPS. Pode ser GPU saturada, batch size inadequado, ou input muito grande (attention é O(n²)).
- "Preciso de fine-tuning" → Eles vão precisar de GPU pra training e um endpoint dedicado pra servir o modelo. Não é só "configuração".
- "Tokens estão caros" → Otimizar prompts pra usar menos tokens, implementar caching semântico, ou trocar pra modelo menor em queries simples.

No próximo post, vamos falar de **Reinforcement Learning** e como isso se conecta com o treinamento de LLMs (spoiler: é assim que o ChatGPT aprendeu a ser "educado").

## Leitura complementar

- [LLM Concepts - A Deep Dive](https://lnkd.in/eSd6fS7n) (Neo Kim, System Design Newsletter)
- [Attention Is All You Need](https://arxiv.org/abs/1706.03762) (paper original dos Transformers)
- [Azure OpenAI Service documentation](https://learn.microsoft.com/azure/ai-services/openai/)
