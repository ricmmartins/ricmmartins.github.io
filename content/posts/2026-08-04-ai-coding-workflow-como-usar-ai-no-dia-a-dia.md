---
slug: "ai-coding-workflow-como-usar-ai-no-dia-a-dia"
aliases:
  - "/posts/ai-coding-workflow-como-usar-ai-no-dia-a-dia/"
title: "AI coding workflow: como usar AI no dia a dia"
description: "GitHub Copilot, Claude, ChatGPT. Como integrar AI no seu workflow real de infra/DevOps sem virar dependente ou perder senso crítico. O último post da série."
date: 2026-08-04T10:00:00-04:00
categories:
  - AI
  - Carreira
tags:
  - ai-engineering
  - produtividade
  - copilot
  - workflow
series:
  - "AI Engineering pra quem é de infra"
---

Último post da série. Nos 14 anteriores, entendemos como AI funciona por dentro. Agora o ângulo é prático: como usar essas ferramentas no dia a dia pra ser mais produtivo sem perder a capacidade de pensar por conta própria.

Esse post é opinativo. Baseado na minha experiência usando AI coding tools diariamente desde 2023. Vou compartilhar o que funciona, o que não funciona, e os anti-patterns que vejo times caindo.

## O que muda no workflow de infra com AI

| Tarefa | Antes (sem AI) | Com AI |
|--------|---------------|--------|
| Escrever Terraform module | 30-60min pesquisando docs + escrevendo | 5-10min descrevendo o que quero + revisando output |
| Criar script de automação | 20-40min coding + debugging | 5-10min prompt + review + ajustes |
| Troubleshooting | Logs → Google → Stack Overflow → tentar | Logs → colar no AI → hipóteses em segundos |
| Documentar runbook | 1-2h escrevendo do zero | 15-30min: AI gera draft, eu reviso e customizo |
| Code review em IaC | 15-30min lendo + comentando | 5min AI-assisted + meus 5min pra decisões de design |

O ganho real não é "código grátis". É **comprimir o ciclo de feedback**. Testar hipóteses mais rápido. Explorar mais alternativas antes de decidir.

## Os 3 modos de usar AI

### Modo 1: Autocomplete (Copilot inline)

GitHub Copilot no editor, sugerindo completions enquanto você digita.

**Funciona bem pra:**
- Terraform resources que seguem patterns repetitivos
- YAML/JSON (K8s manifests, CI/CD pipelines)
- Scripts bash/Python com lógica straightforward
- Completar imports, variáveis, struct definitions

**Não funciona pra:**
- Design decisions (qual service usar, como estruturar módulos)
- Debugging complexo (Copilot não vê seus logs)
- Security-sensitive code (revise SEMPRE)

**Tip prático**: escreva um comentário descritivo antes de deixar o Copilot completar. Quanto mais contexto no comentário, melhor o suggestion.

```terraform
# Azure Container App with auto-scaling based on HTTP requests,
# minimum 2 replicas, maximum 10, scale at 100 concurrent requests
resource "azurerm_container_app" "api" {
  # Copilot completa o resto com alta accuracy
}
```

### Modo 2: Chat contextual (Copilot Chat, Cursor)

Conversa com AI que tem acesso ao seu codebase.

**Funciona bem pra:**
- "Explica o que esse módulo Terraform faz"
- "Refatora esse script pra usar functions"
- "Encontra todos os places onde usamos esse SKU deprecated"
- "Gera testes pra esse módulo"

**Dica**: reference specific files. Em vez de "como funciona o auth?", pergunte "@workspace explica o fluxo de auth em src/middleware/auth.py".

### Modo 3: Agent (Copilot CLI, Claude Code, task-based)

AI que executa tarefas multi-step: cria arquivos, roda comandos, itera baseado em resultados.

**Funciona bem pra:**
- Criar módulos inteiros de IaC baseado em requirements
- Migrar configurações entre formatos (ARM → Bicep, Docker Compose → K8s)
- Gerar boilerplate + customizar
- Research: "encontra todos os recursos nesse subscription que não têm tags"

**Não funciona pra:**
- Tasks que requerem acesso a sistemas internos sem API
- Decisões que precisam de contexto organizacional que o AI não tem

## Workflow integrado: como eu uso no dia a dia

### Cenário: criar um novo módulo Terraform

```
1. PENSAR (5min, sem AI)
   - Qual o objetivo?
   - Quais recursos preciso?
   - Quais são os inputs/outputs?
   - Tem dependências?

2. SCAFFOLD (com AI agent, 5-10min)
   Prompt: "Cria um módulo Terraform pra Azure Container Apps 
   com: custom domain, managed certificate, connection to 
   Azure SQL via private endpoint, auto-scaling 2-10 replicas.
   Segue o pattern dos módulos existentes em modules/"

3. REVIEW (10-15min, eu)
   - Naming conventions estão certas?
   - Security groups/NSGs corretos?
   - Variables e outputs fazem sentido?
   - Algo que o AI inventou que não existe?

4. VALIDATE (com AI + manual, 5min)
   - terraform validate
   - terraform plan (dry run)
   - Perguntar pro AI: "revisa esse plan, algo parece errado?"

5. TEST (5-10min)
   - terraform apply em ambiente de dev
   - Verificar se recursos foram criados corretos
```

Total: 30-45min pra algo que antes levava 2-3 horas.

### Cenário: troubleshooting um incidente

```
1. COLETAR DADOS (manual, 2min)
   - Logs do container/pod
   - Métricas do Azure Monitor
   - Timeline do alerta

2. ANALISAR COM AI (2-3min)
   Cola os logs no chat:
   "Esses são logs de um container que está em CrashLoopBackOff.
   O pod reiniciou 47 vezes na última hora.
   Quais são as possíveis causas e o que verificar primeiro?"

3. TESTAR HIPÓTESES (manual + AI, 5-10min)
   AI sugere 3 hipóteses. Você verifica cada uma:
   - "Verifica se o secret AZURE_SQL_CONNECTION existe no namespace"
   - "Olha se o container tem memory limit suficiente"
   - "Checa se a imagem base mudou no último deploy"

4. REMEDIAR (manual, com AI gerando o comando)
   "Gera o comando kubectl pra aumentar o memory limit 
   do deployment api-server de 256Mi pra 512Mi no namespace production"

5. DOCUMENTAR (AI gera draft, 3min)
   "Gera um post-mortem resumido desse incidente: 
   causa raiz era memory limit, fix foi aumentar pra 512Mi, 
   ação preventiva é adicionar memory monitoring alert"
```

## Anti-patterns: o que NÃO fazer

### 1. Copy-paste sem entender

O anti-pattern mais comum. AI gera Terraform, você aplica sem ler.

**Problema real que já vi**: AI gerou um Security Group com rule `0.0.0.0/0` em port 22 porque o prompt não especificou restrição de IP. Deploy em produção. SSH aberto pro mundo. Incidente de segurança.

**Regra**: se você não consegue explicar o que cada linha faz, não aplique.

### 2. Confiar em outputs sem validar

AI afirma com confiança que `az vm resize --size Standard_D4s_v6` é válido. Você roda. Erro: esse SKU não existe na sua região.

**Regra**: sempre valide commands em docs antes de rodar em prod. `az vm list-skus --location eastus2 --resource-type virtualMachines --query "[?contains(name, 'Standard_D4s')].name" -o tsv`.

### 3. Usar AI pra tudo (atrofia mental)

Se toda vez que precisa escrever um for loop você pede pro Copilot, em 6 meses você não consegue mais escrever um for loop.

**Regra**: use AI pra acelerar coisas que você **sabe** fazer. Não como muleta pra coisas que você deveria **aprender**.

### 4. Prompts vagos

"Cria uma infra boa pro meu app" não vai gerar nada útil.

**Regra**: seja específico sobre requirements, constraints, e contexto.

```
Ruim: "Cria terraform pra um banco de dados"

Bom: "Cria um módulo Terraform pra Azure PostgreSQL Flexible Server.
Requirements:
- SKU: GP_Standard_D2ds_v4 (2 vCores, 8GB)
- HA mode: zone-redundant
- Private endpoint (sem public access)
- Automated backups: 14 dias retention
- Variáveis: resource_group_name, location, vnet_id, subnet_id
- Output: server fqdn, connection string (sem password, usar Key Vault reference)"
```

### 5. Ignorar o contexto organizacional

AI não sabe que sua empresa tem policy de não usar Cosmos DB, que o time de segurança exige encryption at rest com CMK, ou que o naming convention é `{env}-{region}-{service}-{index}`.

**Regra**: mantenha um `.github/copilot-instructions.md` ou arquivo de contexto com regras da organização. AI que tem acesso a isso gera output muito mais útil.

## Ferramentas que uso e recomendo

| Ferramenta | Uso principal | Ponto forte |
|-----------|--------------|-------------|
| **GitHub Copilot** (editor) | Autocomplete + chat | Integração native, entende o repo |
| **GitHub Copilot CLI** | Tasks multi-step no terminal | Executa comandos, itera, cria/edita files |
| **Claude** (web/API) | Análise profunda, code review | Context window grande, raciocínio forte |
| **Azure AI (custom)** | Assistentes internos com RAG | Dados privados, integração com Azure |

## Como evoluir: o mindset certo

AI coding tools estão evoluindo rápido. O que funciona hoje pode ser diferente em 6 meses. Algumas verdades que acho que são duráveis:

**1. AI amplifica, não substitui.**
Se você é um engenheiro mediano, AI te torna um engenheiro mediano mais rápido. Se você é excelente, AI te torna absurdamente produtivo. A base de conhecimento ainda é sua.

**2. O valor migrou pra cima.**
Escrever código ficou comoditizado. O valor está em: saber o que construir, como estruturar, quais trade-offs aceitar. Design > implementation.

**3. Prompting é uma skill temporária.**
Hoje, saber promptar bem é diferencial. Em 2 anos, modelos vão ser bons o suficiente pra entender qualquer input. O que não vai mudar: saber avaliar se o output está correto.

**4. Review é a skill permanente.**
Quanto mais AI gera código, mais importante fica saber revisar código. Security review, performance review, design review. Essas skills valorizam.

## Exercício: comece amanhã

Se você não está usando AI no seu workflow ainda, comece com uma coisa:

1. **Instale GitHub Copilot** no seu editor
2. **Amanhã de manhã**, na primeira tarefa que for fazer, descreva o que quer num comentário e veja o que Copilot sugere
3. **Revise criticamente**. Aceite o que está certo, modifique o que está errado, delete o que não precisa
4. **Repita por 1 semana**. Depois de uma semana, você vai saber intuitivamente quando usar e quando não usar

## Fechando a série

Em 15 posts, cobrimos:

1. Como LLMs funcionam (tokens, embeddings, attention)
2. Reinforcement learning e por que modelos são "educados"
3. Vector databases e busca por similaridade
4. RAG e como conectar seus dados ao modelo
5. Context engineering e como montar prompts efetivos
6. LLM evals e como medir qualidade
7. ML system design e arquitetura de produção
8. Como agents funcionam (LLM + tools + loop)
9. Como projetar um agent
10. Memória e estado em agents
11. Padrões agentic (building blocks)
12. Arquitetura multi-agent
13. MCP (protocolo de conexão)
14. Design de um assistente pessoal (projeto prático)
15. AI coding workflow (este post)

O objetivo nunca foi te transformar em ML engineer. Foi te dar o **vocabulário e o mapa mental** pra entender o que está acontecendo quando o time de ML pede algo, quando um bug envolve AI, ou quando você precisa projetar infra pra esses workloads.

AI engineering está se tornando parte do trabalho de todo profissional de tecnologia. Agora você tem a base pra acompanhar essa evolução sem se perder.

## Leitura complementar

- [AI Coding Workflow 101](https://lnkd.in/ds5r8TxT) (Neo Kim, System Design Newsletter)
- [GitHub Copilot documentation](https://docs.github.com/copilot)
- [Prompt engineering for developers (DeepLearning.AI)](https://www.deeplearning.ai/short-courses/chatgpt-prompt-engineering-for-developers/)
