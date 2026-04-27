---
slug: "sistemas-operacionais-64-bits-vale-a-pena"
title: 'Sistemas operacionais 64 bits: Vale a pena?'
date: '2010-03-28T20:10:21-04:00'
tags:
    - linux
description: "Por Alexandre Otto Strube Hoje o texto será um pouco menos técnico, mas igualmente prático."
cover:
  image: "/og/sistemas-operacionais-64-bits-vale-a-pena.png"
  alt: ""
  hidden: true
---

Por Alexandre Otto Strube

Hoje o texto será um pouco menos técnico, mas igualmente prático.

Processadores de 64 bits são hoje uma realidade, e não apenas um sonho de futuro. Mesmo os processadores celeron atuais são capazes de executar sistemas operacionais de 64 bits. Os preços não são mais altos do que os de 32 bits, eles simplesmente os sucederam.

Coisa semelhante deverá acontecer com os processadores intel pentium 4, que, por serem mais caros, têm uma rotatividade menor, portanto ainda são encontrados em sua maioria em 32 bits no mercado brasileiro ainda.  
No lado da AMD, os athlon já são 64 bits há muito tempo. Os processadores da linha Sempron, que são o antigo athlon XP, ainda são de 32 bits. Existem algumas poucas unidades encontráveis no mercado que permitem endereçamento de memória de 64 bits.

Que os processadores de 64 bits valem a pena, não há a menor dúvida. Eles permitem uma capacidade muito maior de memória, e permitem rodar os softwares do futuro, coisa um pouco mais complicada para os de 32 bits. O caso é: Vale a pena ter um sistema operacional de 64 bits hoje em dia?

A grande questão atualmente é com os controladores de dispositivo, que nós nos referimos como Device Drivers. Vários controladores de dispositivo são disponíves apenas para sistemas operacionais de 32 bits.

O caso é especialmente emblemático no caso do Microsoft Windows. Como ele foi lançado há relativamente pouco tempo, os desenvolvedores não tiveram tempo (ou interesse) em lançar versões de 64 bits dos drivers dos seus produtos (afinal, quase ninguém usa). A falta de drivers para o windows xp 64 é emblemática. Os próprios integradores e lojas vendem máquinas de 64 bits com o windows de 32.

No caso do Linux, a coisa muda um pouco de figura, e, incrivelmente, para melhor.

Por quê?

A explicação é simples: o Linux é software livre. Temos grande parte dos drivers desenvolvidos pela própria comunidade de software livre. Da mesma forma que, em grande parte dos casos, ter um programa rodando nos pc 64 bits é simplesmente uma questão de recompilação, assim acontece com muitos dos drivers. Outros dão algum trabalho, mas nada do outro mundo.

Existem alguns drivers, entretanto, que são problemáticos mesmo no caso do Linux. São eles exatamente os drivers proprietários, que fazem o pesadelo do xp 64.

Portanto, se você quer usar Linux mas tem um winmodem, a chance é de que você não irá conseguir usá-lo, a menos que use o driver da Linuxant ( <http://www.linuxant.com/drivers> ) – que é específico para modems conexant e é pago.

O caso é ainda mais estranho para as placas de rede sem fio. Muitas delas não têm drivers para Linux, e usa-se uma aplicação chamada ndiswrapper ( <http://ndiswrapper.sourceforge.net/> )que pode usar os drivers do windows – mas nesse caso, deve usar os drivers do xp-64, e você está novamente em um beco sem saída, pois a maiora das placas não tem driver nem para o windows.

Conclusão. Vale a pena usar o Linux de 64 bits? Vale. E por que não usar? Por conta de um ou outro hardware específico. Fora isso, sejam bem-vindos ao futuro!
