---
slug: "como-bloquear-execucao-de-determinado-software-no-windows"
title: 'Como bloquear execução de determinado software no Windows'
date: '2010-05-11T21:16:10-04:00'
tags:
    - windows
---

Sabemos que em um ambiente em domínio, existem GPO’s que permitem criar “whitelists” ou “blacklists” permitindo ou não a execução de determinados softwares.

Podemos criar listas de executáveis permitidos e negados. Porém em um ambiente workgroup, ou até mesmo em uma estação standalone, eu não conhecia uma maneira de fazer isto.

Até que hoje eu descobrí uma maneira bastante simples de se fazer isto, utilizando um pequeno utilitário chamado **Trust-No-Exe.** Trabalha como um filtro de executáveis e permite criar listas de executáveis negados e liberados para execução no Windows.

Ele permite ainda que você faça isso pela rede em outras máquinas, sem ter a necessidade de ir em uma por uma.

Maiores informações e download, estão disponíveis em: <http://www.beyondlogic.org/solutions/trust-no-exe/trust-no-exe.htm>
