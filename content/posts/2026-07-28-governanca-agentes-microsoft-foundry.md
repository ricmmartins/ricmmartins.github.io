---
slug: "governanca-agentes-microsoft-foundry"
translationKey: "2026/07/28/agent-governance-microsoft-foundry"
title: "Governança de Agentes no Microsoft Foundry"
description: "Como o Microsoft Foundry resolve identidade, RBAC, catálogo de tools e enforcement de políticas para agentes de IA em escala organizacional."
date: 2026-07-28T10:00:00-04:00
categories:
  - AI
  - Azure
tags:
  - microsoft-foundry
  - governanca
  - rbac
  - azure-policy
  - agentes-ia
  - entra-id
series:
  - "MCP Agentes e Infraestrutura"
---

Os quatro posts anteriores construíram agents desenhados por mim, em que eu sei exatamente o que cada tool faz e lembro de cabeça qual flag restringe o quê. Isso funciona até o momento em que outro time, sem ter lido esta série, sobe o próprio agent na mesma plataforma. A partir daí, a pergunta deixa de ser "essa tool é segura?" e passa a ser "como eu sei, no nível organizacional, o que está rodando e com quais permissões?". É nesse momento que governança deixa de ser boa prática e vira pré-requisito.

A plataforma da Microsoft para isso, agora chamada **Microsoft Foundry** (o nome que veio depois de "Azure AI Foundry"; vale conferir qual dos dois ainda aparece na sua subscription, porque o rename ainda está em rollout em alguns lugares), já cobre uma parte importante do que eu apliquei manualmente nos posts anteriores. Este post é sobre onde a plataforma resolve isso por você e onde ela não resolve, porque as duas coisas importam para quem vai assinar embaixo dessa governança.

## Hubs e projects como unidade de isolamento

A estrutura do Foundry tem duas camadas: o hub é um workspace compartilhado com compute, storage, Key Vault e Container Registry centralizados; o project é a unidade isolada dentro dele, normalmente por time. Dados, como arquivos, histórico de conversa e índices de busca, não vazam de um project para outro, mesmo quando os dois vivem sob o mesmo hub.

Aplicando isso aos agents da série: o watchdog de tokens e o diagnosticador de AKS poderiam perfeitamente morar no mesmo project, porque pertencem ao mesmo time de SRE. Mas, se o time de dados decidir construir o próprio agent em cima do mesmo hub, ele cai em um project separado por default, sem que alguém precise lembrar de configurar isolamento manualmente toda vez.

## RBAC granular: quem cria não é quem publica

O Foundry separa, por meio de roles nativas do Azure, quem pode criar um agent de quem pode publicá-lo em produção. A role mínima para publicar é `Foundry Project Manager`, distinta de `Foundry User`, que só opera dentro do que já existe. Esse é exatamente o controle que falta quando um agent nasce a partir de um script pessoal: nos posts anteriores, eu fui ao mesmo tempo quem escreveu, testou e "publicou" cada agent. Em uma organização real, essas coisas precisam ser papéis distintos, com aprovação entre uma etapa e outra. É isso que o RBAC do Foundry impõe nativamente, em vez de depender de processo informal.

## Identidade por agent, não uma credencial compartilhada

Este é o ponto que resolve mais diretamente uma dor que eu carreguei ao longo da série inteira: cada versão publicada de um agent no Foundry ganha a própria managed identity de curta duração: a Entra Agent Identity. Nos posts 1 a 4, eu insisti em least privilege e em nunca compartilhar credenciais entre agents como uma prática que você precisa lembrar de aplicar. No Foundry, isso é estrutural: não existe credencial compartilhada para esquecer de rotacionar, porque cada agent nasce com a própria identidade, escopada para a versão publicada.

## Um catálogo governado de tools/MCP, não flags costuradas

O Foundry tem um catálogo "Add Tools" onde você registra MCP servers, incluindo remotos, como o servidor de Azure DevOps já disponível no catálogo, e escolhe explicitamente qual subconjunto de tools cada agent pode usar daquele servidor. É a aplicação, em nível de plataforma, do mesmo princípio que eu apliquei com `--access-level readonly` no `aks-mcp` lá no post 1; só que agora de forma centralizada e auditável em catálogo, não por uma flag de linha de comando que só quem fez o deploy original sabe que existe. Se alguém perguntar daqui a seis meses "esse agent pode escalar um deployment?", a resposta está no catálogo, não na memória de quem configurou.

## Policy como gate de deploy, não revisão manual

Azure Policy pode bloquear automaticamente o deploy de um agent que viole uma regra de acesso a modelo, tratamento de dados ou content safety, antes mesmo de o agent começar a rodar, e não como auditoria posterior. Isso muda bastante a postura: nos posts anteriores, todo guardrail que eu construí era código meu, revisável só por mim. Policy é enforcement de plataforma, aplicado a qualquer agent publicado por qualquer time, tenha ele lido esta série de blog ou não.

## Observabilidade nativa em vez de logging artesanal

No post 3, o guardrail que eu propus para o watchdog era registrar manualmente o raciocínio por trás de cada decisão, para depois auditar por que algo virou `info` em vez de `urgent`. O Foundry já oferece isso pronto: tracing baseado em OpenTelemetry que captura cada interação do agent em produção, com evaluators nativos para coherence, relevance, groundedness e safety. Continua valendo fazer logging próprio para casos muito específicos do seu domínio; mas, para auditoria geral, é melhor aproveitar o que a plataforma já entrega do que reconstruir tudo.

## CI/CD com versionamento de verdade

RBAC por ambiente (dev, test, production), somente um service principal de pipeline com token OIDC auditado promovendo entre eles, e rollback que é só apontar o ponteiro de versão ativa para trás, sem redeploy. Isso fecha uma pergunta que nenhum dos posts anteriores tratou: quem mudou este agent, quando, e como eu volto para a versão anterior sem reconstruir nada na unha?

## Provisionando hub e project via Terraform

Hub e project do Foundry têm recursos nativos no provider `azurerm`: `azurerm_ai_foundry` (o hub) e `azurerm_ai_foundry_project` (o project), confirmados no Terraform Registry:

```hcl
resource "azurerm_ai_foundry" "hub" {
  name                = "hub-sre-ai"
  location            = azurerm_resource_group.ai.location
  resource_group_name = azurerm_resource_group.ai.name
  storage_account_id  = azurerm_storage_account.ai.id
  key_vault_id        = azurerm_key_vault.ai.id

  identity {
    type = "SystemAssigned"
  }
}

resource "azurerm_ai_foundry_project" "watchdog" {
  name               = "project-watchdog-429"
  location           = azurerm_ai_foundry.hub.location
  ai_services_hub_id = azurerm_ai_foundry.hub.id

  identity {
    type = "SystemAssigned"
  }
}
```

Isso te dá isolamento por project diretamente no state do Terraform: cada novo time que precisa de um project vira mais um bloco, revisável em pull request, em vez de alguém clicando no portal e depois ninguém lembrar mais do que foi feito.

## O que a plataforma ainda não resolve sozinha

Existem limites, porém, e "a plataforma cuida disso" é uma das frases que mais geram falsa sensação de segurança. O plano de proteção para workloads de IA no Defender for Cloud (em preview no começo de 2026) cobre detecção de prompt injection, volume anômalo de inferência e acesso vindo de geolocalizações inesperadas; mas não cobre integridade dos dados de grounding (writes em containers de RAG) nem lateral movement da managed identity entre hub e Key Vault. Governança de plataforma centraliza e formaliza o que você já deveria estar fazendo; ela não pensa por você sobre quais tools um agent específico realmente precisa. Esse continua sendo o seu trabalho de design, no mesmo exercício tool-by-tool que fizemos ao longo dos quatro posts anteriores.

Para fechar com algo prático: você pode monitorar mudanças em content safety ou em policy de RAI diretamente via Log Analytics, tratando isso como mudança de configuração de segurança, não como operação rotineira de ML:

```kql
AzureActivity
| where OperationNameValue contains "contentFilters" or OperationNameValue contains "raiPolicies"
| where ResourceId contains "MachineLearningServices"
| where ActivityStatus == "Succeeded"
| project TimeGenerated, Caller, OperationNameValue, ResourceId, ActivityStatus
| order by TimeGenerated desc
```

## Fechando a série

Cinco posts, do conceito à governança: o que é MCP e como um agent decide sozinho a sequência de chamadas; um watchdog que começou como script determinístico e só depois ganhou raciocínio, com o guardrail de nunca ganhar poder para agir; um orquestrador que correlaciona dois agents sem criar uma nova superfície de ataque; e agora a camada de plataforma que formaliza tudo isso para além do que cabe na memória de quem escreveu o código.

O fio condutor dos cinco posts é sempre o mesmo: autonomia para decidir, sim; autonomia para agir em produção, não. A menos que isso seja uma escolha explícita, auditável e revisada, nunca um acidente de configuração. Isso vale para o `--access-level readonly` em uma flag de linha de comando, e vale para o catálogo de tools de uma plataforma inteira da Microsoft, numa escala completamente diferente.

Se a sua empresa está exatamente nesse ponto, com vários times subindo agents sem coordenação e ninguém ainda sabe como olhar isso centralmente, esse é o tipo de desenho em que eu gosto de ajudar. Fico feliz em conversar se isso for útil.

**Companion repo**: eu reuni todo o Terraform usado do post 2 ao post 5: Cognitive Account/Deployment, Action Group, Metric Alert, managed identity com RBAC, hub e project do Foundry, em um único arquivo comentado por post, em `infra/terraform/main.tf`.

---

*Este é o post 5 da série "MCP, Agentes e Times de Agentes para Engenheiros de Infraestrutura":*

1. [MCP e Agentes 101](/mcp-e-agentes-101-para-engenheiros-de-infra/)
2. [O Watchdog 429 Determinístico](/watchdog-429-deterministico-azure-openai/)
3. [De Script a Agente](/watchdog-agente-autonomia-decisao-guardrails/)
4. [Orquestração Multi-Agentes](/orquestracao-multi-agentes-aks-openai-correlacao/)
5. **[Governança no Microsoft Foundry](/governanca-agentes-microsoft-foundry/)**

*Repositório companion: [agentic-infra-handbook](https://github.com/ricmmartins/agentic-infra-handbook)*

*Read this post in [English](https://rmmartins.com/2026/07/28/agent-governance-microsoft-foundry/).*
