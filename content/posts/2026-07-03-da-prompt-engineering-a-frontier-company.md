---
slug: "da-prompt-engineering-a-frontier-company"
translationKey: "2026/07/02/from-prompt-engineering-to-frontier-company"
title: "Da prompt engineering à frontier company: por que o modelo já não é o diferencial"
description: "Modelos viraram commodity. O diferencial agora é o sistema ao redor: harness engineering, context engineering, governança. Como a conversa evoluiu em 3 anos e onde estamos hoje."
date: 2026-07-02T18:00:00-04:00
categories:
  - AI
  - Arquitetura
tags:
  - ai-engineering
  - harness-engineering
  - context-engineering
  - frontier-company
  - agentes-ia
  - azure
---

Três anos atrás, a pergunta que eu mais ouvia era: "qual é o melhor prompt?"

Dois anos atrás, mudou pra: "como faço RAG?"

Ano passado: "como construo um agent?"

Esse ano, a conversa é diferente. As pessoas estão perguntando como transformar uma organização inteira pra operar com agents. Não um chatbot no site. Dezenas de agents integrados nos processos, com governança, observabilidade, permissões granulares.

Essa evolução conta uma história. E acho que poucos pararam pra conectar os pontos.

## A timeline

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 780 520" style="width:100%;height:auto" role="img" aria-label="Evolução da engenharia de AI: de Prompt Engineering até Frontier Company, mostrando cada disciplina como uma etapa na timeline vertical">
<defs>
<marker id="arr-blue" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
<path d="M 0 0 L 10 5 L 0 10 z" fill="#6c8ebf"/>
</marker>
<marker id="arr-purple" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
<path d="M 0 0 L 10 5 L 0 10 z" fill="#9673a6"/>
</marker>
<marker id="arr-green" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
<path d="M 0 0 L 10 5 L 0 10 z" fill="#82b366"/>
</marker>
</defs>
<g font-family="Segoe UI, Arial, sans-serif">
<rect x="250" y="10" width="280" height="42" rx="8" fill="#dae8fc" stroke="#6c8ebf" stroke-width="2"/>
<text x="390" y="36" text-anchor="middle" font-size="13" font-weight="bold" fill="#1a3a5c">Prompt Engineering</text>
<line x1="390" y1="52" x2="390" y2="78" stroke="#6c8ebf" stroke-width="2" marker-end="url(#arr-blue)"/>
<rect x="250" y="80" width="280" height="42" rx="8" fill="#dae8fc" stroke="#6c8ebf" stroke-width="2"/>
<text x="390" y="106" text-anchor="middle" font-size="13" font-weight="bold" fill="#1a3a5c">Context Engineering</text>
<line x1="390" y1="122" x2="390" y2="148" stroke="#6c8ebf" stroke-width="2" marker-end="url(#arr-blue)"/>
<rect x="250" y="150" width="280" height="42" rx="8" fill="#dae8fc" stroke="#6c8ebf" stroke-width="2"/>
<text x="390" y="176" text-anchor="middle" font-size="13" font-weight="bold" fill="#1a3a5c">RAG + Tool Calling</text>
<line x1="390" y1="192" x2="390" y2="218" stroke="#6c8ebf" stroke-width="2" marker-end="url(#arr-purple)"/>
<rect x="250" y="220" width="280" height="42" rx="8" fill="#e1d5e7" stroke="#9673a6" stroke-width="2"/>
<text x="390" y="246" text-anchor="middle" font-size="13" font-weight="bold" fill="#4a235a">Agent Engineering</text>
<line x1="390" y1="262" x2="390" y2="288" stroke="#9673a6" stroke-width="2" marker-end="url(#arr-purple)"/>
<rect x="250" y="290" width="280" height="42" rx="8" fill="#e1d5e7" stroke="#9673a6" stroke-width="2"/>
<text x="390" y="316" text-anchor="middle" font-size="13" font-weight="bold" fill="#4a235a">Harness Engineering</text>
<line x1="390" y1="332" x2="390" y2="358" stroke="#9673a6" stroke-width="2" marker-end="url(#arr-purple)"/>
<rect x="250" y="360" width="280" height="42" rx="8" fill="#e1d5e7" stroke="#9673a6" stroke-width="2"/>
<text x="390" y="386" text-anchor="middle" font-size="13" font-weight="bold" fill="#4a235a">Multi-Agent Systems</text>
<line x1="390" y1="402" x2="390" y2="428" stroke="#82b366" stroke-width="2" marker-end="url(#arr-green)"/>
<rect x="250" y="430" width="280" height="48" rx="8" fill="#d5e8d4" stroke="#82b366" stroke-width="2.5"/>
<text x="390" y="459" text-anchor="middle" font-size="14" font-weight="bold" fill="#1b5e20">Frontier Company</text>
<text x="60" y="36" font-size="11" fill="#888">2023</text>
<text x="60" y="106" font-size="11" fill="#888">2024</text>
<text x="60" y="176" font-size="11" fill="#888">2024</text>
<text x="60" y="246" font-size="11" fill="#888">2025</text>
<text x="60" y="316" font-size="11" fill="#888">2026</text>
<text x="60" y="386" font-size="11" fill="#888">2026</text>
<text x="60" y="459" font-size="11" fill="#888">2026+</text>
<text x="620" y="36" font-size="10" fill="#666">como falar com o modelo</text>
<text x="620" y="106" font-size="10" fill="#666">o que o modelo enxerga</text>
<text x="620" y="176" font-size="10" fill="#666">dar memória e ação ao modelo</text>
<text x="620" y="246" font-size="10" fill="#666">autonomia de decisão</text>
<text x="620" y="316" font-size="10" fill="#666">confiabilidade em produção</text>
<text x="620" y="386" font-size="10" fill="#666">coordenação entre agents</text>
<text x="620" y="459" font-size="10" fill="#666">empresa inteira opera com agents</text>
</g>
</svg>

Cada etapa resolveu um problema real que a anterior não cobria. Prompt engineering ensinou a falar com o modelo. Context engineering ensinou a alimentar o modelo com a informação certa. RAG e tool calling deram memória e capacidade de ação. Agents deram autonomia. E aí percebemos que autonomia sem controle é caos em produção.

## O modelo virou commodity

Vou ser direto: o modelo já não é o diferencial competitivo.

Em 2023, ter acesso ao GPT-4 era vantagem real. Hoje existem GPT-5, Claude, Gemini, Llama, DeepSeek, Mistral, Qwen. Todos excelentes. Todos capazes de escrever código, interpretar imagens, chamar ferramentas, resolver problemas complexos.

Ainda existem diferenças entre eles? Sim. Mas o gap entre o melhor e o quinto melhor encolheu tanto que raramente determina o sucesso de um projeto.

Pensa assim: duas empresas usando o mesmo modelo. A primeira conecta esse modelo ao CRM, ERP, monitoramento, documentação interna, pipelines, políticas de segurança e workflows da organização. A segunda abre uma janela de chat.

Mesmo modelo. Resultados completamente diferentes.

O valor nunca esteve só no cérebro. Sempre esteve no sistema ao redor dele.

## Harness engineering: o nome do jogo agora

Uma fórmula que apareceu bastante esse ano resume bem:

```
Agent = Model + Harness
```

O modelo é o "cérebro". O harness é tudo que transforma esse cérebro num agent que funciona em produção. Uma analogia que gosto: pensa num piloto de F1. O piloto é o LLM. O carro, rádio, telemetria, equipe de box, estratégia de pneus e regulamento da corrida são o harness. Coloca o melhor piloto num carro ruim e ele perde a corrida.

Na prática, o harness de um agent corporativo inclui:

| Componente | O que faz | Serviço no Azure |
|------------|-----------|------------------|
| System prompts | Define personalidade e constraints | Azure AI Foundry |
| Ferramentas (MCP/APIs) | Dá capacidade de ação | Azure Functions, Logic Apps |
| RAG | Busca conhecimento relevante | Azure AI Search |
| Memória | Mantém estado entre sessões | Cosmos DB |
| Permissões | Controla quem acessa o quê | Microsoft Entra ID |
| Aprovação humana | Decisões críticas passam por gente | Logic Apps, Service Bus |
| Avaliação | Mede qualidade das respostas | Azure AI Foundry evals |
| Observabilidade | Logs, traces, métricas | Azure Monitor, App Insights |
| Guardrails | Previne comportamentos indesejados | Azure AI Content Safety |
| Orquestração | Coordena múltiplos agents | Azure Container Apps, AKS |

Percebe o padrão? Quase nada dessa lista é IA. É engenharia de software. Infraestrutura. O tipo de coisa que a gente já faz há anos, aplicado a um contexto novo.

## Um exemplo concreto

Imagina um agent que responde perguntas sobre sua infraestrutura Azure. Alguém pergunta:

> "Qual VM está consumindo mais CPU nas últimas 24h?"

O modelo sozinho não sabe a resposta. Ele não tem acesso ao seu ambiente.

Com um harness bem montado, o fluxo real é:

1. O agent identifica a intenção (query de métricas de VM)
2. Valida se o usuário tem permissão pra acessar esses dados (Entra ID)
3. Consulta o Azure Resource Graph pra listar as VMs
4. Chama o Azure Monitor pra puxar métricas de CPU
5. Compara os resultados e identifica o pior caso
6. Monta a resposta com dados reais
7. Opcionalmente, sugere ação (resize, alerta, runbook)

Esse fluxo inteiro não tem nada a ver com "qual modelo usar". É design de sistema. É integrações. É permissões. É observabilidade.

Em código, a chamada do agent pro Azure Resource Graph seria algo como:

```bash
az graph query -q "
  Resources
  | where type == 'microsoft.compute/virtualmachines'
  | project name, resourceGroup, location, properties.hardwareProfile.vmSize
" --output table
```

E as métricas de CPU viriam do Monitor:

```bash
az monitor metrics list \
  --resource "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Compute/virtualMachines/{vm}" \
  --metric "Percentage CPU" \
  --interval PT1H \
  --start-time 2026-07-02T00:00:00Z \
  --end-time 2026-07-03T00:00:00Z \
  --output table
```

O modelo só entra pra decidir a sequência de chamadas e formatar a resposta final. O harness faz o trabalho pesado.

## Context engineering: o sistema operacional do agent

Contexto não é só "jogar documentos no prompt".

Context engineering é decidir:

- O que o agent pode enxergar (e o que não pode)
- Quando pode enxergar (contexto temporal)
- Por quanto tempo retém informação (memória de curto vs longo prazo)
- Em qual formato recebe os dados (structured vs unstructured)
- Quanto espaço cada peça ocupa no token budget

Escrevi sobre isso em detalhe no [post sobre context engineering](/posts/context-engineering-a-arte-de-alimentar-llms/). A versão curta: contexto bem montado é 80% do resultado. Modelo mediano com contexto excelente supera modelo top com contexto ruim.

## MCP: o USB-C dos agents

Outro componente do harness que explodiu em 2026: o Model Context Protocol. Já escrevi sobre isso [aqui](/posts/mcp-e-agentes-101-para-engenheiros-de-infra/) e [aqui](/posts/como-mcp-funciona-o-protocolo-que-conecta-agents-ao-mundo/), mas no contexto desse post o ponto é simples.

Antes do MCP, cada ferramenta precisava de uma integração custom. Agora existe um protocolo padronizado que conecta qualquer modelo a qualquer sistema. É o que permitiu harness engineering escalar. Em vez de construir integrações one-off, você expõe seus sistemas como MCP servers e qualquer agent pode consumir.

## Frontier company: quando o harness vira a empresa

A Microsoft começou a usar o termo "frontier company" pra descrever algo que vai além de "empresa que usa IA".

Uma frontier company não é uma empresa onde alguns funcionários usam Copilot. É uma empresa onde:

- Agents fazem parte dos processos de negócio
- Humanos supervisionam e decidem, agents pesquisam e executam
- Existe governança real sobre o que agents podem fazer
- Produtividade é medida no nível organizacional
- Dados e sistemas estão conectados de forma que agents conseguem navegar

A diferença parece sutil. Mas muda a arquitetura do negócio inteiro.

## O paralelo com o que já vivemos

Nos anos 2000, aprendemos a construir pra servidores físicos. Depois virtualização. Depois cloud. Depois containers. Depois Kubernetes.

Cada uma dessas mudanças parecia ser "só uma nova tecnologia". Na real, cada uma mudou completamente como pensamos software. Cloud não foi "rodar VM em outro lugar". Foi um modelo mental novo sobre como construir, operar e escalar sistemas.

Tenho a impressão de que estamos vivendo a mesma coisa de novo. Aplicações cujo comportamento é definido por agents já existem em produção. E elas pedem práticas diferentes, arquiteturas diferentes, formas diferentes de testar e monitorar.

Se a era anterior foi "cloud native", talvez essa seja "agent native".

## O diferencial real

Daqui a alguns anos, duvido que alguém pergunte qual modelo sua empresa usa. Da mesma forma que hoje ninguém pergunta qual hipervisor roda seu ambiente ou qual web server entrega seu site.

O diferencial vai estar em outro lugar:

- Na qualidade do contexto que seus agents recebem
- Na engenharia do harness (segurança, observabilidade, governança)
- Na integração entre agents e pessoas
- Na capacidade de transformar inteligência artificial em inteligência organizacional

Porque empresas não competem por modelos. Competem pela capacidade de usar conhecimento pra tomar decisões melhores, mais rápido.

E o sistema que permite isso tem nome: harness.

---

*Este post também está disponível em [inglês](https://rmmartins.com/2026/07/02/from-prompt-engineering-to-frontier-company/). Se você quer se aprofundar nos conceitos técnicos mencionados aqui, recomendo os posts da série [AI Engineering pra quem é de infra](/series/ai-engineering-pra-quem-é-de-infra/), especialmente os sobre [context engineering](/posts/context-engineering-a-arte-de-alimentar-llms/), [RAG](/posts/como-rag-funciona-da-teoria-ao-pipeline/) e [MCP](/posts/mcp-e-agentes-101-para-engenheiros-de-infra/).*
