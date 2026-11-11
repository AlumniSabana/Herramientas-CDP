# Instalación de Supabase

Para un proyecto nuevo (por ejemplo el de pruebas). Son cinco pasos.

## 1. Claves del proyecto

En Supabase → **Project Settings → API** (o **API Keys**) copia:

- **Project URL** → `VITE_SUPABASE_URL`
- **Publishable key** (`sb_publishable_…`) → `VITE_SUPABASE_PUBLISHABLE_KEY`

Ponlas en `.env.local` (hay una plantilla en `.env.example`).

> **La clave `sb_secret_…` NO se usa en este proyecto.** Se salta todas las políticas de seguridad (RLS); si se pone en una variable `VITE_…` la descarga cualquier visitante de la página. Si ya la compartiste en algún chat o repositorio, regénerala en el panel.

## 2. Migración

SQL Editor → pega **todo** `supabase/migrations/20261110000000_esquema_inicial.sql` → **Run**.
Crea tablas, políticas, triggers de registro y las vistas del administrador. Se puede repetir sin perder datos.

## 3. Autenticación

**Authentication → Sign In / Providers → Email**: deja activado **Confirm email**.

**Authentication → Email Templates → Confirm signup** y **Reset password**: reemplaza el enlace por el código para que el formulario funcione:

```html
<h2>Tu código</h2>
<p>{{ .Token }}</p>
```

Para pruebas ya hay un límite bajo de correos; para producción configura un SMTP propio (**Auth → SMTP Settings**).

## 4. Primer administrador

Regístrate desde la aplicación con el correo del CDP, confirma el código y, en el SQL Editor:

```sql
update public.perfiles set rol = 'admin'
 where lower(correo) = 'desarrolloprofesional@unisabana.edu.co';
```

Cierra sesión y vuelve a entrar: aparece «Administración» en el menú.

## 5. Edge Functions (opcional)

Las observaciones del pitch, la revisión del portafolio y la traducción usan funciones en `supabase/functions/`. Siguen igual que antes; ver `desplegar-observaciones.md` y `desplegar-traduccion-y-revision.md`.

## Si algo falla

| Síntoma | Causa habitual |
|---|---|
| «Falta configurar Supabase» en el registro | `.env.local` vacío o sin reiniciar `npm run dev` |
| «El correo debe terminar en @unisabana.edu.co» | Solo se admiten correos institucionales (trigger `validar_registro`) |
| Llega un enlace en vez de un código | Falta cambiar la plantilla del paso 3 |
| «Administración» no aparece | Falta el `update` del paso 4, o no se cerró y reabrió sesión |
| El consolidado sale vacío | Ninguna persona ha iniciado sesión todavía, o las vistas no se crearon (paso 2) |
