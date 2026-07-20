---
slug: "como-instalar-o-wordpress-no-windows"
title: 'Como instalar o WordPress no Windows'
date: '2011-01-05T11:38:28-05:00'
tags:
    - php
    - wordpress
---

Aproveitando o post de ontem sobre como instalar o PHP no Windows, resolvi testar e fazer um post com o passo-a-passo para instalar o WordPress no Windows.

Primeiro faça o download do Microsoft Web Platform Installer 2.0 em <http://www.microsoft.com/web/downloads/platform.aspx>.

Ao executar, será exibida a tela abaixo:

\* Clique nas imagens para ampliar.

[![](/wp-content/uploads/2011/01/1.png "1")](/wp-content/uploads/2011/01/1.png)

Depois de alguns instantes, o conteúdo será carregado:

[![](/wp-content/uploads/2011/01/2.png "2")](/wp-content/uploads/2011/01/2.png)

Como podem notar, é possível realizar a instalação de diversas ferramentas para blogs, comércio eletrônico, fóruns e wikis, como WordPress, Joomla, Moodle, PhpBB, Drupal, etc. No caso, escolha o Wordpress.

Em seguida, o sistema irá informar que para instalar o WordPress, será necessáro instalar alguns componentes adicionais:

[![](/wp-content/uploads/2011/01/3.png "3")](/wp-content/uploads/2011/01/3.png)

Aceite a instalação destes requisitos (dentre eles o MySQL e o PHP) e em seguida defina uma senha para o MySQL:

[![](/wp-content/uploads/2011/01/4.png "4")](/wp-content/uploads/2011/01/4.png)

[![](/wp-content/uploads/2011/01/5.png "5")](/wp-content/uploads/2011/01/5.png)

Em seguida será realizado o download dos componentes necessários

[![](/wp-content/uploads/2011/01/6.png "6")](/wp-content/uploads/2011/01/6.png)

O próximo passo é definir como será a configuração do WordPress no IIS. São informações como link, nome, onde ficarão os arquivos do site, ip e porta que irão responder pelo site.

[![](/wp-content/uploads/2011/01/7.png "7")](/wp-content/uploads/2011/01/7.png)

Aqui define-se o banco de dados à ser usado, a senha de administrador do banco de dados, e as informações de login/senha da base de dados do WordPress

[![](/wp-content/uploads/2011/01/8.png "8")](/wp-content/uploads/2011/01/8.png)

[![](/wp-content/uploads/2011/01/9.png "9")](/wp-content/uploads/2011/01/9.png)

[![](/wp-content/uploads/2011/01/10.png "10")](/wp-content/uploads/2011/01/10.png)

Terminadas estas configurações, será exibido o resumo acima, informando quais componentes foram baixados e instalados.

Agora vamos conferir como ficou a configuração no IIS 7. Execute **inetmgr** e verifique como ficou

[![](/wp-content/uploads/2011/01/11.png "11")](/wp-content/uploads/2011/01/11.png)

Agora acesse http://localhost/wordpress (Se você configurou o link da mesma forma que aqui). Neste primeiro acesso, você irá definir o título do site, o nome, e-mail e senha do usuário administrador do WordPress.

[![](/wp-content/uploads/2011/01/12.png "12")](/wp-content/uploads/2011/01/12.png)

[![](/wp-content/uploads/2011/01/13.png "13")](/wp-content/uploads/2011/01/13.png)

Ao término clique em “Install WordPress” para terminar a configuração.

[![](/wp-content/uploads/2011/01/14.png "14")](/wp-content/uploads/2011/01/14.png)

Concluída a configuração, clique em “Log In” para acessar o sistema utilizando as credenciais escolhidas. Você será redirecionado para o endereço http://localhost/wordpress/wp-login.php, que é o endereço que terá que utilizar sempre que for acessar a console de adminsitração do WordPress.

[![](/wp-content/uploads/2011/01/15.png "15")](/wp-content/uploads/2011/01/15.png)

Uma vez logado no sistema, pronto, você já pode começar a postar e usar sua critatividade para customizar seu blog.

[![](/wp-content/uploads/2011/01/16.png "16")](/wp-content/uploads/2011/01/16.png)

E para acessar o site, acesse http://localhost/wordpress e confira como ficou:

[![](/wp-content/uploads/2011/01/17.png "17")](/wp-content/uploads/2011/01/17.png)

Por hoje é isso!
