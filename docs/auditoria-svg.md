# Auditoría del dibujo SVG — 20 de octubre de 2026

Cambio local en road-scene.js. Conserva las coordenadas operativas del simulador.

- Bordes y asfalto en capas globales: los bordes de un tramo ya no atraviesan el pavimento vecino.
- Extremos rectos y uniones poligonales: eliminan los abultamientos de tapas redondas en cruces T.
- Intersección de segmentos desplazados para mantener separación de líneas al doblar; límite de inglete para ángulos agudos.
- Separadores interrumpidos antes de intersecciones de tres o más tramos.
- Selección mediante resaltado transparente, sin cambiar el color base del pavimento por tramo.

Validación: ocho pruebas de geometría, carriles y prioridades aprobadas; build correcto. Inspección visual en navegador de Pirro ampliado y vista general. En la primera inspección se encontraron tapas abultadas y se corrigieron antes de la segunda inspección.

Alcance: no es un levantamiento topográfico ni se han revisado individualmente los 975 tramos. Los anchos y posiciones de marcas siguen siendo editables/propuestos. No se modifican la lógica semafórica ni las rutas. No se repiten las pruebas de tres horas porque el cambio se limita al renderizado SVG.
