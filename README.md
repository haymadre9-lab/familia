# Familia

App de casa: compra, tareas, cole de Ian y Unax, y citas médicas.
Sincronizada entre los móviles de Carlos y Miren.

PWA sin build: HTML, CSS y un JS. Datos en Supabase (proyecto de UsoEmbsa),
tablas `fam_items`, `fam_miembros` y `fam_ajustes`.

## Subir a GitHub Pages

1. Crea el repositorio **familia** (público; el código es público, los datos no).
2. Sube estos archivos a la raíz, sin carpeta:
   `index.html`, `estilo.css`, `app.js`, `sw.js`, `manifest.json`, `icono-192.png`, `icono-512.png`
3. Settings → Pages → Source: **Deploy from a branch**, rama `main`, carpeta `/ (root)`. Guardar.
4. A los dos minutos: `https://haymadre9-lab.github.io/familia/`

## Antes de entrar

Ejecuta `familia_ajustes.sql` en el SQL Editor de Supabase (una sola vez).
Crea la tabla de colores y el orden de la compra compartidos.

## Instalar en el móvil

- **Android/Chrome**: menú ⋮ → Añadir a pantalla de inicio.
- **iPhone/Safari**: Compartir → Añadir a pantalla de inicio.
  En iPhone es obligatorio instalarla si algún día quieres avisos.

Hazlo en los dos móviles y entrad cada uno con vuestro correo.

## Traer los datos del prototipo

⚙️ → Restaurar copia → pega el JSON exportado del prototipo → pulsar otra vez.
Traduce los nombres antiguos (`nino`, `deleted`) a los nuevos.

## Qué hace y qué no

Funciona:
- Sincronización instantánea entre móviles (Supabase Realtime).
- Sin cobertura: la app abre, se puede leer y apuntar; los cambios se suben solos
  al volver la conexión (aviso abajo con los cambios pendientes).
- Avisos con la app abierta o en segundo plano reciente.

Todavía no:
- Avisos con la app cerrada. Necesita VAPID + Edge Function con cron + tabla de
  suscripciones. El `sw.js` ya trae el receptor `push` listo.
- Notas de voz como audio. Ahora es dictado a texto (marca 🎤).
  Audio real necesita Supabase Storage.

## Estructura

| archivo | qué es |
|---|---|
| `index.html` | esqueleto: login, pestañas, paneles, formulario |
| `estilo.css` | todo el diseño |
| `app.js` | datos, Supabase, vistas, buscador, avisos |
| `sw.js` | offline + receptor de push |
| `manifest.json` | instalación en pantalla de inicio |

La `anon key` está en `app.js` a la vista: es pública por diseño.
Lo que protege los datos es el RLS. La `service_role` **nunca** entra aquí.
