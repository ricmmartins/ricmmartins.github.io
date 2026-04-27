---
slug: "criando-um-dual-boot-entre-windows7-e-windows8-usando-vhd"
title: 'Criando um Dual Boot entre Windows 7 e Windows 8 usando VHD'
date: '2011-10-11T17:18:14-04:00'
tags:
    - windows
description: "Neste post vou mostrar como instalar o Windows 8 em um VHD. Usando esse método, você poderá escolher inicializar o computador ecom o seu atual Windows 7"
---

Neste post vou mostrar como instalar o Windows 8 em um VHD. Usando esse método, você poderá escolher inicializar o computador ecom o seu atual Windows 7 ou com o novo Windows 8, sem necessidade de reinstalar programas, refazer suas configurações e etc no seu Windows 7.

Além disso, como o Windows 8 ainda é beta, não é recomendável substituir radicalmente por ele, pois pode ser que muitos dos seus programas ainda sejam incompatíveis com ele. É um método recomandado apenas para você conhecer e descobrir as novas funcionalidades do novo sistema operacional da Microsoft.

Usando um VHD, você pode instalar o Windows 8 em um único arquivo que ficará armazenado no sistema de arquivos do Windows 7, e depois ao dar o boot no sistema, você poderá escolher inicializar seu sistema operacional existente ou o novo Windows 8 diretamente do VHD (Virtual Hard Disk).

Você não estará fazendo uma atualização ou reinstalação. É apenas uma nova instalação do Windows 8 sem que você tenha que se desfazer da sua instalação existente do windows 7. Algumas observações importantes antes de começarmos:

– Se você estiver usando o BitLocker na sua instalação atual do Windows 7, não crie o VHD do Windows 8 no seu drive criptografado pelo BitLocker. Se todos os seus drives estão criptografados, você não poderá dar o boot pelo VHD. Dar pause na criptografia do Bitlocker também não é uma solução adequada.

– Se você estiver usando o Windows XP como sistema operacional atual, você não pode inicializar a partir VHD. Este método de dual boot não estará disponível para você. Você só pode (oficialmente) usar isso em um computador rodando Windows 7 ou Windows 2008 R2.

– Ao criar o VHD, certifique-se que o “tamanho máximo” que você especificou é menor que o tamanho real do seu disco. Por exemplo, se você tiver um disco de 60 GB certifique-se o tamanho Max do VHD é menor que 60GB e não o de 100GB que eu uso no exemplo abaixo.

Vamos começar!

Se você ainda não tem, [baixe aqui o Windows 8](http://msdn.microsoft.com/en-us/windows/apps/br229516) e navegue no site [BuildWindows.com](http://www.buildwindows.com/).

No computador onde você já tem o Windows 7 instalado, dê o boot no sistema pela media do Windows 8 e inicie a instalação. Antes de clicar em “Install Now”, pressione **Shift + F10** e o prompt de comandos do WinPE aparecerá.

[![01-WinPECMD](/wp-content/uploads/2011/10/01-WinPECMD1.png "01-WinPECMD")](/wp-content/uploads/2011/10/01-WinPECMD1.png)

Nota: Se você deseja dar boot através da USB ao invés de queimar um DVD, você pode usar o [WUDT Tool](http://wudt.codeplex.com/), uma ferramenta sensacional do CodePlex que permite criar um pendrive USB bootável à partir do arquivo ISO.

Agora é a hora de criar o VHD que será a unidade com o seu Windows 8. Execute o “diskpart” na janela do prompt de comandos, e em seguida os seguintes comandos do diskpart:

1. **list disk** … Este comando mostra seus discos atachados (anexados) atualmente. Neste exemplo eu tenho apenas um, o Disco 0.
2. **select disk 0** … Aqui desejamos usar o disco onde está instalado o sistema operacional atual (Windows 7). Se você tiver mais discos disponíveis, pode usar um número diferente.
3. **list vol** … Exibir todos os volumes existentes no disco. Instalações existentes do Windows 7 irão geralmente ter um volume de 100MB que é uma partição reservada para o sistema (usada para permitir partições criptografadas com Bitlocker conseguirem dar boot no sistema) e o volume usado pelo SO é bem maior (no caso com 126GB). Neste exemplo você pode ver que o volume com minha instalação do Windows 7 está atualmente atribuída ao drive D (embora normalmente no boot apareça como meu drive C:)
4. **create vdisk file=d:Windows8.vhd maximum=100000 type=expandable** … Isto cria um VHD Dinâmico que pode crescer até o limite de 100GB na raiz da minha partição do Windows 7. Caso seu HD seja menor que 100GB, confirme que está usando um valor menor que o atual tamanho do seu HD para o parâmetro “**maximum**”.
5. **select vdisk file=d:Windows8.vhd** … Aqui selecionamos o VHD que iremos utilizar. Depois de selecionar este vdisk, os seguintes commandos serão aplicados a ele:
6. **attach vdisk** … O VHD sera montado e o disco estará disponível para o instalador do Windows.
7. **exit** … Aqui finalizamos as configurações com o diskpart.

Todos estes commandos irão se parecer com isso:

[![02-DiskpartVHD](/wp-content/uploads/2011/10/02-DiskpartVHD.png "02-DiskpartVHD")](/wp-content/uploads/2011/10/02-DiskpartVHD.png)

Agora você pode fechar o Prompt de Comandos, voltar ao programa de instalação e clicar em “Install Now”. Quando for questionado onde você deseja instalar o Windows, você irá ver um novo “Disk1” com espaço não alocado. Quando você selecionar este disco, será notificado pelo instalador que o “Windows não pode ser instalado neste disco”, mas o botão “Next” estará habilitado. Se você clicar nele, ele irá realizar a instalação do Windows normalmente.

[![03-Disk1](/wp-content/uploads/2011/10/03-Disk1.png "03-Disk1")](/wp-content/uploads/2011/10/03-Disk1.png)

Assim que a instalação estiver finalizada e seu computador reiniciar, você verá o “Boot Loader” solicitando para escolher um sistema operacional para inicializar. Então você poderá escolher entre a nova instalação do Windows 8 ou sua instalação já existente do Windows 7. Na primeira vez que esta opção aparecer, você terá 3 segundos para escolher ou ele irá carregar automaticamente o Windows 8 para finalizar a instalação. Nas próximas vezes que reiniciar o computador, você terá 30 segundos para escolher.

[![04-ChooseOS](/wp-content/uploads/2011/10/04-ChooseOS.png "04-ChooseOS")](/wp-content/uploads/2011/10/04-ChooseOS.png)

Agora você pode conhecer o Windows 8 em seu hardware nativo, sem necessidade de utilizar ferramentas de virtualização. Você também poderá acessar seus arquivos no HD com o Windows 7. Abra o Windows Explorer e você verá que ele aparece com uma letra de unidade diferente (D: neste caso) e você pode ainda navegar pelos seus arquivos, copiar e modificá-los como quiser.

[![05-Windows8](/wp-content/uploads/2011/10/05-Windows8.png "05-Windows8")](/wp-content/uploads/2011/10/05-Windows8.png)

Observou que o D: está cheio? Isso ocorre porque o VHD que você criou para o Windows 8 está relatando seu tamanho máximo em vez de seu tamanho real. Quando você inicializar o Windows 7 você verá que o VHD tem realmente apenas cerca de 8GB.

Já mexeu bastante no Windows 8 e não consegue descobrir como desligar? Passe o mouse sobre o botão iniciar clique com o cursor do mouse no canto inferior esquerdo da tela e um pequeno menu iniciar aparecerá. Clique em Configurações, em seguida, “Power” e escolha “Shut down”

[![06-Shutdown](/wp-content/uploads/2011/10/06-Shutdown.png "06-Shutdown")](/wp-content/uploads/2011/10/06-Shutdown.png)

Agora você pode experimentar o melhor dos dois mundos!
