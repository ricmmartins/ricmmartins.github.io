# Copilot Instructions for ricardomartins.com.br

## Git Commits
- **NEVER** add `Co-authored-by: Copilot` or any Co-authored-by trailer referencing Copilot, GitHub Copilot, or any bot/AI in commit messages for this repository.
- All commits must appear as authored solely by the repository owner (Ricardo Martins).

## Content Rules

### Language & Style
- All blog posts and page content must be in Brazilian Portuguese (pt-BR).
- Use sentence case for all titles (only first word and proper nouns capitalized).
- Follow the humanizer voice calibration: direct, conversational, no AI patterns.
- Tom do Ricardo: como se estivesse explicando pro colega no whiteboard. Sem formalismo acadêmico.

### Clareza e Profundidade Técnica (OBRIGATÓRIO)
- **Todo post deve trazer clareza e profundidade técnica real.** Nível de um Principal Solutions Engineer que vive isso no dia a dia.
- Sempre incluir: comandos reais, exemplos práticos, cenários de produção, problemas reais.
- Nunca ficar na superfície. Se mencionar um conceito, explicar o porquê, o como, e quando usar/não usar.
- Começar com um problema real quando possível (cenário de segunda-feira de manhã, ticket de suporte, incidente).
- Para conceitos novos (especialmente AI), incluir tabelas mapeando jargão novo para conceitos que o leitor já conhece.
- Incluir comandos CLI (az, kubectl, terraform) que o leitor pode copiar e testar.
- Quando relevante, incluir screenshots do Azure Portal usando a ferramenta Playwright em tools/screenshots/.

### Validação Técnica (OBRIGATÓRIO)
- **Antes de finalizar qualquer post, TODOS os comandos CLI, scripts, blocos de código e referências técnicas devem ser validados contra a documentação oficial da Microsoft Learn.**
- Usar as ferramentas `microsoft_docs_search` e `microsoft_code_sample_search` para confirmar sintaxe, parâmetros, nomes de SKUs, e flags de comandos.
- Verificar que SKUs de VMs, nomes de serviços, e APIs referenciados não estão deprecated ou retired.
- Garantir que exemplos YAML/JSON (Kubernetes manifests, ARM templates, Bicep, Terraform) seguem a estrutura atual da documentação oficial.
- Se um comando mudou de sintaxe ou um serviço foi renomeado, usar a versão mais atual.
- Zero tolerância para comandos inventados ou flags que não existem. Se não encontrar confirmação na docs, não incluir.
