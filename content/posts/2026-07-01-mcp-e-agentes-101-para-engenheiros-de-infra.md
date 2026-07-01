---
slug: "mcp-e-agentes-101-para-engenheiros-de-infra"
translationKey: "2026/07/01/mcp-and-agents-101-for-infra-engineers"
title: "MCP e Agentes de IA 101 para Engenheiros de Infraestrutura"
description: "O que é MCP, como agentes de IA funcionam e o que muda operacionalmente — explicado para profissionais de infra/SRE com um exemplo real no AKS."
date: 2026-07-01T10:00:00-04:00
categories:
  - AI
  - Azure
tags:
  - mcp
  - agentes-ia
  - azure
  - aks
  - infraestrutura
  - tool-calling
series:
  - "MCP Agentes e Infraestrutura"
---

Em algum momento nos últimos meses, alguém do seu time apareceu falando sobre um "AI agent" ou um "MCP server" e pediu acesso, um deploy ou uma explicação para o CISO sobre por que agora existe um processo não determinístico com permissão para encostar no cluster de produção. Este post é o modelo mental que eu gostaria de ter tido antes de tocar nisso pela primeira vez. Sem hype e com um exemplo real rodando no Azure ao longo do caminho.

## O que um agent realmente é

Esqueça a definição de marketing. Na prática, um agent é a combinação de quatro coisas: um modelo que decide o próximo passo, um conjunto de tools que ele pode invocar, um loop de execução que orquestra essa ida e volta, e algum tipo de memória para sustentar o estado durante o processo.

A diferença entre um agent e um script de automação tradicional está em onde a decisão mora. Num script, você escreveu o fluxo: "se X, faça Y". Num agent, você descreve o objetivo e as tools disponíveis, e o modelo decide a sequência de chamadas em tempo real com base no que cada tool retorna. Na prática, o loop é sempre esta dança:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 200" style="width:100%;height:auto" role="img" aria-label="Loop de execução de um agent: prompt entra, modelo decide, chama tool, host executa, resultado volta ao modelo">
<defs>
<marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M 0 0 L 10 5 L 0 10 z" fill="#555"/>
</marker>
</defs>
<g font-family="Segoe UI, Arial, sans-serif">
<rect x="20" y="45" width="135" height="44" rx="7" fill="#dae8fc" stroke="#6c8ebf" stroke-width="2"/>
<text x="87" y="64" text-anchor="middle" font-size="10" fill="#1a3a5c">User Prompt +</text>
<text x="87" y="78" text-anchor="middle" font-size="10" fill="#1a3a5c">Available Tools</text>
<line x1="155" y1="67" x2="195" y2="67" stroke="#555" stroke-width="2" marker-end="url(#arr)"/>
<rect x="200" y="45" width="120" height="44" rx="7" fill="#e1d5e7" stroke="#9673a6" stroke-width="2"/>
<text x="260" y="71" text-anchor="middle" font-size="11" font-weight="bold" fill="#4a235a">Model Decides</text>
<line x1="320" y1="67" x2="365" y2="67" stroke="#555" stroke-width="2" marker-end="url(#arr)"/>
<rect x="370" y="45" width="130" height="44" rx="7" fill="#fff2cc" stroke="#d6b656" stroke-width="2"/>
<text x="435" y="64" text-anchor="middle" font-size="10" fill="#7c6200">Requests</text>
<text x="435" y="78" text-anchor="middle" font-size="10" fill="#7c6200">Tool Call</text>
<line x1="500" y1="67" x2="540" y2="67" stroke="#555" stroke-width="2" marker-end="url(#arr)"/>
<rect x="545" y="45" width="135" height="44" rx="7" fill="#d5e8d4" stroke="#82b366" stroke-width="2"/>
<text x="612" y="64" text-anchor="middle" font-size="10" fill="#1b5e20">Host Executes</text>
<text x="612" y="78" text-anchor="middle" font-size="10" fill="#1b5e20">the Tool</text>
<path d="M 612 89 L 612 120 C 612 135, 600 140, 580 140 L 280 140 C 265 140, 260 135, 260 125 L 260 95" stroke="#555" stroke-width="2" fill="none" marker-end="url(#arr)"/>
<text x="430" y="155" text-anchor="middle" font-size="10" fill="#555">result goes back</text>
<line x1="260" y1="89" x2="260" y2="175" stroke="#9673a6" stroke-width="2" stroke-dasharray="5,3" marker-end="url(#arr)"/>
<rect x="195" y="175" width="130" height="20" rx="4" fill="none" stroke="none"/>
<text x="260" y="193" text-anchor="middle" font-size="10" fill="#9673a6">Final text or iteration limit</text>
</g>
</svg>

Pense nisso como um runbook executado não por uma pessoa lendo o Confluence, mas por um LLM lendo as descrições das tools que ele tem disponíveis. Isso é poderoso porque generaliza: você não precisa de um script para cada cenário. E também é arriscado pelo mesmo motivo: o caminho percorrido não é 100% previsível.

## Tool calling: o mecanismo por trás de tudo

Quando você entrega para um modelo a definição de uma tool, com nome, descrição e schema de parâmetros, ele não executa nada. O que ele faz é emitir uma estrutura de dados dizendo: "quero chamar `get_pod_logs` com `namespace=prod, pod=checkout-7f9c`". Quem de fato executa isso é o seu código (o "host"), que pega esse JSON, roda a função real e devolve o resultado para o modelo continuar raciocinando. O modelo nunca toca diretamente em nada; ele só sugere chamadas.

Esse detalhe parece pequeno, mas é por isso que a **descrição** da tool importa tanto quanto o código por trás dela. Um cenário clássico quando você começa a testar isso no mundo real: você sobe um agent com uma tool de logs cuja descrição não menciona limite de linhas nem paginação. Em produção, um pod em crash loop gera 40 mil linhas. O modelo chama a tool, recebe um payload grande demais para raciocinar direito, tenta de novo com outra janela de tempo, depois troca de pod, depois volta para o primeiro. Dez chamadas depois, uma tarefa que deveria custar centavos virou uma conta de API de dois dígitos, e ninguém está mais perto de entender por que o pod caiu. A causa raiz não foi o modelo "alucinando"; foi a descrição incompleta da tool. É o tipo de bug que não aparece em tutorial; só aparece em produção.

## E é aí que entra o MCP

MCP (Model Context Protocol) é um protocolo aberto, criado pela Anthropic em novembro de 2024 e doado em dezembro de 2025 para a Agentic AI Foundation, sob o guarda-chuva da Linux Foundation. Ou seja, hoje ele é um padrão com governança neutra, não um recurso proprietário de um único vendor. Ele padroniza **como** uma aplicação com LLM se conecta a data sources e tools externas, usando JSON-RPC 2.0 por baixo dos panos.

A analogia que costuma funcionar melhor para quem é de infra é a do LSP (Language Server Protocol). Antes do LSP, cada editor precisava da própria integração para cada linguagem. O LSP resolveu isso ao criar um protocolo comum: qualquer editor que fala LSP conversa com qualquer language server que fala LSP. O MCP faz o mesmo para agents: antes dele, toda aplicação de IA que quisesse integrar com GitHub, um banco de dados ou Azure precisava de uma integração proprietária. Com MCP, você escreve **um** servidor, e qualquer host compatível, como Claude, Copilot, Cursor ou VS Code, consegue falar com ele sem código custom.

A arquitetura tem três peças:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 310" style="width:100%;height:auto" role="img" aria-label="Arquitetura MCP com Host contendo MCP Client, conectado via transport ao MCP Server que expõe tools, resources e prompts">
<defs>
<marker id="arr2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M 0 0 L 10 5 L 0 10 z" fill="#555"/>
</marker>
</defs>
<g font-family="Segoe UI, Arial, sans-serif">
<rect x="40" y="20" width="340" height="90" rx="8" fill="#dae8fc" stroke="#6c8ebf" stroke-width="2"/>
<text x="210" y="42" text-anchor="middle" font-size="13" font-weight="bold" fill="#1a3a5c">HOST</text>
<rect x="80" y="55" width="260" height="40" rx="6" fill="#ffffff" stroke="#6c8ebf" stroke-width="1.5" stroke-dasharray="4,3"/>
<text x="210" y="79" text-anchor="middle" font-size="11" fill="#1a3a5c">MCP Client (1 per server)</text>
<text x="400" y="55" font-size="10" fill="#666">Claude, Copilot, Cursor,</text>
<text x="400" y="68" font-size="10" fill="#666">your agent</text>
<line x1="210" y1="110" x2="210" y2="155" stroke="#555" stroke-width="2" marker-end="url(#arr2)"/>
<text x="225" y="138" font-size="10" fill="#555">stdio / HTTP + streaming</text>
<rect x="40" y="160" width="340" height="80" rx="8" fill="#d5e8d4" stroke="#82b366" stroke-width="2"/>
<text x="210" y="185" text-anchor="middle" font-size="13" font-weight="bold" fill="#1b5e20">MCP SERVER</text>
<text x="210" y="218" text-anchor="middle" font-size="11" fill="#1b5e20">tools · resources · prompts</text>
<text x="400" y="195" font-size="10" fill="#666">e.g. AKS-MCP, GitHub,</text>
<text x="400" y="208" font-size="10" fill="#666">Postgres</text>
<line x1="210" y1="240" x2="210" y2="275" stroke="#555" stroke-width="2" marker-end="url(#arr2)"/>
<text x="210" y="295" text-anchor="middle" font-size="11" fill="#444">real API / resource (Azure, K8s, database...)</text>
</g>
</svg>

- **Host**: a aplicação que orquestra o loop e apresenta a interface para o usuário.
- **MCP Client**: vive dentro do host e mantém uma conexão 1:1 com cada servidor.
- **MCP Server**: o processo que expõe capacidades, localmente (via `stdio`) ou remotamente (via HTTP com streaming e OAuth).

E o que um servidor expõe são três tipos de primitivas: **tools** (ações, verbos como `scale_deployment`), **resources** (dados que podem virar contexto, substantivos como um log ou um documento) e **prompts** (templates reutilizáveis que o servidor sugere para o modelo usar em uma tarefa específica).

## Um exemplo real: um agent de SRE falando com AKS via MCP

Para sair da teoria: a própria Microsoft mantém um MCP server open source para AKS, o `aks-mcp`, dentro da organização Azure no GitHub. Ele expõe componentes que você ativa individualmente: `az_cli`, `monitor`, `detectors`, `advisor`, `kubectl`, `helm`, `network`, `compute`, `fleet`, `cilium`, `hubble`, e você o sobe assim:

```
./aks-mcp --transport stdio \
  --access-level readonly \
  --enabled-components monitor,detectors,kubectl
```

A partir daí, qualquer host compatível com MCP, como a extensão oficial de AKS para VS Code, Claude, Copilot Chat ou Cursor, enxerga essas capacidades como tools disponíveis para o modelo.

Cenário: 3 da manhã, alerta de pod em crash loop em produção. Em vez de abrir cinco abas: Azure Monitor, um terminal com `kubectl`, Resource Health, Advisor, você pergunta para o agent: "por que o pod de checkout caiu de novo?". O modelo, vendo as tools disponíveis, decide sozinho a sequência: chama `detectors` para verificar se o AKS já sinalizou algum problema conhecido na service mesh ou no control plane, chama `monitor` para puxar métricas de CPU e memória do node, chama `kubectl` para capturar os eventos recentes do pod. Você nunca escreveu esse script: ele emergiu da combinação entre a pergunta e as tools disponíveis naquele momento.

O detalhe mais importante do ponto de vista operacional é o `--access-level readonly`. Isso não é "só mais um parâmetro"; é o guardrail mais importante do servidor inteiro. Sem ele, esse mesmo agent poderia, em teoria, decidir "corrigir" o problema escalando o deployment ou reiniciando um node por conta própria. Com `readonly`, ele só pode observar.

## Construindo um agent do zero

Coloque de lado, por um instante, qual framework usar: a arquitetura é a mesma, seja LangChain, um agent SDK ou código bruto chamando a API.

Tudo começa pela escolha do modelo, sempre um trade-off entre custo, latência e qualidade de raciocínio, e isso pesa mais aqui do que em um chatbot simples, porque um agent faz múltiplas chamadas por tarefa, não uma só. Em cima disso vem o system prompt, que define o papel, os limites do que o agent pode fazer e o formato de resposta esperado. É o documento de onboarding do seu "funcionário" não determinístico.

A parte que mais determina se o agent vai funcionar bem ou mal, porém, são as definições das tools. A descrição de cada tool é literalmente o manual que o modelo lê para decidir se e como deve usá-la, como vimos no exemplo do log gigante. "Update resource" convida ao uso errado; "scale a Kubernetes deployment to N replicas, requires namespace and deployment name, do not use on StatefulSets" conduz ao uso certo.

```python
# pip install mcp
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("k8s-ops")

@mcp.tool()
def scale_deployment(namespace: str, deployment: str, replicas: int) -> str:
    """Scales a Kubernetes Deployment to the given number of replicas.
    Do not use on StatefulSets. Requires the exact namespace and name."""
    # the real call to the K8s API goes here
    return result

if __name__ == "__main__":
    mcp.run(transport="stdio")
```

Esse é o padrão real do SDK oficial em Python (`mcp.server.fastmcp.FastMCP`): o decorator captura automaticamente o nome da função, os type hints e a docstring para gerar o JSON schema que o modelo lê; por isso a docstring não é comentário, é interface. Você registra a função, escolhe um transport (`stdio` para uso local, `streamable-http` para uso remoto e multiusuário, com OAuth se ficar exposto externamente), e qualquer host compatível passa a enxergar essa capability.

Acima de tudo isso está o próprio loop de execução: o orquestrador que envia prompt e tools para o modelo, recebe a intenção de chamar algo, executa isso de verdade, devolve o resultado e repete, sempre com limite de iterações, porque sem isso um agent confuso pode ficar chamando a mesma tool de novo e de novo, e cada chamada é uma requisição de API faturada. E, por fim, memória: quanto da conversa cabe na context window, se você precisa buscar informação externa (RAG), se precisa persistir estado entre sessões.

## Construindo um servidor MCP

Construir um servidor é mais simples do que parece e, na prática, você raramente vai começar do zero. Hoje existem SDKs oficiais em Python, TypeScript, Java, Kotlin, C# e Swift (além de implementações da comunidade em Rust e Go), e um ecossistema com mais de 500 servidores públicos já prontos: bancos de dados, GitHub, Slack e, no seu caso específico, todo o Azure por meio de servidores como o `aks-mcp`. Antes de escrever uma linha de código, vale checar se o que você precisa já existe.

Quando realmente faz sentido construir o seu, o coração de um servidor se parece bastante com isto:

```python
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("k8s-ops")

@mcp.tool()
def scale_deployment(namespace: str, deployment: str, replicas: int) -> str:
    """Scales a Kubernetes Deployment to the given number of replicas.
    Do not use on StatefulSets. Requires the exact namespace and name."""
    # the real call to the K8s API goes here
    return result
```

Você registra a função, expõe o schema, escolhe o transport, e qualquer host compatível passa a ver essa capability automaticamente.

Se você quiser testar isso hoje à noite sem sequer subir um host, o caminho mais rápido é o MCP Inspector: `npx @modelcontextprotocol/inspector` aponta para qualquer servidor, o seu ou um pronto, como o `aks-mcp`, e deixa você navegar pelas tools, chamar cada uma manualmente e ver o JSON-RPC cru indo e voltando. É o jeito mais direto de entender o protocolo antes de colocar um modelo dentro do loop.

## Times de agents (sistemas multi-agent)

Um único agent começa a quebrar quando a tarefa é grande demais para uma única context window, ou quando ela se beneficia de especialização. Voltando ao cenário do crash loop: em vez de um agent com acesso a tudo, você pode ter um orquestrador que delega para sub-agents especializados: um chamando `aks-mcp` para diagnosticar o cluster, outro consultando o histórico de deploy no Azure DevOps para ver se uma mudança recente coincide com o incidente, um terceiro apenas redigindo o resumo do incidente no formato que o seu time usa. No fim, o orquestrador junta tudo.

A analogia mais honesta para o seu dia a dia é: microservices versus monolito. Dividir em sub-agents dá isolamento de contexto e reduz o blast radius por componente, mas adiciona latência, custo (mais chamadas de API por tarefa) e complexidade de coordenação. Depurar "por que o time de agents chegou a essa conclusão" é mais difícil do que depurar um único agent, pelo mesmo motivo que depurar uma cadeia de microservices é mais difícil do que depurar um monolito. Essa complexidade só vale a pena quando a tarefa realmente ganha com paralelismo ou especialização que um único system prompt não cobre bem; caso contrário, é overhead.

Um comentário lateral: existe também o A2A (Agent-to-Agent Protocol), que resolve um problema diferente de MCP: comunicação entre agents, não entre agent e tool. MCP dá mãos ao agent; A2A deixa agents conversarem entre si sem um orquestrador central. Para o padrão orquestrador-worker descrito acima, você nem precisa disso; um orquestrador chamando sub-agents como funções já resolve. O A2A entra em cena quando os agents pertencem a sistemas ou times diferentes e precisam negociar sem hierarquia compartilhada.

## O que isso muda operacionalmente

O exemplo do `aks-mcp` já deu a pista do que muda do seu lado: um MCP server frequentemente carrega credenciais reais: kubeconfig, API keys, tokens de banco, e merece exatamente o mesmo rigor que qualquer outro serviço com acesso privilegiado: segredos em vault, rotação e escopo mínimo necessário por tool. As flags `--access-level readonly` e `--enabled-components` no servidor são a aplicação literal desse princípio: você não entrega ao agent mais capability do que a tarefa pede, do mesmo jeito que não daria a um service principal mais do que ele precisa.

Também aparece um vetor de ataque que não existe na automação tradicional: se uma tool retorna conteúdo vindo de fora, como um log, um email ou o body de uma página web, esse conteúdo pode conter instruções que o modelo tente seguir como se viessem do usuário. Trate todo dado externo como não confiável, do mesmo jeito que você trataria input de usuário numa aplicação web. E qualquer tool com poder destrutivo, como `delete_resource`, `scale_to_zero` ou reiniciar um node, não deveria ser autônoma; pense nela como um approval gate em pipeline, não como um botão que o agent aperta sozinho.

Por fim, custo é métrica operacional, não só financeira. Cada iteração do loop é uma chamada de modelo, e chamada de modelo significa token, e token significa dinheiro. Sem limite de iterações e sem alerta de custo, o cenário do log gigante descrito acima deixa de ser exceção e vira rotina. E nada disso é depurável se você não registra cada tool call com o mesmo rigor com que registraria qualquer chamada de API: quem pediu, o que o modelo decidiu, o que realmente rodou, o que voltou.

## Fechando

MCP é o protocolo que padroniza como agents se conectam a tools e dados: o LSP do mundo dos agents, agora sob governança neutra da Linux Foundation. Um agent é modelo, tools, loop de execução e guardrails. Não é mágica: é uma arquitetura com um componente não determinístico no meio. Um time de agents é composição: vários agents especializados coordenados, com os mesmos trade-offs de qualquer sistema distribuído. E, como o `aks-mcp` mostra, isso já não é mais experimento de laboratório. É tooling oficial rodando contra clusters de produção, com os mesmos riscos e as mesmas exigências de qualquer outro componente que toca infraestrutura crítica: least privilege, observabilidade, limites de custo e approval gates sempre que a ação for irreversível.

Se você curte conteúdo aplicado de infraestrutura como este, eu sigo escrevendo sobre Azure, AKS e SRE em [rmmartins.com](https://rmmartins.com). Há mais material hands-on de Kubernetes em [k8shackathon.com](https://k8shackathon.com) e [fromservertocluster.com](https://fromservertocluster.com).

*Esta série tem um repositório companion com todo o Terraform usado do post 2 ao post 5; o link está no fim do post 5.*

---

*Este é o post 1 da série "MCP, Agentes e Times de Agentes para Engenheiros de Infraestrutura":*

1. **[MCP e Agentes 101](/mcp-e-agentes-101-para-engenheiros-de-infra/)**
2. [O Watchdog 429 Determinístico](/watchdog-429-deterministico-azure-openai/)
3. [De Script a Agente](/watchdog-agente-autonomia-decisao-guardrails/)
4. [Orquestração Multi-Agentes](/orquestracao-multi-agentes-aks-openai-correlacao/)
5. [Governança no Microsoft Foundry](/governanca-agentes-microsoft-foundry/)

*Repositório companion: [agentic-infra-handbook](https://github.com/ricmmartins/agentic-infra-handbook)*

*Read this post in [English](https://rmmartins.com/2026/07/01/mcp-and-agents-101-for-infra-engineers/).*
