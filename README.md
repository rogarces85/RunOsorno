# RunOsorno

Plataforma web de gestión de entrenamiento de running que conecta entrenadores con sus atletas.

Ver documentación completa en [`AGENTS.md`](./AGENTS.md), [`specs/mvp.md`](./specs/mvp.md) y [`plan/mvp.md`](./plan/mvp.md).

## Stack

- **Next.js 16** (App Router, React 19, TypeScript)
- **Tabler** (`@tabler/core` CSS + `@tabler/icons-react`)
- **MySQL (PlanetScale)** + Cloudflare Hyperdrive + Drizzle ORM
- Auth por sesión (cookies), Server Actions, Zod + React Hook Form

## Requisitos

- Node.js 20+
- npm

## Setup

```bash
npm install
# crea .env.local con las variables (ver .env.local del proyecto)
npm run dev
```

Abre http://localhost:3000

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Servir build de producción |
| `npm run lint` | ESLint |
| `npm run format` | Prettier (formatear) |
| `npm run format:check` | Prettier (verificar) |
