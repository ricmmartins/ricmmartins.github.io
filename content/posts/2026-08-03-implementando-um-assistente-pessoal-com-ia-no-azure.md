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

O código está no repositório [agentic-infra-handbook](https://github.com/ricmmartins/agentic-infra-handbook/tree/master/labs/personal-assistant), em `labs/personal-assistant`.

## O que vamos entregar

Ao final, teremos:

- uma API FastAPI com endpoint de chat;
- RAG sobre runbooks em Markdown;
- Azure AI Search com busca híbrida e semantic ranker;
- Azure OpenAI autenticado por Microsoft Entra ID;
- uma ferramenta de leitura;
- uma ação de escrita que só vira execução depois da confirmação;
- identidade do usuário vinda do Azure Container Apps;
- telemetria no Application Insights;
- uma imagem publicada no Azure Container Registry;
- uma API rodando no Azure Container Apps.

Eu cortei duas partes da primeira entrega de propósito. A memória curta fica em processo e a memória longa fica atrás de uma interface sem implementação. Isso permite provar o fluxo inteiro antes de pagar por Azure Managed Redis e Cosmos DB.

Também mantive a criação de incidentes em um adapter simulado. O controle de aprovação é real. A mutação em um sistema de ITSM não é. Antes de ligar ServiceNow, Jira ou outro sistema, precisamos testar autorização, idempotência e auditoria com algo que não abra chamados de verdade.

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

```text
labs/personal-assistant/
├── docs/runbooks/
├── infra/
│   └── main.bicep
├── src/personal_assistant/
│   ├── actions.py
│   ├── agent.py
│   ├── app.py
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
├── Dockerfile
└── pyproject.toml
```

O projeto usa Python 3.12. Para acompanhar o tutorial, você também precisa de:

- Git;
- Azure CLI;
- Azure Developer CLI;
- permissão para criar recursos e atribuir roles na assinatura;
- quota para dois deployments de modelo na região escolhida.

Docker local é opcional. O `azure.yaml` usa build remoto no Azure Container Registry.

## 1. Rode local antes de criar qualquer recurso

Clone o repositório e entre no lab:

```powershell
git clone https://github.com/ricmmartins/agentic-infra-handbook.git
Set-Location agentic-infra-handbook\labs\personal-assistant

Copy-Item .env.example .env
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -e ".[dev]"
```

O `.env.example` começa assim:

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

```powershell
personal-assistant-api
```

Em outro terminal:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://127.0.0.1:8000/chat `
  -ContentType 'application/json' `
  -Body '{"session_id":"demo-1","message":"Quais cabeçalhos de identidade o app lê no Azure?"}'
```

A resposta inclui texto, citações e, quando houver uma operação sensível, uma `pending_action`.

Rode os testes antes de seguir:

```powershell
pytest -q
```

Os nove testes cobrem o fluxo local e alguns contratos que costumam quebrar só depois do deploy:

1. o chat devolve resposta e fonte;
2. uma ação de escrita fica pendente;
3. nada é criado antes da confirmação;
4. outro usuário não consegue confirmar a ação;
5. confirmações concorrentes criam um único incidente;
6. repetir a confirmação devolve o mesmo resultado;
7. argumentos de ferramentas são validados;
8. o schema do Search usa o analyzer `pt-BR.microsoft`;
9. uma service principal autenticada pode ser resolvida mesmo sem nome de usuário.

O quarto teste parece detalhe até você imaginar dois usuários dividindo o mesmo backend. Um UUID difícil de adivinhar não substitui autorização.

## 2. Separe desenvolvimento local de identidade gerenciada

No notebook do desenvolvedor, `DefaultAzureCredential` é conveniente porque encontra a sessão do Azure CLI. Dentro do Container App, prefiro uma credencial determinística.

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

## 3. Conecte o Azure OpenAI sem usar API key

O cliente usa o endpoint v1 da API OpenAI:

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

```python
response = client.embeddings.create(
    model=config.azure_openai_embedding_deployment,
    input=text,
    dimensions=1536,
)
```

O modelo permite usar menos dimensões, mas o índice e as consultas precisam concordar. Trocar esse valor em um lugar e esquecer o outro produz erro ou, pior, uma migração de índice no meio do projeto.

## 4. Crie o índice vetorial do Azure AI Search

O adapter cria o índice de forma idempotente. Estes são os campos relevantes:

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

### Separe a indexação quando sair do lab

Eu separaria as identidades assim:

| Identidade | Roles no Search |
|------------|-----------------|
| Pipeline de indexação | Search Service Contributor + Search Index Data Contributor |
| API do assistente | Search Index Data Reader |

A identidade da API consulta. A identidade do pipeline altera schema e documentos. Se o Container App também conseguir recriar o índice, uma vulnerabilidade no chat ganhou um caminho de escrita que não precisava existir.

No lab, `BOOTSTRAP_RAG_ON_STARTUP=true` existe para facilitar o primeiro deploy. Por isso, o template atribui Search Service Contributor e Search Index Data Contributor à identidade do Container App. Em produção, mova a ingestão para um job, deixe `BOOTSTRAP_RAG_ON_STARTUP=false` e reduza a API para Search Index Data Reader.

## 5. Monte o agent loop

O núcleo recebe a identidade, recupera documentos e carrega o histórico da sessão. A chave da memória inclui o ID do usuário:

```python
memory_session_id = f"{actor.actor_id}:{session_id}"
history = memory_store.get_history(memory_session_id)
documents = knowledge_base.search(message)
```

Isso impede que duas pessoas que escolheram `session_id="demo"` compartilhem contexto por acidente.

Depois, o loop chama o modelo no máximo três vezes:

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

## 6. Trate leitura e escrita de formas diferentes

A ferramenta de métricas é somente leitura:

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

## 7. Use a identidade que o Container Apps já validou

Azure Container Apps tem autenticação integrada. Quando o Microsoft Entra ID está configurado, o middleware da plataforma valida o usuário antes de entregar a requisição e injeta cabeçalhos como:

- `X-MS-CLIENT-PRINCIPAL-ID`;
- `X-MS-CLIENT-PRINCIPAL-NAME`.

A API lê os dois:

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

Tokens app-only podem não ter um nome de usuário. Nesse caso, o código usa o ID do principal como nome de auditoria. O fallback local só existe quando `APP_ENV=development`. Em qualquer outro ambiente, a ausência do ID vira `401`.

Isso depende de configurar o Container App para exigir autenticação. Não publique a API com acesso anônimo e espere que esse código resolva o problema sozinho.

## 8. Entenda o que o template provisiona

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

Modelos e versões mudam. Confirme disponibilidade e quota na sua assinatura antes de executar o Bicep. Se a versão não estiver disponível, altere o template e rode os testes novamente. Não troque apenas o nome no portal e deixe o código contando outra história.

O template mantém uma réplica. Como sessão e ações pendentes ainda vivem em memória, duas réplicas poderiam separar a criação da confirmação. Resolva o armazenamento compartilhado antes de aumentar `maxReplicas`.

## 9. Crie o App Registration

O Bicep configura a autenticação do Container App, mas recebe o client ID de um App Registration existente. Crie o registro no tenant que contém a assinatura:

```powershell
az login --tenant <tenant-id>

$app = az ad app create `
  --display-name personal-assistant-reference `
  --sign-in-audience AzureADMyOrg | ConvertFrom-Json

$clientId = $app.appId
az ad app update `
  --id $clientId `
  --identifier-uris "api://$clientId"

$scopeId = [guid]::NewGuid().Guid
$body = @{
  api = @{
    requestedAccessTokenVersion = 2
    oauth2PermissionScopes = @(
      @{
        adminConsentDescription = "Access the personal assistant API"
        adminConsentDisplayName = "Access the personal assistant API"
        id = $scopeId
        isEnabled = $true
        type = "User"
        userConsentDescription = "Access the personal assistant API"
        userConsentDisplayName = "Access the personal assistant API"
        value = "user_impersonation"
      }
    )
  }
  web = @{
    implicitGrantSettings = @{
      enableIdTokenIssuance = $true
      enableAccessTokenIssuance = $false
    }
  }
} | ConvertTo-Json -Depth 6 -Compress

$graphToken = (
  az account get-access-token --resource-type ms-graph |
    ConvertFrom-Json
).accessToken

Invoke-RestMethod `
  -Method Patch `
  -Uri "https://graph.microsoft.com/v1.0/applications/$($app.id)" `
  -Headers @{ Authorization = "Bearer $graphToken" } `
  -ContentType "application/json" `
  -Body $body | Out-Null
```

O escopo delegado é `api://<client-id>/user_impersonation`. A opção `enableIdTokenIssuance` atende ao fluxo híbrido usado pelo Easy Auth. Sem ela, o callback falha com `AADSTS700054`.

Crie também um secret para o provedor de autenticação. Respeite o prazo máximo definido pela política do tenant:

```powershell
$endDate = (Get-Date).ToUniversalTime().AddDays(30).ToString(
  "yyyy-MM-ddTHH:mm:ssZ"
)

$credential = az ad app credential reset `
  --id $clientId `
  --append `
  --display-name container-app-easy-auth `
  --end-date $endDate | ConvertFrom-Json
```

Alguns tenants exigem consentimento de administrador. Não contorne essa política com uma conta pessoal ou um tenant diferente. Trate o secret como uma credencial operacional e defina uma rotina de rotação antes do vencimento.

`/healthz` fica fora da autenticação para atender os probes. Navegadores sem sessão são redirecionados para o login. Clientes de API sem uma sessão ou bearer token válido recebem o desafio de autenticação, normalmente como `401`.

## 10. Configure o ambiente do AZD

Entre com a conta correta no Azure CLI e no Azure Developer CLI:

```powershell
az login --tenant <tenant-id>
az account set --subscription <subscription-id>
azd auth login
```

Crie um ambiente isolado e grave os parâmetros:

```powershell
azd env new personal-assistant-dev
azd env set AZURE_SUBSCRIPTION_ID <subscription-id>
azd env set AZURE_LOCATION eastus2
azd env set AZURE_SEARCH_LOCATION eastus
azd env set AUTH_CLIENT_ID $clientId
azd env set AUTH_CLIENT_SECRET $credential.password

$credential = $null
```

Use a mesma região para `AZURE_LOCATION` e `AZURE_SEARCH_LOCATION` quando houver capacidade. Separar as duas é uma saída para indisponibilidade regional, não uma recomendação automática.

O `azure.yaml` usa `remoteBuild: true`. O AZD envia o contexto para o ACR, compila a imagem lá e injeta `SERVICE_API_IMAGE_NAME` no Bicep. Isso evita a dependência de Docker local e impede que um novo `azd provision` restaure uma imagem placeholder.

`AUTH_CLIENT_SECRET` entra no Bicep como parâmetro seguro e é armazenado como secret do Container App. Ele não deve aparecer no repositório.

O comando `azd env set` também grava o valor no arquivo local `.azure/<ambiente>/.env`. Esse diretório está no `.gitignore`, mas o arquivo não é criptografado. Proteja o diretório com as permissões do usuário e remova o valor local depois do provisionamento:

```powershell
azd env set AUTH_CLIENT_SECRET ''
```

O AZD 1.24.1 não oferece `env unset`; definir uma string vazia remove o valor sensível, embora preserve a chave. Para uma atualização futura do Easy Auth, gere um novo secret, execute `azd env set`, rode `azd provision` e limpe novamente o valor local.

## 11. Valide antes de provisionar

Compile o Bicep e rode os testes:

```powershell
az bicep build --file infra\main.bicep --stdout | Out-Null
pytest -q
```

Confira o que o Azure pretende criar:

```powershell
azd provision --preview --no-prompt
azd package --no-prompt
```

O preview não reserva capacidade. Search e deployments de modelo ainda podem falhar no deploy se a região ficar sem capacidade ou se a quota mudar entre uma etapa e outra.

## 12. Faça o deploy

Com o ambiente validado:

```powershell
azd up
```

O comando provisiona a infraestrutura, executa o build remoto e publica a API. No final, o output `API_URL` já inclui `https://`.

Agora registre o callback e abra a aplicação:

```powershell
$appUrl = azd env get-value API_URL

az ad app update `
  --id $clientId `
  --web-redirect-uris "$appUrl/.auth/login/aad/callback"

Start-Process $appUrl
```

O navegador redireciona para o login Microsoft e volta para uma interface de chat. A página mostra as fontes do RAG, consulta métricas e apresenta um botão de confirmação quando o modelo prepara uma ação sensível.

Para publicar apenas uma mudança no código:

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

```text
<client-id>
api://<client-id>
```

Ela também restringe tokens app-only ao client ID autorizado. O secret do provedor fica no secret store do Container App e precisa ser rotacionado. Para usuários, aplique as regras de assignment e consentimento do seu tenant.

## 14. Observe o fluxo no Application Insights

O pacote `azure-monitor-opentelemetry` usa a variável `APPLICATIONINSIGHTS_CONNECTION_STRING` entregue pelo Bicep:

```python
from azure.monitor.opentelemetry import configure_azure_monitor


if config.applicationinsights_connection_string:
    configure_azure_monitor(
        connection_string=config.applicationinsights_connection_string
    )
```

O código cria spans para chat, RAG e ferramentas. Ele registra contagens, backend usado e presença de ação pendente. Não envia o texto da pergunta como atributo de telemetria.

Esse cuidado evita transformar Application Insights em uma cópia dos prompts. A trilha de auditoria das ações é diferente: ela registra deliberadamente ator, tipo da ação, severidade, título e resultado. Esses campos podem conter nomes de recursos, portanto aplique retenção e controle de acesso compatíveis com os dados operacionais.

No smoke test, os spans `chat.request`, `rag.search` e `tool.execute` apareceram em `dependencies`. A trilha do incidente registrou `pending_action_created`, `pending_action_confirmed` e `pending_action_result`.

Consultas úteis:

```kusto
dependencies
| where name in ("chat.request", "rag.search", "tool.execute")
| summarize calls=count(), failures=countif(success == false) by name
| order by failures desc
```

```kusto
traces
| where message startswith "audit_event=pending_action"
| project timestamp, message
| order by timestamp desc
```

## 15. Teste o fluxo no Azure

Recupere a URL e espere o health check:

```powershell
$appUrl = azd env get-value API_URL

Invoke-RestMethod "$appUrl/healthz"
```

Abra `$appUrl` em uma janela sem sessão. O navegador deve pedir login Microsoft e voltar para a interface. Clientes de API sem autenticação recebem um desafio em `/chat`; no teste com `curl`, a resposta foi `401`. Para automação, obtenha um token emitido para o App Registration. Não coloque o secret no repositório nem no histórico do terminal. O estado local do AZD guarda o valor em `.azure/<ambiente>/.env` até você executar `azd env set AUTH_CLIENT_SECRET ''`.

Teste primeiro uma pergunta que só usa RAG. Depois, uma pergunta que chama a ferramenta de leitura. Por último, peça a criação de um incidente e confirme que:

1. `/chat` retorna uma ação pendente;
2. a lista de incidentes continua vazia;
3. outro usuário recebe `403` ao tentar confirmar;
4. o solicitante consegue confirmar;
5. repetir a confirmação devolve o mesmo `incident_id`;
6. a auditoria contém solicitação, confirmação e resultado.

No ambiente de validação, o login interativo voltou para a interface, o RAG devolveu três citações e a ferramenta de métricas respondeu. O pedido de incidente exibiu a confirmação na tela e criou o incidente somente depois do clique. O Container App ficou em modo de revisão única, com 100% do tráfego e uma réplica.

## E a memória com Redis e Cosmos DB?

Azure Cache for Redis está em processo de aposentadoria. Para novos projetos, use Azure Managed Redis.

O serviço usa Microsoft Entra ID por padrão e aceita tokens no escopo:

```text
https://redis.azure.com/.default
```

O client usa o object ID da identidade como usuário e o token como senha. O token precisa ser renovado antes de expirar. Não basta obter um token no startup e manter a conexão por dias.

No código, a memória já depende de um protocolo:

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

Quando terminar:

```powershell
$resourceGroup = azd env get-value AZURE_RESOURCE_GROUP

az group delete `
  --name $resourceGroup `
  --yes `
  --no-wait
```

Confirme antes que o resource group não contém nada que você queira manter.

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
