Sistema de Sorteio de Vagas - Windows

Como usar:

1. Extraia todo o conteudo do arquivo ZIP.
2. Abra a pasta extraida.
3. Execute INICIAR-SORTEIO-WINDOWS.bat
4. O sistema sera aberto em http://localhost:3030

Se voce recebeu o pacote portatil completo:

- nao precisa instalar Node.js
- o sistema usa o runtime que ja vai dentro da pasta runtime

Se voce recebeu um pacote simples e o Windows informar que o Node.js nao foi encontrado:

- instale o Node.js no computador
ou
- coloque um node.exe dentro da pasta runtime

Arquivos importantes:

- INICIAR-SORTEIO-WINDOWS.bat = iniciador principal
- start.bat = iniciador tecnico
- runtime\ = runtime local do Node.js usado pela versao portatil
- config\building-config.json = configuracao dos apartamentos
- data\store.json = historico local dos sorteios, criado automaticamente
