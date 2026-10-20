# Preview local del editor vial

URL: `http://127.0.0.1:4173/?editor=vial#laboratorio`.

Borrador local v0.7.0. La versión publicada sigue siendo v0.6.1. No se ha hecho commit, push ni deploy de este editor.

Permite elegir una intersección y un acceso, ajustar las dimensiones en metros, arrastrar la línea de detención, el paso propuesto y el poste del acceso elegido, mover el centro del cruce y editar puntos interiores de la calle. «Añadir punto» subdivide el segmento más largo del tramo seleccionado. La geometría editada conserva las conexiones y los sentidos; recalcula longitudes al aplicar. Los dos escenarios reciben la misma geometría y reinician.

La posición de frenado usa la línea configurada y la mitad de la longitud del automóvil para que su frente se detenga antes de la marca. El poste se dibuja por separado. Las rutas y los tiempos de coordinación se recalculan con las longitudes editadas.

Los ajustes se guardan en localStorage de este navegador y pueden exportarse/importarse como JSON. No se suben a un servidor. «Aplicar geometría y reiniciar» actualiza el motor. «+5 min» avanza ambos escenarios sin tener que esperar la reproducción. «Mostrar escenario» permite modificar demanda y parámetros existentes.

Limitaciones de este borrador:
- La escala municipal sobre la imagen es aproximada; no es levantamiento topográfico.
- Las cebras y sus ubicaciones son propuestas, no inventario confirmado de la calle.
- El ancho de carril cambia la representación y la alineación del vehículo; no agrega carriles operativos al motor.
- No se agregaron peatones ni fases peatonales. Los pasos dibujados todavía no consumen tiempos de cruce.
- Se conservan semáforos y cedas previamente referenciados. No se inventan señales ALTO como controles existentes.
- Al mover un centro de cruce, la posición final se aplica a todas las calles conectadas al reiniciar. Las marcas en borrador deben revisarse después de aplicar.

Pruebas: movimiento de cruces sin alterar la red original, inversión de geometría para el sentido opuesto, frenado frente a la marca y rechazo de archivos con medidas inválidas. Se conservan las regresiones de tránsito de más de treinta minutos.
