---
slug: "implementando-o-apache-guacamole-no-azure"
title: 'Implementando o Apache Guacamole no Azure'
description: "Implemente o Apache Guacamole no Azure com alta disponibilidade: load balancer, múltiplas VMs e MySQL. Guia detalhado de arquitetura."
date: '2018-04-30T20:44:48-04:00'
categories:
  - Azure
tags:
    - azure
    - linux
---

# Introdução

O objetivo deste artigo é demonstrar sobre o setup do [Apache Guacamole](http://guacamole.apache.org/) no Azure abordando os detalhes de arquitetura, segurança e disponibilidade.

O Apache Guacamole é um “*remote desktop gateway clientless*” com suporte aos protocolos mais utilizados como SSH, RDP e VNC. É chamado de *clientless* pois permite o uso sem a necessidade de utilização da plugins ou clientes extras, sendo utilizado diretamente pelo seu browser.

# Arquitetura

A ilustração abaixo se refere à arquitetura sugerida. Esta arquitetura contempla um balanceador de carga público que recebe os acessos externos e direciona para duas máquinas virtuais na camada web. A camada web se comunica com a camada de dados onde temos um banco de dados MySQL responsável por armazenar as informações de login, acessos e conexões.

[![](/wp-content/uploads/2018/04/arquitetura.png)](/wp-content/uploads/2018/04/arquitetura.png)

O uso do Availability Set garante o SLA de 99.95% para as máquinas virtuais e o uso do Azure Database for MySQL, um banco de dados como serviço gerenciado, escalável e altamente disponível garante o SLA de 99.99%.

# Deployment do ambiente

Abaixo serão descritos os comandos do Azure CLI que podem ser usados para criar o ambiente. Além de servir como uma documentação sobre os serviços que foram implantados, são uma boa prática de infraestrutura como código.

## Instalação do Azure CLI

O Azure CLI é a ferramenta que permite o gerenciamento de recursos do Azure via linha de comandos. Ela é um pré-requisito para este tutorial e [neste link](https://docs.microsoft.com/pt-br/cli/azure/install-azure-cli) você encontra as informações sobre como realizar a instalação.

## Criação do Resource Group

Uma vez que você já tenha o AZ CLI instalado, vamos aos comandos. A primeira coisa a fazer é rodar o comando “az login” que irá permitir que você se autentique com sua conta do Azure. Será gerado um código e solicitado que você acesse <https://microsoft.com/devicelogin> para informá-lo.

Assim que concluir esta etapa, você já estará autenticado em sua assinatura do Azure e pronto para começar a executar os comandos.

```bash
user@mydesktop:~$ az group create \
--name rg-guacamole-demo \
--location eastus
```
## Criação do serviço do MySQL

```bash
user@mydesktop:~$ az mysql server create \
--resource-group rg-guacamole-demo \
--name guacamoledemodb \
--location eastus \
--admin-user guacadbadminuser \
--admin-password 'Password01@2018!' \
--performance-tier Basic \
--compute-units 50 \
--storage-size 51200 \
--ssl-enforcement Disabled
```

## Criação da regra de firewall para o MySQL

```bash
user@mydesktop:~$ az mysql server create \
--resource-group rg-guacamole-demo \
--name guacamoledemodb \
--location eastus \
--admin-user guacadbadminuser \
--admin-password 'Password01@2018!' \
--performance-tier Basic \
--compute-units 50 \
--storage-size 51200 \
--ssl-enforcement Disabled
```

```bash
user@mydesktop:~$ az mysql server firewall-rule create \
--resource-group rg-guacamole-demo \
--server guacamoledemodb \
--name AllowYourIP \
--start-ip-address 0.0.0.0 \
--end-ip-address 255.255.255.255
```

Após setup e testes iniciais, é importante remover esta regra a deixar habilitado apenas a flag que permite comunicação do serviço do MySQL apenas com serviços do Azure:

[![](/wp-content/uploads/2018/04/portal-mysql.png)](/wp-content/uploads/2018/04/portal-mysql.png)

## Criação da VNET

```bash
user@mydesktop:~$ az network vnet create \
--resource-group rg-guacamole-demo \
--name myVnet \
--address-prefix 10.0.0.0/16 \
--subnet-name mySubnet \
--subnet-prefix 10.0.1.0/24
``````

## Criação do Availability Set

```bash
user@mydesktop:~$ az vm availability-set create \
--resource-group rg-guacamole-demo \
--name guacamoleAvSet \
--platform-fault-domain-count 2 \
--platform-update-domain-count 3
```

## Criação das VMs

```bash
user@mydesktop:~$ for i in `seq 1 2`; do
az vm create \
--resource-group rg-guacamole-demo \
--name Guacamole-VM$i \
--availability-set guacamoleAvSet \
--size Standard_DS1_v2  \
--image Canonical:UbuntuServer:16.04-LTS:latest  \
--admin-username guacauser \
--generate-ssh-keys \
--no-wait \
--vnet-name myVnet \
--subnet  mySubnet \
--nsg NSG-Guacamole
done
```

Após a execução deste bloco de comandos, serão criadas duas máquinas virtuais inseridas dentro do Availability Set criado previamente e com as características definidas nos comandos executados.

Importante ressaltar que as chaves SSH serão armazenadas no diretório ~/.ssh do host onde os comandos foram executados e para conectar nas VMs basta rodar o comando abaixo:

```bash
user@mydesktop:~$ ssh -i .ssh/id_rsa guacauser@<ip>
```

## Criação do Network Security Group

```bash
user@mydesktop:~$ az network nsg rule create \
--resource-group rg-guacamole-demo \
--nsg-name NSG-Guacamole \
--name web-rule \
--access Allow \
--protocol Tcp \
--direction Inbound \
--priority 200 \
--source-address-prefix Internet \
--source-port-range "*" \
--destination-address-prefix "*" \
--destination-port-range 80
```

Neste caso, estamos criando a regra de liberar o acesso na porta 80 (HTTP) à partir da Internet. O acesso na porta 22 (SSH) é criado automaticamente. Estas configurações devem ser revisadas futuramente para aumentar a segurança oferecendo um acesso mais restrito sobre a origem destas conexões ao Apache Guacamole.

## Instalação dos pacotes relacionados e devidas configurações

Neste ponto iremos usar um arquivo json que irá fazer uma chamada à um shell script e executar a instalação de pacotes necessários no Linux. Abaixo os comandos à serem executados:

```bash
user@mydesktop:~$ for i in `seq 1 2`; do
az vm extension set \
--resource-group rg-guacamole-demo \
--vm-name Guacamole-VM$i \
--name customScript --publisher Microsoft.Azure.Extensions \
--settings ./guac.json
done
```

### Conteúdo do arquivo JSON (guac.json)

```bash
{  
  "fileUris": ["https://ricardomartins9888.blob.core.windows.net/arquivos/guac-install.sh"],
  "commandToExecute": "./guac-install.sh"
}
```

Caso o script guac-install.sh esteja armazenado em outra url, alterar no campo correspondente acima.

### Conteúdo do script shell (guac-install.sh)

```bash
#!/bin/bash

# Version numbers of Guacamole and MySQL Connector/J to download
GUACVERSION="0.9.14"

# Update apt so we can search apt-cache for newest tomcat version supported
apt update

# Get MySQL root password and Guacamole User password
guacdbuserpassword="Password01@2018!"
guacmysqlhostname="guacamoledemodb.mysql.database.azure.com"
guacmysqlport="3306"
guacmysqldatabase="guacamoledb"
guacmysqlusername="guacadbadminuser@guacamoledemodb"

# Ubuntu and Debian have different package names for libjpeg
# Ubuntu and Debian versions have differnet package names for libpng-dev
source /etc/os-release
if [[ "${NAME}" == "Ubuntu" ]]
then
    JPEGTURBO="libjpeg-turbo8-dev"
    if [[ "${VERSION_ID}" == "16.04" ]]
    then
        LIBPNG="libpng12-dev"
    else
        LIBPNG="libpng-dev"
    fi
elif [[ "${NAME}" == *"Debian"* ]]
then
    JPEGTURBO="libjpeg62-turbo-dev"
    if [[ "${PRETTY_NAME}" == *"stretch"* ]]
    then
        LIBPNG="libpng-dev"
    else
        LIBPNG="libpng12-dev"
    fi
else
    echo "Unsupported Distro - Ubuntu or Debian Only"
    exit
fi

# Tomcat 8.0.x is End of Life, however Tomcat 7.x is not...
# If Tomcat 8.5.x or newer is available install it, otherwise install Tomcat 7
if [[ $(apt-cache show tomcat8 | egrep "Version: 8.[5-9]" | wc -l) -gt 0 ]]
then
    TOMCAT="tomcat8"
else
    TOMCAT="tomcat7"
fi

# Uncomment to manually force a tomcat version
#TOMCAT=""

# Install features
apt -y install build-essential libcairo2-dev ${JPEGTURBO} ${LIBPNG} libossp-uuid-dev libavcodec-dev libavutil-dev \
libswscale-dev libfreerdp-dev libpango1.0-dev libssh2-1-dev libtelnet-dev libvncserver-dev libpulse-dev libssl-dev \
libvorbis-dev libwebp-dev mysql-client mysql-common mysql-utilities libmysql-java ${TOMCAT} freerdp-x11 \
ghostscript wget dpkg-dev

# If apt fails to run completely the rest of this isn't going to work...
if [ $? -ne 0 ]; then
    echo "apt failed to install all required dependencies"
    exit
fi

# Set SERVER to be the preferred download server from the Apache CDN
SERVER="http://apache.org/dyn/closer.cgi?action=download&filename=guacamole/${GUACVERSION}"

# Download Guacamole Server
wget -O guacamole-server-${GUACVERSION}.tar.gz ${SERVER}/source/guacamole-server-${GUACVERSION}.tar.gz
if [ $? -ne 0 ]; then
    echo "Failed to download guacamole-server-${GUACVERSION}.tar.gz"
    echo "${SERVER}/source/guacamole-server-${GUACVERSION}.tar.gz"
    exit
fi

# Download Guacamole Client
wget -O guacamole-${GUACVERSION}.war ${SERVER}/binary/guacamole-${GUACVERSION}.war
if [ $? -ne 0 ]; then
    echo "Failed to download guacamole-${GUACVERSION}.war"
    echo "${SERVER}/binary/guacamole-${GUACVERSION}.war"
    exit
fi

# Download Guacamole authentication extensions
wget -O guacamole-auth-jdbc-${GUACVERSION}.tar.gz ${SERVER}/binary/guacamole-auth-jdbc-${GUACVERSION}.tar.gz
if [ $? -ne 0 ]; then
    echo "Failed to download guacamole-auth-jdbc-${GUACVERSION}.tar.gz"
    echo "${SERVER}/binary/guacamole-auth-jdbc-${GUACVERSION}.tar.gz"
    exit
fi

# Extract Guacamole files
tar -xzf guacamole-server-${GUACVERSION}.tar.gz
tar -xzf guacamole-auth-jdbc-${GUACVERSION}.tar.gz

# Make directories
mkdir -p /etc/guacamole/lib
mkdir -p /etc/guacamole/extensions

# Install guacd
cd guacamole-server-${GUACVERSION}
./configure --with-init-dir=/etc/init.d
make
make install
ldconfig
systemctl enable guacd
cd ..

# Get build-folder
BUILD_FOLDER=$(dpkg-architecture -qDEB_BUILD_GNU_TYPE)

# Move files to correct locations
mv guacamole-${GUACVERSION}.war /etc/guacamole/guacamole.war
ln -s /etc/guacamole/guacamole.war /var/lib/${TOMCAT}/webapps/
ln -s /usr/local/lib/freerdp/guac*.so /usr/lib/${BUILD_FOLDER}/freerdp/
ln -s /usr/share/java/mysql-connector-java.jar /etc/guacamole/lib/
cp guacamole-auth-jdbc-${GUACVERSION}/mysql/guacamole-auth-jdbc-mysql-${GUACVERSION}.jar /etc/guacamole/extensions/

# Configure guacamole.properties
echo "mysql-hostname: $guacmysqlhostname" >> /etc/guacamole/guacamole.properties
echo "mysql-port: $guacmysqlport" >> /etc/guacamole/guacamole.properties
echo "mysql-database: $guacmysqldatabase" >> /etc/guacamole/guacamole.properties
echo "mysql-username: $guacmysqlusername" >> /etc/guacamole/guacamole.properties
echo "mysql-password: $guacdbuserpassword" >> /etc/guacamole/guacamole.properties

# restart tomcat
service ${TOMCAT} restart

# Create guacamole_db and grant guacamole_user permissions to it

# SQL code
SQLCODE="
create database $guacmysqldatabase;
GRANT SELECT,INSERT,UPDATE,DELETE ON $guacmysqldatabase.* TO '$guacmysqlusername'@'*';
flush privileges;"

# Execute SQL code
echo $SQLCODE | mysql -h $guacmysqlhostname -u $guacmysqlusername -p$guacdbuserpassword

# Add Guacamole schema to newly created database
cat guacamole-auth-jdbc-${GUACVERSION}/mysql/schema/*.sql | mysql -h $guacmysqlhostname -u $guacmysqlusername -p$guacdbuserpassword $guacmysqldatabase

# Ensure guacd is started
service guacd start

# Cleanup
rm -rf guacamole-*

echo -e "Installation Complete\nhttp://localhost:8080/guacamole/\nDefault login guacadmin:guacadmin\nBe sure to change the password."
```

## Alteração para chamar o Guacamole diretamente no “/” ao invés de “/guacamole”

Por padrão o acesso no Guacamole se dá acessando o IP do servidor /guacamole. Por exemplo, http://10.20.30.40/guacamole. O objetivo aqui é permitir que o acesso seja feito diretamente em http://10.20.30.40

````bash
user@mydesktop:~$ for i in `seq 1 2`; do
az vm run-command invoke -g rg-guacamole-demo -n Guacamole-VM$i \
--command-id RunShellScript \
--scripts "sudo /bin/rm -rf /var/lib/tomcat7/webapps/ROOT/* && sudo /bin/cp -pr /var/lib/tomcat7/webapps/guacamole/* /var/lib/tomcat7/webapps/ROOT/"
done
````

## Alteração na porta do Tomcat (de 8080 para 80)

Por padrão o Tomcat trabalha escutando requisições na porta 8080. Aqui é feita a alteração para que ele escute por requisições na porta 80.

```bash
user@mydesktop:~$ for i in `seq 1 2`; do
az vm run-command invoke -g rg-guacamole-demo -n Guacamole-VM$i \
--command-id RunShellScript --scripts "sudo sed -i.bak 's/#AUTHBIND=no/AUTHBIND=yes'/g /etc/default/tomcat7"
az vm run-command invoke -g rg-guacamole-demo -n Guacamole-VM$i \
--command-id RunShellScript --scripts "sudo sed -i.bak 's|<Connector port=\"8080\"|<Connector port=\"80\"|g' /etc/tomcat7/server.xml"
az vm run-command invoke -g rg-guacamole-demo -n Guacamole-VM$i \
--command-id RunShellScript --scripts "sudo systemctl restart tomcat7"
done
```

## Criação do Balanceador de Carga

A utilização de um balanceador de carga irá distribuir o acesso entre as duas VMs e permitir que no caso de falha em uma delas, isso seja transparente para o usuário. Neste exemplo estará sendo criado um balanceador de carga público, no entanto nada impede que seja utilizado um balanceador de carga interno (privado).

A criação do balanceador de carga envolve alguns passos, como a criação do IP público que ele terá, seu nome DNS, healthprobe, regra de balanceamento e regras de nat interno (opcional). Nos próximos tópicos serão descritos cada um dos passos.

### Criação do IP Público do Balanceador de Carga

```bash
user@mydesktop:~$ az network public-ip create \
-g rg-guacamole-demo \
-n lbguacamoledemopip \
-l eastus \
--dns-name loadbalancerguaca \
--allocation-method static \
--idle-timeout 4
```

### Criação do Balanceador de Carga

```bash
user@mydesktop:~$ az network lb create \
-g rg-guacamole-demo \
--name lbguacademo \
-l eastus \
--public-ip-address lbguacamoledemopip \
--backend-pool-name backendpool  \
--frontend-ip-name lbguacafrontend 
```

### Criação do Healthprobe

```bash
user@mydesktop:~$ az network lb probe create \
--resource-group rg-guacamole-demo \
--lb-name lbguacademo \
--name healthprobe \
--protocol "http" \
--port 80 \
--path / --interval 15 
```

### Criação da regra de balanceamento

```bash
user@mydesktop:~$ az network lb rule create \
--resource-group rg-guacamole-demo \
--lb-name lbguacademo \
--name lbrule \
--protocol tcp \
--frontend-port 80 \
--backend-port 80 \
--frontend-ip-name lbguacafrontend \
--backend-pool-name backendpool \
--probe-name healthprobe \
--load-distribution SourceIPProtocol
```

### Inserção das máquinas virtuais na regra de balanceamento

```bash
user@mydesktop:~$ az network nic ip-config update \
--name ipconfigGuacamole-VM1 \
--nic-name Guacamole-VM1VMNic \
--resource-group rg-guacamole-demo \
--lb-address-pools backendpool \
--lb-name lbguacademo 

user@mydesktop:~$ az network nic ip-config update \
--name ipconfigGuacamole-VM2 \
--nic-name Guacamole-VM2VMNic \
--resource-group rg-guacamole-demo \
--lb-address-pools backendpool \
--lb-name lbguacademo 
```

### Criação das regras de INAT

As regras de INAT irão permitir que as chamadas feitas diretamente no endereço do balanceador de carga direcionem para cada servidor por baixo dele dependendo da porta chamada.

Neste caso, ao realizar a chamadda na porta 21 do balanceador, direciona para a porta a VM1 na porta 22 (SSH) e a chamada na porta 23 do balanceador direciona para a VM2 na porta 22 (SSH).

```bash
user@mydesktop:~$ az network lb inbound-nat-rule create \
--resource-group rg-guacamole-demo \
--lb-name lbguacademo \
--name ssh1 \
--protocol tcp \
--frontend-port 21 \
--backend-port 22 \
--frontend-ip-name lbguacafrontend

user@mydesktop:~$ az network lb inbound-nat-rule create \
--resource-group rg-guacamole-demo \
--lb-name lbguacademo \
--name ssh2 \
--protocol tcp \
--frontend-port 23 \
--backend-port 22 \
--frontend-ip-name lbguacafrontend

user@mydesktop:~$ az network nic ip-config inbound-nat-rule add \
--inbound-nat-rule ssh1 \
--ip-config-name ipconfigGuacamole-VM1 \
--nic-name Guacamole-VM1VMNic \
--resource-group rg-guacamole-demo \
--lb-name lbguacademo

user@mydesktop:~$ az network nic ip-config inbound-nat-rule add \
--inbound-nat-rule ssh2 \
--ip-config-name ipconfigGuacamole-VM2 \
--nic-name Guacamole-VM2VMNic \
--resource-group rg-guacamole-demo \
--lb-name lbguacademo
```

Com isso, você pode alterar a regra default do NSG criado anteriormente que possui a porta 22 exposta para a internet com o comando abaixo:

```bash
user@mydesktop:~$ az network nsg rule delete \
--resource-group rg-guacamole-demo \
--nsg-name NSG-Guacamole \
--name default-allow-ssh
```

# Finalizando o setup

Após completar todos os passos anteriores, já teremos finalizado a setup do Apache Guacamole. Para acessá-lo, basta ir até o endereço <http://loadbalancerguaca.eastus.cloudapp.azure.com/> e informar o usuário e senha padrão da instalação (guacadmin/guacadmin)

[![](/wp-content/uploads/2018/04/screen.png)](/wp-content/uploads/2018/04/screen.png)
