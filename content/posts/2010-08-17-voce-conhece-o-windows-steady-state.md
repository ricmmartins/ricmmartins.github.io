---
slug: "voce-conhece-o-windows-steady-state"
title: 'Você conhece o Windows Steady State?'
date: '2010-08-17T13:34:19-04:00'
tags:
    - windows
description: "Vou compartilhar com vocês um utilitário gratuito da Microsoft, que é uma mão na roda para adminsitradortes de redes. Estou falando do Windows Steady"
cover:
  image: "/og/voce-conhece-o-windows-steady-state.png"
  alt: ""
  hidden: true
---

Vou compartilhar com vocês um utilitário gratuito da Microsoft, que é uma mão na roda para adminsitradortes de <span class="bbli">redes</span>. Estou falando do Windows Steady State, um utilitário para configurar restrições, similares à GPO’s de domínio, em estações clientes. Eu utilizo em vários clientes e recomendo.

Atualmente, o Windows SteadyState já está na versão 2.5. Ele é um aplicativo se propõe a manter intacto o <span class="bbli">sistema operacional</span> e suas respectivas configurações livres dos dedos “fuçadores” dos usuários. Seja em uma empresa ou em um internet café com grande volume de clientes que utilize a linha de produtos Microsoft.

Para uma micro, pequena ou média empresa que, por quaisquer circunstâncias que sejam ainda não possuem o *Active Directory* (AD) instalado, esta pode ser uma eficiente e gratuita opção a ser considerada, pois não existe custo de licença cobrado pela Microsoft. Apenas há a validação do sistema operacional genuíno.

Em tempo vale a pena dizer que o WSS se integra ao AD. Pode funcionar como complemento específico para a proteção de partição física dos clientes da rede.

Assim, pelo menos em teoria, o nível de incidentes ao departamento de suporte tende a diminuir. E por conseqüência a equipe de suporte técnico fica um pouco mais aliviada para tratar de assuntos um pouco mais nobres.

Antes de instalar o produto deve-se desfragmentar o disco rígido para só então instalar o recurso Proteção de Disco do Windows. (Isto é importante porque o cache da Proteção de Disco precisa de uma porção contígua grande do espaço em disco para funcionar adequadamente.)

Já na tela inicial encontramos os três vértices do produto que são as configurações de restrições ao computador, agendamento de atualizações de software e proteção de disco rígido.

![telainicial](/wp-content/uploads/2010/08/telainicial1.jpg "telainicial")

Através da criação de contas particulares de usuários através do próprio WSS, que é o primeiro passo a ser dado nesta ferramenta, chega-se à configuração de restrições ao usuário. Tais como remoção de opções de menus e também configurações de aplicações para o Windows XP. Há ainda como restringir acesso a websites e restringir o tempo de utilização da máquina.

Lembra a filosofia do antigo poledit e também das diretivas de group policy.

Quanto às atualizações do sistema operacional efetuadas pelo windows update, também existe uma proteção configurável através do próprio WSS que garante que hotfixes e patches não serão removidos da máquina por qualquer usuário mais desavisado.

**Proteção de HD** – Esta característica (*Windows Disk Protection*) visa a proteger a partição na qual está instalado o sistema operacional. Atua como um restaurador automático do próprio sistema operacional. Pois sempre que o PC sofre um reboot, o WSS faz com que o Windows XP volte ao seu estado original pré-definido quando da instalação e configuração do próprio Windows SteadyState.

Uma prática recomendada é limpar e atualizar tudo o que puder no computador antes da instalação. Ou seja, desinstalar programas e excluir arquivos desnecessários, limpar caches e históricos, remover arquivos temporários e cookies, executar um programa antivírus e de remoção de spyware e verificar se há atualizações para o Windows e todos os seus aplicativos. A idéia é iniciar o computador com exatamente a mesma configuração que você deseja toda vez que usar a Proteção de Disco do Windows.

Considerando que a TI decidiu instalar o WSS em todos os PCs da empresa, ou ainda do café internet, é possível exportar todos os profiles criados para os outros PCs da rede. Assim as regras comuns passam a valer para todas as máquinas que possuem o Windows SteadyState instalado.

#### Configurando as restrições do computador

![Fig1](/wp-content/uploads/2010/08/Fig11.jpg "Fig1")

De acordo com a **Figura 1** percebemos as seguintes opções:

##### I – Configurações de privacidade

*1. Eliminar da caixa de diálogo “Log on to Windows” os nomes de usuários que já passaram anteriormente* *pela determinada máquina. Assim é minimizado o risco de um nome válido de usuário ser descoberto por* *pessoas com segundas intenções;*

*2. Prevenir a busca e uso de perfis de usuários;*

*3. Não armazenar em cache cópias de perfis de usuários;*

##### II – Configurações de segurança

*1. Remover o nome do administrador da tela de boas vindas.

*2. Remover os botões de desativar da tela de logon. Assim evita-se o risco de desligamentos não programados.*

*3. Não permitir que o Windows armazene senhas através de hash.*

*4. Não permitir a armazenagem de nomes e senhas de usuários do domínio ou Live ID.*

*5. Não permitir a criação de novas pastas (diretórios) na partição em tela.*

*6. Prevenir a abertura de documentos office a partir do browser.*

*7. Prevenir acesso de escrita a partir de portas USB. Claramente voltado para a evasão de informações corporativas.*

##### III – Outras Configurações

*1. Ativar a tela de boas vindas*

Alguns exemplos de uso:

- Não exiba logons na tela de boas-vindas.
- Remova o Painel de Controle do menu Iniciar.
- Oculte as unidades de disco que desejar em Meu Computador.
- Remova a opção Favoritos do menu do Internet Explorer.
- Desative macros no Microsoft Office.
- Impeça a execução de um programa instalado.
- Limite a duração de sessões usando cronômetros.
- Restrinja o acesso a uma lista de sites aprovados da Internet.

Na **figura 2** encontramos o agendamento de atualizações a ser realizado pelo WSS. Esta característica está diretamente ligada à proteção de HD que veremos logo em seguida. Há ainda a possibilidade de implementação de scripts para a realização das atualizações.

![Fig2](/wp-content/uploads/2010/08/Fig2.jpg "Fig2")

Na **figura 3** chegamos à proteção de HD que pode ser realizada através de três alternativas a partir do momento em que é habilitada.

![Fig3](/wp-content/uploads/2010/08/Fig3.jpg "Fig3")

*2. Remover todas as alterações ao reinício – Remove todas as mudanças feitas pelo usuário no próximo boot.*

*3. Reter mudanças temporariamente – Por um determinado período as mudanças são retidas no PC.*

*4. Reter as mudanças permanentemente – Tanto nesta opção quanto na segunda, o administrador poderá avaliar tudo que foi alterado pelo usuário.*

Existe ainda um check box onde o administrador não é avisado da perda de mudanças a cada reinício da máquina. Simplesmente o computador volta ao seu estado original eleito pela própria equipe de TI.

**Como funciona o recurso Proteção de Disco do Windows?**

O recurso Proteção de Disco do Windows cria um cache -um lugar especial no disco rígido – onde ele armazena todas as alterações que um usuário faz no sistema. Esse cache é seguro e recluso, como uma ‘área de segurança’ na qual os usuários realizam suas atividades sem afetar o sistema fora dela. Quando você limpa o cache, todas as alterações do usuário são descartadas, e o SteadyState cria uma nova área de segurança vazia para o próximo usuário trabalhar.

**Posso usar o recurso Proteção de Disco do Windows sem que os usuários percam todo seu trabalho?**

Sim. O recurso Proteção de Disco do Windows descarta somente as alterações feitas em arquivos que residam no mesmo disco rígido (partição) que o sistema Windows. Quando os usuários salvam seus trabalhos em uma unidade diferente, eles não são afetados pelo recurso Proteção de Disco do Windows.

**Dica**: *Você pode redirecionar a pasta Meus Documentos do usuário para uma unidade alternativa para facilitar o uso.*

**Posso permitir que os usuários façam alterações constantes em seus perfis?**

Sim. Se houver um usuário que precise reter as alterações entre as reinicializações, você poderá isentá-lo do recurso Proteção de Disco do Windows criando o perfil desse usuário em uma partição separada da partição do sistema operacional. Por exemplo, se o Windows XP estiver instalado na unidade C, você poderá configurar o perfil do usuário para residir na unidade D. (Observação: Não bloqueie o perfil. Um perfil bloqueado removerá quaisquer modificações, independentemente de onde estiverem no computador.)

**Posso gerenciar um grupo de computadores remotamente com o Windows SteadyState?**

O Windows SteadyState foi projetado essencialmente para configurar computadores individuais para uso compartilhado. A única forma de gerenciar remotamente um grupo de trabalho composto de computadores ponto-a-ponto conectados em rede é exportando os perfis de usuários criados em um computador para um local na rede do qual outros computadores possam importar as mesmas configurações.

Se os seus computadores compartilhados estiverem em um ambiente de servidor de domínio, o Active Directory fornecerá mais ferramentas poderosas para restringir os usuários e configurar os computadores. Todavia, o recurso Proteção de Disco do Windows do SteadyState é ainda muito útil para proteger a partição do sistema operacional de computadores de domínio.

**O Windows SteadyState funciona com servidores do Windows, Diretiva de Grupo e/ou Active Directory?**

Sim, ele funciona em um ambiente de servidor com Diretiva de Grupo e Active Directory. Em geral, as ferramentas de servidor são recomendadas para controlar as restrições de usuário. Todavia, o recurso Proteção de Disco do Windows do SteadyState é recomendado para proteger a partição do sistema operacional dos computadores compartilhados.

Todos podem acessar a comunidade do WSS no Microsoft Technet clicando em seu ícone na própria tela inicial do produto.

O Windows SteadyState é destinado a usuários do Windows XP PRO, Home e Tablet PC sob NTFS.

Gostou? Faça o download em [http://www.microsoft.com/downloads/details.aspx?displaylang=pt-br&amp;FamilyID=d077a52d-93e9-4b02-bd95-9d770ccdb431](http://www.microsoft.com/downloads/details.aspx?displaylang=pt-br&FamilyID=d077a52d-93e9-4b02-bd95-9d770ccdb431)
