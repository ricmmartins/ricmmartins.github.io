---
slug: "como-mcp-funciona-o-protocolo-que-conecta-agents-ao-mundo"
aliases:
  - "/posts/como-mcp-funciona-o-protocolo-que-conecta-agents-ao-mundo/"
title: "Como MCP funciona: o protocolo que conecta agents ao mundo"
description: "Model Context Protocol desmontado. Como a padronização de tools, resources e prompts resolve o problema N×M de integrações, explicado pra quem entende de APIs e protocolos."
date: 2026-07-29T10:00:00-04:00
categories:
  - AI
  - Arquitetura
tags:
  - ai-engineering
  - mcp
  - protocolo
  - integracoes
  - agents
series:
  - "AI por dentro: de tokens a agents"
---

Cada vez que um agent precisa acessar um novo data source, alguém escreve uma integração custom. GitHub? Integração custom. Jira? Integração custom. Azure Monitor? Integração custom. Banco de dados? Mais uma.

Se isso parece com o problema que REST/HTTP resolveu pra APIs web, você está pensando certo. **MCP (Model Context Protocol)** é a tentativa de padronizar como AI models e agents se conectam a data sources e ferramentas.

## O mapa pro profissional de infra

| Conceito MCP | O que faz | Equivalente em infra |
|-------------|-----------|---------------------|
| **MCP Server** | Expõe dados/ferramentas via protocolo padrão | API server, microserviço |
| **MCP Client** | Consome dados/ferramentas de MCP servers | API client, SDK |
| **Host** | Aplicação que roda o client (VS Code, Claude, etc.) | Browser, app que consome APIs |
| **Tool** | Função executável via MCP | Endpoint REST (POST /action) |
| **Resource** | Dado acessível via MCP | Endpoint REST (GET /data) |
| **Prompt** | Template de interação | Slash command, prompt salvo, formulário parametrizado |
| **Transport** | Como client e server se comunicam | stdio, Streamable HTTP (SSE legado só por compatibilidade) |

## O problema N×M

Antes de MCP, cada combinação de (AI application × data source) precisava de código custom.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1120 272" style="width:100%;height:auto" role="img" aria-label="Problema N por M com quatro aplicações de IA conectadas diretamente a quatro fontes de dados">
<defs>
<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
<path d="M 0 0 L 10 5 L 0 10 z" fill="#666666" />
</marker>
</defs>
<g font-family="Segoe UI, Arial, sans-serif">
<text x="20" y="24" text-anchor="start" font-size="14" font-weight="bold" fill="#111111">Sem padrão (N×M problem):</text>
<text x="115" y="73.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#111111">AI Apps:</text>
<text x="730" y="73.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#111111">Data Sources:</text>
<line x1="196" y1="77" x2="626" y2="77" stroke="#999999" stroke-width="1.5" fill="none" />
<line x1="196" y1="86.2" x2="626" y2="135.2" stroke="#999999" stroke-width="1.5" fill="none" />
<line x1="196" y1="84.5" x2="876" y2="147.4" stroke="#999999" stroke-width="1.5" fill="none" />
<line x1="182.3" y1="93.4" x2="674.3" y2="213.4" stroke="#999999" stroke-width="1.5" fill="none" />
<line x1="375.9" y1="142.1" x2="654.3" y2="90.9" stroke="#999999" stroke-width="1.5" fill="none" />
<line x1="376" y1="157" x2="876" y2="157" stroke="#999999" stroke-width="1.5" fill="none" />
<line x1="196" y1="147.9" x2="876" y2="155.8" stroke="#999999" stroke-width="1.5" fill="none" />
<line x1="195.9" y1="157.5" x2="625.9" y2="213.5" stroke="#999999" stroke-width="1.5" fill="none" />
<line x1="375.9" y1="142.1" x2="654.3" y2="90.9" stroke="#999999" stroke-width="1.5" fill="none" />
<line x1="376" y1="155.1" x2="626" y2="149.4" stroke="#999999" stroke-width="1.5" fill="none" />
<line x1="196" y1="147" x2="626" y2="147" stroke="#999999" stroke-width="1.5" fill="none" />
<line x1="195.9" y1="157.5" x2="625.9" y2="213.5" stroke="#999999" stroke-width="1.5" fill="none" />
<line x1="249.8" y1="210.4" x2="681.8" y2="90.4" stroke="#999999" stroke-width="1.5" fill="none" />
<line x1="297.2" y1="211.1" x2="634.7" y2="161.1" stroke="#999999" stroke-width="1.5" fill="none" />
<line x1="346" y1="213.2" x2="876" y2="166.2" stroke="#999999" stroke-width="1.5" fill="none" />
<line x1="346" y1="227" x2="626" y2="227" stroke="#999999" stroke-width="1.5" fill="none" />
<rect x="40" y="62" width="150" height="30" rx="6" fill="#dae8fc" stroke="#6c8ebf" stroke-width="2" />
<text x="115" y="88.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#111111">Claude</text>
<rect x="40" y="132" width="150" height="30" rx="6" fill="#dae8fc" stroke="#6c8ebf" stroke-width="2" />
<text x="115" y="151" text-anchor="middle" font-size="12" font-weight="bold" fill="#111111">GPT</text>
<rect x="220" y="142" width="150" height="30" rx="6" fill="#dae8fc" stroke="#6c8ebf" stroke-width="2" />
<text x="295" y="161" text-anchor="middle" font-size="12" font-weight="bold" fill="#111111">Copilot</text>
<rect x="40" y="212" width="300" height="30" rx="6" fill="#dae8fc" stroke="#6c8ebf" stroke-width="2" />
<text x="190" y="223.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#111111">Custom</text>
<rect x="620" y="62" width="220" height="30" rx="6" fill="#fff2cc" stroke="#d6b656" stroke-width="2" />
<text x="730" y="88.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#111111">GitHub</text>
<rect x="620" y="132" width="220" height="30" rx="6" fill="#fff2cc" stroke="#d6b656" stroke-width="2" />
<text x="730" y="151" text-anchor="middle" font-size="12" font-weight="bold" fill="#111111">Jira</text>
<rect x="870" y="142" width="220" height="30" rx="6" fill="#fff2cc" stroke="#d6b656" stroke-width="2" />
<text x="980" y="161" text-anchor="middle" font-size="12" font-weight="bold" fill="#111111">Azure Monitor</text>
<rect x="620" y="212" width="220" height="30" rx="6" fill="#fff2cc" stroke="#d6b656" stroke-width="2" />
<text x="730" y="231" text-anchor="middle" font-size="12" font-weight="bold" fill="#111111">PostgreSQL</text>
<text x="190" y="238.5" text-anchor="middle" font-size="10" font-weight="normal" fill="#555555">4 apps × 4 sources = 16 integrações custom</text>
</g>
</svg>

Com MCP:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 284" style="width:100%;height:auto" role="img" aria-label="Arquitetura N mais M com aplicações de IA conectadas a servidores MCP por um protocolo comum">
<defs>
<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
<path d="M 0 0 L 10 5 L 0 10 z" fill="#666666" />
</marker>
</defs>
<g font-family="Segoe UI, Arial, sans-serif">
<text x="20" y="24" text-anchor="start" font-size="14" font-weight="bold" fill="#111111">Com padrão (N+M):</text>
<text x="40" y="50" text-anchor="start" font-size="12" font-weight="bold" fill="#111111">AI Apps:</text>
<text x="700" y="50" text-anchor="start" font-size="12" font-weight="bold" fill="#111111">MCP Servers:</text>
<rect x="400" y="120" width="180" height="60" rx="8" fill="#e1d5e7" stroke="#9673a6" stroke-width="2" />
<text x="490" y="146.5" text-anchor="middle" font-size="14" font-weight="bold" fill="#111111">MCP</text>
<text x="490" y="161.5" text-anchor="middle" font-size="10" font-weight="normal" fill="#555555">protocolo padrão</text>
<rect x="40" y="74" width="150" height="30" rx="6" fill="#dae8fc" stroke="#6c8ebf" stroke-width="2" />
<text x="115" y="93" text-anchor="middle" font-size="12" font-weight="bold" fill="#111111">Claude</text>
<path d="M 196 89 H 280 V 132 H 394" stroke="#666666" stroke-width="2" fill="none" marker-end="url(#arrow)" />
<rect x="40" y="144" width="150" height="30" rx="6" fill="#dae8fc" stroke="#6c8ebf" stroke-width="2" />
<text x="115" y="163" text-anchor="middle" font-size="12" font-weight="bold" fill="#111111">GPT</text>
<path d="M 196 159 H 300 V 146 H 394" stroke="#666666" stroke-width="2" fill="none" marker-end="url(#arrow)" />
<rect x="220" y="144" width="150" height="30" rx="6" fill="#dae8fc" stroke="#6c8ebf" stroke-width="2" />
<text x="295" y="163" text-anchor="middle" font-size="12" font-weight="bold" fill="#111111">Copilot</text>
<path d="M 376 159 H 394" stroke="#666666" stroke-width="2" fill="none" marker-end="url(#arrow)" />
<rect x="40" y="224" width="370" height="30" rx="6" fill="#dae8fc" stroke="#6c8ebf" stroke-width="2" />
<text x="225" y="235.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#111111">Custom</text>
<path d="M 416 239 V 174 H 394" stroke="#666666" stroke-width="2" fill="none" marker-end="url(#arrow)" />
<rect x="700" y="74" width="220" height="30" rx="6" fill="#d5e8d4" stroke="#82b366" stroke-width="2" />
<text x="810" y="93" text-anchor="middle" font-size="11" font-weight="bold" fill="#111111">GitHub MCP Server</text>
<path d="M 586 132 H 640 V 89 H 694" stroke="#666666" stroke-width="2" fill="none" marker-end="url(#arrow)" />
<rect x="700" y="144" width="220" height="30" rx="6" fill="#d5e8d4" stroke="#82b366" stroke-width="2" />
<text x="810" y="163" text-anchor="middle" font-size="11" font-weight="bold" fill="#111111">Jira MCP Server</text>
<path d="M 586 146 H 640 V 159 H 694" stroke="#666666" stroke-width="2" fill="none" marker-end="url(#arrow)" />
<rect x="950" y="144" width="220" height="30" rx="6" fill="#d5e8d4" stroke="#82b366" stroke-width="2" />
<text x="1060" y="163" text-anchor="middle" font-size="11" font-weight="bold" fill="#111111">Azure Monitor MCP Server</text>
<path d="M 586 160 H 820 V 159 H 944" stroke="#666666" stroke-width="2" fill="none" marker-end="url(#arrow)" />
<rect x="700" y="224" width="220" height="30" rx="6" fill="#d5e8d4" stroke="#82b366" stroke-width="2" />
<text x="810" y="243" text-anchor="middle" font-size="11" font-weight="bold" fill="#111111">PostgreSQL MCP Server</text>
<path d="M 586 174 H 640 V 239 H 694" stroke="#666666" stroke-width="2" fill="none" marker-end="url(#arrow)" />
<text x="225" y="250.5" text-anchor="middle" font-size="10" font-weight="normal" fill="#555555">4 + 4 = 8 componentes (cada um implementa MCP uma vez)</text>
</g>
</svg>

É o mesmo valor que USB-C trouxe: um dispositivo implementa USB-C uma vez, funciona em qualquer computador.

## Arquitetura do protocolo

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 910 480" style="width:100%;height:auto" role="img" aria-label="Arquitetura do protocolo MCP com host, cliente, transporte, servidor e capabilities">
<defs>
<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
<path d="M 0 0 L 10 5 L 0 10 z" fill="#666666" />
</marker>
</defs>
<g font-family="Segoe UI, Arial, sans-serif">
<rect x="20" y="20" width="860" height="180" rx="8" fill="#dae8fc" stroke="#6c8ebf" stroke-width="2" />
<text x="450" y="50" text-anchor="middle" font-size="14" font-weight="bold" fill="#111111">HOST</text>
<text x="450" y="70" text-anchor="middle" font-size="10" font-weight="normal" fill="#555555">(VS Code, Claude Desktop, custom app)</text>
<rect x="120" y="90" width="660" height="80" rx="6" fill="#fff2cc" stroke="#d6b656" stroke-width="2" />
<text x="450" y="111.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#111111">MCP CLIENT</text>
<text x="450" y="126.5" text-anchor="middle" font-size="10" font-weight="normal" fill="#555555">- Descobre capabilities do server</text>
<text x="450" y="141.5" text-anchor="middle" font-size="10" font-weight="normal" fill="#555555">- Invoca tools</text>
<text x="450" y="156.5" text-anchor="middle" font-size="10" font-weight="normal" fill="#555555">- Acessa resources</text>
<line x1="450" y1="176" x2="450" y2="341" stroke="#666666" stroke-width="2" fill="none" marker-end="url(#arrow)" />
<text x="470" y="220" text-anchor="start" font-size="10" font-weight="normal" fill="#555555">Transport (stdio, Streamable HTTP)</text>
<rect x="20" y="280" width="860" height="170" rx="8" fill="#d5e8d4" stroke="#82b366" stroke-width="2" />
<text x="450" y="310" text-anchor="middle" font-size="14" font-weight="bold" fill="#111111">MCP SERVER</text>
<rect x="120" y="335" width="660" height="70" rx="6" fill="#e1d5e7" stroke="#9673a6" stroke-width="2" />
<text x="450" y="329" text-anchor="middle" font-size="12" font-weight="bold" fill="#111111">Capabilities</text>
<line x1="340" y1="365" x2="340" y2="405" stroke="#666666" stroke-width="2" fill="none" />
<line x1="560" y1="365" x2="560" y2="405" stroke="#666666" stroke-width="2" fill="none" />
<text x="450" y="344" text-anchor="middle" font-size="12" font-weight="bold" fill="#111111">Tools</text>
<text x="450" y="389" text-anchor="middle" font-size="10" font-weight="normal" fill="#555555">(ações)</text>
<text x="450" y="359" text-anchor="middle" font-size="12" font-weight="bold" fill="#111111">Resources</text>
<text x="450" y="404" text-anchor="middle" font-size="10" font-weight="normal" fill="#555555">(dados)</text>
<text x="450" y="374" text-anchor="middle" font-size="12" font-weight="bold" fill="#111111">Prompts</text>
<text x="450" y="419" text-anchor="middle" font-size="10" font-weight="normal" fill="#555555">(templates)</text>
<text x="50" y="433" text-anchor="start" font-size="10" font-weight="normal" fill="#555555">Backend: GitHub API, Database, File System, etc.</text>
</g>
</svg>

## Os três primitivos do MCP

### 1. Tools (ações que o model pode executar)

Tools são funções com input/output definidos. O model decide quando chamá-las.

```json
{
  "name": "restart_service",
  "description": "Reinicia um serviço systemd no servidor especificado",
  "inputSchema": {
    "type": "object",
    "properties": {
      "hostname": {
        "type": "string",
        "description": "Hostname do servidor"
      },
      "service_name": {
        "type": "string",
        "description": "Nome do serviço systemd"
      }
    },
    "required": ["hostname", "service_name"]
  }
}
```

Similar a: um endpoint REST com OpenAPI spec.

### 2. Resources (dados que o model pode ler)

Resources são URIs que retornam dados. O model (ou host) decide quando acessá-los.

```json
{
  "uri": "server://web-prod-01/metrics",
  "name": "Métricas de web-prod-01",
  "description": "CPU, memória, disco e rede do servidor web-prod-01",
  "mimeType": "application/json"
}
```

Similar a: um endpoint GET com resposta structured.

Resources podem ser **estáticos** (listados no `resources/list`) ou **dinâmicos** (templates com parâmetros, via `resources/templates/list`). A diferença prática:

| Tipo | Exemplo de URI | Quando usar |
|------|---------------|-------------|
| Estático | `server://web-prod-01/metrics` | Dados de um recurso fixo e conhecido |
| Template | `server://{hostname}/metrics` | Client preenche o hostname em runtime |
| Subscriptions | `resources/subscribe` → URI | Client recebe notificação quando o conteúdo muda |

Resources são **read-only** por design. Se o agent precisa modificar algo, isso é uma Tool. Essa separação é intencional: resources são seguros pra expor sem preocupação com side effects.

### 3. Prompts (templates de interação)

Prompts são templates pré-definidos que o host pode oferecer ao usuário.

```json
{
  "name": "diagnose_alert",
  "description": "Template pra diagnosticar um alerta de monitoramento",
  "arguments": [
    {"name": "alert_name", "description": "Nome do alerta", "required": true},
    {"name": "resource", "description": "Recurso afetado", "required": true}
  ]
}
```

Similar a: um form template que guia o input do usuário.

## Implementando um MCP Server

Um MCP server que expõe métricas de Azure Monitor. Aqui eu usei a API atual de alto nível da SDK Python, que registra tools, resources e prompts direto com decorators.

### Com Python (SDK oficial)

```python
import os
import subprocess
from typing import Annotated

from mcp.server import MCPServer
from pydantic import Field

SUBSCRIPTION_ID = os.environ["AZURE_SUBSCRIPTION_ID"]

mcp = MCPServer("azure-monitor")


@mcp.tool()
def get_vm_metrics(
    resource_group: str,
    vm_name: str,
    offset: Annotated[str, Field(description="Ex: 1h ou 24h")] = "1h",
) -> str:
    """Retorna métricas de CPU de uma VM Azure."""
    resource_id = (
        f"/subscriptions/{SUBSCRIPTION_ID}"
        f"/resourceGroups/{resource_group}"
        f"/providers/Microsoft.Compute/virtualMachines/{vm_name}"
    )
    result = subprocess.run(
        [
            "az", "monitor", "metrics", "list",
            "--resource", resource_id,
            "--metric", "Percentage CPU",
            "--interval", "PT5M",
            "--offset", offset,
            "--output", "json",
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    return result.stdout


@mcp.tool()
def list_metric_alert_rules(resource_group: str) -> str:
    """Lista regras de alerta baseadas em métricas no resource group."""
    result = subprocess.run(
        [
            "az", "monitor", "metrics", "alert", "list",
            "--resource-group", resource_group,
            "--output", "json",
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    return result.stdout


@mcp.resource("azure://monitor/metric-alert-rules")
def metric_alert_rules() -> str:
    """Regras de alertas de métricas disponíveis na subscription."""
    result = subprocess.run(
        [
            "az", "monitor", "metrics", "alert", "list",
            "--output", "json",
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    return result.stdout


@mcp.prompt()
def diagnose_alert(alert_name: str, resource: str) -> str:
    """Monta um prompt inicial pra diagnosticar um alerta."""
    return (
        f"Diagnostique o alerta {alert_name} no recurso {resource}. "
        "Liste hipóteses, sinais pra confirmar cada uma e a ordem de checagem."
    )


if __name__ == "__main__":
    mcp.run()
```

### Configurando no client (VS Code / Claude Desktop)

```json
{
  "mcpServers": {
    "azure-monitor": {
      "command": "python",
      "args": ["./mcp-servers/azure-monitor/server.py"],
      "env": {
        "AZURE_SUBSCRIPTION_ID": "seu-sub-id"
      }
    }
  }
}
```

## Transport: como client e server se comunicam

Na prática, você vai lidar com dois transports padrão: `stdio` localmente e Streamable HTTP no modo remoto. SSE continua existindo por compatibilidade com clients antigos, mas não é o caminho novo.

### stdio (local)

O client sobe o server como processo filho. A conversa vai por stdin e stdout.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 220" style="width:100%;height:auto" role="img" aria-label="Fluxo stdio local com host process, MCP client e MCP server process">
<defs>
<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
<path d="M 0 0 L 10 5 L 0 10 z" fill="#666666" />
</marker>
</defs>
<g font-family="Segoe UI, Arial, sans-serif">
<rect x="40" y="30" width="320" height="150" rx="8" fill="#dae8fc" stroke="#6c8ebf" stroke-width="2" />
<text x="200" y="58" text-anchor="middle" font-size="14" font-weight="bold" fill="#111111">Host process</text>
<rect x="90" y="90" width="220" height="50" rx="6" fill="#fff2cc" stroke="#d6b656" stroke-width="2" />
<text x="200" y="119" text-anchor="middle" font-size="12" font-weight="bold" fill="#111111">MCP Client</text>
<rect x="460" y="90" width="250" height="50" rx="6" fill="#d5e8d4" stroke="#82b366" stroke-width="2" />
<text x="585" y="119" text-anchor="middle" font-size="12" font-weight="bold" fill="#111111">MCP Server process</text>
<line x1="316" y1="104" x2="466" y2="104" stroke="#666666" stroke-width="2" fill="none" marker-end="url(#arrow)" />
<text x="385" y="100" text-anchor="middle" font-size="10" font-weight="normal" fill="#555555">spawns</text>
<line x1="454" y1="126" x2="304" y2="126" stroke="#666666" stroke-width="2" fill="none" marker-start="url(#arrow)" marker-end="url(#arrow)" />
<text x="385" y="152" text-anchor="middle" font-size="10" font-weight="normal" fill="#555555">JSON-RPC via stdin/stdout</text>
</g>
</svg>

**Quando usar**: tools locais (file system, CLI), integrações que rodam na mesma máquina.

### Streamable HTTP (remoto)

No modo remoto, cada mensagem JSON-RPC vai por HTTP POST no endpoint MCP. O server pode responder com JSON puro ou abrir um stream SSE na mesma rota. Se precisar mandar notificações fora de uma request em andamento, o client pode abrir um GET no mesmo endpoint.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 780 220" style="width:100%;height:auto" role="img" aria-label="Fluxo Streamable HTTP em que o MCP client envia requests JSON-RPC e pode abrir stream SSE opcional">
<defs>
<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
<path d="M 0 0 L 10 5 L 0 10 z" fill="#666666" />
</marker>
</defs>
<g font-family="Segoe UI, Arial, sans-serif">
<rect x="40" y="30" width="320" height="150" rx="8" fill="#dae8fc" stroke="#6c8ebf" stroke-width="2" />
<text x="200" y="58" text-anchor="middle" font-size="14" font-weight="bold" fill="#111111">Host (browser, app)</text>
<rect x="90" y="90" width="220" height="50" rx="6" fill="#fff2cc" stroke="#d6b656" stroke-width="2" />
<text x="200" y="119" text-anchor="middle" font-size="12" font-weight="bold" fill="#111111">MCP Client</text>
<rect x="470" y="60" width="250" height="90" rx="8" fill="#d5e8d4" stroke="#82b366" stroke-width="2" />
<text x="595" y="101.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#111111">Remote MCP endpoint</text>
<text x="595" y="116.5" text-anchor="middle" font-size="10" font-weight="normal" fill="#555555">Streamable HTTP + JSON-RPC</text>
<line x1="316" y1="104" x2="476" y2="96" stroke="#666666" stroke-width="2" fill="none" marker-end="url(#arrow)" />
<text x="390" y="80" text-anchor="middle" font-size="10" font-weight="normal" fill="#555555">POST /mcp</text>
<text x="390" y="95" text-anchor="middle" font-size="10" font-weight="normal" fill="#555555">request JSON-RPC</text>
<line x1="316" y1="124" x2="476" y2="124" stroke="#666666" stroke-width="2" fill="none" marker-end="url(#arrow)" />
<text x="390" y="145" text-anchor="middle" font-size="10" font-weight="normal" fill="#555555">GET /mcp (opcional)</text>
<text x="390" y="160" text-anchor="middle" font-size="10" font-weight="normal" fill="#555555">notifications via SSE</text>
</g>
</svg>

**Quando usar**: server compartilhado, server em cloud, vários clients apontando pro mesmo endpoint.

```python
from server import mcp


if __name__ == "__main__":
    mcp.run(
        transport="streamable-http",
        host="127.0.0.1",
        port=8000,
        streamable_http_path="/mcp",
    )
```

Se você ainda precisa atender client antigo, a SDK Python também consegue subir SSE legado. Eu só não começaria projeto novo assim.

## Security considerations

MCP servers expõem ações reais. Um MCP server mal configurado é um vetor de ataque.

### Autenticação

No stdio, o comum é herdar credenciais do ambiente local. No HTTP, a especificação atual descreve um fluxo de autorização baseado em OAuth 2.1, metadata do resource server e `WWW-Authenticate`.

> **Nota:** OAuth 2.1 ainda é um draft (RFC em andamento, não ratificado). Na prática, isso significa que a parte de auth do MCP spec pode mudar conforme o OAuth 2.1 avança para RFC final. Implemente seguindo a spec atual, mas esteja preparado para ajustes.

Mesmo assim, autenticar o client é só metade do trabalho. Você ainda precisa decidir o que cada identidade pode fazer.

```python
# Adicionar auth no server HTTP
from starlette.authentication import requires
from starlette.responses import Response


@requires("authenticated")
async def handle_mcp_http_request(request):
    payload = await request.json()

    if payload.get("method") == "tools/call":
        token = request.auth.credentials
        allowed_tools = get_allowed_tools(token)
        tool_name = payload["params"]["name"]

        if tool_name not in allowed_tools:
            return Response(status_code=403)

    # Encaminhar a requisição pro handler MCP real
    ...
```

### Princípio de least privilege

```python
# Não exponha tools destrutivas por padrão
SAFE_TOOLS = ["get_metrics", "list_alerts", "get_logs"]
DANGEROUS_TOOLS = ["restart_service", "scale_resource", "delete_resource"]


def exposed_tools_for(client_level: str) -> list[str]:
    tool_names = SAFE_TOOLS.copy()
    if client_level == "admin":
        tool_names += DANGEROUS_TOOLS

    return tool_names
```

### Input validation

```python
def validate_get_vm_metrics(arguments: dict) -> dict:
    if not validate_resource_group(arguments["resource_group"]):
        raise ValueError("resource group inválido ou sem permissão")

    return {
        "resource_group": arguments["resource_group"],
        "vm_name": sanitize_resource_name(arguments["vm_name"]),
        "offset": arguments.get("offset", "1h"),
    }
```

## Ecossistema atual

| MCP Server | O que expõe | Maintained by |
|-----------|------------|---------------|
| GitHub | Repos, issues, PRs, code search | GitHub/Community |
| PostgreSQL | Query, schema info | Community |
| Filesystem | Read/write files | Anthropic |
| Azure DevOps | Work items, pipelines | Community |
| Kubernetes | Pods, logs, events | Community |
| Slack | Messages, channels | Community |

A lista cresce rápido. Confira em [modelcontextprotocol.io](https://modelcontextprotocol.io/) o registry atualizado.

## MCP vs Function Calling: qual a diferença?

| Aspecto | Function Calling | MCP |
|---------|-----------------|-----|
| Definido por | Cada provider (OpenAI, Anthropic) | Protocolo aberto |
| Escopo | Uma chamada de API | Protocolo completo (discovery, transports, auth HTTP, streaming) |
| Portabilidade | Lock-in no provider | Qualquer client, qualquer server |
| Discovery | Precisa definir tools no request | Server expõe capabilities dinamicamente |
| State | Normalmente stateless | Pode manter sessão, ou operar stateless no HTTP |
| Transport | HTTP request | stdio, Streamable HTTP |

MCP não substitui tool calling do provider no lado do modelo. Ele substitui a integração ad-hoc entre host e sistemas externos. Muitos clients traduzem tools MCP pro formato de function calling do provider, mas isso é detalhe de implementação do client.

## O que pode dar errado

- **MCP server com tool destrutiva exposta**: expor `restart_service` ou `delete_resource` sem autenticação adequada é equivalente a deixar um endpoint de admin público. Comece com tools read-only e adicione writes com gate de aprovação.
- **Server crash sem retry no client**: se o MCP server reinicia (deploy, OOM kill), o client precisa reconectar. A spec define retry, mas nem todo client implementa. Teste o cenário de server restart explicitamente.
- **Input injection via tool arguments**: o agent passa argumentos pra tool que vieram do input do usuário. Se a tool constrói queries ou comandos shell sem sanitização, isso é um vetor de injection clássico. Valide e sanitize sempre.
- **Resource retornando dado stale**: um resource que cacheia métricas de 5 minutos atrás. O agent decide que "CPU está baixa" baseado em dado velho enquanto o servidor está pegando fogo agora. Documente o freshness do resource e considere subscriptions.
- **Discovery dinâmico expondo tools inesperadas**: se o server expõe tools baseado em contexto (role do user, por exemplo) e a lógica de filtragem tem bug, o agent pode ver tools que não deveria. Trate `tools/list` como uma superfície de ataque.

## O que levar pra segunda-feira

- MCP é o "USB-C dos AI agents". Padroniza a conversa entre hosts, clients e sistemas externos.
- Três primitivos aparecem o tempo todo: Tools (ações), Resources (dados) e Prompts (templates).
- Segurança continua sendo trabalho de engenharia. A spec ajuda no fluxo HTTP, mas autorização fina, validação e observabilidade continuam na sua mão.
- Comece expondo tools read-only. get_metrics, list_resources, get_logs. Ações de escrita entram depois.
- stdio pra local, Streamable HTTP pra remoto. SSE legado existe, mas hoje é mais compatibilidade do que recomendação.

Se você quer entender como agents usam tools e memória por dentro antes de conectar via MCP, comece pela série "AI por dentro": [como AI agents funcionam por dentro](/como-ai-agents-funcionam-por-dentro/) e [memória, estado e consistência](/ai-agents-memoria-estado-e-consistencia/).

No próximo post: **projetando um assistente AI pessoal** de ponta a ponta.

## Leitura complementar

- [How MCP Works](https://lnkd.in/eT-z8Ekk) (Neo Kim, System Design Newsletter)
- [Model Context Protocol specification](https://modelcontextprotocol.io/)
- [MCP Servers repository](https://github.com/modelcontextprotocol/servers)
