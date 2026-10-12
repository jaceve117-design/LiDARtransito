# Mapa de referencia y red vial 0.4

## Fuentes

- `Heredia.png`, imagen marcada por el usuario el 11 de octubre de 2026. Los nueve puntos rojos son los puntos de control tomados para esta prueba. Las flechas amarillas fueron la referencia inicial, sustituida para los sentidos por la nueva imagen de flechas rojas. No son mediciones de volumen.
- Red Vial Tramos MH, Municipalidad de Heredia: https://sig.heredia.go.cr/server/rest/services/UTGV/RedVIalTramosMH/MapServer/0. Se descargó una instantánea pública de geometrías en Web Mercator, con campos de nombre, longitud, tipo de vía y dirección. El campo `SENTIDO_CARRIL` estaba vacío en los 1.044 registros consultados. Esta capa no se interpretó como un inventario de semáforos.
- Se revisaron servicios públicos de UTGV, Ingeniería y Policía Municipal, y resultados públicos del MOPT. No se obtuvo un inventario completo, actualizado y verificable de semáforos y ciclos para el área. Las solicitudes de contraste a OpenStreetMap no devolvieron datos utilizables; no se incorporaron datos de esa fuente.

El anexo A del estudio de mayo de 2023 contiene la certificación DVT-DGIT-2023-142 del Departamento de Semáforos, fechada el 31 de marzo de 2023 (páginas PDF 233–236, impresas 227–230). Incluye planes de Av. 7 y Calle 9; Av. 1 y Calle 9; Av. 6 y Calle 9; Av. 20 y Ruta 3, La Fosforera; y Av. 14 entre calles 10 y 12. Se conserva como referencia histórica, sin declarar vigentes esos planes ni añadir semáforos actuales por inferencia.

## Alineación y topología

La geometría municipal se alineó con las calles de la imagen original usando una transformación de escala y desplazamiento, guardada en `data/map-registration.json`. No se reorganizó la ciudad como una malla regular. La transformación se estimó sobre píxeles de vialidad de la referencia; es una alineación visual para este experimento, no una certificación topográfica.

Los nueve puntos de control se asociaron a cruces próximos de la geometría municipal. La diferencia visual entre marca y cruce fue de 0,9 a 6,1 píxeles en un lienzo de 2.048 × 1.033. En v0.3.2, el usuario corrigió el control antes situado en la confluencia sur de Ruta 5: se trasladó al cruce inmediatamente al norte donde entra el ramal desde San Pablo, en (1008, 617,32) del mapa base. Se mantienen nueve controles; el cruce anterior queda libre y el semáforo superior de acceso al centro conserva su ubicación. Se conserva la imagen original para comparar.

La red reconstruida contiene 975 tramos, 671 nodos topológicos y 34 accesos en los bordes. Los nodos incluyen cruces y extremos de vías; **671 no significa 671 intersecciones semaforizadas**. Las líneas siguen las polilíneas municipales, con sus curvas y conexiones. Los accesos también incluyen extremos de rutas nacionales dentro de la imagen, donde termina la cobertura municipal, para representar las aproximaciones del este. No se usan todos los callejones internos como generadores de demanda. Solo se simula el componente conectado; los fragmentos desconectados no reciben viajes. Las calles visibles en el mapa base fuera del área cubierta por esa red no tienen tráfico simulado inventado.

Se guardó el snapshot con los campos públicos necesarios en `data/municipal-roads.json`. Se puede regenerar el grafo sin conexión con:

```sh
node scripts/prepare-network.mjs
```

## Sentidos, puntos rojos y flujos

- Se conservan los nueve controles de la referencia inicial y se añade el semáforo del costado oeste confirmado por el usuario el 12 de octubre (diez en total). Los cinco cedas se aplican por movimiento, según `data/pirro-movements.json`; no se convierten en semáforos.
- La nueva imagen de Google Maps anotada por el usuario se transcribió a 31 corredores en `data/direction-reference.json`. Incluye las flechas rojas y flechas pequeñas legibles del mapa. Se alinea con la geometría municipal mediante `data/direction-reference-registration.json` (distancia media aproximada a píxeles viales: 1,0 px). El emparejamiento comprueba proximidad, orientación y cobertura de la polilínea, no solo el extremo de una flecha.
- El ramal junto a la Hispanoamericana circula al sur hacia La Casona de Laly; el ramal paralelo circula al norte hacia Pirro. La aproximación superior desde San Pablo circula hacia Pirro; la salida inferior de Ruta 5 se orienta al este según la imagen. El tramo La Casona–Miraflores conserva un carril por sentido. Las flechas opuestas crean dos carriles independientes, uno por sentido, no dos carriles en la misma dirección.
- Los sentidos sin marca **siguen sin verificarse**. El experimento permite ambos sentidos en ellos; no afirma que sean bidireccionales en campo. Deben introducirse las restricciones y giros reales antes de calibrar resultados.
- Los ciclos, verdes, amarillos y despejes siguen siendo de prueba. La imagen aporta ubicaciones; no tiempos oficiales.
- Los accesos de la simulación usan demanda sintética. Se ponderan accesos de aproximación a zonas de conflicto, como escenario de estrés; esa ponderación no procede de un aforo.
- Se mantiene la conservación de vehículos y la espera cuando el siguiente tramo está ocupado, incluso en vías sin semáforo.
- Los vehículos frenan antes del cruce controlado. Cuando ya han cruzado la línea de parada, continúan el despeje aunque cambie la fase. Los iconos están ampliados para poder verlos sobre el mapa; no representan dimensiones a escala.

## Imágenes

`public/maps/heredia-referencia.png` conserva la imagen marcada original. `public/maps/heredia-limpia.png` es una edición con la herramienta integrada de imágenes: reduce rótulos comerciales e iconos y quita las marcas pintadas del fondo, manteniendo el encuadre y el trazado. Solo se dibujan los vehículos y los controles interactivos sobre el mapa limpio. Las flechas de referencia se utilizan para los sentidos de circulación, sin mostrarlas; tampoco se superponen líneas de la red municipal. Las capas de colas y sensores son opcionales y empiezan desactivadas. La geometría de circulación procede del grafo, no de interpretar la imagen generada. El usuario puede activar “Imagen original” para comprobar la correspondencia.

Prompt de edición utilizado:

> Use case: precise-object-edit. Edit target: the supplied marked map screenshot of Heredia, Costa Rica. Produce a cleaned base map for pixel-aligned traffic simulation. CRITICAL INVARIANTS: preserve exact map bounds, aspect ratio, orientation and the exact position/shape of EVERY road, crossing, river, park and railway. Do not redraw, simplify, relocate, invent or crop the road network. Change only clutter: remove business names, shop/restaurant icons, commercial advertisements, hotels, residential development labels and bus stop icons, filling with matching existing map background. Retain small street labels and major geographic landmarks Hospital San Vicente de Paul, Estacion Heredia, Rio Pirro and stadium. Remove the hand-drawn red dots and yellow arrows in this cleaned base ONLY (they will be accurately rebuilt as an interactive overlay in code). Keep the original road colors and very light neutral map background. No added legend, border, dashboard, map elements or decorative graphics. Output a landscape raster map with same framing as input, suitable as the background below exact-positioned overlay vehicles. Accuracy of unchanged geometry is more important than aesthetic changes.

La edición puede simplificar detalles gráficos o rótulos; la referencia original y el snapshot municipal quedan disponibles para revisar y corregir cualquier diferencia. No se modificó `Heredia.png`.

Ver `docs/pirro-2026.md` para los escenarios de hora pico, el factor de demanda y el bloqueo de cruces. La nueva imagen de direcciones no se distribuye ni se utiliza como mapa base.

En v0.4.0 se incorporan las siete observaciones detalladas de prioridad, el décimo semáforo y el tren: [prioridades-pirro.md](prioridades-pirro.md). Las referencias históricas de nueve controles describen las versiones anteriores.
