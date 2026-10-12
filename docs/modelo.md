# Modelo experimental 0.1

## Referencias y alcance

- Imagen local `Captura de pantalla 2026-10-11 201955.png`: Heredia, estación, hospital y río Pirro. Usada para orientar el esquema; no como levantamiento de precisión.
- `estudio_de_impacto_funcional_y_seguridad_vial_mayo2023_fd.pdf`: Consultores Viales S.A., mayo de 2023, Proyecto Bulevar, promotor Municipalidad de Heredia. Documento de 690 páginas, conservado fuera del sitio y del repositorio.
- En el PDF, página 11 (paginación impresa 5), sección 1.4, se describe la predominancia de calles unidireccionales y sentidos alternados en el cuadrante central. El prototipo adopta ese patrón general con direcciones supuestas.
- Páginas 25 y 27 (impresas 19 y 21), secciones 3.1–3.2: el estudio contempla más de 100 intersecciones, aforos por maniobra y cortes de 15 minutos, en periodos de mañana, mediodía y tarde. La versión actual reduce la red a 30 cruces de demostración; no importa ni extrapola esos conteos.
- Las condiciones documentadas en 2023 no se consideran condiciones observadas en 2026. El bulevar y los cambios de prioridad propuestos no se incorporan.

## Parámetros

- Paso físico: 0,2 segundos. La velocidad de reproducción cambia cuánto tiempo simulado avanza, no los parámetros físicos.
- Velocidad libre: 11,11 m/s (40 km/h).
- Aceleración: 2,2 m/s². Desaceleración objetivo: 4,5 m/s², con límite adicional de avance para evitar cruzar obstáculos.
- Longitud física de vehículo: 4,5 m y separación mínima: 2,5 m. Los buses se distinguen visualmente, pero aún comparten la dinámica del automóvil.
- Distancia supuesta: 1,25 metros por unidad del esquema; no es una escala geográfica validada.
- Llegadas: proceso Poisson estacionario, demanda total entre 0 y 5.000 veh/h. Accesos uniformes; destinos elegidos en otro lado del perímetro. No es una matriz origen-destino observada.
- Calles centrales: sentido alternado; perímetro: bidireccional. Un carril por sentido permitido. Las flechas reflejan los sentidos del modelo, no una certificación de la señalización real.
- Cruces libres: admisión cuando hay espacio en la calle siguiente; no incluyen resolución física de conflictos ni reglas de prioridad reales.
- Cruces semaforizados: ejes horizontal y vertical, amarillo de 3 s y despeje de 1 s entre ejes. Un giro puede salir hacia otro eje; no hay fase exclusiva para giro izquierdo.
- Las rutas minimizan tiempo libre más penalización por cantidad de vehículos en cada tramo. El desvío se recalcula en los cruces; se penaliza el retorno al tramo anterior.

## Control adaptativo

Un agente por cruce. Cuatro estados: dominio horizontal, dominio vertical, equilibrado y saturado. Tres acciones: -5, 0 y +5 segundos al verde horizontal. Límites: 25–55 s. Tasa de aprendizaje 0,20; descuento 0,85; exploración 0,10. Recompensa negativa por vehículos detenidos y ocupación cerca de la intersección durante el ciclo previo. La cola de control se cuenta hasta 100 m antes del cruce; un vehículo se considera detenido bajo 0,5 m/s.

La tabla Q empieza en cero con cada reinicio. No existe entrenamiento previo ni garantía de mejora. Los sensores mostrados son ventanas de ocupación alrededor de 65 m y 20 m antes y 35 m después del cruce; no se modela una nube de puntos, oclusión, clima, reflectividad ni detección física de un LiDAR.

## Métricas y comparación

- Generados = completados + en red + pendientes de ingreso; ningún vehículo se elimina por congestión.
- Cola total: vehículos bajo 0,5 m/s más todos los pendientes de ingreso.
- Cola promedio: integral de esa cola dividida por tiempo simulado.
- Espera por viaje: tiempo detenido (incluyendo espera de ingreso) de los viajes completados, dividido por viajes completados.
- Tiempo de viaje: desde la llegada programada al acceso hasta la salida a destino, solo para viajes completados.
- Velocidad: promedio instantáneo de vehículos aún en la red.
- El porcentaje favorable cambia de signo según convenga subir o bajar la métrica; no se calcula cuando la referencia es cero o no hay viajes completados en ambos motores.
- Los dos escenarios comparten exactamente llegadas, tipos de vehículos, orígenes y destinos. Las decisiones de aprendizaje usan otro generador aleatorio.
- Las rutas efectivas pueden diferir porque las colas de cada escenario son distintas.

No sumar conteos de todos los cruces como si fueran vehículos únicos: un mismo viaje puede atravesar varios puntos. No interpretar una espera menor con pocos viajes completados como mejora global sin comprobar colas, pendientes y salidas. Esta herramienta no calcula niveles de servicio oficiales ni efectos de seguridad vial.

## Próxima calibración

Reemplazar el esquema por geometría y maniobras verificadas, cargar aforos por acceso y periodo, incorporar peatones, buses y paradas, medir tiempos de semáforo, y contrastar viajes, colas y salidas con datos de campo. Toda configuración nueva requiere volver a comparar los dos motores con demanda idéntica.
