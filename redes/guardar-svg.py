#!/usr/bin/env python3
"""Recibe la página que imprime Chrome (--dump-dom), saca el SVG que armó svg.js
y le incrusta la fuente y las imágenes, para que el archivo funcione solo. Lo usa exportar.sh."""
import base64
import html
import pathlib
import re
import sys

AQUI = pathlib.Path(__file__).resolve().parent
TIPOS = {'.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp'}


def incrustar(ruta):
    archivo = (AQUI / ruta).resolve()
    return f'data:{TIPOS[archivo.suffix]};base64,' + base64.b64encode(archivo.read_bytes()).decode()


pagina = sys.stdin.read()
hallado = re.search(r'<pre id="svg-out">(.*?)</pre>', pagina, re.S)
if not hallado:
    sys.exit('No se generó el SVG: revisa que la pieza abra bien en el navegador.')
svg = html.unescape(hallado.group(1))
svg = re.sub(r'xlink:href="(\.\./[^"]+)"', lambda m: f'xlink:href="{incrustar(m[1])}"', svg)
svg = re.sub(r'url\((\.\./[^)"]+)\)', lambda m: f'url({incrustar(m[1])})', svg)
pathlib.Path(sys.argv[1]).write_text(svg, encoding='utf-8')
