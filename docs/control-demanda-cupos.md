# Control por demanda y cupos - v0.6.0

El modo adaptativo incorpora actuación por demanda y reservas de capacidad compartidas. Está activado por defecto. Desactivar «Control por demanda y cupos» recupera la coordinación por tiempos v0.5. El comparador fijo conserva sus fases independientes. Ambos usan las mismas solicitudes, destinos, tren y porcentaje de invasión de cruces.

## Fases y lotes

- Mantener el verde si hay flujo útil y no hay demanda transversal.
- Registrar demanda aproximándose dentro de 180 m y avisos del cruce anterior cuya llegada se prevé en los siguientes 8 s.
- Verde mínimo inicial: 10 s; máximo con demanda contraria: 60 s; espera objetivo: 60 s; ausencia de demanda durante 3 s permite solicitar cambio.
- Máximo inicial de 10 **vehículos autorizados** por lote. El contador baja cuando se autoriza la entrada cerca de la línea de parada, una sola vez por vehículo y cruce. No significa que hayan terminado de cruzar ni que existan diez espacios garantizados.
- Al cerrar un lote, atender primero el otro eje si tiene demanda y salida viable. Si solo hay demanda de un eje puede volver a atenderse tras el despeje.
- Cada cierre pasa por amarillo de 3 s y todo rojo de 1 s. Los vehículos ya autorizados dentro del cruce continúan; el cupo no produce un rojo instantáneo.
- Si ambas entradas tienen demanda pero no espacio receptor, el cruce queda retenido en rojo tras el despeje. Los controles de salida siguen atendiendo su propia demanda: no se ordena rojo a todos los semáforos del corredor.
- La espera objetivo no puede garantizarse cuando la salida está bloqueada. La lógica no incluye todavía peatones ni programación para equipos de calle.

## Capacidad y reservas

Cada arista representa un carril dirigido. Capacidad geométrica de referencia: `floor(longitud / (4,5 + 2,5))`, al menos uno. Se resta un margen de hasta 2 espacios, limitado al 15% entero de esa capacidad, para no inutilizar enlaces cortos. Un automóvil ocupa una unidad y un bus reserva tres unidades conservadoras. Esto es una aproximación de almacenamiento; el movimiento longitudinal del motor conserva su simplificación anterior de longitudes.

Antes de autorizar la línea de parada se comprueba la ruta hasta el siguiente semáforo, borde o primer tramo que complete al menos 600 m. Se reserva capacidad en cada tramo receptor de esa ruta. Cada reserva pertenece a un vehículo y se comparte globalmente entre accesos. `disponibles = capacidad útil - ocupados - reservas de vehículos en camino`, con mínimo cero.

Los conectores geométricos de menos de 21 m no se consideran depósitos independientes para esta reserva: tratarlos como una calle completa impediría permanentemente el paso de buses. Se conserva la comprobación física de separación y entrada inmediata en esos enlaces. La tabla permite observar sus ocupaciones, pero no se les exige el umbral de reserva de una calle de almacenamiento.

Al entrar a una arista, su reserva se convierte en ocupación, sin doble conteo. Las reservas de tramos posteriores permanecen hasta alcanzarlos. La ruta comprometida no se cambia mientras quedan reservas. Las reservas se limpian al terminar el viaje. Cuando un tramo agota espacio, se espera a recuperar al menos 3 unidades (o su capacidad útil si es menor) antes de reabrir: evita cierres y reaperturas continuos por un único hueco.

Las entradas no semaforizadas y los vehículos que ya estaban en la red también ocupan espacio y pueden consumir capacidad prevista; el controlador vuelve a comprobar el espacio disponible, sin asumir que una predicción garantiza la recepción. No modela todos los conflictos físicos de giros. La retención preventiva opera en los semáforos controlados; no modifica los cedas ni añade semáforos nuevos.

## Coordinación

Cada autorización calcula una llegada estimada al siguiente control con la longitud de la ruta y la velocidad de coordinación elegida. Ese aviso solicita una ventana de servicio antes de la llegada. La salida también considera su propia cola, demanda transversal y espacio receptor. Es coordinación dinámica con predicción, no una promesa de pasar siempre sin detenerse. La tabla antigua de desfases sigue como referencia vial; sus tiempos gobiernan solo al desactivar el modo por cupos. Ciclo y verde base quedan deshabilitados en el formulario con el modo nuevo; se usan los parámetros propios del control actuado.

## Interfaz y exportaciones

«Demanda, lotes y espacio disponible» muestra lote restante del cruce seleccionado, vehículos retenidos, unidades reservadas para vehículos en camino y almacenamiento por tramo. Las reservas globales cuentan una vez cada vehículo en camino, aunque pueda tener varios tramos futuros reservados. La tabla sí muestra cada reserva en el tramo donde será usada.

El CSV general añade modo de cupos, parámetros, vehículos autorizados y reservas. «Fases / coordinación CSV» exporta las transiciones reales y el motivo (lote completo, espera transversal, salida ocupada o ausencia de demanda). Con el modo anterior exporta sus planes por corredor.

## Verificación

34 pruebas: se conservan las 26 previas y se agregan mantenimiento del verde útil, cierre por lote con despeje, retención de entradas, atención transversal, aviso anticipado, reserva compartida, cupo de buses y conservación/espaciado durante ejecución. El ensayo de 90 minutos con parámetros explícitos está en `ensayo-cupos-v0.6.0.json`; incluye viajes pendientes y dentro de la red, sin retirar vehículos por saturación. Los resultados son del modelo sintético y pueden mejorar o empeorar respecto del fijo. No representan rendimiento de sensores físicos ni beneficio comprobado de 5G.

Resultado del ensayo de 90 minutos, semilla 42, demanda estimada 15:00 y 75% hacia el norte: 2.986 solicitudes. El fijo completó 1.000 viajes y el modo por cupos 226, con cola media 806,22 frente a 1.258,33. El modo nuevo **empeora este escenario de saturación prolongada**; requiere ajustar la estrategia de almacenamiento y restricciones de salida. La interfaz y los CSV muestran el resultado sin ocultarlo. Se publica como modo experimental para las pruebas solicitadas, con opción de volver al control por tiempos; no como optimización demostrada.
