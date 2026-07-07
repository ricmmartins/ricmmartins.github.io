---
slug: "llm-evals-como-medir-se-seu-modelo-presta"
aliases:
  - "/posts/llm-evals-como-medir-se-seu-modelo-presta/"
title: "LLM evals: como medir se seu modelo presta"
description: "Métricas de qualidade, benchmarks, evals automatizados. Como saber se suas mudanças no prompt melhoraram ou pioraram o modelo, com a mentalidade de quem já faz load testing."
date: 2026-07-08T10:00:00-04:00
categories:
  - AI
  - Arquitetura
tags:
  - ai-engineering
  - evals
  - observabilidade
  - qualidade
  - testing
series:
  - "AI por dentro: de tokens a agents"
---

Você mudou o system prompt. O time de ML acha que ficou melhor. Mas "achar" não é métrica. Em infra, você não faz deploy sem rodar tests. Em AI, o equivalente é **evals**.

LLM Evals são testes automatizados que medem a qualidade das respostas do modelo. É o seu test suite pro AI. Sem evals, toda mudança no pipeline (prompt, modelo, RAG, chunking) é um deploy no escuro.

## O mapa pro profissional de infra

| Conceito Evals | O que faz | Equivalente em infra |
|---------------|-----------|---------------------|
| **Eval dataset** | Conjunto de perguntas + respostas esperadas | Test fixtures |
| **Metric** | Medida de qualidade (0-1) | SLA metric (uptime, latência) |
| **Regression test** | Verificar que mudanças não pioraram | Load test before/after deploy |
| **Benchmark** | Comparação entre modelos/configs | Performance benchmark (ApacheBench) |
| **Human eval** | Humano julga qualidade | User acceptance testing |
| **LLM-as-judge** | Outro LLM avalia a resposta | Automated QA |
| **Golden dataset** | Dataset curado com respostas "certas" | Test fixtures com assertions |

## Por que evals são difíceis (e por que fazer mesmo assim)

Em software tradicional, testes são determinísticos. `assert add(2, 3) == 5`. Sempre.

LLMs são estocásticos. A mesma pergunta pode gerar respostas diferentes. E "correto" muitas vezes não é binário. Uma resposta pode ser parcialmente correta, correta mas verbosa, correta mas no tom errado.

Isso não significa que não dá pra testar. Significa que os testes são **estatísticos** e não **determinísticos**. Em vez de "passou/falhou", você mede "acertou 87% das vezes" e detecta quando cai pra 82%.

É exatamente como medir latência. Você não espera que toda request demore exatamente 50ms. Você mede p50, p95, p99, e alerta quando desviam do baseline.

## Tipos de evals

### 1. Exact match / Contains

O mais simples. A resposta contém a informação correta?

```python
def eval_contains(response, expected_terms):
    """Verifica se termos esperados estão na resposta."""
    score = sum(1 for term in expected_terms if term.lower() in response.lower())
    return score / len(expected_terms)

# Exemplo
resposta = "Use kubectl delete namespace meu-ns para remover o namespace"
esperado = ["kubectl", "delete", "namespace"]
score = eval_contains(resposta, esperado)  # 1.0 (contém tudo)
```

Bom pra: comandos CLI, fatos objetivos, referências a documentos específicos.
Ruim pra: respostas complexas, tom, completude.

### 2. Similarity-based

Compara embedding da resposta com embedding da resposta esperada.

```python
from openai import AzureOpenAI
import numpy as np

def cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

def eval_similarity(response, reference, client):
    """Compara semântica da resposta com referência."""
    resp_embedding = client.embeddings.create(
        input=response, model="text-embedding-3-small"
    ).data[0].embedding
    
    ref_embedding = client.embeddings.create(
        input=reference, model="text-embedding-3-small"
    ).data[0].embedding
    
    return cosine_similarity(resp_embedding, ref_embedding)
```

Bom pra: verificar se a resposta está "na direção certa".
Ruim pra: detectar erros factuais sutis (embedding similar, mas informação errada).

### 3. LLM-as-judge

Usar outro LLM (tipicamente mais poderoso) pra avaliar a resposta. É o método mais flexível.

```python
import json

def eval_llm_judge(question, response, reference, client):
    """Usa GPT-4o como juiz de qualidade."""
    
    judge_prompt = """Avalie a resposta do assistente comparando com a referência.
    
Critérios (0-5 cada):
- Correção factual: informações estão corretas?
- Completude: respondeu tudo que foi perguntado?
- Clareza: fácil de entender e aplicar?
- Segurança: não sugere ações perigosas sem avisos?

Retorne JSON: {"correção": N, "completude": N, "clareza": N, "segurança": N, "nota_final": N, "justificativa": "..."}
"""
    
    result = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": judge_prompt},
            {"role": "user", "content": f"""
Pergunta: {question}
Resposta do assistente: {response}
Resposta de referência: {reference}
"""}
        ],
        response_format={"type": "json_object"},
        temperature=0
    )
    
    return json.loads(result.choices[0].message.content)
```

Bom pra: avaliação nuanced, múltiplos critérios.
Cuidado: o judge também pode errar. Valide com human eval periodicamente.

### 4. Task-specific metrics

Métricas específicas pro tipo de tarefa:

| Tarefa | Métrica | Como medir |
|--------|---------|-----------|
| Q&A factual | Accuracy / exact match | Resposta contém o fato correto |
| Classificação | Precision, recall e F1 | F1 = média harmônica entre precision e recall |
| Summarization | ROUGE | Overlap de n-grams ou subsequências com a referência |
| Tradução / captioning | BLEU | Overlap de n-grams. Útil como baseline, fraco sozinho pra julgar qualidade |
| Code generation | Pass@k | Probabilidade de pelo menos uma entre k amostras passar nos testes |
| RAG | Faithfulness | Resposta é suportada pelo contexto |
| RAG | Relevance | Chunks recuperados e resposta final atacam a pergunta |

BLEU e ROUGE continuam úteis quando existe uma resposta de referência boa e estável. Pra resposta aberta de LLM, eu trato os dois como sinal auxiliar, não como veredito final.

## Montando um eval pipeline

### Passo 1: Criar o golden dataset

Comece com 50-100 exemplos curados manualmente. Cada exemplo tem:

```json
{
  "id": "eval-001",
  "question": "Como verificar se a replicação do PostgreSQL está saudável?",
  "expected_answer": "Executar SELECT * FROM pg_stat_replication no primário. Verificar que sent_lsn e replay_lsn estão próximos (lag < 1MB). Se replay_lsn estiver muito atrás, verificar network e I/O no standby.",
  "expected_terms": ["pg_stat_replication", "sent_lsn", "replay_lsn"],
  "category": "database",
  "difficulty": "medium"
}
```

### Passo 2: Rodar evals automaticamente

```python
import json
from datetime import datetime

def run_eval_suite(eval_dataset, rag_pipeline, client, output_file):
    """Roda suite de evals e salva resultados."""
    results = []
    
    for item in eval_dataset:
        # Gerar resposta do sistema
        response = rag_pipeline.query(item["question"])
        
        # Avaliar
        contains_score = eval_contains(response, item["expected_terms"])
        judge_result = eval_llm_judge(
            item["question"], response, item["expected_answer"], client
        )
        
        results.append({
            "id": item["id"],
            "category": item["category"],
            "contains_score": contains_score,
            "judge_scores": judge_result,
            "response": response,
            "timestamp": datetime.now().isoformat()
        })
    
    # Salvar resultados
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    
    # Calcular agregados
    avg_score = sum(r["judge_scores"]["nota_final"] for r in results) / len(results)
    print(f"Score médio: {avg_score:.2f}/5.0")
    print(f"Contains score: {sum(r['contains_score'] for r in results)/len(results):.2%}")
    
    return results
```

### Passo 3: Integrar no CI/CD

```yaml
# .github/workflows/eval.yml
name: LLM Eval Suite
on:
  pull_request:
    paths:
      - 'prompts/**'
      - 'rag/**'
      - 'config/**'

jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run eval suite
        env:
          AZURE_OPENAI_KEY: ${{ secrets.AZURE_OPENAI_KEY }}
          AZURE_OPENAI_ENDPOINT: ${{ secrets.AZURE_OPENAI_ENDPOINT }}
        run: |
          python -m pip install -r requirements.txt
          python run_evals.py --dataset evals/golden.json --output results.json
      
      - name: Check regression
        run: |
          python check_regression.py \
            --current results.json \
            --baseline evals/baseline.json \
            --threshold 0.05
          # Falha se score caiu mais que 5% vs baseline
```

## Métricas específicas pra RAG

Quando avalia um sistema RAG, separe as métricas em duas camadas:

### Retrieval metrics (o search está funcionando?)

| Métrica | O que mede | Como calcular |
|---------|-----------|--------------|
| **Recall@K** | % de docs relevantes nos top K | Docs relevantes em K / total relevantes |
| **Precision@K** | % dos top K que são relevantes | Docs relevantes em K / K |
| **MRR** | Quão cedo aparece o primeiro resultado relevante | Média de 1/rank do primeiro relevante em cada query |

### Generation metrics (o modelo está respondendo bem?)

| Métrica | O que mede | Como calcular |
|---------|-----------|--------------|
| **Faithfulness** | Resposta é suportada pelo contexto? | LLM-judge: "esta afirmação é suportada pelos docs?" |
| **Relevance** | Resposta responde a pergunta? | LLM-judge: "a resposta endereça a pergunta?" |
| **Hallucination rate** | % de respostas com info inventada | LLM-judge: "info não presente no contexto?" |

```python
def eval_rag_faithfulness(response, context_chunks, client):
    """Avalia se a resposta é fiel ao contexto fornecido."""
    
    prompt = f"""Analise se CADA afirmação na resposta é suportada pelo contexto.

Contexto fornecido:
{chr(10).join(context_chunks)}

Resposta do assistente:
{response}

Para cada afirmação na resposta, indique:
- SUPORTADA: está no contexto
- NÃO SUPORTADA: não está no contexto (possível alucinação)
- PARCIAL: parcialmente suportada

Retorne JSON: {{"afirmacoes": [...], "score_faithfulness": 0.0-1.0}}
"""
    
    result = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        temperature=0
    )
    
    return json.loads(result.choices[0].message.content)
```

## Eval anti-patterns

**Eval dataset pequeno demais**
- Com 10 exemplos você percebe um desastre, não uma regressão sutil. Pra começar, 50-100 casos já dão um sinal bem melhor.

**Eval dataset viesado**
- Só testar perguntas fáceis dá falsa confiança. Inclua edge cases, perguntas ambíguas, perguntas que o sistema não deveria responder.

**Não versionar o baseline**
- Se você não sabe qual era o score antes da mudança, não sabe se melhorou ou piorou.

**Avaliar só com LLM-as-judge**
- O judge pode concordar com alucinações. Faça human eval em 10-20% dos casos regularmente.

**Otimizar pro eval em vez do usuário**
- Se o eval dataset não reflete perguntas reais dos usuários, você está overfitting pro test. Use logs de produção pra atualizar o dataset.

## Ferramentas e frameworks

| Ferramenta | O que faz | Quando usar |
|-----------|-----------|-------------|
| **Azure AI Evaluation SDK** | Evals integrados ao Azure AI | Já usa Azure AI Studio |
| **promptfoo** | Open-source, CLI-first eval | Times que querem controle, CI/CD |
| **Ragas** | Métricas específicas pra RAG | Avaliando pipelines RAG |
| **DeepEval** | Framework Python pra LLM evals | Integração com pytest |
| **Custom scripts** | Python puro | Máximo controle, necessidades específicas |

```bash
# promptfoo: exemplo de eval via CLI
npm install -g promptfoo

# Configurar eval
cat > promptfooconfig.yaml << 'EOF'
providers:
  - id: azure-gpt-4o
    provider: azure-openai
    apiKey: $AZURE_OPENAI_API_KEY
    apiHost: https://meu-endpoint.openai.azure.com
    deployment: gpt-4o
    apiVersion: "2024-06-01"
    model: gpt-4o

prompts:
  - file://prompts/system-v1.txt
  - file://prompts/system-v2.txt

tests:
  - vars:
      question: "Como verificar replicação PostgreSQL?"
    assert:
      - type: contains
        value: "pg_stat_replication"
      - type: llm-rubric
        value: "A resposta inclui comandos SQL específicos e explica o que verificar"
  - vars:
      question: "Qual o procedimento de failover?"
    assert:
      - type: contains
        value: "DR-003"
      - type: llm-rubric
        value: "Menciona pré-requisitos e tem passos claros"
EOF

# Rodar
promptfoo eval
promptfoo view  # abre dashboard com resultados
```

## O que levar pra segunda-feira

- **Evals são o test suite do AI.** Sem eles, você não sabe se suas mudanças melhoraram ou pioraram.
- **Comece simples.** 50 exemplos + contains + LLM-as-judge já dão um raio-X bem útil.
- **Meça retrieval e generation separadamente.** Se o modelo erra, primeiro descubra se o problema é no search ou na geração.
- **Integre no CI/CD.** Mudanças em prompts devem passar por evals antes de ir pra produção, igual código passa por tests.
- **Trate evals como métricas de SLA.** Defina thresholds por categoria, alerte quando cair e investigue root cause.

O próximo post é sobre **Machine Learning System Design**: como projetar sistemas de ML completos, da ingestão de dados ao serving em produção.

## Leitura complementar

- [LLM Evals Explained](https://lnkd.in/diU4hic8) (Neo Kim, System Design Newsletter)
- [Azure AI Evaluation SDK](https://learn.microsoft.com/azure/ai-studio/how-to/evaluate-generative-ai-app)
- [promptfoo documentation](https://promptfoo.dev/)
