# Mapa de referencia y red vial 0.2

## Fuentes

- `Heredia.png`, imagen marcada por el usuario el 11 de octubre de 2026. Los nueve puntos rojos son los puntos de control tomados para esta prueba. Las seis flechas amarillas son referencias de flujo y congestión, no mediciones de volumen.
- Red Vial Tramos MH, Municipalidad de Heredia: https://sig.heredia.go.cr/server/rest/services/UTGV/RedVIalTramosMH/MapServer/0. Se descargó una instantánea pública de geometrías en Web Mercator, con campos de nombre, longitud, tipo de vía y dirección. El campo `SENTIDO_CARRIL` estaba vacío en los 1.044 registros consultados. Esta capa no se interpretó como un inventario de semáforos.
- Se revisaron servicios públicos de UTGV, Ingeniería y Policía Municipal, y resultados públicos del MOPT. No se obtuvo un inventario completo, actualizado y verificable de semáforos y ciclos para el área. Las solicitudes de contraste a OpenStreetMap no devolvieron datos utilizables; no se incorporaron datos de esa fuente.

## Alineación y topología

La geometría municipal se alineó con las calles de la imagen original usando una transformación de escala y desplazamiento, guardada en `data/map-registration.json`. No se reorganizó la ciudad como una malla regular. La transformación se estimó sobre píxeles de vialidad de la referencia; es una alineación visual para este experimento, no una certificación topográfica.

Los nueve puntos de control se asociaron a cruces próximos de la geometría municipal. La diferencia visual entre marca y cruce fue de 0,9 a 6,1 píxeles en un lienzo de 2.048 × 1.033. La marca del acceso sur al Pirro estaba unos 6 píxeles al norte del cruce de la capa municipal. Se conserva la imagen original para comparar.

La red reconstruida contiene 975 tramos, 671 nodos topológicos y 30 accesos en los bordes. Los nodos incluyen cruces y extremos de vías; **671 no significa 671 intersecciones semaforizadas**. Las líneas siguen las polilíneas municipales, con sus curvas y conexiones. Solo se simula el componente conectado; los fragmentos desconectados no reciben viajes. Las calles visibles en el mapa base fuera del área cubierta por esa red no tienen tráfico simulado inventado.

Se guardó el snapshot con los campos públicos necesarios en `data/municipal-roads.json`. Se puede regenerar el grafo sin conexión con:

```sh
node scripts/prepare-network.mjs
```

## Sentidos, puntos rojos y flujos

- Los nueve controles son los puntos aportados por el usuario; no se añaden semáforos por cada fila del mapa.
- Las flechas se asocian a tramos cercanos y con orientación compatible. Son referencias dibujadas a mano, algunas desplazadas al lado de la calzada para no taparla.
- La flecha de salida sur se asoció al tramo municipal de travesía (registro 1911) que discurre desde el entorno de Guayabal hacia la conexión sur. La asociación se limita al tramo que pasa por esa zona, no a todo el conjunto de vías agrupadas bajo ese registro.
- Los sentidos sin marca **siguen sin verificarse**. El experimento permite ambos sentidos en ellos; no afirma que sean bidireccionales en campo. Deben introducirse las restricciones y giros reales antes de calibrar resultados.
- Los ciclos, verdes, amarillos y despejes siguen siendo de prueba. La imagen aporta ubicaciones; no tiempos oficiales.
- Los accesos de la simulación usan demanda sintética. Se ponderan accesos de aproximación a zonas de conflicto, como escenario de estrés; esa ponderación no procede de un aforo.
- Se mantiene la conservación de vehículos y la espera cuando el siguiente tramo está ocupado, incluso en vías sin semáforo.
- Los vehículos frenan antes del cruce controlado. Cuando ya han cruzado la línea de parada, continúan el despeje aunque cambie la fase. Los iconos están ampliados para poder verlos sobre el mapa; no representan dimensiones a escala.

## Imágenes

`public/maps/heredia-referencia.png` conserva la imagen marcada original. `public/maps/heredia-limpia.png` es una edición con la herramienta integrada de imágenes: reduce rótulos comerciales e iconos y quita las marcas pintadas del fondo, manteniendo el encuadre y el trazado. Las flechas y los controles se reconstruyen como elementos interactivos. La geometría de circulación procede del grafo, no de interpretar la imagen generada. El usuario puede activar “Imagen original” para comprobar la correspondencia.

Prompt de edición utilizado:

> Use case: precise-object-edit. Edit target: the supplied marked map screenshot of Heredia, Costa Rica. Produce a cleaned base map for pixel-aligned traffic simulation. CRITICAL INVARIANTS: preserve exact map bounds, aspect ratio, orientation and the exact position/shape of EVERY road, crossing, river, park and railway. Do not redraw, simplify, relocate, invent or crop the road network. Change only clutter: remove business names, shop/restaurant icons, commercial advertisements, hotels, residential development labels and bus stop icons, filling with matching existing map background. Retain small street labels and major geographic landmarks Hospital San Vicente de Paul, Estacion Heredia, Rio Pirro and stadium. Remove the hand-drawn red dots and yellow arrows in this cleaned base ONLY (they will be accurately rebuilt as an interactive overlay in code). Keep the original road colors and very light neutral map background. No added legend, border, dashboard, map elements or decorative graphics. Output a landscape raster map with same framing as input, suitable as the background below exact-positioned overlay vehicles. Accuracy of unchanged geometry is more important than aesthetic changes.

La edición puede simplificar detalles gráficos o rótulos; la referencia original y el snapshot municipal quedan disponibles para revisar y corregir cualquier diferencia. No se modificó `Heredia.png`.
