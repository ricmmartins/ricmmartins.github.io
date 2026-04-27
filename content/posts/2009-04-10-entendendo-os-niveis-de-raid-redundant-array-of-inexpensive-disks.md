---
slug: "entendendo-os-niveis-de-raid-redundant-array-of-inexpensive-disks"
title: 'Entendendo os Níveis de RAID (Redundant Array of Inexpensive Disks)'
date: '2009-04-10T18:12:17-04:00'
tags:
    - storage
categories:
    - Geral
description: "Autor: Danilo Montagna Esse artigo demonstra como solucionar os problemas de quebra de disco em um servidor, Dependendo dos serviços que estão sendo"
---

Autor: Danilo Montagna

Esse artigo demonstra como solucionar os problemas de quebra de disco em um servidor, Dependendo dos serviços que estão sendo rodados no servidor, geralmente acesso à banco de dados, e-mail, sistema corporativos, etc, não seria legal perder todo esse conteúdo por causa de uma falha de disco rígido, e por isso empresas de médio a grande porte investem em sistemas de “tolerância à falhas” ou seja, o Sistema RAID.

Uma das melhores soluções para “tolerância à falhas” para seu servidor é o Sistema RAID.

Definição de RAID: RAID significa “Redundant Array of Inexpensive Disks”. Pesquisadores da Universidade de Berkeley na Califórnia foram os que publicaram um estudo definindo o RAID, as suas características e tecnologias. Atualmente existem onze tipos de RAID: 0, 1, 2, 3, 4, 5, 6, 7, 10, 53 e 0+1.

Abaixo estão as descrições dos RAID mais utilizados:

**RAID 0 – striping sem tolerância à falha**

![RAID - Entendendo os Níveis de RAID (Redundant Array of Inexpensive Disks)](http://www.baboo.com.br/absolutenm/articlefiles/4127-raid.gif)

Este nível tem o nome de “striping”. Os dados do computador são divididos entre dois ou mais discos rígidos, o que oferece uma alta performance de transferência de dados, porém não oferece segurança de dados, pois caso haja alguma pane em um disco rígido, todo o conteúdo gravado neles irá ser perdido. O RAID 0 pode ser usado para se ter uma alta performance, porém não é indicado para sistemas que necessitam de segurança de dados.

![Raid1 - Entendendo os Níveis de RAID (Redundant Array of Inexpensive Disks)](http://www.baboo.com.br/absolutenm/articlefiles/4127-raid1.gif)

É possível usar de dois a quatro discos rígidos em RAID 0, onde os mesmos serão acessados como se fosse um único disco, aumentando radicalmente o desempenho do acesso aos HD’s. Os dados gravados são divididos em partes e são gravados por todos os discos. Na hora de ler, os discos são acessados ao mesmo tempo. Na prática, temos um aumento de desempenho de cerca de 98% usando dois discos, 180% usando 3 discos e algo próximo a 250% usando 4 discos. As capacidades dos discos são somadas. Usando 4 discos de 10 GB, por exemplo, você passará a ter um grande disco de 40 GB.

Este modo é o melhor do ponto de vista do desempenho, mas é ruim do ponto de vista da segurança e da confiabilidade, pois como os dados são divididos entre os discos, caso apenas um disco falhe, você perderá os dados gravados em todos os discos. É importante citar que neste nível você deve usar discos rígidos idênticos. É até possível usar discos de diferentes capacidades, mas o desempenho ficará limitado ao desempenho do disco mais lento.

**RAID 1 (mirror e duplexing)**

![Raid2 - Entendendo os Níveis de RAID (Redundant Array of Inexpensive Disks)](http://www.baboo.com.br/absolutenm/articlefiles/4127-raid2.gif)

O RAID 1 também é conhecido como “espelhamento”, ou seja, os dados do computador são divididos e gravados em dois ou mais discos ao mesmo tempo, oferecendo, portanto, uma redundância dos dados com segurança contra falha em disco. Esse nível de RAID tende a ter uma demora maior na gravação de dados nos discos, pelo fato da replicação ocorrer entre os dois discos instalados, mais sua leitura será mais rápida, pois o sistema terá duas pontes de procura para achar os arquivos requeridos.

Neste nível são utilizados dois discos, sendo que o segundo terá uma cópia idêntica do primeiro, ou seja, um CLONE. Na prática, será como se existisse apenas um único disco rígido instalado, pois o segundo seria usado para espelhamento dos dados gravados no primeiro – mas caso o disco principal falhe por qualquer motivo, você terá uma cópia de segurança armazenada no segundo disco. Este é o modo ideal se você deseja aumentar a confiabilidade e a segurança do sistema.

Um detalhe importante em RAID 1 é que, caso os dois discos estejam na mesma IDE, (1º em master e o 2º em slave), você teria que resetar o micro caso o primeiro disco quebrar, usando um disco por IDE a placa fará a troca automaticamente, sem necessidade de reset.

**RAID 10 (mirror e striping com alta performance)**

![Raid7 - Entendendo os Níveis de RAID (Redundant Array of Inexpensive Disks)](http://www.baboo.com.br/absolutenm/articlefiles/4127-raid7.gif)

O RAID 10 pode ser usado apenas com 4 discos rígidos. Os dois primeiros trabalharão em modo Striping (aumentando o desempenho), enquanto os outros dois armazenarão uma cópia exata dos dois primeiros, mantendo uma tolerância à falhas. Este modo é na verdade uma junção do RAID 0 com o RAID 1 e é muito utilizado em servidores de banco de dados que necessitem alta performance e tolerância à falhas.

**RAID 0+1 (alta performance com tolerância)**

![Raid9 - Entendendo os Níveis de RAID (Redundant Array of Inexpensive Disks)](http://www.baboo.com.br/absolutenm/articlefiles/4127-raid9.gif)

Ao contrário do que muitos pensam, o RAID 0+1 não é o mesmo que o RAID 10: embora ambos exijam no mínimo quatro discos rígidos para operarem e funcionam de uma maneira similar, o RAID 0+1 e tem a mesma tolerância à falha do RAID 5. No RAID 0+1, se um dos discos rígidos falhar, ele se torna essencialmente um RAID 0  
**RAID 2 (ECC)**

![Raid3 - Entendendo os Níveis de RAID (Redundant Array of Inexpensive Disks)](http://www.baboo.com.br/absolutenm/articlefiles/4127-raid3.gif)

Este nível de RAID é direcionado para uso em discos que não possuem detecção de erro de fábrica. O RAID 2 é muito pouco usado uma vez que os discos modernos já possuem de fábrica a detecção de erro no próprio disco.  
**RAID 3 (cópia em paralelo com paridade)**

![Raid4 - Entendendo os Níveis de RAID (Redundant Array of Inexpensive Disks)](http://www.baboo.com.br/absolutenm/articlefiles/4127-raid4.gif)

O RAID 3 divide os dados, a nível de byte, entre vários discos. A paridade é gravada em um disco em separado. Para ser usado este nível, o hardware deverá possuir este tipo de suporte implementado. Ele é muito parecido com o RAID 4.

**RAID 4 (paridade em separado)**

![Raid5 - Entendendo os Níveis de RAID (Redundant Array of Inexpensive Disks)](http://www.baboo.com.br/absolutenm/articlefiles/4127-raid5.gif)

RAID 4 divide os dados, a nível de “blocos”, entre vários discos. A paridade é gravada em um disco separado. Os níveis de leitura são muito parecidos com o RAID 0, porém a gravação requer que a paridade seja atualizada toda as vezes que ocorrerem gravações no disco, tornando-a mais lenta a gravação dos dados no disco. O RAID 4 exige no mínimo três discos rígidos.

**RAID 5 (paridade distribuída)**

![Raid6 - Entendendo os Níveis de RAID (Redundant Array of Inexpensive Disks)](http://www.baboo.com.br/absolutenm/articlefiles/4127-raid6.gif)

O RAID 5 é comparável ao RAID 4, mas ao invés de gravar a paridade em um disco separado, a gravação é distribuída entre os discos instalados. O RAID 5 aumenta a velocidade em gravações de arquivos pequenos, uma vez que não há um disco separado para a paridade. Porém como o dado de paridade tem que ser distribuído entre todos os discos instalados, durante o processo de leitura, a performance deverá ser um pouco mais lenta que o RAID 4. O RAID 5 exige no mínimo três discos rígidos.

Existem outros RAID que são utilizados em menor escala e/ou são baseados naquele acima mencionados:

**RAID 6 (dupla paridade)**

É essencialmente uma extensão do RAID 5 com dupla paridade

**RAID 7 (altíssima performance)**

As informações são transmitidas em modo assíncrono que são controladas e cacheadas de modo independente. obtendo performances altíssimas.

**RAID 53 (alta performance)**

É essencialmente um RAID 3 com cinco discos rígidos

Com certeza pode-se afirmar que o Sistema de arquitetura RAID é o mais utilizado entre empresas que querem manter segurança de dados em seus servidores. Algumas soluções são bastante caras, mas permitem um nível de segurança compatível com o investimento realizado.
