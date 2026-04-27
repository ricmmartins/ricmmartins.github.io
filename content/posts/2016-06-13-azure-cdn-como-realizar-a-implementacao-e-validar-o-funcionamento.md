---
slug: "azure-cdn-como-realizar-a-implementacao-e-validar-o-funcionamento"
title: 'Azure CDN: Como realizar a implementação e validar o funcionamento'
date: '2016-06-13T20:27:47-04:00'
tags:
    - azure
    - nginx
description: "O objetivo deste artigo é demonstrar passo-a-passo a criação de um ambiente web hospedando um website utilizando a CDN do Azure."
---

O objetivo deste artigo é demonstrar passo-a-passo a criação de um ambiente web hospedando um website utilizando a CDN do Azure.

Para uma melhor compreensão serão abordados os tópicos desde o registro do domínio, passando pela configuração no Azure DNS, criação/configuração do webserver, até a configuração da CDN e testes.

Neste exemplo será utilizado o domínio azurelab.com.br com registro feito no <http://registro.br>.

## Preparando o ambiente no Azure

A primeira coisa à ser feita é criar o Resource Group no azure, que conterá todos os recursos relacionados com o ambiente à ser criado.

[![resourcegroup](/wp-content/uploads/2016/06/resourcegroup.png)](/wp-content/uploads/2016/06/resourcegroup.png)

Uma vez criado, vamos configurar o Azure DNS.

[![dns-1](/wp-content/uploads/2016/06/dns-1.png)](/wp-content/uploads/2016/06/dns-1.png)

Após escolher o resource group criado, vamos clicar em Add:

[![dns-2](/wp-content/uploads/2016/06/dns-2.png)](/wp-content/uploads/2016/06/dns-2.png)

Na caixa de busca, vamos procurar por DNS

[![dns-3](/wp-content/uploads/2016/06/dns-3.png)](/wp-content/uploads/2016/06/dns-3.png)

Em seguida clique em create:

[![dns-4](/wp-content/uploads/2016/06/dns-4.png)](/wp-content/uploads/2016/06/dns-4.png)

Na próxima tela, vamos definir qual será o nome DNS, a subscription que será usada e qual resource group usar:

[![dns-5](/wp-content/uploads/2016/06/dns-5.png)](/wp-content/uploads/2016/06/dns-5.png)

Após criar será exibido conforme abaixo:

[![dns-6](/wp-content/uploads/2016/06/dns-6.png)](/wp-content/uploads/2016/06/dns-6.png)

Neste primeiro momento, ao clicar na zona criada, teremos esta tela:

[![dns-7](/wp-content/uploads/2016/06/dns-7.png)](/wp-content/uploads/2016/06/dns-7.png)

A primeira coisa à ser feita é tomar nota dos Name Servers do Azure, para configurá-los no Registro.Br. Neste exemplo, os NameServers associados ao nome dns que criamos foram:

- ns1-04.azure-dns.com.
- ns2-04.azure-dns.net.
- ns3-04.azure-dns.org.
- ns4-04.azure-dns.info.

De posse destas informações, o próximo passo é voltar ao Registro.Br e configurar os NameServers fornecidos.

[![registro-1](/wp-content/uploads/2016/06/registro-1.png)](/wp-content/uploads/2016/06/registro-1.png)

Basta escolher o domínio desejado e ir na opção correspondente para alterar os servidores DNS:

[![registro-2](/wp-content/uploads/2016/06/registro-2.png)](/wp-content/uploads/2016/06/registro-2.png)

Agora informar os novos name servers:

[![registro-3](/wp-content/uploads/2016/06/registro-3.png)](/wp-content/uploads/2016/06/registro-3.png)

## Criação da máquina virtual Linux

Dentro do resource group que estamos trabalhando, clicar em Add:

[![labcdn-1](/wp-content/uploads/2016/06/labcdn-1.png)](/wp-content/uploads/2016/06/labcdn-1.png)

Na caixa de pesquisa que será aberta, escreva CentOS, para usar esta distribuição Linux

[![labcdn-2](/wp-content/uploads/2016/06/labcdn-2.png)](/wp-content/uploads/2016/06/labcdn-2.png)

Escolha do modelo de deployment (Resource Manager) e em seguida clique para criar:

[![labcdn-3](/wp-content/uploads/2016/06/labcdn-3.png)](/wp-content/uploads/2016/06/labcdn-3.png)

Em seguida será feita a definição do nome da máquina, nome do usuário a ser criado, método de autenticação, escolha do resource group à ser usado e localização:

[![labcdn-4](/wp-content/uploads/2016/06/labcdn-4.png)](/wp-content/uploads/2016/06/labcdn-4.png)

Escolha do tipo de máquina virtual:

[![labcdn-5](/wp-content/uploads/2016/06/labcdn-5.png)](/wp-content/uploads/2016/06/labcdn-5.png)

O próximo passo é a criação da storage account:[  ](/wp-content/uploads/2016/06/labcdn-16.png)  
[![labcdn-6](/wp-content/uploads/2016/06/labcdn-6.png)](/wp-content/uploads/2016/06/labcdn-6.png)

Criação da VNet:

[![labcdn-7](/wp-content/uploads/2016/06/labcdn-7-1.png)](/wp-content/uploads/2016/06/labcdn-7-1.png)

Criação da Subnet:

[![labcdn-8](/wp-content/uploads/2016/06/labcdn-8.png)](/wp-content/uploads/2016/06/labcdn-8.png)

Definição do IP público da máquina virtual como estático:

[![labcdn-9](/wp-content/uploads/2016/06/labcdn-9.png)](/wp-content/uploads/2016/06/labcdn-9.png)

Configuração do Network Security Group:

[![labcdn-10](/wp-content/uploads/2016/06/labcdn-10.png)](/wp-content/uploads/2016/06/labcdn-10.png)

Por padrão, como é um servidor Linux o Security Group já vem com a porta SSH (22) aberta. Como este servidor terá a função de webserver, vamos abrir a porta HTTP (80):

[![labcdn-11](/wp-content/uploads/2016/06/labcdn-11.png)](/wp-content/uploads/2016/06/labcdn-11.png)

Extensões, Monitoramento e Availability Set:

[![labcdn-12](/wp-content/uploads/2016/06/labcdn-12.png)](/wp-content/uploads/2016/06/labcdn-12.png)

Note que não adicionaremos nenhuma extensão (<https://azure.microsoft.com/pt-br/blog/automate-linux-vm-customization-tasks-using-customscript-extension/> – <https://github.com/Azure/azure-linux-extensions> ).

É recomendável deixar o monitoramento habilitado, usando uma conta de storage account separada para os dados de diagnósticos do monitoramento.

Como se trata de apenas um servidor, não utilizamos o recurso de Availability Set (<https://azure.microsoft.com/en-us/documentation/articles/virtual-machines-windows-manage-availability/>)

Resumo da configuração:

[![labcdn-13](/wp-content/uploads/2016/06/labcdn-13.png)](/wp-content/uploads/2016/06/labcdn-13.png)

Após a validação das configurações, basta dar OK para iniciar a criação da VM.

Depois da criação da VM, já podemos pegar o IP público que associamos com ela e configurar como endereço do tipo A no DNS:

[![labcdn-14](/wp-content/uploads/2016/06/labcdn-14.png)](/wp-content/uploads/2016/06/labcdn-14.png)

## Criação do registro no Azure DNS

Dentro do Azure DNS, vamos adicionar um novo registro:

[![labcdn-15](/wp-content/uploads/2016/06/labcdn-15.png)](/wp-content/uploads/2016/06/labcdn-15.png)

Na tela que se abre, basta informar o ip público associado com a máquina virtual com o nome **www** e com o tipo **A**:

[![labcdn-16](/wp-content/uploads/2016/06/labcdn-16.png)](/wp-content/uploads/2016/06/labcdn-16.png)

Depois de aguardar alguns instantes para a replicação de DNS, verifique:

[![labcdn-17](/wp-content/uploads/2016/06/labcdn-17.png)](/wp-content/uploads/2016/06/labcdn-17.png)

## Configurando o Webserver

Neste exemplo, vamos trabalhar com o Nginx como servidor web. Vamos conectar no servidor e em seguida usar rodar os comandos abaixo para realizar a instalação:

[![labcdn-18](/wp-content/uploads/2016/06/labcdn-18.png)](/wp-content/uploads/2016/06/labcdn-18.png)

Instalação do repositório epel:

```bash
sudo yum install epel-release -y
```

Instalação do Nginx:

```bash
sudo yum install nginx -y
```

Criando a configuração do servidor web:

```bash
mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.orig
```

Em seguida rode esta linha de comando:

```bash
cat <<'EOF' >> /etc/nginx/conf.d/default.conf
server {
	listen 80 default_server;
	server_name www.azurelab.com.br;
	
	include /etc/nginx/conf.d/*.conf;
	location / {
		root	/usr/share/nginx/html;
		index	index.html index.html;
	}
}
EOF
```

Iniciando o servidor:

```bash
/etc/init.d/nginx start && chkconfig nginx on
```

Testando o acesso:

Acesse: http://www.azurelab.com.br

![labcdn-19](/wp-content/uploads/2016/06/labcdn-19.png)

## Configurando a storage account

Os dados estarão hospedados em um container chamado “files” dentro de uma storage account. Para configurar vamos usar uma ferramenta chamada Azure Explorer, que pode ser obtida em <http://www.storageexplorer.com/>

Depois de instalar, ele se apresenta desta forma e você deve ir em “Azure Accounts Settings” conforme destacado abaixo:

[![labcdn-20](/wp-content/uploads/2016/06/labcdn-20.png)](/wp-content/uploads/2016/06/labcdn-20.png)

Em seguida escolha a opção para adicionar uma conta:

[![labcdn-21](/wp-content/uploads/2016/06/labcdn-21.png)](/wp-content/uploads/2016/06/labcdn-21.png)

Ao clicar em adicionar conta, será solicitado o email e senha de acesso à sua conta:

[![labcdn-22](/wp-content/uploads/2016/06/labcdn-22.png)](/wp-content/uploads/2016/06/labcdn-22.png)

Depois de informar as credenciais, vamos em uma das storage accounts criadas e criaremos um novo container:

[![labcdn-23](/wp-content/uploads/2016/06/labcdn-23.png)](/wp-content/uploads/2016/06/labcdn-23.png)

Clicando com o botão direito do mouse em “blob container”, temos a opção de criar um novo:

[![labcdn-24](/wp-content/uploads/2016/06/labcdn-24.png)](/wp-content/uploads/2016/06/labcdn-24.png)

E vamos criar um novo container chamado “files”:

[![labcdn-25](/wp-content/uploads/2016/06/labcdn-25.png)](/wp-content/uploads/2016/06/labcdn-25.png)

Clique com o botão direito do mouse no container “files”e em seguida escolha a opção “Set Public Access Level”:

[![labcdn-26](/wp-content/uploads/2016/06/labcdn-26.png)](/wp-content/uploads/2016/06/labcdn-26.png)

Então podemos escolher a opção de “Public read access for blobs only”. Desta forma apenas o acesso aos arquivos será público, não ao container inteiro.

Feito isso vou fazer o upload de um arquivo de imagem para este container escolhendo a opção correspondente:

[![labcdn-27](/wp-content/uploads/2016/06/labcdn-27.png)](/wp-content/uploads/2016/06/labcdn-27.png)

Como é um arquivo de imagem, vou escolher a opção de blob de blocos:

[![labcdn-28](/wp-content/uploads/2016/06/labcdn-28.png)](/wp-content/uploads/2016/06/labcdn-28.png)

Pronto:

[![labcdn-29](/wp-content/uploads/2016/06/labcdn-29.png)](/wp-content/uploads/2016/06/labcdn-29.png)

Para fazer um teste, pegue a URL do arquivo e abra no browser:

[![labcdn-30](/wp-content/uploads/2016/06/labcdn-30.png)](/wp-content/uploads/2016/06/labcdn-30.png)

http://labcdn4353.blog.core.windows.net/files/hello.png

[![labcdn-31](/wp-content/uploads/2016/06/labcdn-31.png)](/wp-content/uploads/2016/06/labcdn-31.png)

## Configuração da CDN

O próximo passo, é criar um perfil de CDN no Azure. Dentro do resource group, clique em Add e em seguida digite CDN:

[![labcdn-32](/wp-content/uploads/2016/06/labcdn-32.png)](/wp-content/uploads/2016/06/labcdn-32.png)

Em seguida clicar em create:

[![labcdn-33](/wp-content/uploads/2016/06/labcdn-33.png)](/wp-content/uploads/2016/06/labcdn-33.png)

Para nosso teste, vou escolher a camada S2 da Akamai para usar:

[![labcdn-34](/wp-content/uploads/2016/06/labcdn-34.png)](/wp-content/uploads/2016/06/labcdn-34.png)

## Criação do Endpoint da CDN

Abra a blade da CDN criada, em seguida clique para adicionar um endpoint e preencha os campos correspondentes:

[![labcdn-35](/wp-content/uploads/2016/06/labcdn-35.png)](/wp-content/uploads/2016/06/labcdn-35.png)

## **Finalizando a configuração no webserver**

Para que as chamadas em [www.azurelab.com.br/cdn](http://www.azurelab.com.br/cdn) sejam direcionadas para o endpoint da CDN, precisamos adicionar o bloco abaixo ao arquivo de configuração do Nginx (/etc/nginx/conf.d/default.conf):

```bash
location /cdn {
		proxy_pass			http://labricardo.azureedge.net/files/;
		proxy_redirect		off;
		proxy_set_header	X-Real-IP $remote_addr;
		proxy_set_header	X-Forwarded-For $proxy_add_x_forwarded_for;
	}
```

O arquivo deve ficar assim:

```bash
server {
        listen 80;
        server_name www.azurelab.com.br;

        include /etc/nginx/default.d/*.conf;

        location / {
                root    /usr/share/nginx/html;
                index   index.html index.html;
        }

location /cdn {
                proxy_pass              http://labricardo.azureedge.net/files/;
                proxy_redirect          off;
                proxy_set_header        X-Real-IP $remote_addr;
                proxy_set_header        X-Forwarded-For $proxy_add_x_forwarded_for;
        }
}
```
Depois faça um reload na configuração com o comando:

```bash
/etc/init.d/nginx reload
```

## Validando a configuração

Testando o acesso via CDN em http://labricardo.azureedge.net/files/hello.png:

[![labcdn-36](/wp-content/uploads/2016/06/labcdn-36.png)](/wp-content/uploads/2016/06/labcdn-36.png)

Testando o acesso pelo webserver, buscando a imagem no storage account via CDN em http://www.azurelab.com.br/cdn/hello.png:

[![labcdn-37](/wp-content/uploads/2016/06/labcdn-37.png)](/wp-content/uploads/2016/06/labcdn-37.png)

Até a próxima!
