# Validación de tres horas · preview local v0.7.0

## Fallo reproducido

La preview anterior con semilla 42 dejó de completar viajes después de unos 75 minutos: se quedó en 541 viajes. No era únicamente un problema de color o de actualización de la pantalla.

## Correcciones

- Una salida cerrada esperaba tres cupos para reabrir, aunque ya pudiera recibir un carro. Ahora puede reabrir con espacio suficiente para el vehículo después de una espera de reposición máxima de cinco segundos. Un bus que requiere tres cupos no bloquea por sí solo a los carros que requieren uno. Nunca se autoriza entrar sin los cupos necesarios.
- Las entradas sin semáforo y las entradas desde el borde respetan los espacios ya reservados por otros vehículos.
- Un vehículo detenido dentro de un cruce ya no bloquea la circulación recta del carril opuesto cuando ambos movimientos no se intersectan. Los giros, movimientos perpendiculares y movimientos que comparten salida conservan el conflicto. Los vértices que solo forman la geometría de una calle no se tratan como cajas de intersección.
- La distribución posterior a Calle 7 / Avenida 5 evita regresar por Pirro y La Casona. La red municipal disponible no conecta directamente esa salida con los extremos orientales sin ese regreso: se utiliza un extremo noreste existente, identificado como aproximación E–NE. Esto corrige una asignación de rutas; no demuestra una mejora real de tránsito ni representa una medición de destinos.

## Ensayo reproducible

Duración: 10.800 segundos, 54.000 pasos. Demanda estimada desde las 15:00, año 2026, participación Pirro 75 %, bloqueo de cruces 15 %, tren activo cada diez minutos durante 45 segundos. La geometría de prueba es la propuesta inicial del editor; modificaciones guardadas por el usuario pueden producir resultados distintos.

El ensayo coordinado de la preview, semilla 42, completó 3.517 viajes y siguió completando viajes en cada intervalo de quince minutos; completó 305 en el último. Quedaron 385 vehículos en la red y 1.988 pendientes de ingresar, de 5.890 generados. Persiste saturación: este ensayo valida continuidad y conservación, no ausencia de congestión.

El archivo `ensayo-180-min-preview-v0.7.0.json` conserva los resultados de ese ensayo. `node scripts/diagnose-long-run.mjs --preview --tag=revision` permite repetir el diagnóstico. Los resultados detallados se guardan fuera del sitio, en la carpeta de trabajo `output/diagnostics`.

`tests/long-run.test.mjs` cubre dos semillas de preview, la geometría base y el controlador fijo durante tres horas. Comprueba progreso por intervalos, conservación de vehículos, posiciones finitas, separación y que las reservas no excedan el almacenamiento disponible. En el modo coordinado comprueba servicio en los semáforos principales durante los últimos quince minutos.

Resultado de la batería completa: **57 pruebas aprobadas, cero fallos**. Preparación del sitio (`npm run build`) aprobada.

| Ensayo de 180 minutos | Generados | Completados | En red | Pendientes |
| --- | ---: | ---: | ---: | ---: |
| Preview coordinada, semilla 42 | 5.890 | 3.517 | 385 | 1.988 |
| Preview coordinada, semilla 7 | 5.890 | 3.572 | 320 | 1.998 |
| Geometría base coordinada, semilla 42 | 5.890 | 3.814 | 357 | 1.719 |
| Preview fija, semilla 42 | 5.890 | 3.366 | 368 | 2.156 |

Los cuatro ensayos completaron viajes en cada ventana de quince minutos. La prueba de geometría base cambia distancias de detención: no se debe atribuir su diferencia de resultados únicamente al algoritmo semafórico.

## Lectura del rojo

La preview muestra fase, tiempo en fase, motivo y cupos del tramo receptor. Un rojo mientras el receptor está lleno puede ser una retención correcta. El límite de cinco segundos corresponde a la espera de reposición cuando ya hay espacio utilizable; no es un límite para todos los rojos ni obliga a enviar vehículos hacia una salida ocupada.

La ejecución del navegador también completó 180:00 / 180:00 sin errores de consola. Toda esta revisión permanece en local; no se publicó en Cloudflare.
