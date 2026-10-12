# Prioridades de Pirro · v0.4.0

Las siete observaciones del usuario del 12 de octubre de 2026 se transcriben en `data/pirro-movements.json`. No se obtuvieron de una inferencia del estudio de 2023. La red conserva su geometría y sentidos; los cedas actúan sobre una maniobra específica y no sobre toda la calle.

| Punto | Comportamiento incorporado |
| --- | --- |
| 1 | En La Casona, el giro izquierdo desde el ramal de la Hispanoamericana hacia San Pablo espera al flujo que llega desde Miraflores. El cruce ferroviario de prueba está asociado a este punto. |
| 2 | El semáforo superior de Pirro controla oeste → este y sur → norte. El giro derecho este → norte tiene ceda independiente de la fase del semáforo; espera a los movimientos con prioridad, incluso con luz verde para otro flujo. |
| 3 | La entrada oeste → norte espera al flujo directo sur → norte. |
| 4 | Desde el sur se puede continuar al norte o girar a la izquierda hacia el centro y San Joaquín. La red ya contiene ambas salidas. No se inventó un porcentaje medido de reparto entre ellas. |
| 5 | Los buses que llegan por el acceso oeste giran a la derecha, hacia el ramal de la Hispanoamericana. Ese giro tiene ceda al tráfico norte → sur. Los servicios sintéticos originados al oeste tienen destino al sur por Miraflores; el resto de buses mantiene viajes genéricos. |
| 6 | Se añade el semáforo del costado oeste, que alterna el flujo norte → sur y el oeste → este. Ahora hay diez semáforos. Sus tiempos siguen siendo de prueba. |
| 7 | En el cruce oeste superior, el ingreso oeste → este cede al flujo norte → sur. |

## Modelo de paso

El ceda comprueba la aproximación del vehículo con prioridad, si puede avanzar según su señal y el espacio disponible, y la ocupación reciente del cruce. La separación inicial es **4 segundos**, un parámetro de prueba en el archivo de reglas. No representa un tiempo medido en campo. Si no hay espacio, la cola se propaga hacia atrás. Cuando el vehículo ya entró, conserva la maniobra y despeja el cruce; no cambia de dirección dentro de él. Los viajes de buses se calculan teniendo en cuenta la arista de entrada, por lo que una redistribución tampoco puede saltarse el giro obligatorio descrito.

Los vehículos ya dentro de un cruce pueden seguir sujetos al bloqueo de su salida descrito en `pirro-2026.md`. El modelo no representa choques ni conflictos físicos detallados entre trayectorias.

## Tren

«Simular paso del tren» permite activar o desactivar un cierre periódico. Los valores iniciales son primer paso a los 120 s, intervalo de 600 s y cierre de 45 s. Son **eventos sintéticos editables, no horarios de operación ni una medición de frecuencia ferroviaria**. La barrera virtual se sitúa 18 m antes del nodo del punto 1 en sus aproximaciones. Es una aproximación funcional, no un levantamiento de ubicación de rieles o barreras.

El tren detiene antes del cruce a los vehículos que aún no ingresaron. Los que ya pasaron la barrera virtual continúan despejando. Cuando termina el cierre, los vehículos vuelven a someterse al ceda y al espacio de salida: la cola no desaparece automáticamente.

## Revisión y exportación

La página muestra los cinco cedas, el nuevo semáforo y una lista seleccionable de los siete puntos. El panel de Pirro incluye vehículos esperando en cedas, estado del cruce ferroviario y vehículos esperando por tren. Los CSV agregan esos conteos, espera acumulada en vehículo-segundos y los parámetros ferroviarios usados.

Las pruebas verifican cada prioridad contra su flujo principal y tras liberarse el espacio, el giro con ceda en fase roja, la restricción de buses al calcular o redistribuir rutas y el cierre/despeje del tren. Se mantienen las comprobaciones de conectividad, conservación de vehículos y separación en los carriles.
