---
slug: "desabilitar-o-login-obrigatorio-aws"
title: 'Como desabilitar o login obrigatório do usuário ec2-user na sua instância Linux da AWS'
date: '2013-04-26T15:09:07-04:00'
tags:
    - aws
    - cloud
    - linux
description: "Se você assim como eu não suporta ter que logar com esse usuário ec2-user na Amazon, aqui vai a dica de como logar direto como root:"
---

Se você assim como eu não suporta ter que logar com esse usuário ec2-user na Amazon, aqui vai a dica de como logar direto como root:  

```bash
# vim /etc/ssh/sshd_config
```

Comente a linha:  

```bash
PermitRootLogin forced-commands-only
```

E insira:  

```bash
PermitRootLogin yes
```

Em seguida altere o conteúdo do arquivo authorized\_keys:  

```bash
# vim /root/.ssh/authorized_keys
```

Remova o “command” e deixe apenas a parte correspondente à sua chave (ssh-rsa…):  

```bash
command=”echo ‘Please login as the ec2-user user rather than root user.’;echo;sleep 10″ ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQCLnwp65NYFH2JlVCfL6oavdL4ZQy9zjKRkJ2ZFwl6oG84rxxn5PrXCLpoN5FGdbpVN4wa7yNNREPvWa8VX7leF8tHGDuN2kEOkOQdUCRRsishdflsiuhdfiuhtRb1hKMHsAD/Xg/ZLT9DtV8XerNuRTduqLKtXYCJtU67xPyKloDN8eKMXJxPQRCPuk05ciZb2cDyaqYNfLFUqjH13CIDrxpBCyADu4URVMpVaQEznsuTu7mthpI/tNVBLkEbPZzzAZzbw9miKPwRW4peDuN51J/eFSnzpxv70JyTW0ujbqySoBxbaEp8bsaasd8f769876asedt5fcLFhj rmartins
```

*\* Por questões de segurança, o conteúdo da chave rsa acima foi alterado*

Agora basta reiniciar o serviço do SSH e logar direto como root  

```bash
# /etc/init.d/sshd reload
```
