---
slug: "implementando-um-assistente-pessoal-com-ia-no-azure"
aliases:
  - "/posts/implementando-um-assistente-pessoal-com-ia-no-azure/"
title: "Implementando um assistente pessoal com IA no Azure, passo a passo"
description: "Da arquitetura ao código: FastAPI, Azure OpenAI, Azure AI Search, Managed Identity, ferramentas com confirmação, Container Apps e observabilidade."
date: 2026-08-03T10:00:00-04:00
categories:
  - AI
  - Azure
tags:
  - ai-engineering
  - azure-openai
  - azure-ai-search
  - container-apps
  - managed-identity
  - projeto-pratico
series:
  - "AI por dentro: de tokens a agents"
---

No [post anterior](/projetando-um-assistente-ai-pessoal/), eu desenhei um assistente que consulta runbooks, mantém contexto e chama ferramentas de infraestrutura. A arquitetura fazia sentido, mas ainda tinha um problema: os exemplos eram recortes. Faltavam os arquivos que conectam uma parte à outra.

Este post fecha essa lacuna. Vamos partir de uma aplicação que roda localmente sem Azure e levar a mesma vertical slice para Container Apps, Azure OpenAI e Azure AI Search.

O código está no repositório [agentic-infra-handbook](https://github.com/ricmmartins/agentic-infra-handbook/tree/master/labs/personal-assistant), em `labs/personal-assistant`. O README do lab também traz um [passo a passo independente para executar o projeto localmente e fazer o deploy no Azure](https://github.com/ricmmartins/agentic-infra-handbook/tree/master/labs/personal-assistant#deploy-to-azure-step-by-step), incluindo App Registration, configuração do AZD, callback de autenticação, validação e limpeza dos recursos.

O README é a referência operacional deste post. Ele contém os comandos completos, validações de versão, preflight, troubleshooting e cleanup. Aqui eu explico as decisões e mostro o caminho; quando houver diferença, use o README do lab.

## O que vamos entregar

Ao final, teremos:

- uma API FastAPI com endpoint de chat;
- RAG sobre runbooks em Markdown;
- Azure AI Search com busca híbrida e semantic ranker;
- Azure OpenAI autenticado por Microsoft Entra ID;
- uma ferramenta de leitura;
- uma ação de escrita que só vira execução depois da confirmação;
- identidade do usuário validada pelo Easy Auth do Azure Container Apps e restrita a usuários ou grupos aprovados;
- telemetria no Application Insights;
- uma imagem publicada no Azure Container Registry;
- uma API rodando no Azure Container Apps.

Eu cortei duas partes da primeira entrega de propósito. A memória curta fica em processo e a memória longa fica atrás de uma interface sem implementação. Isso permite provar o fluxo inteiro antes de pagar por Azure Managed Redis e Cosmos DB.

Também mantive a criação de incidentes em um adapter simulado. O controle de aprovação é real. A mutação em um sistema de ITSM não é. Antes de ligar ServiceNow, Jira ou outro sistema, precisamos testar autorização, idempotência e auditoria com algo que não abra chamados de verdade.

Esta é uma referência didática, não uma baseline pronta para produção. Ela mantém rede pública para OpenAI e Search, um índice compartilhado sem ACL por documento, estado em memória, uma réplica, sem rate limiting, sem expiração de ações pendentes e sem token CSRF explícito na confirmação do navegador.

| Caminho | Implementado nesta etapa |
|---------|--------------------------|
| Execução local | Sim, sem assinatura Azure |
| FastAPI e agent loop | Sim |
| RAG local | Sim |
| Azure OpenAI | Sim |
| Azure AI Search | Sim |
| Ferramenta de leitura | Sim, com métricas determinísticas |
| Aprovação para escrita | Sim |
| Integração real com ITSM | Não, adapter simulado |
| Azure Managed Redis | Interface pronta, implementação posterior |
| Cosmos DB para memória longa | Interface pronta, implementação posterior |

Esse escopo menor não é um atalho. Ele evita descobrir cinco problemas de infraestrutura ao mesmo tempo sem saber qual deles quebrou a resposta.

![Assistente respondendo com RAG e citações dos runbooks](/img/personal-assistant-rag-citations.gif)

*A resposta usa Azure AI Search e mostra os runbooks que fundamentaram cada recomendação.*

## Estrutura do projeto

**Código existente — não copie/não execute.** Esta árvore mostra os arquivos que já existem no repositório.

```text
labs/personal-assistant/
├── docs/runbooks/
├── infra/
│   ├── app.bicep
│   ├── main.bicep
│   └── main.parameters.json
├── scripts/
│   ├── preflight.ps1
│   └── smoke-test.ps1
├── src/personal_assistant/
│   ├── actions.py
│   ├── agent.py
│   ├── app.py
│   ├── audit.py
│   ├── bootstrap.py
│   ├── config.py
│   ├── identity.py
│   ├── llm.py
│   ├── memory.py
│   ├── observability.py
│   ├── rag.py
│   └── tools.py
├── tests/
├── .env.example
├── azure.yaml
├── Dockerfile
└── pyproject.toml
```

O projeto usa Python 3.12 e PowerShell 7.4 ou posterior. Para acompanhar o tutorial, você também precisa de:

- Git;
- Azure CLI;
- Azure Developer CLI;
- `Contributor` para criar recursos e `User Access Administrator` ou `Role Based Access Control Administrator` para atribuir roles, ou `Owner`;
- permissão para registrar uma aplicação no Microsoft Entra;
- quota para dois deployments de modelo na região escolhida;
- um segundo usuário do Microsoft Entra, com object ID conhecido, para concluir a validação de ownership no Azure.

Docker local é opcional. O `azure.yaml` usa build remoto no Azure Container Registry.

Antes de começar, confirme as versões:

**Execute — PowerShell.**

```powershell
$PSVersionTable.PSVersion
py -3.12 --version
az version
az bicep version
azd version
```

## 1. Rode local antes de criar qualquer recurso

Clone o repositório e entre no lab:

**Execute — PowerShell.**

```powershell
git clone https://github.com/ricmmartins/agentic-infra-handbook.git
Set-Location .\agentic-infra-handbook\labs\personal-assistant

if (-not (Test-Path .\azure.yaml) -or -not (Test-Path .\pyproject.toml)) {
  throw "Execute este tutorial a partir de agentic-infra-handbook\labs\personal-assistant."
}

.\scripts\preflight.ps1 -LocalOnly
Copy-Item .env.example .env
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -e ".[dev]"
python -m pytest -q
```

O `.env.example` começa assim:

**Código existente — não copie/não execute.** O arquivo já vem configurado para o modo local.

```dotenv
APP_ENV=development
APP_HOST=127.0.0.1
APP_PORT=8000
MODEL_BACKEND=fake
RAG_BACKEND=local
MEMORY_BACKEND=in_memory
```

Com esses valores, a aplicação não tenta acessar o Azure. O modelo é determinístico, os documentos vêm de `docs/runbooks` e a memória existe apenas durante o processo.

Suba a API:

**Execute — PowerShell.**

```powershell
personal-assistant-api
```

Em outro terminal:

**Execute — PowerShell.**

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://127.0.0.1:8000/chat `
  -ContentType 'application/json' `
  -Body '{"session_id":"demo-1","message":"Quais cabeçalhos de identidade o app lê no Azure?"}'
```

A resposta inclui texto, citações e, quando houver uma operação sensível, uma `pending_action`.

**Saída esperada.** Os textos variam, mas uma consulta de leitura tem este formato:

```json
{
  "answer": "...",
  "citations": [
    {
      "source": "01-container-apps-auth.md",
      "title": "..."
    }
  ],
  "pending_action": null
}
```

A suíte atual executa 15 casos (`15 passed`). Um teste parametrizado gera dois casos; em conjunto, eles cobrem o fluxo local e contratos que costumam quebrar só depois do deploy:

1. o chat devolve resposta e fonte;
2. uma ação de escrita fica pendente;
3. nada é criado antes da confirmação;
4. outro usuário não consegue confirmar a ação;
5. confirmações concorrentes criam um único incidente;
6. repetir a confirmação devolve o mesmo resultado;
7. argumentos de ferramentas são validados;
8. o schema do Search usa o analyzer `en.microsoft`, alinhado aos runbooks em inglês;
9. uma service principal autenticada pode ser resolvida mesmo sem nome de usuário;
10. o envelope de identidade do Easy Auth precisa ser íntegro e coerente;
11. a auditoria enviada à telemetria não expõe nome, object ID, título ou payload da ação.

O quarto teste parece detalhe até você imaginar dois usuários dividindo o mesmo backend. Um UUID difícil de adivinhar não substitui autorização.

## 2. Como o desenvolvimento local se separa da identidade gerenciada

No notebook do desenvolvedor, `DefaultAzureCredential` é conveniente porque encontra a sessão do Azure CLI. Dentro do Container App, prefiro uma credencial determinística.

**Código existente — não copie/não execute.** Este recorte explica a seleção de credencial já implementada em `bootstrap.py`.

```python
from azure.identity import DefaultAzureCredential, ManagedIdentityCredential


def build_token_credential(config):
    if config.is_development:
        return DefaultAzureCredential()

    return ManagedIdentityCredential(
        client_id=config.managed_identity_client_id
    )
```

Para identidade atribuída pelo sistema, `managed_identity_client_id` fica vazio. Se você anexar uma identidade atribuída pelo usuário, informe o client ID explicitamente.

Essa diferença evita que o ambiente de produção percorra uma cadeia de credenciais que só faz sentido no computador do desenvolvedor.

## 3. Como o Azure OpenAI é conectado sem API key

O cliente usa o endpoint v1 da API OpenAI:

**Código existente — não copie/não execute.** Este recorte omite o restante do adapter e serve apenas para explicar a autenticação.

```python
from azure.identity import get_bearer_token_provider
from openai import OpenAI


token_provider = get_bearer_token_provider(
    build_token_credential(config),
    "https://ai.azure.com/.default",
)

client = OpenAI(
    base_url=f"{config.azure_openai_endpoint.rstrip('/')}/openai/v1/",
    api_key=token_provider,
)
```

O valor passado em `model` é o nome do deployment, não necessariamente o nome comercial do modelo:

**Código existente — não copie/não execute.**

```python
response = client.chat.completions.create(
    model=config.azure_openai_chat_deployment,
    messages=messages,
    tools=tools,
    tool_choice="auto",
)
```

O exemplo não envia `temperature`. O deployment usado no teste real foi `gpt-5-mini`, versão `2025-08-07`, que não aceita esse parâmetro nessa configuração.

Para embeddings, fixei `text-embedding-3-small` em 1536 dimensões:

**Código existente — não copie/não execute.**

```python
response = client.embeddings.create(
    model=config.azure_openai_embedding_deployment,
    input=text,
    dimensions=1536,
)
```

O modelo permite usar menos dimensões, mas o índice e as consultas precisam concordar. Trocar esse valor em um lugar e esquecer o outro produz erro ou, pior, uma migração de índice no meio do projeto.

## 4. Como funciona o índice vetorial do Azure AI Search

O adapter cria o índice de forma idempotente. Estes são os campos relevantes:

**Código existente — não copie/não execute.** Este é apenas o campo vetorial dentro do schema completo.

```python
{
    "name": "content_vector",
    "type": "Collection(Edm.Single)",
    "searchable": True,
    "retrievable": False,
    "stored": False,
    "dimensions": 1536,
    "vectorSearchProfile": "content-vector-profile",
}
```

O vetor não volta na resposta. O modelo recebe título, fonte e conteúdo, que são os campos úteis para citar.

A consulta combina texto e vetor:

**Código existente — não copie/não execute.** Este é o payload montado pelo adapter.

```python
payload = {
    "search": query,
    "queryType": "semantic",
    "semanticConfiguration": "runbook-semantic",
    "select": "id,title,source,content",
    "top": 3,
    "vectorQueries": [
        {
            "kind": "vector",
            "vector": query_vector,
            "fields": "content_vector",
            "k": 50,
            "weight": 2,
        }
    ],
}
```

O Search executa as partes lexical e vetorial em paralelo, combina os resultados com Reciprocal Rank Fusion e aplica o semantic ranker. `top=3` controla quantos documentos voltam para o prompt. `k=50` deixa candidatos suficientes para o reranking.

### Como separar a indexação ao sair do lab

Eu separaria as identidades assim:

| Identidade | Roles no Search |
|------------|-----------------|
| Pipeline de indexação | Search Service Contributor + Search Index Data Contributor |
| API do assistente | Search Index Data Reader |

A identidade da API consulta. A identidade do pipeline altera schema e documentos. Se o Container App também conseguir recriar o índice, uma vulnerabilidade no chat ganhou um caminho de escrita que não precisava existir.

No lab, `BOOTSTRAP_RAG_ON_STARTUP=true` existe para facilitar o primeiro deploy. Por isso, o template atribui Search Service Contributor e Search Index Data Contributor à identidade do Container App. Em produção, mova a ingestão para um job, deixe `BOOTSTRAP_RAG_ON_STARTUP=false` e reduza a API para Search Index Data Reader.

## 5. Como o agent loop funciona

O núcleo recebe a identidade, recupera documentos e carrega o histórico da sessão. A chave da memória inclui o ID do usuário:

**Código existente — não copie/não execute.**

```python
memory_session_id = f"{actor.actor_id}:{session_id}"
history = memory_store.get_history(memory_session_id)
documents = knowledge_base.search(message)
```

Isso impede que duas pessoas que escolheram `session_id="demo"` compartilhem contexto por acidente.

Depois, o loop chama o modelo no máximo três vezes:

**Código existente — não copie/não execute.** O recorte destaca o limite de iterações; a implementação completa permanece no repositório.

```python
for _ in range(3):
    turn = model.complete(messages=messages, tools=tool_registry.schemas)

    if turn.tool_calls:
        messages.append(turn.as_assistant_message())

        for tool_call in turn.tool_calls:
            result = tool_registry.execute(
                session_id=session_id,
                actor=actor,
                tool_name=tool_call.name,
                arguments=tool_call.arguments,
            )
            messages.append(result.as_tool_message(tool_call.id))

        continue

    return ChatResponse(
        answer=turn.content,
        citations=citations,
        pending_action=pending_action,
    )
```

O limite evita um modelo preso em chamadas de ferramenta. Em produção, eu também registraria o motivo do término: resposta final, limite de iterações, timeout ou erro de ferramenta.

## 6. Como leitura e escrita seguem caminhos diferentes

A ferramenta de métricas é somente leitura:

**Código existente — não copie/não execute.** Este é o schema da ferramenta registrado pela aplicação.

```python
{
    "type": "function",
    "function": {
        "name": "get_resource_metrics",
        "description": "Return metrics for a named resource.",
        "parameters": {
            "type": "object",
            "properties": {
                "resource_name": {"type": "string"},
                "window_minutes": {
                    "type": "integer",
                    "minimum": 5,
                    "maximum": 60,
                },
            },
            "required": ["resource_name"],
        },
    },
}
```

No lab, ela devolve números determinísticos. Trocar pelo Azure Monitor significa substituir um adapter, não reescrever o agent loop.

`create_incident` segue outro caminho. A chamada do modelo apenas cria um registro pendente:

**Código existente — não copie/não execute.**

```python
record = pending_action_service.create_incident_request(
    session_id=session_id,
    actor=actor,
    title=arguments["title"],
    summary=arguments["summary"],
    severity=arguments["severity"],
)
```

O usuário recebe um `action_id` e uma prévia. Nenhum incidente existe ainda.

![Fluxo de criação de incidente com confirmação explícita](/img/personal-assistant-confirmation-flow.gif)

*O modelo prepara a ação, mas o backend só executa a escrita depois da confirmação explícita do usuário.*

Para confirmar:

**Execute — PowerShell.** Use este fluxo somente no modo local; no Azure, a identidade vem da sessão autenticada do navegador.

```powershell
$chat = Invoke-RestMethod `
  -Method Post `
  -Uri http://127.0.0.1:8000/chat `
  -ContentType 'application/json' `
  -Body '{"session_id":"demo-2","message":"Abra um incidente para CPU alta no payments-api"}'

Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:8000/actions/$($chat.pending_action.action_id)/confirm" `
  -ContentType 'application/json' `
  -Body '{"confirm":true}'
```

O backend verifica três coisas:

1. a confirmação veio explícita;
2. a ação ainda está pendente;
3. o usuário autenticado é quem pediu a ação.

Só depois o adapter de incidente é executado. No lab, ele cria `INC-0001` em memória. Para conectar um ITSM real, preserve essa ordem e acrescente:

- idempotency key;
- timeout e retry limitados;
- validação de severidade e time responsável;
- armazenamento durável do estado;
- trilha de auditoria fora do processo.

## 7. Como a identidade validada pelo Container Apps chega à API

Azure Container Apps tem autenticação integrada. Quando o Microsoft Entra ID está configurado, o middleware da plataforma valida o usuário antes de entregar a requisição e injeta cabeçalhos como:

- `X-MS-CLIENT-PRINCIPAL-ID`;
- `X-MS-CLIENT-PRINCIPAL-NAME`.

A API lê os dois:

**Código existente — não copie/não execute.**

```python
actor_id = request.headers.get("X-MS-CLIENT-PRINCIPAL-ID")
actor_name = request.headers.get("X-MS-CLIENT-PRINCIPAL-NAME")

if actor_id:
    return ActorContext(
        actor_id=actor_id,
        actor_name=actor_name or actor_id,
        used_local_fallback=False,
    )
```

Tokens app-only podem não ter um nome de usuário. Nesse caso, o ID do principal continua sendo o identificador estável para autorização. O fallback local só existe quando `APP_ENV=development`. Em Azure, a aplicação exige o ID e o envelope canônico `X-MS-CLIENT-PRINCIPAL`, verifica o provedor `aad` e rejeita claims inconsistentes com `401`.

Isso depende de manter a porta da aplicação acessível somente pelo ingress gerenciado com Easy Auth. Esses headers não têm uma assinatura verificável pela aplicação. Se você introduzir qualquer caminho alternativo até a porta 8000, valide o bearer token dentro da aplicação em vez de confiar nos headers.

## 8. Como o template provisiona os recursos

O deploy usa Azure Developer CLI e Bicep. `infra/main.bicep` roda no escopo da assinatura, cria um resource group isolado e chama `infra/app.bicep`.

O módulo cria:

- Log Analytics e Application Insights;
- Azure Container Registry Basic, sem usuário administrador;
- uma identidade atribuída pelo usuário para o pull da imagem;
- Azure OpenAI com `gpt-5-mini` e `text-embedding-3-small`;
- Azure AI Search Basic, sem autenticação por chave;
- Container Apps Environment;
- Container App com identidade atribuída pelo sistema;
- roles para ACR, OpenAI e Search;
- autenticação integrada com Microsoft Entra ID;
- probes de startup, liveness e readiness.

O Search tem um parâmetro de região separado. No deploy que usei para validar este artigo, East US 2 não tinha capacidade para um novo serviço Basic. Mover apenas o Search para East US resolveu o problema sem espalhar a aplicação por várias regiões sem necessidade.

Os deployments usados no teste foram:

| Uso | Deployment | Modelo |
|-----|------------|--------|
| Chat e ferramentas | `assistant-chat` | `gpt-5-mini`, versão `2025-08-07` |
| Embeddings | `assistant-embedding` | `text-embedding-3-small`, versão `1`, 1536 dimensões |

Modelos e versões mudam. Confirme disponibilidade e quota na sua assinatura antes de executar o Bicep. O lab recebe modelo, versão, SKU, capacidade e dimensão por parâmetros do ambiente AZD; não é necessário editar o Bicep para adaptar esses valores.

O template mantém uma réplica. Como sessão e ações pendentes ainda vivem em memória, duas réplicas poderiam separar a criação da confirmação. Resolva o armazenamento compartilhado antes de aumentar `maxReplicas`.

## 9. Crie o App Registration

O Bicep configura a autenticação do Container App, mas recebe o client ID de um App Registration existente. Execute as seções [Create the Microsoft Entra App Registration](https://github.com/ricmmartins/agentic-infra-handbook/tree/master/labs/personal-assistant#6-create-the-microsoft-entra-app-registration) e [Create a short-lived Easy Auth credential](https://github.com/ricmmartins/agentic-infra-handbook/tree/master/labs/personal-assistant#7-create-a-short-lived-easy-auth-credential) do README.

Esse script cria uma aplicação single-tenant, o escopo `api://<client-id>/user_impersonation`, tokens v2, ID tokens para o fluxo do Easy Auth e `groupMembershipClaims = "SecurityGroup"`. A chamada ao Microsoft Graph usa o esquema Bearer no cabeçalho `Authorization` e valida o estado resultante antes de continuar. Sem `enableIdTokenIssuance`, o callback pode falhar com `AADSTS700054`.

Não repliquei aqui um fragmento do script porque criar apenas o secret sem validar aplicação, service principal, token v2, ID token e escopo deixa o ambiente em um estado ambíguo. O README é a fonte operacional e também cobre prazo, armazenamento e rotação da credencial.

Alguns tenants exigem consentimento de administrador. Não contorne essa política com uma conta pessoal ou um tenant diferente.

`/healthz` fica fora da autenticação para atender os probes. Com `RedirectToLoginPage`, uma requisição anônima às rotas protegidas recebe `302` para o provedor de login. Um token inválido ou um ator que não pertence às allowlists pode receber `401` ou `403`, dependendo da etapa que rejeitou a requisição.

## 10. Configure o ambiente do AZD

Entre com a conta correta no Azure CLI e no Azure Developer CLI:

**Execute — PowerShell.** Antes, defina `$tenantId` e `$subscriptionId` conforme o [passo 5 do README](https://github.com/ricmmartins/agentic-infra-handbook/tree/master/labs/personal-assistant#5-select-the-tenant-subscription-regions-and-models).

```powershell
az login --tenant $tenantId
az account set --subscription $subscriptionId
azd auth login
azd auth status
```

Crie o ambiente e grave todos os parâmetros executando a seção [Create and validate the AZD environment](https://github.com/ricmmartins/agentic-infra-handbook/tree/master/labs/personal-assistant#8-create-and-validate-the-azd-environment) do README. Ela define regiões, modelos, capacidades, allowlists, client ID e secret como uma unidade. Mantenha a mesma sessão PowerShell desde a seleção do tenant até essa etapa.

Use a mesma região para `AZURE_LOCATION` e `AZURE_SEARCH_LOCATION` quando houver capacidade. Separar as duas é uma saída para indisponibilidade regional, não uma recomendação automática.

Antes de criar recursos, registre os providers do passo 5 e execute o preflight Azure completo do passo 8. Não monte a chamada a partir de parâmetros isolados deste artigo; o README acompanha a assinatura atual do script.

O `azure.yaml` usa `remoteBuild: true`. O AZD envia o contexto para o ACR, compila a imagem lá e injeta `SERVICE_API_IMAGE_NAME` no Bicep. Isso evita a dependência de Docker local e impede que um novo `azd provision` restaure uma imagem placeholder.

`AUTH_CLIENT_SECRET` entra no Bicep como parâmetro seguro e é armazenado como secret do Container App. Ele não deve aparecer no repositório.

O comando `azd env set` também grava o valor no arquivo local `.azure/<ambiente>/.env`. Esse diretório está no `.gitignore`, mas o arquivo não é criptografado. Proteja o diretório com as permissões do usuário e remova o valor local depois do provisionamento:

**Execute — PowerShell.** Faça isso somente depois de o provisionamento ter enviado o secret ao Container App.

```powershell
azd env set AUTH_CLIENT_SECRET ''
```

O AZD 1.24.1 não oferece `env unset`; definir uma string vazia remove o valor sensível, embora preserve a chave. Para uma atualização futura do Easy Auth, gere um novo secret, execute `azd env set`, rode `azd provision` e limpe novamente o valor local.

## 11. Valide antes de provisionar

Compile o Bicep e rode os testes:

**Execute — PowerShell.**

```powershell
az bicep build --file infra\main.bicep --stdout | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Falha ao compilar o Bicep." }
python -m pytest -q
```

Confira o que o Azure pretende criar:

**Execute — PowerShell.** O preview consulta sua assinatura, mas não cria intencionalmente os recursos.

```powershell
azd provision --preview --no-prompt
```

Não execute `azd package` neste lab. Para um serviço Docker, esse comando tenta empacotar localmente, enquanto `remoteBuild: true` envia o source ao ACR durante `azd up`. O preview não reserva capacidade; Search e deployments de modelo ainda podem falhar se quota ou capacidade regional mudarem.

## 12. Faça o deploy

Com o ambiente validado:

**Produção.** Execute no PowerShell; este comando cria recursos Azure faturáveis.

```powershell
azd up
```

O comando provisiona a infraestrutura, executa o build remoto e publica a API. No final, o output `API_URL` já inclui `https://`.

Agora registre o callback e abra a aplicação:

**Execute — PowerShell.**

```powershell
$appUrl = azd env get-value API_URL
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($appUrl)) {
  throw "O AZD não retornou API_URL."
}
$clientId = azd env get-value AUTH_CLIENT_ID
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($clientId)) {
  throw "O AZD não retornou AUTH_CLIENT_ID."
}
$redirectUri = "$($appUrl.TrimEnd('/'))/.auth/login/aad/callback"

az ad app update `
  --id $clientId `
  --web-redirect-uris $redirectUri
if ($LASTEXITCODE -ne 0) {
  throw "Não foi possível registrar o callback do Easy Auth."
}

azd env set AUTH_CLIENT_SECRET ''
Start-Process $appUrl
```

O navegador redireciona para o login Microsoft e volta para uma interface de chat. A página mostra as fontes do RAG, consulta métricas e apresenta um botão de confirmação quando o modelo prepara uma ação sensível.

Para publicar apenas uma mudança no código:

**Opcional.** Execute no PowerShell apenas quando a infraestrutura não mudou.

```powershell
azd deploy api
```

O startup cria o índice e ingere os Markdown de `/app/docs/runbooks`. O `Dockerfile` define `DOCS_PATH` explicitamente porque o pacote Python instalado não é o diretório onde os documentos foram copiados.

Na primeira subida, o bootstrap pode demorar enquanto gera embeddings e aguarda a propagação das roles. A startup probe tolera esse período. Falhas continuam visíveis nos logs, em vez de serem convertidas em um health check enganoso.

## 13. RBAC e autenticação sem chaves

A identidade atribuída pelo sistema recebe:

| Recurso | Role |
|---------|------|
| Azure OpenAI | Cognitive Services OpenAI User |
| Azure AI Search | Search Service Contributor |
| Azure AI Search | Search Index Data Contributor |

A identidade atribuída pelo usuário recebe `AcrPull`. O ACR aceita autenticação do ARM e mantém `adminUserEnabled=false`.

Essas roles do Search atendem ao bootstrap do lab. Depois de mover a ingestão para um job, deixe o runtime apenas com Search Index Data Reader.

O Search e o Azure OpenAI usam `disableLocalAuth=true`. Não existe API key no código nem nas variáveis do Container App. Em desenvolvimento, `DefaultAzureCredential` aproveita a sessão local. No Azure, `ManagedIdentityCredential` usa a identidade do Container App.

A configuração de Easy Auth redireciona navegadores anônimos para o Microsoft Entra ID e aceita os audiences:

**Saída esperada.** O template deve produzir exatamente estes dois formatos de audience:

```text
<client-id>
api://<client-id>
```

Ela também restringe tokens app-only ao client ID autorizado. Isso não limita usuários interativos. O template usa `allowedPrincipals` com `AUTH_ALLOWED_PRINCIPAL_IDS` e `AUTH_ALLOWED_GROUP_IDS` para permitir somente object IDs aprovados. O secret do provedor fica no secret store do Container App e precisa ser rotacionado.

## 14. Observe o fluxo no Application Insights

O pacote `azure-monitor-opentelemetry` usa a variável `APPLICATIONINSIGHTS_CONNECTION_STRING` entregue pelo Bicep:

**Código existente — não copie/não execute.**

```python
from azure.monitor.opentelemetry import configure_azure_monitor


if config.applicationinsights_connection_string:
    configure_azure_monitor(
        connection_string=config.applicationinsights_connection_string
    )
```

O código cria spans para chat, RAG e ferramentas. Ele registra contagens, backend usado e presença de ação pendente. Não envia o texto da pergunta como atributo de telemetria.

Esse cuidado evita transformar Application Insights em uma cópia dos prompts ou do incidente. A telemetria de auditoria contém apenas o tipo do evento, `action_id` e `actor_ref`, uma referência derivada de SHA-256 truncado. Nome, object ID, session ID, título, detalhes e resultado não são enviados ao Application Insights.

No smoke test, os spans `chat.request`, `rag.search` e `tool.execute` apareceram em `dependencies`. A trilha do incidente registrou `pending_action_created`, `pending_action_confirmed` e `pending_action_result`.

Consultas úteis:

**Execute — Application Insights.** Cole esta consulta em **Logs** para resumir os spans.

```kusto
dependencies
| where name in ("chat.request", "rag.search", "tool.execute")
| summarize calls=count(), failures=countif(success == false) by name
| order by failures desc
```

**Execute — Application Insights.** Cole esta consulta em **Logs** para inspecionar os eventos de auditoria minimizados.

```kusto
traces
| where message startswith "audit_event=pending_action"
| project timestamp, message
| order by timestamp desc
```

## 15. Teste o fluxo no Azure

Para concluir todos os oito checks, inclua o object ID de um segundo usuário em `AUTH_ALLOWED_PRINCIPAL_IDS` antes do provisionamento. Esse usuário precisa conseguir abrir `/me`, mas não pode ser quem cria a ação pendente. Sem ele, o check de ownership não está concluído.

Recupere a URL e espere o health check:

**Execute — PowerShell.**

```powershell
$appUrl = azd env get-value API_URL

Invoke-RestMethod "$appUrl/healthz"
```

Abra `$appUrl` em uma janela sem sessão. A resposta anônima esperada nas rotas protegidas é `302`, seguida do login Microsoft. O script `.\scripts\smoke-test.ps1 -AppUrl $appUrl` valida o health endpoint e esse redirect sem precisar de credenciais. Os demais testes usam uma sessão autenticada no navegador.

Depois do login do usuário principal, confirme a identidade:

**Execute — console do navegador.**

```javascript
const meResponse = await fetch("/me");
if (!meResponse.ok) throw new Error(`${meResponse.status}: ${await meResponse.text()}`);
console.table(await meResponse.json());
```

Teste primeiro uma pergunta que só usa RAG. Depois, uma pergunta que chama a ferramenta de leitura. Por último, peça a criação de um incidente e confirme que:

1. `/healthz` responde e uma rota protegida redireciona com `302`;
2. `/me` mostra o object ID aprovado;
3. uma pergunta de runbook devolve citações;
4. a ferramenta de métricas não cria uma ação pendente;
5. o pedido de incidente devolve `pending_action`, mas nenhum `incident_id`;
6. um segundo usuário aprovado acessa o app, mas recebe o `403` de ownership ao confirmar a ação de outra pessoa;
7. o solicitante confirma duas vezes e recebe o mesmo `incident_id` não vazio;
8. Application Insights contém os spans e os eventos de auditoria minimizados.

O README traz helpers JavaScript copiáveis para executar esses checks no console do navegador e a consulta KQL correspondente.

No ambiente de validação, o login interativo voltou para a interface, o RAG devolveu três citações e a ferramenta de métricas respondeu. O pedido de incidente exibiu a confirmação na tela e criou o incidente somente depois do clique. O Container App ficou em modo de revisão única, com 100% do tráfego e uma réplica.

## E a memória com Redis e Cosmos DB?

Azure Cache for Redis está em processo de aposentadoria. Para novos projetos, use Azure Managed Redis.

O serviço usa Microsoft Entra ID por padrão e aceita tokens no escopo:

**Código existente — não copie/não execute.** Este é o escopo solicitado pelo client Redis ao obter o token.

```text
https://redis.azure.com/.default
```

O client usa o object ID da identidade como usuário e o token como senha. O token precisa ser renovado antes de expirar. Não basta obter um token no startup e manter a conexão por dias.

No código, a memória já depende de um protocolo:

**Código existente — não copie/não execute.**

```python
class ConversationMemoryStore(Protocol):
    def append(self, session_id: str, role: str, content: str) -> None: ...
    def get_history(self, session_id: str) -> list[dict[str, str]]: ...
```

Uma implementação com Azure Managed Redis pode substituir o store em memória sem alterar o agente. Ela também libera escala horizontal, desde que as ações pendentes saiam do processo pelo mesmo motivo.

Para memória longa, Cosmos DB vector search continua fazendo sentido, mas exige decisões que não deveriam entrar escondidas em um snippet:

- partition key;
- política vetorial;
- dimensão do embedding;
- tipo de índice;
- TTL e política de exclusão;
- consentimento para gravar preferências;
- separação por usuário ou tenant.

Políticas e índices vetoriais do container são imutáveis depois da criação. Escolha isso antes de carregar dados. Eu colocaria a memória longa em uma terceira etapa, depois de medir quais fatos realmente voltam a ser úteis.

## O que eu mudaria antes de produção

Esta vertical slice prova a arquitetura. Ainda faltam alguns controles:

- persistir sessões e ações pendentes fora do processo;
- separar o pipeline de ingestão do runtime;
- aplicar ACL por documento no Search;
- trocar métricas simuladas por um adapter do Azure Monitor com escopo restrito;
- integrar um ITSM com idempotência;
- adicionar private endpoints se o ambiente exigir isolamento de rede;
- criar evals de recuperação, groundedness e tool selection;
- definir retenção e exclusão de memória por usuário;
- adicionar rate limiting por identidade.

O ponto é saber exatamente o que falta. Isso é melhor do que chamar uma demo de "production-ready" porque ela respondeu três perguntas no notebook.

## Limpeza

Use primeiro o cleanup controlado pelo AZD, que conhece o estado do ambiente:

**Cleanup.** Execute no PowerShell somente depois de revisar o ambiente ativo; o comando remove recursos.

```powershell
azd down --purge
```

Depois remova as credenciais `container-app-easy-auth`, o App Registration e qualquer service principal residual, e limpe o diretório `.azure\<ambiente>`. Se você usou `azd env set-secret`, remova também o segredo do Key Vault. O [procedimento completo de cleanup](https://github.com/ricmmartins/agentic-infra-handbook/tree/master/labs/personal-assistant#14-complete-cleanup) inclui verificações e um fallback manual para estado AZD corrompido; revise o resource group antes de apagar qualquer coisa.

## Referências

- [Azure OpenAI com Microsoft Entra ID](https://learn.microsoft.com/azure/ai-foundry/openai/how-to/managed-identity)
- [Deploy do Container Apps com Azure Developer CLI](https://learn.microsoft.com/azure/developer/azure-developer-cli/container-apps-workflows)
- [Criar um índice vetorial no Azure AI Search](https://learn.microsoft.com/azure/search/vector-search-how-to-create-index)
- [Hybrid search no Azure AI Search](https://learn.microsoft.com/azure/search/hybrid-search-how-to-query)
- [Roles do Azure AI Search](https://learn.microsoft.com/azure/search/search-security-rbac)
- [Managed identities no Azure Container Apps](https://learn.microsoft.com/azure/container-apps/managed-identity)
- [Autenticação do Container Apps com Microsoft Entra ID](https://learn.microsoft.com/azure/container-apps/authentication-entra)
- [Pull do ACR com Managed Identity](https://learn.microsoft.com/azure/container-apps/managed-identity-image-pull)
- [Azure Managed Redis](https://learn.microsoft.com/azure/redis/overview)
- [Autenticação do Azure Managed Redis com Microsoft Entra ID](https://learn.microsoft.com/azure/redis/entra-for-authentication)
- [Vector search no Azure Cosmos DB](https://learn.microsoft.com/azure/cosmos-db/vector-search)
- [OpenTelemetry no Application Insights](https://learn.microsoft.com/azure/azure-monitor/app/opentelemetry-enable)

A série continua com um post sobre como usar AI no trabalho diário de infraestrutura sem transformar a ferramenta em bengala.
