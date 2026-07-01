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
  - "AI Engineering pra quem é de infra"
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
| **Prompt** | Template de interação | OpenAPI spec, documentation |
| **Transport** | Como client e server se comunicam | stdio, HTTP (SSE legado / Streamable HTTP) |

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
<text x="470" y="220" text-anchor="start" font-size="10" font-weight="normal" fill="#555555">Transport (stdio, HTTP/SSE)</text>
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

Um MCP server que expõe métricas de Azure Monitor. Usando a API de decorators da SDK Python (versão atual).

### Com Python (SDK oficial)

```python
import asyncio
import os
import subprocess

import mcp.server.stdio
from mcp.server import Server
from mcp.types import Resource, TextContent, Tool

SUBSCRIPTION_ID = os.environ["AZURE_SUBSCRIPTION_ID"]

server = Server("azure-monitor-mcp")


@server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="get_vm_metrics",
            description="Retorna métricas de CPU de uma VM Azure",
            inputSchema={
                "type": "object",
                "properties": {
                    "resource_group": {"type": "string"},
                    "vm_name": {"type": "string"},
                    "offset": {
                        "type": "string",
                        "description": "Ex: 1h (última hora), 24h (último dia)",
                        "default": "1h",
                    },
                },
                "required": ["resource_group", "vm_name"],
            },
        ),
        Tool(
            name="list_metric_alert_rules",
            description="Lista regras de alerta baseadas em métricas no resource group",
            inputSchema={
                "type": "object",
                "properties": {
                    "resource_group": {"type": "string"}
                },
                "required": ["resource_group"],
            },
        ),
    ]


@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    if name == "get_vm_metrics":
        resource_id = (
            f"/subscriptions/{SUBSCRIPTION_ID}"
            f"/resourceGroups/{arguments['resource_group']}"
            f"/providers/Microsoft.Compute/virtualMachines/{arguments['vm_name']}"
        )
        result = subprocess.run(
            [
                "az", "monitor", "metrics", "list",
                "--resource", resource_id,
                "--metric", "Percentage CPU",
                "--interval", "PT5M",
                "--offset", arguments.get("offset", "1h"),
                "--output", "json",
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        return [TextContent(type="text", text=result.stdout)]

    if name == "list_metric_alert_rules":
        result = subprocess.run(
            [
                "az", "monitor", "metrics", "alert", "list",
                "--resource-group", arguments["resource_group"],
                "--output", "json",
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        return [TextContent(type="text", text=result.stdout)]

    raise ValueError(f"Tool desconhecida: {name}")


@server.list_resources()
async def list_resources() -> list[Resource]:
    return [
        Resource(
            uri="azure://monitor/metric-alert-rules",
            name="Regras de alertas de métricas",
            description="Regras de alertas de métricas disponíveis na subscription",
            mimeType="application/json",
        )
    ]


async def main() -> None:
    async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options(),
        )


if __name__ == "__main__":
    asyncio.run(main())
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

Na prática, você vai encontrar dois jeitos comuns de plugar um MCP server: `stdio` localmente e HTTP no modo remoto. No mundo HTTP, a SDK Python ainda traz SSE legado via `SseServerTransport`, enquanto o ecossistema mais novo vem migrando pra Streamable HTTP.

### stdio (local)

Client spawna o server como processo filho. Comunicação via stdin/stdout.

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

### HTTP com Server-Sent Events (remoto, legado ainda suportado)

Client abre uma conexão SSE e publica mensagens JSON-RPC via POST em outro endpoint.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 780 220" style="width:100%;height:auto" role="img" aria-label="Fluxo HTTP com SSE em que o MCP client abre stream e envia mensagens JSON-RPC">
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
<text x="595" y="116.5" text-anchor="middle" font-size="10" font-weight="normal" fill="#555555">SSE + JSON-RPC</text>
<line x1="316" y1="104" x2="476" y2="96" stroke="#666666" stroke-width="2" fill="none" marker-end="url(#arrow)" />
<text x="390" y="80" text-anchor="middle" font-size="10" font-weight="normal" fill="#555555">GET /sse</text>
<text x="390" y="95" text-anchor="middle" font-size="10" font-weight="normal" fill="#555555">abre stream SSE</text>
<line x1="316" y1="124" x2="476" y2="124" stroke="#666666" stroke-width="2" fill="none" marker-end="url(#arrow)" />
<text x="390" y="145" text-anchor="middle" font-size="10" font-weight="normal" fill="#555555">POST /messages?session_id=...</text>
<text x="390" y="160" text-anchor="middle" font-size="10" font-weight="normal" fill="#555555">envia JSON-RPC</text>
</g>
</svg>

**Quando usar**: servers compartilhados, servers em cloud, múltiplos clients consumindo o mesmo server.

```python
from mcp.server.sse import SseServerTransport
from starlette.applications import Starlette
from starlette.responses import Response
from starlette.routing import Mount, Route

sse = SseServerTransport("/messages/")


async def handle_sse(request):
    async with sse.connect_sse(request.scope, request.receive, request._send) as (
        read_stream,
        write_stream,
    ):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options(),
        )
    return Response()


app = Starlette(
    routes=[
        Route("/sse", endpoint=handle_sse, methods=["GET"]),
        Mount("/messages/", app=sse.handle_post_message),
    ]
)
```

## Security considerations

MCP servers expõem ações reais. Um MCP server mal configurado é um vetor de ataque.

### Autenticação

O protocolo MCP em si não define auth. É responsabilidade do transport layer.

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


@server.list_tools()
async def list_tools() -> list[Tool]:
    client_level = get_client_permission_level()

    tool_names = SAFE_TOOLS.copy()
    if client_level == "admin":
        tool_names += DANGEROUS_TOOLS

    return [build_tool_spec(name) for name in tool_names]
```

### Input validation

```python
@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    # SEMPRE validar inputs antes de executar
    if name == "get_vm_metrics":
        if not validate_resource_group(arguments["resource_group"]):
            return [
                TextContent(
                    type="text",
                    text="Erro: resource group inválido ou sem permissão",
                )
            ]

        vm_name = sanitize_resource_name(arguments["vm_name"])
        ...
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
| Escopo | Uma chamada de API | Protocolo completo (discovery, auth, streaming) |
| Portabilidade | Lock-in no provider | Qualquer client, qualquer server |
| Discovery | Precisa definir tools no request | Server expõe capabilities dinamicamente |
| State | Stateless | Pode manter sessão |
| Transport | HTTP request | stdio, HTTP/SSE |

MCP não substitui function calling. Ele padroniza o que está por trás. O model ainda usa function calling pra invocar tools, mas as tools são descobertas e executadas via MCP.

## O que levar pra segunda-feira

- MCP é o "USB-C dos AI agents". Padroniza conexão entre models e data sources. Cada lado implementa uma vez, funciona com todos.
- Três primitivos: Tools (ações), Resources (dados), Prompts (templates). Simples e composável.
- Segurança é sua responsabilidade. O protocolo não resolve auth por você. Valide inputs, limite permissions, monitore uso.
- Comece expondo read-only tools. get_metrics, list_resources, get_logs. Adicione ações write só quando tiver confiança.
- stdio pra local, Streamable HTTP pra remoto. SSE ainda funciona mas está sendo depreciado em favor do transport stateless.

No próximo post: **projetando um assistente AI pessoal** de ponta a ponta.

## Leitura complementar

- [How MCP Works](https://lnkd.in/eT-z8Ekk) (Neo Kim, System Design Newsletter)
- [Model Context Protocol specification](https://modelcontextprotocol.io/)
- [MCP Servers repository](https://github.com/modelcontextprotocol/servers)
