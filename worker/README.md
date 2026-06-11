# Cloudflare Worker + D1

This folder contains the cloud backend for the GitHub Pages frontend.

## Dashboard setup

1. Cloudflare Dashboard -> Workers & Pages -> D1 SQL Database -> Create.
   Name it `xiaofei_ai`.
2. Open the database console and run `schema.sql`.
3. Workers & Pages -> Create Worker.
   Name it `xiaofei-ai-api`.
4. Open Worker settings -> Bindings -> Add D1 database binding:
   - Variable name: `DB`
   - Database: `xiaofei_ai`
5. Add Worker variables:
   - `PLATFORM_PASSWORD`: `admin123`
   - `SESSION_TTL_DAYS`: `7`
   - Optional: `OPENAI_API_KEY`
   - Optional: `OPENAI_MODEL`: `gpt-4.1-mini`
6. Edit Worker code and paste `src/index.mjs`.
7. Deploy, copy the Worker URL, then paste it into `public/config.js` as `window.XIAOFEI_API_BASE`.

After that, deploy GitHub Pages again. The same public site will use D1 for shared leads and admin data.
