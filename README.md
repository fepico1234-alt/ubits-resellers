# UBITS · Programa de Resellers

Landing para atraer resellers que vendan **UBITS Aprendizaje**, y la pieza gráfica para invitarlos desde redes. Usa los mismos componentes, colores, tipografía e íconos que el rediseño de [ubits.com](https://ubits.com) (repo `ubits-web`).

## Estructura

```
ubits-resellers/
├── site/                        La landing (lo que publica Netlify)
│   ├── index.html               Página única
│   ├── gracias.html             Respaldo si el formulario se envía sin JavaScript
│   ├── css/site.css             Estilos
│   ├── js/site.js               Menú móvil, animaciones y envío del formulario
│   ├── fonts/                   Inter Variable
│   └── img/                     Logo, Bitto, íconos glass, logos de clientes, og.png
├── redes/
│   ├── pieza-resellers.html     Pieza para redes (dos formatos en un archivo)
│   ├── exportar.sh              Exporta los PNG con Google Chrome
│   └── export/                  PNG listos para publicar
├── docs/copies.md               Todos los textos en un solo lugar (landing + redes + post)
├── tools/serve.js               Servidor local de vista previa
└── netlify.toml                 Netlify publica site/ sin paso de build
```

## Verlo en local

Requiere [Bun](https://bun.sh).

```bash
bun tools/serve.js
```

Abre http://localhost:8766. Los envíos del formulario se imprimen en la terminal.

## Publicar en Netlify

1. Sube este repo a GitHub.
2. En Netlify: **Add new site → Import an existing project** y elige el repo. No hay que configurar nada: `netlify.toml` ya le dice que publique `site/`.
3. Las solicitudes del formulario llegan a **Netlify → Forms → resellers**. Ahí puedes activar un aviso por correo o enviarlas a Slack o a un CRM.
4. Cuando tengas el dominio final, cambia `og:image` en `site/index.html` por la URL completa (`https://tu-dominio/img/og.png`) para que la vista previa se vea al compartir el link.

## Pieza para redes

`redes/pieza-resellers.html` tiene dos formatos:

| Formato | Tamaño | Dónde |
|---|---|---|
| `?f=land` | 1600 × 900 | LinkedIn, X, YouTube |
| `?f=feed` | 1080 × 1350 | Instagram y LinkedIn en el feed |

Para volver a exportar después de un cambio:

```bash
bash redes/exportar.sh
```

Los PNG salen a doble resolución en `redes/export/`.

## Pendientes antes de publicar

Ver los ⚠️ en `docs/copies.md`. En resumen, confirmar con el equipo comercial:

- Que unirse no tiene costo.
- El tiempo de respuesta (hoy dice "menos de 2 días hábiles").

Las comisiones (20 % y 25 %) salen del *Deck Comercial 2026 - Partners*. El modelo está confirmado: el reseller cierra su venta e implementa; UBITS da soporte de nivel 2.
