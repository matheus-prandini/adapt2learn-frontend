# adapt2learn-frontend

Frontend da plataforma Adapt2Learn (React 18 + CRA).

## Rodando localmente

```bash
npm install
npm start
```

Abre em `http://localhost:3000`. O login com Google e e-mail funciona contra o
backend real — veja "Como as chamadas de API funcionam" abaixo.

> **Atenção:** por padrão o ambiente local aponta para o backend de
> **produção**. Fazer login e jogar cria sessões e eventos reais (inclusive
> para a coorte do estudo adaptativo, cuja atribuição é imutável). Para testar
> sem afetar produção, aponte para outro backend com `REACT_APP_API_BASE_URL`
> (veja abaixo).

## Como as chamadas de API funcionam

Em produção o Firebase Hosting reescreve (`firebase.json`):

| rota        | destino                            |
| ----------- | ---------------------------------- |
| `/api/**`   | Cloud Run (serviço `adapt2learn`)  |
| `/games/**` | Cloud Function `serveGame`         |

No `npm start` esses rewrites não existem. Sem tratamento, dá um destes erros:

- chamadas a `/api/...` caem no dev server e voltam o `index.html`
  (`SyntaxError: Unexpected token '<'`);
- chamadas diretas ao Cloud Run são bloqueadas por **CORS**, porque o serviço
  não devolve `Access-Control-Allow-Origin` para `http://localhost:3000`.

Por isso o projeto tem [`src/setupProxy.js`](src/setupProxy.js), que replica os
rewrites no dev server. Como a requisição sai do Node (server-to-server), não há
preflight nem CORS.

A base das chamadas fica centralizada em [`src/api/config.js`](src/api/config.js):

- **desenvolvimento** → `/api` (passa pelo proxy)
- **produção** → URL absoluta do Cloud Run

### Apontando para outro backend

Crie um `.env.local` (já ignorado pelo git):

```bash
# usa uma API local em vez do Cloud Run
REACT_APP_API_BASE_URL=http://localhost:8000/api
```

Ou, mantendo o proxy, troque só o destino dele:

```bash
DEV_PROXY_API_TARGET=http://localhost:8000
DEV_PROXY_GAMES_TARGET=https://adapt2learn-api.web.app
```

## Login em localhost

O Firebase Auth já aceita `localhost` por padrão. Se aparecer
`auth/unauthorized-domain`, adicione `localhost` em
**Firebase Console → Authentication → Settings → Authorized domains**
(projeto `adapt2learn-api`).

O usuário precisa já existir no backend: o login checa `/api/me` e, se o perfil
não existir, desloga com "Usuário não cadastrado".

## Design system

O visual é centralizado em:

- [`src/styles/global.css`](src/styles/global.css) — tokens (CSS custom
  properties) e classes de componente, incluindo o tema escuro
- [`src/theme/tokens.js`](src/theme/tokens.js) — espelho em JS, para gráficos e
  para o tema do MUI
- [`src/components/ui/`](src/components/ui) — componentes reutilizáveis

O tema (claro/escuro/sistema) fica em `localStorage` sob a chave `a2l-theme` e é
resolvido antes do primeiro paint por um script inline em `public/index.html`.

## Build e deploy

```bash
npm run build
firebase deploy
```
