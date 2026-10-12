# Medición de campo: propuesta para un piloto de 30 días

Esta es una propuesta de arquitectura. No hay equipos conectados, receptor remoto, almacenamiento de mediciones ni control de semáforos reales implementados en la versión 0.1.

## Estaciones

Sensor comercial LiDAR (marca por definir) → computador local (Raspberry Pi u otro dispositivo dimensionado después de probar el sensor) → módem/router celular 4G/5G con SIM → receptor remoto HTTPS o MQTT con TLS → almacenamiento y panel de datos reales.

La Raspberry Pi es la unidad de proceso; no sustituye al sensor óptico. Para un prototipo económico puede evaluarse un LiDAR de menor capacidad, pero la viabilidad depende del alcance, campo de visión, tasa de lectura y condiciones exteriores. No se ha elegido ni cotizado hardware. La capacidad de procesar nubes de puntos 3D deberá medirse antes de seleccionar el computador.

Ouster como referencia de tráfico e infraestructura: https://ouster.com/industry/smart-infrastructure y https://ouster.com/products/software/blue-city. Comparar otras opciones con mediciones y criterios equivalentes; no declarar compatible ningún modelo sin probar su SDK y salida de datos.

## Datos preliminares

Cada estación propone generar agregados por intervalo, separados del simulador:

```json
{
  "schema_version": "1.0",
  "station_id": "HER-PIRRO-01",
  "interval_start_utc": "2026-10-12T00:00:00Z",
  "interval_seconds": 60,
  "approach_id": "PIRRO-OESTE",
  "source": "FIELD",
  "vehicle_count": 0,
  "mean_speed_mps": null,
  "queue_vehicle_estimate": null,
  "coverage_ratio": 0.0,
  "sensor_model": "POR_DEFINIR",
  "calibration_version": "POR_DEFINIR"
}
```

El ejemplo no es un registro real. Mantener UTC en recepción y mostrar America/Costa_Rica en pantalla. En ausencia de cobertura, velocidad y cola desconocidas son `null`, no cero. Una ventana sin comunicación no significa una calle vacía.

## Piloto

1. Validar una estación con conteo manual simultáneo antes de desplegar varias.
2. Elegir puntos que permitan medir entradas, salidas y tramos congestionados, con posición y orientación registradas.
3. Registrar 30 días, incluir franjas pico y valle, anotar mantenimiento, cortes eléctricos y pérdidas de conexión.
4. Guardar localmente cuando falle la red y reenviar lotes con identificadores que eviten duplicados. Sincronizar relojes.
5. Transmitir principalmente agregados; dimensionar tráfico celular después de medir el volumen. Guardar muestras de nube de puntos para calibración solo cuando sea necesario.
6. Medir errores de conteo, clasificación, velocidad y cola frente a observación manual. Solo después usar esos datos para calibrar la simulación.

Los conteos por estaciones son observaciones locales. Para inferir rutas completas y orígenes/destinos hace falta otro método de asociación entre estaciones, con análisis de precisión y privacidad. Colocar varios LiDAR no reconstruye automáticamente el recorrido individual de todos los vehículos.

Los datos de campo y los datos sintéticos deben conservar etiquetas distintas. Las estaciones sirven primero para medir; no se propone actuar sobre semáforos reales en este piloto.
