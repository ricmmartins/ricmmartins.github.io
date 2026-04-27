---
slug: "instalando-o-oh-my-zsh-no-bash-do-windows"
title: 'Instalando o Oh My Zsh no Bash do Windows'
date: '2017-09-15T14:51:54-04:00'
tags:
    - windows
description: "Há algum tempo atrás eu descobri o Oh My Zsh e desde então me tornei usuário. Porém há aproximadamente um ano e meio mudei de emprego e passei a utilizar"
cover:
  image: "/og/instalando-o-oh-my-zsh-no-bash-do-windows.png"
  alt: ""
  hidden: true
---

Há algum tempo atrás eu descobri o [Oh My Zsh ](http://ohmyz.sh)e desde então me tornei usuário. Porém há aproximadamente um ano e meio mudei de emprego e passei a utilizar WIndows no desktop.

Felizmente existe o [Bash for Windows](https://msdn.microsoft.com/en-us/commandline/wsl/install_guide) onde cheguei a instalar porém o meu tema preferido (agnoster) não funcionava corretamente pois eu não havia encontrado a fonte correta para ser utilizada.

Como há alguns tive um problema de hardware no meu note e precisei reinstalar tudo, aproveitei para descobrir exatamente qual fonte usar e escrever este post para mostrar como instalar o Oh My Zsh no Windows.

Supondo que você já tenha o Bash no Windows instalado, vamos lá:

## Instalando o Zsh

```bash
sudo apt-get install zsh
```

## Tornando o Zsh o shell default

```bash
vim ~/.bashrc

#Add these lines at the end of the file

# Launch Zsh
if [ -t 1 ]; then
exec zsh
fi
```

## Instalando o Oh My Zsh

```bash
# sh -c "$(curl -fsSL https://raw.githubusercontent.com/robbyrussell/oh-my-zsh/master/tools/install.sh)"
```

## Configurando o tema

Tomando como o exemplo o tema agnoster, basta editar o arquivo .zshrc e deixar a linha onde consta a variável ZSH\_THEME desta forma:

```bash
ZSH_THEME="agnoster"
```

## Instalando a fonte correta

Faça o download da fonte [Menlo for Powerline](https://github.com/abertsch/Menlo-for-Powerline/raw/master/Menlo%20for%20Powerline.ttf)

Abra o Bash for Windows, em cima da barra superior clique com o botão direito, em seguida vá em propriedades, escolha a aba Font e depois defina a Menlo for Powerline.
