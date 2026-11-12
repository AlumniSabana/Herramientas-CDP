# Desplegar en Vercel (paso a paso)

Todo lo que cambia entre entornos está en **dos variables**. No hay nada más que configurar en el código.

| Variable | Valor | Dónde se saca |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` | Supabase → Project Settings → API |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` | Supabase → Project Settings → API Keys |

Local: van en `.env` (ya ignorado por git; plantilla en `.env.example`). En Vercel: en el panel, no en el repo.
**La `sb_secret_…` no va en ninguna parte del front.**

## 0 · Antes de empezar

1. La base ya tiene la migración corrida (`docs/supabase-instalacion.md`, pasos 1–4).
2. `npm run build` pasa en tu equipo.
3. El código está subido a GitHub (`git push`).

## 1 · Crear el proyecto en Vercel

1. [vercel.com/new](https://vercel.com/new) → **Import Git Repository** → elige `AlumniSabana/Herramientas-CDP`.
   (Si ya existe el proyecto `herramientas-cdp`, entra a él en vez de crear otro; ver «Cambio desde la versión HTML» abajo.)
2. Vercel detecta Vite. Verifica:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
3. Despliega **Environment Variables** y agrega las dos de la tabla (marca *Production*, *Preview* y *Development*).
4. **Deploy**.

`vercel.json` ya redirige todas las rutas a `index.html`, así que `/portafolio`, `/pitch` o `/admin` funcionan al recargar.

## 2 · Decirle a Supabase cuál es la URL final

Sin esto los correos (confirmación y recuperación) apuntan a `localhost`.

Supabase → **Authentication → URL Configuration**:
- **Site URL:** `https://TU-DOMINIO.vercel.app`
- **Redirect URLs:** añade `https://TU-DOMINIO.vercel.app/**` y `http://localhost:5173/**`

## 3 · Correos

Authentication → **Email Templates** (Confirm signup y Reset password) deben mostrar `{{ .Token }}`.
El correo integrado de Supabase está limitado a pocos mensajes por hora: para uso real configura un SMTP propio en **Authentication → SMTP Settings**.

## 4 · Edge Functions (IA y traducción)

Opcional, pero sin ellas fallan «Generar observaciones», «Revisar mi portafolio» y la traducción. Guía única, con una sola clave de Gemini: [`edge-functions.md`](edge-functions.md); hay que hacerlo **en el mismo proyecto de Supabase** que usa Vercel.

## 5 · Primer administrador

Regístrate en el sitio ya desplegado y en el SQL Editor:

```sql
update public.perfiles set rol = 'admin'
 where lower(correo) = 'desarrolloprofesional@unisabana.edu.co';
```

## 6 · Probar en producción

- [ ] Registro: llega el código y entras.
- [ ] Portafolio: escribe, espera «Guardado», recarga: el texto sigue ahí.
- [ ] Pitch: practica «sin micrófono» y abre el reporte. Con cuenta, aparece en el historial.
- [ ] Con otra cuenta no ves lo de la primera.
- [ ] Admin: aparece «Administración» y el consolidado.
- [ ] Recargar en `/portafolio/identidad` no da 404.
- [ ] El micrófono y la cámara solo funcionan con `https://` (Vercel ya lo da).

## Cambio desde la versión HTML

El sitio actual `herramientas-cdp.vercel.app` sirve los HTML de la raíz. Al desplegar esta versión sobre ese mismo proyecto:

- Cambia el **Framework Preset** a Vite y el **Output Directory** a `dist` (Settings → Build & Development).
- Las variables apuntan al proyecto de Supabase que elijas. **Las cuentas y datos de un proyecto no existen en el otro**: si pasas de producción a un proyecto nuevo, la gente tendrá que registrarse de nuevo. Para conservarlos, corre la migración sobre el proyecto de producción (ya está preparada para tablas viejas) y usa sus claves.
- Para probar sin riesgo: crea el proyecto de Vercel nuevo, o usa una rama (Vercel hace un *Preview Deployment* por rama).

## Cuando cambies algo

`git push` a la rama principal despliega solo. Cambiar una variable en Vercel exige un **Redeploy** (Deployments → ⋯ → Redeploy), porque Vite las incrusta al compilar.

## Limpieza pendiente

- La carpeta `legacy/` es la versión HTML anterior; ya está en el historial de git y se puede borrar.
- Regenera la `sb_secret_…` que se compartió en chats.
