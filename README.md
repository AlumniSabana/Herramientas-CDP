# Herramientas del Centro de Desarrollo Profesional

Plataforma de la Universidad de La Sabana (TalentHub UniSabana) con dos herramientas:

| Herramienta | Qué hace |
|---|---|
| **Construye tu portafolio** | Guía por las cinco secciones de un portafolio, adaptadas al programa, con revisión por IA y PDF. Se guarda en la cuenta. |
| **Estudio de Pitch** | Ensayo de pitch en voz alta con reporte de ritmo, muletillas, estructura y presencia visual. |

**Stack:** Vite · React · TypeScript · Tailwind CSS v4 · React Router · Supabase (Auth, Postgres con RLS, Edge Functions).

## Arrancar

```sh
npm install
cp .env.example .env.local     # completa la URL y la clave publicable de Supabase
npm run dev
```

Base de datos y autenticación: ver [`docs/supabase-instalacion.md`](docs/supabase-instalacion.md).

```sh
npm run typecheck   # tipos
npm run build       # genera dist/ (Vercel lo publica; vercel.json ya trae la reescritura de rutas)
```

## Estructura

```
src/
├── main.tsx · App.tsx          rutas (React Router, herramientas con carga diferida)
├── auth/                       AuthProvider (supabase-js) y guardas de ruta
├── components/                 ui.tsx (botones, campos, tarjetas) y Layout
├── lib/                        cliente de Supabase, catálogo académico
├── pages/                      inicio, cuenta, administración
└── features/
    ├── pitch/                  Estudio de Pitch (+ panel de administración)
    └── portafolio/             Portafolio (+ panel de administración)
supabase/
├── migrations/                 esquema completo (una sola migración)
└── functions/                  Edge Functions: observaciones, revisar-portafolio, traducir
legacy/                         versión anterior en HTML, solo de referencia
```

## Claves y privacidad

- En el navegador solo va la clave **publicable**. La `sb_secret_…` nunca se usa en este repositorio. Las claves de Anthropic y Gemini viven en los secretos de las Edge Functions.
- La seguridad real son las políticas RLS: cada persona solo lee lo suyo. El borrador del portafolio no lo lee ni el administrador; el consolidado usa vistas que solo exponen cifras.
- La sesión se guarda en `sessionStorage`: se cierra al cerrar la pestaña (equipos compartidos del campus).
- El audio del pitch nunca sale del navegador.
- Las observaciones de IA del portafolio señalan problemas; no redactan el texto por la persona. No cambiar esa regla.
