---
slug: "raid-perguntas-e-respostas"
title: 'RAID: perguntas e respostas !'
date: '2009-04-10T18:10:58-04:00'
tags:
    - storage
description: "Autor: Fábio Kaiser Rauber [fabiorauber at hotmail.com] Este tutorial foi desenvolvido para esclarecer um recurso cada vez mais difundido: RAID"
---

Autor: Fábio Kaiser Rauber \[fabiorauber at hotmail.com\]

Este tutorial foi desenvolvido para esclarecer um recurso cada vez mais difundido: RAID. Primeiro serão explicados os conceitos principais e, em meio aos conceitos, responderei a perguntas que freqüentemente vem à cabeça dos leitores.

RAID inicialmente foi feito para servidores, no entanto, muitas placas-mãe SOHO (Small Office Home Office -&gt; Pequenos escritórios ou usuário doméstico) do mercado já vem com um Chip RAID onboard. Mas, o que significa?

RAID significa Redundant Array of Independent Disks. Em bom português, significa Matriz Redundante de Discos Independentes. Apesar do nome ser complicado, o conceito é bem simples: fazer com que vários discos rígidos trabalhem como se fossem um só. Existem vários tipos de RAID, aqui citaremos os mais comuns:

**RAID 0:** Dois ou mais discos rígidos são agrupados. Os dados são gravados distribuindo-se a carga entre os discos que fazem parte da matriz (geralmente em blocos de 32kb ou 64Kb de dados). Este método não é muito seguro, já que se um participante da matriz falhar, todos os dados serão perdidos. No entanto, é o mais rápido, pois a leitura e gravação são distribuídas.

![](http://www.baboo.com.br/absolutenm/articlefiles/3659-RAID0.gif)

**RAID 1:** Também chamado de espelhamento: um dos discos serve de espelho para o outro. Tudo que é gravado em um dos discos é gravado no outro. Isso faz com que a performance de gravação seja um pouco prejudicada, no entanto, a leitura dos dados é acelerada, já que temos dois discos lendo o mesmo arquivo. É uma forma bem segura, mas também a mais cara, sendo que apenas 50% do espaço disponível é aproveitado.

![](http://www.baboo.com.br/absolutenm/articlefiles/3659-RAID1.gif)

**RAID 5:** Melhor relação custo x performance x segurança. Para esse tipo de RAID, há necessidade de no mínimo 3 discos. As informações de paridade são gravadas em cada disco de tal forma que se um dos integrantes da matriz falhar, as informações nele contidas podem ser reconstruídas. Sua performance de gravação é menor do que a do RAID 0 e maior que a do RAID 1. A performance de leitura é a melhor entre as aqui citadas, já que as informações estão distribuídas entre três ou mais discos.

![](http://www.baboo.com.br/absolutenm/articlefiles/3659-RAID5.gif)

Pode-se implementar RAID de duas maneiras distintas sendo cada qual com suas vantagens e desvantagens: RAID por Software ou Hardware.

**RAID por Software**

A grande vantagem do RAID por software é seu custo: nenhuma placa adicional ou mesmo componente onboard faz parte dos seus requisitos. Na verdade, a única necessidade é ter um sistema operacional que dê suporte a essa tecnologia – como o Windows 2000.

Aqui iremos tratar dos conceitos de RAID por software desse sistema operacional da Microsoft pois no Windows 2000 temos dois tipos de discos: básicos e dinâmicos.

**Disco Básico:** É o disco comum, que é subdividido em partições. Pode ter até quatro partições Primárias (aquelas que dão suporte a boot) ou então três Primárias e uma Estendida. Esta última é subdividida em Unidades Lógicas. Um disco básico não dá suporte a RAID por software.

**Disco Dinâmico:** Este tipo de disco é de exclusividade dos sistemas operacionais baseados no Windows 2000 (XP e Win2003 inclusos), ou seja, somente esses sistemas operacionais conseguem reconhecê-lo. Um disco dinâmico é subdividido em Volumes ao invés de partições. Nesse caso não há limitações quanto ao número de volumes que podem existir em um disco dinâmico. Com ele podemos criar matrizes de RAID por software.

**Como faço para converter um disco dinâmico de volta para básico?**

Isso não é possível sem que todos os volumes tenham sido deletados. Portanto, tenha certeza do que está fazendo…

**Posso converter meu ZIP drive ou meu disco USB para disco dinâmico?**

Não é possível converter discos removíveis para discos dinâmicos. Tampouco o disco rígido de seu laptop ou notebook pode ser convertido para dinâmico.

**Convertendo um disco básico em um disco dinâmico:**

![](http://www.baboo.com.br/absolutenm/articlefiles/3659-Basic_to_dynamic.gif)

Selecione o(s) disco(s) a ser(em) convertido(s)…

![](http://www.baboo.com.br/absolutenm/articlefiles/3659-Basic_to_dynamic1.gif)

E finalmente clique em Convert!

![](http://www.baboo.com.br/absolutenm/articlefiles/3659-Basic_to_dynamic2.gif)

Depois de ter o seu disco convertido para dinâmico, é importante que você entenda os vários tipos de volumes existentes no Windows 2000:

**Volume Simples:** É o equivalente à partição do disco Básico. Todas as partições são convertidas para volumes simples depois que seu disco se torna dinâmico.

**Volume Estendido (ou Spanned):** Um volume estendido pode conter espaço em disco de até 32 HDs. Os dados são gravados preenchendo o espaço em disco do primeiro HD, depois do segundo e assim por diante. Por essa razão, não há melhoria na performance.

**Volume Striped:** Chamado assim porque os dados são gravados em tiras (stripes). É o nosso famoso RAID 0! Um volume striped pode conter de 2 até 32 discos.

**Volume Espelhado:** É o RAID 1.

**Volume Striped com Paridade:** Implementação por software do RAID 5. O Windows 2000 suporta até 32 discos em um Volume Striped com Paridade, lembrando que o mínimo é 3.

A figura abaixo ilustra uma matriz de RAID por software, mais precisamente um volume Striped: note que não necessariamente todo o espaço de determinado disco rígido deve estar ocupado pelo volume.

![](http://www.baboo.com.br/absolutenm/articlefiles/3659-RAID0Screen.gif)

**Perguntas Freqüentes**

- Por que não consigo instalar o Windows em um determinado volume?

O Windows 2000 somente pode ser instalado em uma Partição que foi convertida para Volume (isso ocorre automaticamente quando o disco é convertido para dinâmico). O programa de instalação usa a BIOS para se comunicar com o disco, que só reconhece volumes listados na tabela de partições do HD.

- Não consigo fazer um volume Striped com Paridade no meu Windows 2000 Professional!

O Windows 2000 Professional não suporta volumes com tolerância a falha (volumes Espelhados e volumes Striped com Paridade).

- Posso mover um volume Striped, Striped com paridade, Estendido ou Espelhado de um computador para outro?

Sim. Contanto que todas as unidades de disco rígido integrantes da matriz forem movidas.

**RAID por Hardware**

RAID por hardware é sem dúvida a maneira mais eficiente de implementar matrizes de discos rígidos e qualquer sistema operacional pode reconhecer uma matriz desse tipo, como se fosse um HD simples. A figura abaixo demonstra esse aspecto em uma placa-mãe Soyo K7V Dragon Plus, que contém um chip onboard da Promise modelo FastTrak 100 Lite.

![](http://www.baboo.com.br/absolutenm/articlefiles/3659-DevMngHRaid.gif)

![](http://www.baboo.com.br/absolutenm/articlefiles/3659-PromiseChip.gif)

Chip Promise FastTrak 100 Lite  
da Soyo Dragon Plus!

Além disso, o RAID por hardware é mais rápido: ao contrário das matrizes de RAID por Software, todo o espaço da unidade de disco é utilizado para a matriz.

- Posso mesclar unidades de disco diferentes em uma matriz de RAID por Hardware?

Sim, mas a controladora vai fazer com que elas se tornem “iguais”. Se tivermos um disco de 40Gb de 5400Rpm e um outro disco de 20Gb de 7200 Rpm, teremos que a quantidade de espaço disponível para a matriz será de 40Gb, o espaço restante na unidade de disco maior ficará inutilizado. Quanto à performance, seria como se você tivesse dois discos de 5400 rpm.

- Quero mover minha matriz de RAID por Hardware para outro computador.

Funciona, desde que todas as unidades da matriz forem movidas e que as controladoras dos dois computadores sejam as mesmas (como duas Promise Fasttrak 100) ou compatíveis.

- As controladoras RAID são incompatíveis… Posso ler a minha matriz em uma controladora de disco rígido comum?

Você pode ler as unidades em separado e em certas configurações. Apesar desse comportamento variar entre as controladoras RAID, normalmente consegue-se ler qualquer um dos discos de uma matriz de Espelhamento (RAID 1) e uma “matriz” de um disco somente em RAID 0.

- Não existe opção para dar boot pela matriz RAID na minha Bios…

Geralmente a Bios da máquina reconhece a controladora RAID como uma SCSI. Assim sendo, tudo o que você deve fazer é selecionar a opção SCSI em uma das opções de boot. Abaixo temos o exemplo da BIOS da Soyo Dragon Plus:

![](http://www.baboo.com.br/absolutenm/articlefiles/3659-RaidBoot.gif)
