# adapt2learn-frontend

Frontend da plataforma Adapt2Learn — React 18 + Vite.

## Rodando localmente

```bash
npm install
npm start          # ou npm run dev — abre em http://localhost:3000
```

O login (Google ou e-mail) funciona contra o backend real; veja
"Como as chamadas de API funcionam".

> **Atenção:** por padrão o ambiente local aponta para o backend de
> **produção**. Fazer login e jogar cria sessões e eventos reais — inclusive
> para a coorte do estudo adaptativo, cuja atribuição é imutável. Para testar
> sem afetar produção, aponte para outro backend (abaixo).

## Scripts

| comando              | o que faz                             |
| -------------------- | ------------------------------------- |
| `npm start` / `dev`  | servidor de desenvolvimento com proxy |
| `npm run build`      | build de produção em `build/`         |
| `npm run preview`    | serve o `build/` localmente           |
| `npm test`           | testes (Vitest)                       |
| `npm run test:watch` | testes em modo watch                  |
| `npm run lint`       | ESLint (inclui regras de hooks)       |
| `npm run format`     | Prettier em todo o repositório        |

## Como as chamadas de API funcionam

Em produção o Firebase Hosting reescreve (`firebase.json`):

| rota        | destino                           |
| ----------- | --------------------------------- |
| `/api/**`   | Cloud Run (serviço `adapt2learn`) |
| `/games/**` | Cloud Function `serveGame`        |

No dev server esses rewrites não existem. Sem tratamento, `/api/...` cairia no
Vite e voltaria o `index.html`, e chamar o Cloud Run direto do browser é
bloqueado por **CORS** (o serviço só libera `adapt2learn-api.web.app`).

Por isso [`vite.config.js`](vite.config.js) replica os rewrites no
`server.proxy`. A requisição sai do Node (server-to-server): sem preflight,
sem CORS. A base das chamadas fica em [`src/api/config.js`](src/api/config.js):

- **desenvolvimento** → `/api` (passa pelo proxy)
- **produção** → URL absoluta do Cloud Run

Toda chamada passa por `apiFetch`/`apiJson` em
[`src/api/httpClient.js`](src/api/httpClient.js) — token, headers e mapeamento
de erro num só lugar. Não use `fetch` direto para a API.

### Apontando para outro backend

Crie um `.env.local` (ignorado pelo git):

```bash
# usa uma API local em vez do proxy
VITE_API_BASE_URL=http://localhost:8000/api
```

Ou mantenha o proxy e troque só o destino dele:

```bash
DEV_PROXY_API_TARGET=http://localhost:8000
DEV_PROXY_GAMES_TARGET=https://adapt2learn-api.web.app
```

## Login em localhost

O Firebase Auth já aceita `localhost`. Se aparecer `auth/unauthorized-domain`,
adicione `localhost` em **Firebase Console → Authentication → Settings →
Authorized domains** (projeto `adapt2learn-api`).

O usuário precisa existir no backend: o login confirma em `/api/me` e, sem
cadastro (404), desloga com "Usuário não cadastrado".

## Mapa do código

```
src/
  api/            httpClient (apiFetch/apiJson/ApiError), profile, events, word challenges
  auth/           ProfileProvider + useProfile — sessão e /me carregados uma vez
  components/
    ui/           kit de componentes (Button, Card, Field, Alert, Tabs, ConfirmDialog…)
    PrivateRoute  exige login e, opcionalmente, papel (roles)
    ErrorBoundary tela de erro com "voltar ao início"
  pages/          uma pasta por área quando a tela cresce (admin/, teacher/)
  theme/          tokens (JS), tema do MUI, ThemeProvider claro/escuro/sistema
  styles/         global.css — design tokens em CSS custom properties e classes
  constants/      listas compartilhadas (escolas, séries)
```

Rotas de professor/admin são carregadas sob demanda (`React.lazy`): o bundle
inicial do aluno não inclui MUI, Recharts, react-select nem react-dropzone.

## Design system

O visual é centralizado em [`src/styles/global.css`](src/styles/global.css)
(tokens + classes, incluindo o tema escuro) e espelhado em
[`src/theme/tokens.js`](src/theme/tokens.js) para o que não lê CSS variables
(gráficos, tema do MUI). O tema fica em `localStorage` (`a2l-theme`) e é
resolvido antes do primeiro paint por um script inline em `index.html`.

## Qualidade

- **Testes** cobrem o que é puro e tem consequência de pesquisa
  (`contentOptions` — restrição de subárea por escola).
- **ESLint** com `react-hooks` (a regra `set-state-in-effect`, voltada ao React
  Compiler, está desligada com justificativa em `eslint.config.js`).
- **CI** (`.github/workflows/ci.yml`) roda testes, lint e build em todo PR.
  O deploy (`sync_deploy.yml`) dispara só em push na `main` e também passa por
  testes e lint antes de publicar.

## Build e deploy

```bash
npm run build
firebase deploy --only hosting
```

O `build/` é o mesmo diretório que o Firebase Hosting já publicava; o
`firebase.json` não mudou.
