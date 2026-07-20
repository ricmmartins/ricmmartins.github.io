---
slug: "coletando-informacoes-do-azure-com-grafana"
title: 'Coletando informações do Azure com Grafana'
date: '2017-11-22T02:14:33-05:00'
tags:
    - azure
    - monitoramento
---

Recentemente [foi lançado um plugin do Azure Monitor para o Grafana](https://azure.microsoft.com/en-us/blog/monitor-azure-services-and-applications-using-grafana/) que eu resolvi testar e escrever este post.

Eu segui as orientações [deste link](https://docs.microsoft.com/en-us/azure/monitoring-and-diagnostics/monitor-send-to-grafana) e neste artigo vou entrar em detalhes do procedimento.

## Criando a VM

### Criando o Resource Group

```bash
rmartins@jarvis:~$ az group create --name rg-grafana --location eastus
```

### Criando a VM

```bash
rmartins@jarvis:~$ az vm create --resource-group rg-grafana --name grafana-server --image UbuntuLTS --location eastus --generate-ssh-keys
```

### Abrindo a porta correspondente no NSG

O Grafana utiliza a porta TCP 3000, portanto é necessário liberar esta porta no Network Security Group da VM criada de modo a liberar o acesso à VM nesta porta.

```bash
rmartins@jarvis:~$ az network nsg list -g rg-grafana -o table

Location    Name               ProvisioningState    ResourceGroup    ResourceGuid
----------  -----------------  -------------------  ---------------  ------------------------------------
eastus      grafana-serverNSG  Succeeded            rg-grafana       9bfbd4f6-95ad-48c9-a3b7-d68af0d707f5

rmartins@jarvis:~$ az network nsg rule create --resource-group rg-grafana --nsg-name grafana-serverNSG --name allow-grafana --description "Allow access to port 3000 for HTTPS" --access Allow --protocol Tcp --direction Inbound --priority 102 --source-address-prefix "*"  --source-port-range "*" --destination-address-prefix "*" --destination-port-range "3000"
```

### Conectando na VM

```bash
rmartins@jarvis:~$ az vm show --resource-group rg-grafana --name grafana-server -d --query publicIps -otsv

rmartins@jarvis:~$ ssh rmartins@[PublicIP] -i /home/rmartins/.ssh/id_rsa
```

## Instalando o grafana

Procedimento de instalação seguindo [este tutorial](http://docs.grafana.org/installation/debian/).

### Adicionar repositório

```bash
rmartins@grafana-server:~$ sudo sh -c 'echo "deb https://packagecloud.io/grafana/stable/debian/ jessie main" >> /etc/apt/sources.list'
```

### Adicionar chave do Package Cloud

```bash
rmartins@grafana-server:~$ sudo curl https://packagecloud.io/gpg.key | sudo apt-key add -
```

### Atualizar repositórios

```bash
rmartins@grafana-server:~$ sudo apt-get update
```

### Instalar Grafana

```bash
rmartins@grafana-server:~$ sudo apt-get install grafana
```

### Inicializar Grafana

```bash
rmartins@grafana-server:~$ sudo systemctl daemon-reload
rmartins@grafana-server:~$ sudo systemctl start grafana-server
rmartins@grafana-server:~$ sudo systemctl status grafana-server
```

### Habilitar no boot

```bash
rmartins@grafana-server:~$ sudo systemctl enable grafana-server.service
```

### Conectar no serviço

Usar o endereço IP público da VM criada apontando para o a porta 3000 e utilizar o usuário e senha que vem configurados por padrão. Usuário admin e senha admin.

[![](/wp-content/uploads/2017/11/imagem1.png)](/wp-content/uploads/2017/11/imagem1.png)

Uma vez verificado que o acesso está ok, vamos ao próximo passo que é a instalação do plugin do Azure Monitor

## [![](/wp-content/uploads/2017/11/imagem2.png)](/wp-content/uploads/2017/11/imagem2.png)

## Instalando o Azure Monitor Plugin

A instalação do plugin será feita seguindo [esta documentação](https://grafana.com/plugins/grafana-azure-monitor-datasource).

Uma vez conectado na VM, rodar o comando abaixo:

```bash
rmartins@grafana-server:~$ sudo grafana-cli plugins install grafana-azure-monitor-datasource
```

Em seguida reiniciar o serviço do grafana:

```bash
rmartins@grafana-server:~$ sudo systemctl restart grafana-server
```

Após isto será possível verificar que o plugin já foi instalado e já aparece como um datasource:

[![](/wp-content/uploads/2017/11/imagem3.png)](/wp-content/uploads/2017/11/imagem3.png)

### Criando o service principal

O próximo passo é criar um service principal para o plugin de modo que ele possa se conectar ao Azure Active Directory. Para isto basta seguir as intruções [deste link](https://docs.microsoft.com/en-us/azure/azure-resource-manager/resource-group-create-service-principal-portal).

Ao registrar a aplicação, no meu caso ficou conforme abaixo:

[![](/wp-content/uploads/2017/11/imagem4.png)](/wp-content/uploads/2017/11/imagem4.png)

Após registrar a aplicação, vamos pegar as informações de Application Id e Authentication Key. Para isto, ainda dentro do App Registration do AAD, vamos procurar pela aplicação criada:

[![](/wp-content/uploads/2017/11/imagem5.png)](/wp-content/uploads/2017/11/imagem5.png)

Após clicar na aplicação, basta copiar o Application ID, neste caso, addd1254-cb9b-4589-a99c-ac382ebd33ba

[![](/wp-content/uploads/2017/11/imagem6.png)](/wp-content/uploads/2017/11/imagem6.png)

Para gerar a Authentication Key, basta ir em Keys dentro de All Settings:

[![](/wp-content/uploads/2017/11/imagem7.png)](/wp-content/uploads/2017/11/imagem7.png)

[![](/wp-content/uploads/2017/11/imagem8.png)](/wp-content/uploads/2017/11/imagem8.png)

Ao clicar em salvar, a key será gerada e exibida:  
[![](/wp-content/uploads/2017/11/imagem9.png)](/wp-content/uploads/2017/11/imagem9.png)

Neste caso, **3NZ4F2FBwm6h8sfF48dE2Owg3si7xHSWtEAnBwAKqjk=**

Agora precisamos do Directory ID do AAD, que é obtido nas propriedades do AAD:

[![](/wp-content/uploads/2017/11/imagem10.png)](/wp-content/uploads/2017/11/imagem10.png)\* Directory ID omitido por questões de segurança

Por fim, vamos associar a role de **Reader** para a nossa aplicação. Para isso vá na sua subscription, em seguida acesse o IAM, escolha a opção para adicionar apontando a role **Reader** e escolha a aplicação criada:

[![](/wp-content/uploads/2017/11/imagem11.png)](/wp-content/uploads/2017/11/imagem11.png)

## Finalizando a configuração no Grafana

Agora vamos ajustar as configurações no Grafana, adicionando o datasource:

[![](/wp-content/uploads/2017/11/imagem12.png)](/wp-content/uploads/2017/11/imagem12.png)

Em seguida vamos preencher com as informações necessárias:

– Subscription ID  
– TenantID (ID do AAD)  
– ClientID (Application ID)  
– Client Secret (Key)

[![](/wp-content/uploads/2017/11/imagem13.png)](/wp-content/uploads/2017/11/imagem13.png)

\* Neste caso não estou usando o Application Insights. Caso esteja, basta adicionar os dados necessários.

Após salvar é feito um teste. Se estiver tudo ok você deve ver algo assim:

### [![](/wp-content/uploads/2017/11/imagem14.png)](/wp-content/uploads/2017/11/imagem14.png)

### Criando o primeiro dashboard

Agora vamos ao próximo passo:

[![](/wp-content/uploads/2017/11/imagem15.png)](/wp-content/uploads/2017/11/imagem15.png)

Tipo: Graph

[![](/wp-content/uploads/2017/11/imagem16.png)](/wp-content/uploads/2017/11/imagem16.png)

Clique em Panel Tile:

[![](/wp-content/uploads/2017/11/imagem17.png)](/wp-content/uploads/2017/11/imagem17.png)

E ao clicar em Edit esta teremos as opções abaixo:

[![](/wp-content/uploads/2017/11/imagem18.png)](/wp-content/uploads/2017/11/imagem18.png)

Em Metrics, você verá que o Azure Monitor foi adicionado como DataSource default. Agora basta criar o gráfico para o recurso desejado:

[![](/wp-content/uploads/2017/11/imagem19.png)](/wp-content/uploads/2017/11/imagem19.png)

Neste caso peguei dados de uso de CPU de duas VMs e salvei o dashboard como CPU VMs:

[![](/wp-content/uploads/2017/11/imagem20.png)](/wp-content/uploads/2017/11/imagem20.png)

Visualizando:

[![](/wp-content/uploads/2017/11/imagem21.png)](/wp-content/uploads/2017/11/imagem21.png)

Espero que tenha sido útil!
