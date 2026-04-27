---
slug: "mas-enfim-o-que-e-um-firewall"
title: 'Mas enfim, o que é um firewall ?'
date: '2009-03-19T00:57:54-04:00'
tags:
    - segurança
    - networking
description: "[](/wp-content/uploads/2009/03/18-03-2009-214642.jpg) Um Firewall é uma ‘passagem’ (“gateway”) que restringe e controla o fluxo do tráfego de dados entre"
---

[![Firewall](/wp-content/uploads/2009/03/18-03-2009-214642.jpg "Firewall")](/wp-content/uploads/2009/03/18-03-2009-214642.jpg)

Um Firewall é uma ‘passagem’ (“gateway”) que restringe e controla o fluxo do tráfego de dados entre redes, mais comumente entre uma rede empresarial interna e a Internet. Os Firewalls podem também estabelecer passagens seguras entre redes internas. Por exemplo, imagine uma instalação militar hipotética que tenha duas redes, uma para informações não confidenciais e a outra conectada a sistemas estratégicos de defesa. Um Firewall muito eficiente deve ser instalado para assegurar que apenas usuários autorizados tenham acesso a rede mais restrita.

Castelos e suas fortificações são comumente usados em analogia na descrição dos mecanismos de defesa de um sistema de Firewalls. Um castelo é projetado para proteger as pessoas do lado de dentro dos ataques e tentativas de invasão vindas do lado de fora. Existe portanto, um perímetro de defesa que mantém os atacantes o mais afastados quanto possível. (paredes externas, fossos, crocodilos, etc). O portão do castelo é o ‘posto de controle’ por onde as pessoas e suprimentos devem passar para poder entrar ou sair do castelo. É o ponto de maior concentração de recursos de defesa do castelo.

O Firewall é esse ‘posto de controle’ das redes internas que, de forma ativa, inspeciona e controla o fluxo do tráfego de dados entre as redes. No caso de um Firewall com Proxy, o tráfego nunca transita livremente entre as redes. Ao invés disso o Proxy ‘re-empacota’ (ou mascara) as requisições e as respostas. Nenhum Servidor interno é acessado diretamente de uma rede externa e nenhum Servidor externo é acessado diretamente a partir da rede interna. Pense nas pessoas dentro do castelo. Durante os tempos de tensão, eles podem preferir manter-se dentro do castelo e usar os ‘agentes proxy’ (representantes) para cuidar de seus interesses e necessidades fora do castelo.

Parte de um projeto confiável de uma rede conectada na Internet é a criação de uma ‘zona desmilitarizada’ ou DMZ (demilitarized zone) que é justamente uma rede parcialmente protegida que se localiza entre a rede protegida e a rede desprotegida. A DMZ é protegida por um sistema de defesa perimetral, muito semelhante aos muros externos e fossos dos castelos. Imagine a praça de comércio de um castelo. Nos tempos medievais, as pessoas da região e comerciantes podiam entrar nessa área do castelo com certa facilidade para entregar e retirar mercadorias. À noite, os portões eram fechados e os mantimentos trazidos para dentro do castelo, normalmente após uma inspeção rigorosa. Os guardas eram posicionados nos portões do castelo durante o dia para inspecionar todas as pessoas que entram e saem do castelo. Se arruaceiros eram localizados tentando entrar no castelo, eles os impediam e os botavam para fora.

A DMZ segue exatamente essa analogia. Os usuários de Internet podem entrar livremente na DMZ para acessar Servidores WEB Públicos (Sites comuns), enquanto que os roteadores de alerta localizados nos pontos de acesso filtram todo o tráfego não permitido, como por exemplo, inundações de pacotes de dados vindos de Hackers que tentam impedir o funcionamento do sistema por saturação (Ataques do tipo DoS – Deny of Service ou Negação de Serviço). Ao mesmo tempo a rede interna privada está protegida por Firewalls altamente seguros. Dentro dos muros do castelo existia a ‘torre principal’, que era uma estrutura altamente segura que proporcionava a última defesa contra os atacantes.

[![18-03-2009-214703](/wp-content/uploads/2009/03/18-03-2009-214703.jpg "18-03-2009-214703")](/wp-content/uploads/2009/03/18-03-2009-214703.jpg)

Interessantemente, os castelos se mostraram estruturas altamente capazes de resistir aos ataques até a aparição dos canhões. No século 16, Essex e Cromwell derrotaram muitos castelos na Irlanda com pouca milícia. Eles simplesmente estouravam os parapeitos na parte superior dos castelos para que se tornassem indefensáveis e aí então escalavam suas paredes. Comparativamente, que tipos de armas nossas defesas das redes irão enfrentar? Os Firewalls se tornaram equipamentos bastante sofisticados com o passar dos anos, mas eles não constituem uma solução única e absoluta. Eles consistem apenas um dos diversos recursos necessários disponíveis para os administradores de segurança da rede.

Observe:

Um Firewall pode ser composto de diversos componentes, incluindo um Roteador, um servidor Gateway e um Servidor de Autenticação. Um Firewall monitora o tráfego que entra e que sai e filtra, redireciona, re-empacota e/ou rejeita pacotes. Esses pacotes podem ser filtrados com base em seus IPs de origem e destino, porta TCP de origem e destino, número total (ou serie ?) de bits do cabeçalho do TCP e assim por diante.

No caso de um Firewall do tipo Proxy, o Firewall é o endereço de destino de todas as conexões que saem e entram. Possui a capacidade de executar amplas varreduras de segurança e validação nos pacotes por ele processados. Os Proxys executam versões de softwares e protocolos testados extensivamente e livres de mal-funcionamentos (bugs).

Os Firewalls podem fazer cumprir as políticas de segurança de uma organização através da filtragem de todo o tráfego que sai e entra na empresa, garantindo que o mesmo está dentro dos parâmetros de segurança pré-estabelecidos pelas políticas de uso da rede. Recursos sofisticados de auditoria, detecção de intrusos e metodologias de autenticação são hoje parte da maioria dos Firewalls comerciais.

A RFC 2979, “O Comportamento e os Requisitos dos Firewalls de Internet (Behavior of and Requirements for Internet Firewalls) de Outubro de 2000 descreve outras características dos Firewalls.

Os Hackers e os agressores estão crescendo constantemente em número, em agressividade e evoluindo em conhecimento. Em 2000, a China anunciou que não teria como se manter no nível dos EUA militarmente e que, portanto, ameaçou o financiamento de uma guerra de ‘tecnologia da informação’ contra os Estados Unidos. Os sistemas de computadores das instalações militares estão sob ataques constantes, sejam eles sofisticados ou ordinários. Quantos intrusos não detectados poderão existir nesses sistemas ?

Por exemplo, um agressor pode planejar um ataque com antecedência usando técnicas de e-mails infectados com vírus para introduzir os chamados ‘programas zumbis’ em centenas ou milhares de computadores de usuários comuns (e inocentes dentro do contexto do ataque), muitos dentro de sua própria rede (usuários locais). Esses programas zumbis são programados para despertar num determinado momento e começar a promover ataques contra outros sistemas. O verdadeiro agressor não pode ser identificado porque os ataques são originados de computadores inocentes por toda a Internet. Toda a Internet pode se tornar uma grande arma apontada para a sua rede privada.

[![18-03-2009-214713](/wp-content/uploads/2009/03/18-03-2009-214713.jpg "18-03-2009-214713")](/wp-content/uploads/2009/03/18-03-2009-214713.jpg)

Em função dessas ameaças, os Firewalls são necessários em praticamente todo computador conectado à Internet, especialmente os conectados constantemente como é o caso das conexões ADSL (ex. Speedy, Velox, BrTurbo, etc) e cabo (ex. Virtua / AJato, etc), para citar os mais comuns no Brasil. Uma instalação domiciliar comum interliga dois computadores (o dos pais e o das crianças) para que ambos possam usufruir de uma mesma conexão ADSL ou cabo. Considerando que essa conexão está constantemente ligada, ela possui um número de IP contínuo que é publicado / divulgado como se fosse uma bandeira na Internet. Os Hackers descobrem o IP mais cedo ou mais tarde e voltam constantemente para examinar e descobrir as brechas até serem capazes de danificar os sistemas. Os Firewalls são projetados para proteger esses ’sistemas’ (rede como um todo) ao mesmo tempo que minimizam a complexidade da configuração.

**Terminologias do Firewall**

A padronização da termologia usada nos Firewall ajuda na compreensão das tecnologias envolvidas nos Firewalls. A RFC 2647, “Termologias de Benchmarking para Performance de Firewall (Benchmarking Terminology for Firewall Performance)” (Agosto 1999) é um dos documentos que tentam estabelecer essa terminologia. Os termos mais importantes que ele descreve são destacados abaixo. Para uma descrição mais completa desses termos, sugerimos a consulta a essa RFC. A lista abaixo foi reordenada para aumentar sua clareza e alguns termos foram substituídos para agregar maior consistência.

**Firewall »** Um dispositivo (ou grupo de dispositivos) que força a adoção de políticas de segurança em redes. Os Firewalls conectam redes protegidas ou desprotegidas, ou suporta redes de 3 segmentos, o que permite a criação das redes DMZ

**Redes Protegidas »** Um ou mais segmentos de rede no qual o acesso é controlado. As redes protegidas são muitas vezes chamadas de ‘redes internas’, mas a RFC 2647 estipula que o termo é inapropriado porque os Firewalls estão sendo adotados de forma crescente dentro das redes das empresas, onde, por definição, todos os segmentos de rede são ‘redes internas’. Isso vem da conscientização de que os ataques, ou acessos indevidos podem vir de dentro da própria empresa (usuários locais).

**Redes Desprotegidas »** Um ou mais segmentos de rede em que o acesso não é controlado pelo Firewall.

**Zona Desmilitarizada (DMZ) »** (Do Inglês ‘Demilitarized Zone’ (DMZ) ) É o segmento, ou segmentos, de rede localizado entre as redes protegidas e desprotegidas. A DMZ pode não ser conectada a uma rede protegida. A DMZ pode também incluir sistemas de defesa perimetrais. Por exemplo, a DMZ pode ser construída para que se assemelhe (ou simule) a rede protegida, induzindo os hackers à armadilhas virtuais que auditam suas ações de modo a se tentar localizar a origem (localização na Internet) do ataque.

**Firewall de Base Dupla »** É um Firewall com duas interfaces, uma conectada na rede protegida e outra conectada na rede desprotegida.

**Firewall de Base Tripla (ou 3 Segmentos) »** É um Firewall que pode ser conectado a três segmentos de rede. A rede protegida, a DMZ e a rede desprotegida.

**Proxy »** É uma requisição para uma conexão feita em nome de um servidor. O servidor Proxy, ou simplesmente Proxy, localiza-se entre a rede protegida e a rede desprotegida. Pense numa área de quarentena onde as pessoas internas usam um telefone para se comunicar com as pessoas de fora. Todas as conexões externas direcionadas a essa região interna do Proxy (protegida) terminam no próprio Proxy. Isso elimina efetivamente o roteamento de IP entre as redes. O Proxy re-empacota as mensagens na forma de novos pacotes que possuem permissão de trafegar na porção protegida da rede. Da mesma forma, ele re-empacota as mensagens internas destinadas aos endereços externos à rede protegida em pacotes que possuem o endereço do próprio Proxy como sendo o endereço de origem da mensagem, no lugar da origem verdadeira (interna). Mais importante que tudo isso, o Proxy inspeciona e filtra todo o tráfego que passa por ele. As regras predefinidas são usadas para determinar que tráfego deve ser encaminhado para fora e que tráfego deve ser bloqueado. Existem dois tipos básicos de Proxy: Software de software, ou aplicação e Circuitos de Proxy.

**Tradução de Endereços de Rede (NAT) »** (Do Inglês ‘ Network Address Translation (NAT) ‘) é um método de mapear a transposição de um ou mais endereços de IP internos e reservados em um ou mais endereços de IP públicos. O NAT foi criado para conservar as quantidades de endereços IPv4 e se referir a um bloco específico de endereços IP que nunca são reconhecidos ou roteados para a Internet. Com ele e possível a definição de esquemas próprios de IP dentro das redes. Um dispositivo NAT traduz entre endereços internos e externos, e comumente é usado combinado com serviços Proxy. Esses dispositivos são implementados em Firewalls para dar suporte aos esquemas de endereços particulares como definido na RFC 1918.

**Software de Proxy »** É um servico de Proxy que é configurado e implementado em função das especificações do usuário, em contrapartida a existência de configurações estáticas (que é o caso dos Circuitos de Proxy). O software de Proxy executa todas as funções necessárias de um Proxy, mas para aplicações específicas. Em contraste, um Proxy básico executa filtragens genéricas de pacotes. Um Software de Proxy somente processa pacotes relacionados as aplicações que ele suporta. Se o Proxy não é preparado para determinados tipos de programas, os pacotes provenientes de ou para os mesmos são descartados. Os pacotes são transferidos somente após a conexão se estabelecer, que por sua vez depende de autenticação e autorização.

**Circuitos de Proxy »** É um serviço Proxy que define de forma estática qual tráfego será transferido. É uma função especialmente desenhada e executada por Softwares de Proxy, usualmente definida para dar suporte a conexões entre usuários internos e servidores externos. Os pacotes são re-transmitidos sem que seja executado nenhum processamento extenso ou filtros sobre os mesmos pois esses pacotes são oriundos de usuários internos (logo possuem origem confiável) e são direcionados a endereços externos. Entretanto, os pacotes que retornam em resposta aos enviados são extensivamente examinados e filtrados.

**Políticas »** É o documento que define as permissões de acesso para a rede protegida, DMZ e a rede desprotegida. As políticas de segurança definem as diretrizes do que não é permitido ser acessado na rede.

**Conjunto de Regras »** É o conjunto de regras de controle de acesso que determinam quais pacotes são re-transmitidos e quais são ignorados.

**Tráfego permitido »** São os pacotes que resultam da aplicação do conjunto de Regras.

**Tráfego Ilegal »** Pacotes que possuem rejeição especificada no conjunto de regras.

**Tráfego Rejeitado »** Pacotes que são descartados em função da aplicação de um conjunto de regras.

**Autenticação »** É o processo de verificação de que o usuário que requer acesso a rede é realmente quem ele se diz ser. A entidade sendo autenticada pode ser um computador específico ou um usuário específico, de forma que a autenticação pode ser baseada na verificação do IP de origem, porta TCP ou UDP, senhas, e outras formas avançadas de identificação como os cartões tipo TOKEN e biometria.

**Associação de Seguranças »** É o conjunto de informações de segurança atribuído para uma conexão, ou conjunto de conexões, específicas. Essa definição cobre o relacionamento entre as políticas e as conexões. Essas associações podem se estabelecer durante o estabelecimento da conexão e podem ser reiteradas ou revogadas durante a conexão.

**Filtro de Pacotes »** É o processo de controle de acesso através do exame dos pacotes baseados no conteúdo dos cabeçalhos dos mesmos. As informações de cabeçalho, como endereços de IP e número da porta TCP, são examinados e comparados com o conjunto de regras, definindo-se então se o mesmo é autorizado ou bloqueado.

**Filtro de Pacotes Estático »** É o processo de re-transmissão ou bloqueio de tráfego baseado no conteúdo de uma tabela fixa gerenciada pelo Firewall. Quando usado, os pacotes só são re-transmitidos se pertencerem a uma conexão que foi previamente estabelecida e que está sendo ‘vigiada’ pela tabela estática.

**Registro (Logging) »** É o registro das requisições feitas pelos usuários ao Firewall. Todas as requisições são tipicamente registradas, incluindo as autorizações, os bloqueios e as rejeições. Um sistema de detecção de invasões e intrusos monitora de forma ativa os pontos de acesso para detectar hackers e rastrear o seu progresso.

**SOCKS »** É um Circuito de Firewall que tenta garantir um canal seguro entre dois pontos de endereço TCP/IP. Tipicamente, um cliente de acesso a WEB localizado na parte interna de uma rede que quer acessar o servidor WEB externo (na Internet, em outro segmento de rede da mesma empresa ou outra parte da intranet). O SOCKS proporciona serviços de Firewall, assim como auditoria, gerenciamento, tolerância a falhas e outros recursos.  
A maioria dos Firewalls também executam autenticações para verificar a identidade dos usuários ou processos. O serviço RADIUS é o mais comumente usado para isso. É o mesmo serviço de autenticação usado para redes do tipo dial-up (conexão por linha telefônica discada convencional), seja ela para acesso a rede de uma empresa ou conexão com um provedor de acesso a Internet. Através da autenticação dos usuários, o Firewall passa a possuir informações adicionais para a filtragem de pacotes. Por exemplo, ele pode autorizar que somente usuários específicos acessem determinados serviços. Os Firewalls modernos também suportam VPNs, que proporcionam ‘túneis’ virtuais seguros entre o Firewall e o usuário remoto através da Internet. O Firewall autentica o usuário, codifica todas as informações e assegura sua integridade através do uso das assinaturas digitais.

Ricardo Macedo Martins
