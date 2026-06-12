# Sistema de Sorteio de Vagas

Primeira versao de um sistema offline para sorteio automatico das vagas do Condominio Floresce.

<img width="1131" height="704" alt="image" src="https://github.com/user-attachments/assets/5e1d2f3d-d57d-42ff-ae27-f94c7ec369c0" />


## O que esta pronto

- acesso direto, sem login
- sem cadastro manual de participantes
- sorteio automatico dos `Lotes 1` ao `Lote 308`
- definicao automatica de qual apartamento recebe cada lote
- `2 vagas` por lote registradas na auditoria
- seed configuravel para reproducao do sorteio
- hash SHA-256 para auditoria
- historico local de sorteios
- exportacao do ultimo sorteio em JSON
- exportacao do resultado em CSV e Excel

## Como esta funcionando nesta V1

- o sistema usa uma lista fixa de `308 apartamentos`
- cada sorteio embaralha esses apartamentos de forma deterministica
- o primeiro apartamento sorteado recebe o `Lote 1`, o segundo recebe o `Lote 2`, e assim por diante ate o `Lote 308`

## Configuracao atual

O arquivo [config/building-config.json](/Users/jacquesjacob/Documents/Sorteio-Vagas-Floresce/config/building-config.json) define a estrutura usada no sorteio.

Nesta V1, assumi:

- `22 andares` por bloco
- blocos `Jacarandá`, `Ipê` e `Cedro`
- total de `308 apartamentos`
- distribuicao automatica para fechar esse total:
- `Jacarandá = 103`
- `Ipê = 103`
- `Cedro = 102`

Os rotulos dos apartamentos sao gerados no formato:

```text
Bloco NumeroDoApartamento
Jacarandá 11
Ipê 33
Cedro 222
```

Se voces tiverem a lista real de apartamentos e nomenclaturas exatas, o proximo passo ideal e trocar essa configuracao gerada por uma lista explicita.

## Como rodar

Se voce tiver `node` instalado:

```bash
node server.js
```

Ou use o script:

```bash
./run-local.sh
```

Depois abra:

```text
http://localhost:3030
```

No macOS, voce tambem pode dar duplo clique em:

```text
start.command
```

No Windows, voce pode usar:

```text
start.bat
```

Ou, para um uso mais simples:

```text
INICIAR-SORTEIO-WINDOWS.bat
```

## Como compartilhar com outra pessoa

Se a ideia for baixar pelo GitHub e entregar algo pronto para Windows, prefira a `Release` com o pacote portatil.

Para gerar um pacote `.zip` pronto para envio:

```bash
./build-share-package.sh
```

Para gerar um pacote focado em `Windows`:

```bash
./build-windows-package.sh
```

Para gerar um pacote `Windows portatil`, sem exigir instalacao manual do Node:

```bash
./build-windows-portable-package.sh
```

O arquivo sera criado na pasta:

```text
dist/
```

Esse pacote ja inclui:

- servidor local
- interface web
- configuracao dos apartamentos
- iniciador para `macOS` com `start.command`
- iniciador para `Windows` com `start.bat`

No pacote de Windows, tambem entram:

- `INICIAR-SORTEIO-WINDOWS.bat`
- `WINDOWS-README.txt`
- pasta `runtime/` pronta para receber um `node.exe`, se voce quiser mandar uma versao portatil depois

No pacote Windows portatil, a pasta `runtime/` ja vai preenchida com o runtime oficial do Node.js para `Windows x64`.

Observacao importante desta V1:

- no pacote simples, o computador que vai receber o sistema ainda precisa ter `Node.js` instalado
- no pacote Windows portatil, isso nao e necessario
- depois de iniciar o sistema, basta abrir `http://localhost:3030`

## Persistencia

Os dados ficam em:

```text
data/store.json
```

Esse arquivo guarda o historico dos sorteios localmente, sem depender de internet.
