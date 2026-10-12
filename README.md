# LiDAR Tránsito

Laboratorio web experimental para observar la distribución vehicular en una red esquemática del casco central de Heredia, desde el entorno del río Pirro hacia el oeste y San Joaquín, con entradas por los cuatro lados.

**Prueba pública:** https://lidar-transito.pages.dev

## Ejecutar y modificar

Requiere Node.js 22 o posterior. La aplicación no necesita dependencias de producción, claves de mapas ni servidor de datos.

```sh
git clone https://github.com/jaceve117-design/LiDARtransito.git
cd LiDARtransito
npm ci
npm run dev
```

Abrir http://127.0.0.1:4173. Para comprobar el motor y preparar la publicación:

```sh
npm test
npm run build
```

## Archivos

- `public/index.html`: página, controles, indicadores y textos.
- `public/styles.css`: diseño adaptable a escritorio y teléfono.
- `public/network.js`: nodos, conexiones, sentidos, distancias supuestas y búsqueda de rutas.
- `public/simulation.js`: llegadas, colas, señales, movimiento y aprendizaje Q-learning.
- `public/app.js`: animación SVG, interacción, gráfica y CSV.
- `tests/simulation.test.mjs`: conectividad, conservación de vehículos, separación, semáforos y reproducibilidad.
- `tests/interface.test.mjs`: interacción y exportación con un DOM de prueba; no sustituye la revisión visual en un navegador.
- `archive/LIDAR_Puente_Rio_Pirro_V4_1.html`: versión anterior preservada como referencia; no se publica dentro de la página.
- `docs/modelo.md`: parámetros, métricas y límites del experimento.
- `docs/medicion-piloto.md`: propuesta de contrato para mediciones reales futuras, sin servidor implementado.

## Publicación en Cloudflare

Proyecto Pages `lidar-transito`, cuenta `Jac`, conectado a este repositorio:

- Rama de producción: `main`.
- Directorio raíz: `/`.
- Construcción: `npm test && npm run build`.
- Directorio de salida: `dist`.
- Node.js: 22.

Los commits enviados a `main` activan el despliegue automático. Las ramas de trabajo pueden generar vistas previas. Revisar el resultado del build antes de considerar publicada una modificación. No subir claves, tokens o mediciones personales al repositorio.

La exportación incluye datos por segundo de ambos motores, comparación de métricas y tablas Q por cruce. La aplicación no transmite resultados a un servidor: cada visitante ejecuta su propio experimento.

Una persona con permisos sobre este repositorio puede clonarlo y enviar cambios desde otra computadora. Para gestionar configuraciones, dominios y despliegues necesita también acceso a la cuenta/proyecto de Cloudflare. La publicación automática usa la integración GitHub de Cloudflare, no credenciales guardadas en el código.

Publicación manual con una sesión propia de Cloudflare:

```sh
npx wrangler login
npm run deploy
```

## Qué representa esta versión

30 cruces, 14 semáforos de prueba y 22 accesos. La red admite rutas alternativas y bloqueo por ocupación del siguiente tramo. Dos motores reciben la misma lista de llegadas y destinos, con semilla reproducible. El selector cambia qué motor se dibuja; ambos avanzan al mismo tiempo.

**No es un gemelo digital calibrado.** La imagen aportada sirve de referencia visual. El estudio de impacto del proyecto Bulevar, de mayo de 2023, sirve únicamente como referencia histórica: no se aplica la propuesta de bulevar, ni sus escenarios se presentan como la red actual. No se importaron sus aforos como demanda activa.

Los sentidos alternados se inspiran en la descripción general del estudio, pero cada sentido, distancia, cruce y semáforo debe verificarse en campo. La malla no equivale al trazado real ni incluye todas las intersecciones existentes. Los datos mostrados son sintéticos, calculados en cada navegador.

Ouster es una referencia de hardware a evaluar, no una integración o patrocinio: https://ouster.com/industry/smart-infrastructure. El simulador no depende de una marca.
