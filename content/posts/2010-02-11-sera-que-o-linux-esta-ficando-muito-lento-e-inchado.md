---
slug: "sera-que-o-linux-esta-ficando-muito-lento-e-inchado"
title: 'Será que o Linux está ficando muito lento e inchado?'
date: '2010-02-11T23:03:22-05:00'
tags:
    - linux
description: "Linux performance: is Linux becoming just too slow and bloated? Autor original: Mitch Meyran"
---

***Linux performance: is Linux becoming just too slow and bloated?**  
Autor original:* **Mitch Meyran**  
*Publicado originalmente no:* [*freesoftwaremagazine.com*](http://www.freesoftwaremagazine.com/columns/linux_performance_linux_slow_bloated)  
*Tradução: [Roberto Bechtlufft](http://www.bechtranslations.com.br/)*

Eis um aspecto do software livre e de código aberto que está voltando a ser discutido: por anos, prevaleceu a ideia de que um software desse tipo precisava ser leve e elegante para ser considerado pronto para o uso. Mas alguns eventos recentes mostraram que, no caso do kernel do Linux, isso de certa forma deixou de ser verdade: o desempenho vem caindo lenta e regularmente.

Como isso é possível?

### O kernel “inchado”

O kernel do Linux é monolítico. Isso significa que todos os drivers de hardware rodam no espaço de memória do kernel. Sempre que você inclui um drive, está incluindo algo no kernel. Além disso, por questões de desempenho, vários elementos do espaço de usuário entram no kernel e o tornam ainda mais inchado.

Some a isso o fato de que, historicamente, o Linux tem sido desenvolvido para plataformas x86, estando fortemente vinculado a essa arquitetura, chegando até a usar interrupções de hardware no código (essencialmente misturando assembly de x86 no código C, que é bem mais genérico e portável).

Para completar, como tudo o que está relacionado ao hardware roda no espaço do kernel, o resultado é instável por natureza: um bug em um driver de hardware possibilita à placa de rede travar o sistema. O Linux é literalmente o oposto de um microkernel.

Talvez vocês se lembrem de um quebra-pau ocorrido há muitos anos na internet entre Andy Tanenbaum e Linus Torvalds acerca dos méritos de um microkernel. Não vou fingir ser o que eu não sou (professor com PhD, desenvolvedor de software e escritor), e vou deixar que você descubra por conta própria do que se tratava a discussão: primeiro, na [página de Andrew S. Tanenbaum sobre o MINIX e o Linux](http://www.cs.vu.nl/%7East/brown/), depois em uma [entrevista concedida à FSM](http://www.freesoftwaremagazine.com/articles/minix). Para acelerar as coisas, vou resumir aqui o que é um microkernel e suas vantagens.

#### MINIX: um microkernel

Um microkernel é, por definição, um kernel que NÃO possui drivers de hardware integrados — nenhum! Nem mesmo um agendador de interrupções ou um controlador de memória. Nada além de um sistema de mensagens, com todo o resto que não faça parte do kernel sendo executado em espaço de usuário. Um microkernel é elegante, e talvez nem precise de mais do que uns poucos milhares de linhas de código em C. É estável: se um driver de hardware falhar, o kernel não trava. Com isso, o driver pode travar e ser recarregado em seguida, novinho em folha. Além do mais, esse tipo de design facilita muito as atualizações. Como o kernel em si é muito simples, é relativamente fácil livrá-lo de bugs; quando um driver é atualizado, ele pode ser descarregado para que uma nova versão seja carregada em seu lugar. Ou seja, é o fim das reinicializações.

O MINIX foi criado como uma ferramenta para o aprendizado: por isso, precisa ser o mais independente do hardware quanto possível. Ele é todo feito com código portável (por exemplo, C — nada de assembly).

O MINIX está em sua terceira versão. Ele é capaz de rodar um sistema de janelas e pseudoterminais. Também pode operar como servidor, ou como desktop (mas pouquíssimas ferramentas para desktops foram portadas). Está em conformidade com o POSIX (o que não significa muita coisa).

E por que o MINIX não substitui o Linux?

Primeiro, por questões históricas. O MINIX é, antes de mais nada, uma ferramenta para o aprendizado. Ele é o clone funcional de UNIX mais básico da atualidade, e por isso mesmo precisa se manter bem simples. Novos recursos não devem ser incluídos como patches, mas sim como drivers adicionais, para que não sejam usados até serem necessários. Isso tudo, somado à menor quantidade possível de duplicação de código, significa que o processo de melhoria do MINIX é muito delicado.

Segundo, por questões de desempenho: os microkernels usam um sistema de mensagens para comunicação entre o kernel e os drivers. Esse processo consome ciclos de CPU que a comunicação direta no espaço do kernel não consome. O simples fato do controlador de memória estar separado do kernel já leva a uma perda de desempenho de 20%. Logo, na maioria dos casos, o MINIX será pelo menos 20% mais lento do que o Linux ou o BSD.

Outra questão de desempenho: como o código do Linux inclui código em assembly otimizado para x86, mesmo sem o design do microkernel ele continuaria sendo mais rápido do que o MINIX, que só tem código em C, ao rodar em plataformas x86 (o desempenho dependeria da eficiência do compilador, mas certamente haveria perdas). Mas é bom que entremos em mais detalhes nessa questão.

Nota do editor: *o Minix só se tornou livre um bom tempo depois de nascer. Esse foi um dos principais argumentos de Linus no debate com Tanenbaum…*

#### Um estranho kernel monolítico: o Linux

Uma das maiores melhorias implementadas no Linux desde sua criação foi a capacidade de suportar módulos: no princípio, era preciso compilar o kernel inteiro sempre que um componente de hardware era alterado. Outra opção era compilar um kernel enorme, com todos os drivers carregados, e isso resultava em RAM desperdiçada com drivers não utilizados. Com os módulos, é possível dividir o kernel em várias partes, que podem ser carregadas e descarregadas livremente. Ou seja, você pode compilar um kernel pequeno e básico para depois carregar os módulos necessários, em tempo de execução. Dá até para descarregar um módulo, compilar um substituto e carregar a versão atualizada, igualzinho a um micro kernel. Mas um aviso para quem não está prestando atenção: não é aí que o design do micro kernel é teoricamente melhor do que o de um kernel monolítico. Isso ocorre na interface entre o driver e o kernel.

Por exemplo, se você carregar um módulo com um driver gráfico bugado, pode travar o kernel e o computador.

Há vários fatores que aliviam o problema: a interface dos módulos no Linux fica cada vez mais afiada, e vai ficando mais difícil para um bug em um driver travar o kernel inteiro. Fora que, com a natureza de código aberto do kernel, é muito pouco provável que um código qualquer contenha bugs capazes de causar travamentos — e os bugs que existem logo são eliminados. Resumindo, o MINIX é estável porque não permite que bugs o façam travar, e o Linux é estável porque não há muitos bugs capazes de derrubá-lo — e as diferenças no uso dos dois são suficientes para que cada um seja um projeto diferente.

Embora Torvalds (e a comunidade de desenvolvedores do Linux de modo geral) discorde de Tabenbaum no que tange aos microkernels, ele admite que várias de suas afirmações são válidas. É por isso que, com o tempo, mais e mais código é adicionado ao kernel para isolar os subsistemas um do outro. Esse tipo de código traz mais complexidade às funções do kernel, usando ciclos de CPU e reduzindo o desempenho…

Essa é uma das questões.

Como o Linux agora roda em mais de uma plataforma (x86), várias de suas partes tiveram que ser reescritas: ARM, PPC e Itanium são algumas das plataformas nas quais o kernel roda. A maioria replica as mesmas funcionalidades da plataforma x86, mas muitas vezes de forma menos avançada ou refinada — logo, embora o Linux provavelmente seja um dos kernels de melhor desempenho em x86, o mesmo não vale para outras plataformas. Como isso é um problema, a maior parte do trabalho em código específico de x86 agora é feito da forma mais compartimentada possível:

- código que não tenha equivalente funcional em outras plataformas (a um custo razoável de desempenho, ou código como um emulador FPU x87, ou um controlador de memória específico) é mantido dentro do x86, mas precisa ser à prova de hacks;
- código com equivalência funcional em outras plataformas (com um custo razoável de desempenho) é programado em C comum e tirado do x86 para se alojar na seção “kernel”.

Veja que, nesse meio tempo, vários “hacks de velocidade” (válidos tanto para código remanufaturado quanto para código novo) poderiam ser perdidos. Ao mesmo tempo, graças à reutilização do código, a parte “central” do kernel em todas as plataformas (digamos, o agendador, o controlador de memória e o resto dos componentes internos do kernel) talvez esteja se tornando mais elegante em suas funções básicas. Mas código mais elegante não é a mesma coisa que código mais rápido.

Essa é outra questão.

O desempenho também depende de quem vê: por vezes ele pode ser prejudicado por um bug ou uma regressão, por outras pode resultar de uma mudança no equilíbrio. Vamos tomar como exemplo o alocador de memória e o driver do ext4.

Essa é a terceira questão, e merece uma análise mais detalhada.

### Recursos e segurança às custas do desempenho

Embora a modularização do código tenha um custo de desempenho genérico que costuma ser irrisório, considerando-se os ganhos de tempo de desenvolvimento e a qualidade geral do código, alguns recursos têm custos de desempenho que não são acompanhados de benefícios que possam ser facilmente mensurados — mas o benefício existe. Vamos tomar como exemplo duas das mais citadas “regressões que não são regressões”.

Tenha em mente que regressões acontecem e que geralmente são corrigidas após algumas versões novas do kernel.

#### O dilema do alocador de memória

No momento, o kernel do Linux tem três alocadores diferentes: O SLOB, que é histórico e um tanto dedicado, o SLAB, que era o favorito, e o SLUB, que é o mais novo e de modo geral o mais lento.

De acordo com a documentação do kernel, o SLUB foi escrito para substituir o SLAB em sistemas com mais de um núcleo: o SLAB é mais rápido do que o SLUB, sem dúvidas, mas em sistemas com mais de um núcleo ele também consome mais RAM. Em casos muito extremos, o SLAB pode acabar usando mais do que um gigabite de RAM, acabando com seus ganhos de desempenho devido à paginação e à “competição” do barramento de dados. O SLUB resolve esse problema pesando mais na CPU, mas usando menos RAM — nesses casos extremos, o SLUB se sai melhor do que o SLAB. Como ele também não consome tanta CPU assim, e como as máquinas estão ganhando cada vez mais núcleos (um Intel quad-core com Hyper-threading conta como processador de oito núcleos, e desperdiça uns 17 MB de RAM — diga adeus ao cache da sua CPU), acabou se tornando o padrão.

Mas as medições de desempenho de bancos de dados mostram que kernels usando o SLUB têm desempenho pior do que kernels usando o SLAB.

#### O estresse dos agendadores

A princípio, o Linux foi posto para trabalhar em tarefas típicas de servidores: essas tarefas tinham que ser realizadas o mais rapidamente possível. O Linux também é um kernel multitarefa cooperativo, que dá mais recursos a um processo quando ele os solicita se:

- a prioridade do processo (seu nível de ‘nice’) for mais alta do que a de outros processos que também exigem recursos;
- outros processos em execução tiverem notificado o kernel de que no momento suas operações foram concluídas.

A questão vai além disso, mas é só para você entender o básico.

Geralmente, a carga em servidores inclui um punhado de processos em primeiro plano com prioridades altas, focados em concluir suas tarefas o mais rapidamente possível antes de liberar seus recursos: nesses casos, atrasar uma tarefa para que outra seja concluída é o sistema mais eficiente. Menos erros de cache na CPU, menos movimentos frenéticos dos discos rígidos… esse tipo de agendamento é bom para servidores.

Mas em um desktop, isso significa que, digamos, os movimentos do mouse vão congelar se um processo abusar muito da CPU. E isso não é legal.

Para isso, o agendador CFS foi escrito, e o kernel meio que foi reprojetado. O CFS leva em conta coisas como a quantidade de recursos que já foram solicitados pelo processo. Ele permite a preempção de um processo em mais pontos de execução, e consulta os processos em busca de pontos de execução adicionais em intervalos mais regulares de tempo.

Mas as medições de desempenho de bancos de dados mostram que kernels usando o CFS têm desempenho pior do que kernels antigos.

### Fatores atenuantes

Pode parecer que a perda de velocidade do kernel não é algo ruim se em troca temos um sistema mais versátil e seguro. Mas ainda se discutem vários pontos que podem parecer contradizer tudo o que estou dizendo. Vou tratar de alguns desses pontos.

#### Os drivers de sistemas de arquivos devem ficar no espaço de usuário ou no kernel?

Essa é uma questão bem delicada, e há mais de um motivo para isso: como tudo no Linux é um arquivo, o sistema de arquivos tem que estar bem próximo ao kernel. Afinal, até os processos estão no sistema de arquivos. É só olhar em /proc, ou procurar por dispositivos em /dev! Voltemos ao debate microkernel vs. kernel monolítico. Os custos de desempenho seriam altos se todos os sistemas de arquivos ficassem no espaço de usuário. Então vamos colocar todos os drivers de sistemas de arquivos na memória! Mas há milhares deles, e alguns estão infestados de bugs! Tem certeza de que quer fazer isso?

Vou usar um exemplo bastante controverso, que mostra como é difícil responder a essa pergunta sem um contexto: vamos falar no NTFS, com suporte a espaços de arquivos NT, POSIX e DOS, fluxos de dados alternativos, journaling de metadados, compactação e criptografia em nível de arquivo, desfragmentação integrada e alocação de blocos fora da ordem.

A versão 3 estreou no Windows 2000, e é a versão em uso no momento. Nem todos os seus recursos são usados ou sequer suportados pelos sistemas operacionais da Microsoft, ou seja, pode haver destruição de dados em volumes NTFS perfeitamente válidos e “sadios”. Não diga que eu não avisei.

O suporte a NTFS é uma promessa antiga: primeiro porque não havia nenhuma utilização real para ele até 2003, segundo porque ele é muito complexo e não muito bem documentado. Ainda assim, há suporte ao NTFS no kernel desde 2001, só que para uma versão mais antiga do NTFS (do NT4), que não era compatível com a versão 3.x, causando corrupções tremendas. Em meados de 2004, um driver NTFS reescrito apareceu, permitindo acesso para leitura e até para escrita em partições NTFS. Um driver de terceira geração, surgido em 2006, logo chamou a atenção: o NTFS-3G roda em espaço de usuário e oferece acesso total para leitura e escrita em partições NTFS. O objetivo principal não era o desempenho, e só recentemente essa questão ganhou prioridade, embora já tenham havido muitas melhorias nesse sentido.

O seu desempenho mediano foi citado como razão para que os drivers de sistemas de arquivos sejam mantidos no espaço do kernel. A julgar pelos testes semiformais que eu fiz, isso é uma besteira. O que eu observei foi que:

- O driver NTFS do Windows tem um alocador de blocos desastroso, capaz de dividir um arquivo grande em mais de 3.000 pedaços em uma partição usada, enquanto o NTFS-3G só divide o arquivo em uns trinta pedaços (teste realizado em uma partição de 80 GB com 60% do espaço preenchido).
- O NTFS-3G consome bastante tempo da CPU ao realizar a escrita (a versão mais recente, 20091015, dá uma boa melhorada nesse problema): um monte de arquivos pequenos ou um poucos arquivos grandes agora não fazem muita diferença, mas em sistemas mais modestos (como netbooks) a taxa de transferência é essencialmente limitada pelo clock da CPU;
- O NTFS do Windows, do NTFS-3G e do Linux têm velocidade de leitura e uso de CPU muito semelhantes durante a leitura;
- As taxas de dados variam enormemente no Linux de acordo com a interface usada: SCSI (incluindo IDE e SATA nos kernels mais recentes) ou USB. O mesmo se aplica se você usar o pacote FUSE completo ou a versão reduzida e otimizada oferecida pelo NTFS-3G.

Isso significa que o NTFS-3G não pode ser usado para exemplificar como drivers internos do kernel são melhores do que os que ficam em espaço de usuário: ele não apenas é tão rápido quanto o driver interno do kernel, (ambos compartilham a mesma funcionalidade e boa parte do código, com uso semelhante da CPU) como também há um maior impacto no desempenho vindo dos controladores de barramento! Além disso, levando-se em consideração que a maior parte do tempo gasto em leituras se dá esperando por uma resposta do driver, otimizações pequenas como o acesso direto ao kernel e/ou o uso de código assembly são inúteis, e ponto final. Otimizações na ordem de leitura, na organização e na alocação dos dados são bem mais importantes.

Quanto a deixar os sistemas de arquivos na memória, a questão é outra. Ou seja, não há motivo para que um driver de sistema de arquivos seja portado para o kernel se ele já funciona bem em espaço de usuário, nem há motivos reais para tirar um sistema de arquivos do kernel se ele já estiver completo e tiver sido bem testado. Na verdade, há um projeto em andamento para modularizar a alocação de blocos e os relatórios de erros no kernel para todos os drivers de sistemas de arquivos: Embora esse não seja, *stricto sensus*, o melhor lugar para isso, é mais prático em termos de “repositório de código”, mas exige também para funcionar bem.

#### Fora do x86, o Linux é uma droga… ou não?

Essa afirmação não está errada, mas também não está certa: na verdade, o Linux funciona muito bem em PPC, provavelmente devido ao fato de Linus ter uma CPU Apple Mac G5; ou seja, se o Linux-x86 é bom, o Linux-PPC vem em segundo lugar. Além disso, a arquitetura x86-64 recentemente conquistou um lugar só seu no kernel, não sendo mais a filha bastarda da árvore x86. Enquanto isso, Alpha e Itanium vão ficando meio “mofadas” — digo, suas arquiteturas. Há vários sistemas embarcados com suporte a elas… ou não — eles não costumam durar muito.

E chegamos à arquitetura ARM. O fato é que o Linux não roda muito bem na arquitetura ARM. Aqui, temos algumas informações vindas do Debian. O kernel pode não ser fantástico, mas a maior parte da perda de desempenho em ARM vem da biblioteca glibc do GNU — e foi por isso que o Debian decidiu substituir a glibc pela eglibc, que é basicamente uma glibc cheia de patches. De acordo com os autores do fork, os desenvolvedores do GNU não são muito rápidos e demoram muito para integrar patches para a arquitetura ARM, o que levou ao fork. O bom da eglibc é que, embora tenha patches para ARM, ela continua compatível com a glibc — rodando, portanto, em x86 (em ambas), PPC etc.

Parece que não é mais tão difícil assim portar o Linux para plataformas diferentes, e a falha de um port depende de muitas outras coisas além do kernel. Mas é preciso tempo para que as coisas deem certo.

### Conclusão

O Linux está inchando e ficando mais lento. Só que não dá para correlacionar diretamente as duas coisas, já que o kernel cresce cada vez que um driver é incluído, mas você não é obrigado a carregar todos os drivers. O fato é que, dado um conjunto semelhante de drivers, o Linux não está de fato ficando maior.

Usando medições atuais, o desempenho do Linux está, sim, caindo regularmente; essas medições são voltadas para tarefas específicas, e essas tarefas são típicas de servidores, portanto é bom ter um pé atrás.

Quando alguma regressão aparece no kernel, ela geralmente é corrigida rapidamente. Regressões “falsas” geralmente são causadas pelo acréscimo de recursos de segurança e/ou estabilidade, e também por uma “mãozinha” das otimizações voltadas para os usuários. O que faltam são ferramentas que “peguem” regressões e tempo para que novos recursos não façam o kernel inchar.

Nesse sentido, projetos como a suíte de testes e tracker da [Phoronix](http://www.phoronix.com/), que testa tanto tarefas orientadas à rede quanto ao usuário, e que permite que variações sejam disponibilizadas automaticamente, são ferramentas comuns há tempos no Windows, e seus resultados não têm preço.

*Créditos a Mitch Meyran* – [freesoftwaremagazine.com](http://www.freesoftwaremagazine.com/columns/linux_performance_linux_slow_bloated)  
*Tradução por [Roberto Bechtlufft](http://www.bechtranslations.com.br/) &lt;info at bechtranslations.com.br&gt;*

<http://www.guiadohardware.net/artigos/linux-lento-inchado/>
