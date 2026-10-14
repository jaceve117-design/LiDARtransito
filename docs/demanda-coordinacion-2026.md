# Demanda por hora y coordinación · v0.5.0

## Observaciones y estimación

El TPDA del MOPT para la estación 125, entrada/salida de Heredia en el puente del río Pirro, es **27.534 pasos diarios en 2019**. No es el total de vehículos únicos de Heredia ni un conteo actual.

El cuadro 2.5 del [Anuario estadístico del sector transporte 2024](https://repositorio.mopt.go.cr/bitstreams/c12904ff-adce-4ba1-ada3-923b9450cf33/download), página física 32 / impresa 21, usa una misma definición INS: vehículos que cumplieron las obligaciones de pago. Total 2019: **1.565.811**; 2024: **1.887.571**. No se mezclan marchamos puestos al cobro, inscripciones nuevas ni vehículos únicos con viajes diarios.

- Crecimiento anual compuesto: `g = (1887571 / 1565811)^(1/5) - 1 = 3,80847%`.
- Escenario 2026: `D = 27534 * (1887571 / 1565811)^(7/5) = 35768,345 pasos/día`.
- Escenario 2024: `D = 27534 * 1887571 / 1565811`.
- Escenario 2019: `D = 27534`.

2025 y 2026 se extrapolan; no son inventarios observados. El crecimiento nacional sirve como **proxy de demanda local**, suponiendo igual crecimiento proporcional y sin estimar una cuota provincial nueva. No demuestra que el tránsito de Pirro haya crecido así. Las motocicletas están incluidas en el total nacional y el aforo base no se desagrega por tipo. La simulación todavía simplifica vehículos a autos/buses, con 12% de buses sintético. El anterior multiplicador ×1,2 deja de aplicarse en este modo. Solo sigue disponible en el escenario libre.

El aforo histórico está en el [Anuario de tránsito 2024](https://repositorio.mopt.go.cr/bitstreams/a22e3b10-ec6f-4d87-8a3d-fd3d9e71d93e/download), estación 125, año de conteo 2019. El portal [TPDA](https://tpda.mopt.go.cr/transito/tpd.php) usa `cod_reg=44` para esta estación, no `cod_reg=125`.

## Horarios

Se toma el cuadro 40 del [Anuario de tránsito 2016](https://repositorio.mopt.go.cr/bitstreams/409ea570-d404-4eb8-999b-963a70cf1818/download), E9 La Puebla, Ruta 5, página física 38 / impresa 29. Es un perfil cercano **histórico**, no el perfil medido de Pirro 2026 ni una distribución específica de días hábiles. El porcentaje máximo es 9–10 (5,64%). Se conserva la observación del usuario sobre mayor congestión local de 6–8 y 15–17; congestión no es sinónimo de mayor porcentaje de volumen.

Las 24 participaciones publicadas suman 100,02% por redondeo. Se normalizan por su suma. `veh/h = D * participación_hora`. Una ventana 6–8 integra separadamente las horas 6–7 y 7–8; no usa un 5% para las dos horas juntas. También se integran fracciones de hora y cambios de día.

La duración define cuánto se observa desde la hora inicial elegida. Seleccionar una franja propone su hora inicial; para observarla completa elegir 2 o 3 horas según corresponda. Una prueba de 15 minutos a las 15:00 en 2026 solicita **499** vehículos; la hora completa solicita **1.995**. Las llegadas se espacian con variación reproducible por semilla, con número total igual al integral redondeado. Son solicitudes, no garantías de ingreso o salida: la falta de espacio mantiene vehículos pendientes fuera del mapa.

## Reparto de viajes y dispersión

El aforo de referencia corresponde a ambos sentidos. La demanda total se solicita una sola vez, no se aplica por cada acceso o semáforo. El reparto de prueba es 75% hacia el norte en la tarde, 60% en la mañana y 50% en otras franjas; editable. No es un reparto observado por el MOPT.

Los viajes hacia el norte se originan en los accesos este/sur, pasan por el semáforo principal de Pirro y alcanzan el nodo `mh-50`, extremo oriental del sector Calle 7 / Avenida 5 según la alineación de la referencia. Desde allí siguen a destinos de borde al oeste (45%), norte (35%) o este (20%). Este reparto es supuesto y editable. Las calles y giros válidos determinan la ruta; no se obliga a girar físicamente hacia el oeste en una calle que no lo permite. Los viajes de salida desde norte/oeste pasan por el control occidental `mh-726` y terminan al sur, en Miraflores/San José. Es una aproximación del área de influencia de Pirro, **no una reconstrucción exacta de la sección de aforo 125**.

El contador «distribuidos» cuenta viajes que alcanzaron la zona norte, no viajes completados. Siguen ocupando calles hasta alcanzar su destino. No se elimina una cola al llegar a Avenida 5. Los cedas, los giros obligatorios de buses, el tren sintético y los sentidos del usuario se conservan. La redistribución por congestión opera después de los puntos de paso obligatorios, para evitar saltárselos.

## Coordinación y adaptación

El comparador fijo conserva tiempos independientes. El adaptativo ahora usa tres corredores de ciclo común:

1. Pirro: ingreso desde San Pablo → Pirro principal → ramal de salida hacia San José. Se puede priorizar Miraflores en el primer control. El eje inicial puede ser E–O y el siguiente N–S; se coordinan movimientos de viaje, no colores de ejes idénticos.
2. Entrada oeste / centro: acceso oeste → cuatro controles del corredor central.
3. Calle 16: dos controles hacia el sur.

Se usan caminos dirigidos válidos de la red municipal. `desfase = distancia acumulada / velocidad de coordinación`. Con 30 km/h, entre ingreso de San Pablo y Pirro principal hay 314,335 m y **37,72 s**. El ramal hacia San José tiene otros 460,42 m y 55,25 s adicionales. Los desfases mayores al ciclo equivalen al mismo desfase módulo ciclo. No se inventan semáforos al norte.

Cada corredor comparte un verde prioritario. Al comienzo de cada ciclo común se compara la cola principal y transversal agregada: aumenta o disminuye hasta 5 s, manteniendo al menos 25 s para cada eje. Si todas las salidas de un control están ocupadas, su presión de entrada pesa menos. El plan se **aplica en el siguiente inicio local de ciclo**, sin interrumpir una fase para saltar de verde a rojo. Siempre hay 3 s de amarillo y 1 s de todo rojo entre ejes. Durante un cambio de plan puede haber una transición de un ciclo entre miembros del corredor.

Se coordina un sentido prioritario; no se promete onda verde simultánea para sentidos opuestos ni para todos los giros. La velocidad libre del movimiento sigue en 40 km/h y la velocidad de coordinación es un supuesto editable entre 10 y 40. Aceleraciones, cedas, trenes, giros y colas pueden hacer perder la banda de verde. La admisión sigue dependiendo del espacio real en la calle siguiente; los conductores que invaden la caja pueden bloquear el cruce en ambos escenarios. Esto es adaptación por presión de colas y coordinación determinista; **no Q-learning**, ni una implementación conectada a equipos físicos.

## Verificación y exportación

Se comprueban la fórmula, integración horaria, llegada exacta compartida, rutas conectadas sin retorno inmediato, restricciones de buses, conservación, separación vehicular, continuidad tras dispersarse, desfases por distancia y aplicación de planes con despeje. Las exportaciones registran referencia histórica, escenario de estimación, demanda por hora, semilla, reparto, coordinación y los resultados al mismo tiempo. El CSV de coordinación contiene decisiones y desfases, reemplazando las tablas Q de la versión anterior.

Una mejora de una métrica no implica mejora de todas. No se escogen semillas o se cambian tiempos para fabricar un beneficio; la tabla puede mostrar empeoramientos. La validación de campo requiere aforos recientes por sentido, giro y hora, tiempos semafóricos, pasajeros/buses y capacidad de salidas.

## Ejemplo observado en esta versión

Escenario inicial del navegador: 2026, 15:00, 15 minutos, semilla 42, 75% norte, 45/35/20 de destinos, ciclo 90 s, verde base 35 s, onda a 30 km/h priorizando San Pablo, bloqueo 15% y tren cada 600 s con 45 s de cierre desde el segundo 120. Se solicitan 499 viajes compartidos. El fijo completa 133 y el coordinado 147 (+10,5%); cola media 73,3 frente a 66,8 vehículos (8,9% menor). Hay todavía 326 viajes dentro y 26 pendientes en el coordinado. Se distribuyeron 149 al llegar al sector norte; esto no significa que todos hayan salido. Es un resultado de ese escenario sintético, no una predicción de mejora en Heredia ni una validación estadística con múltiples aforos.

Prueba extendida con los mismos parámetros durante **90 minutos**, cruzando de 15:00 a 16:00: 2.986 solicitudes, conservación comprobada en cada paso. El fijo completa 1.000 y el coordinado 727; cola media 806,22 frente a 910,54. El coordinado **empeora** bajo esta carga prolongada, con bloqueo de cajas, cedas y capacidad limitada. La mejora del ensayo corto no se generaliza. Esta versión implementa la demanda y coordinación solicitadas como laboratorio: requiere calibración con datos reales y desarrollo adicional de protección ante saturación antes de recomendar tiempos de calle. No es evidencia de ahorro para un caso financiero ni un resultado del piloto 5G.
