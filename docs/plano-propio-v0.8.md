# Plano propio · preview local v0.8

El editor se construye con superficies y marcas vectoriales; no carga imágenes en el mapa. Conserva las coordenadas y conexiones de la red municipal disponible para mantener la ubicación de Heredia. El fondo neutro no representa edificios o predios medidos.

Cada tramo admite de cero a tres carriles en cada sentido, con al menos uno en total, y un ancho por carril configurable por tramo. Cero cierra ese sentido para el cálculo de rutas. El sentido contrario puede crearse explícitamente como propuesta si no existía en la referencia. Las flechas y divisiones se dibujan desde esos mismos datos.

La circulación utiliza colas separadas por carril. Los vehículos conservan su carril o confluyen hacia el carril disponible del tramo siguiente por correspondencia de índice. No se simulan adelantamientos ni cambios de carril. Los cupos del receptor consideran el número de carriles; la admisión verifica además la disponibilidad del carril elegido. Las reservas siguen compartidas entre accesos.

Se conservan los semáforos y cedas registrados. Cada acceso permite proponer ALTO, CEDA o paso libre. El ALTO experimental exige un segundo detenido antes de comprobar prioridad; ese segundo es una decisión de simulación, no un plazo establecido por ley. El CEDA propuesto comprueba conflictos y ocupación del cruce; los cedas registrados mantienen las maniobras ya definidas. Las vías del tren se indican esquemáticamente en el cruce ferroviario registrado, sin afirmar ubicación topográfica precisa.

Las líneas de detención, pasos y postes conservan medidas y posiciones editables. Aún no existen agentes peatonales ni fases peatonales: los pasos son geometría propuesta, no una evaluación de seguridad peatonal. El cálculo de conflictos de los cruces sigue siendo aproximado; este plano no sustituye un diseño vial profesional.

Se selecciona una calle haciendo clic en su calzada o con el selector de tramo. Luego se aplica la configuración para reconstruir las trayectorias y reiniciar ambos escenarios. La exportación JSON incluye calles, sentidos, medidas y controles. El borrador vectorial se guarda separado del editor anterior (`lidar-heredia-road-layout-v1-vector`), que se utiliza solo como punto de partida si no existe el nuevo borrador.

La preview se revisó primero en local. El 20 de octubre de 2026 el usuario autorizó commit, push y despliegue en Cloudflare; la versión de publicación es 0.8.0. El editor se abre con `?editor=vial&plano=propio#laboratorio`. Los ajustes personales siguen guardados en cada navegador; para trasladarlos desde local es necesario exportar e importar el JSON. El informe de tres horas v0.7 corresponde a la versión anterior; la versión vectorial dispone de su propia prueba larga en `tests/long-run.test.mjs`.

## Verificación

La batería completa aprobó 63 pruebas sin fallos, incluyendo cinco corridas de tres horas. La corrida del plano vectorial con dos carriles en un tramo completó 3.517 de 5.890 solicitudes; conservó 385 vehículos en la red y 1.988 pendientes. Completó viajes en cada intervalo de quince minutos, sin perder vehículos ni exceder las reservas. Estos resultados validan continuidad del modelo, no una reducción real de la congestión.

También se aprobaron las pruebas de colas independientes por carril, reversión de sentido, configuración de dos más un carril, detención en ALTO, prioridad de CEDA e importación de una geometría dibujada desde el sentido contrario. La compilación del sitio pasó. La preview del navegador avanzó cinco minutos con 158 vehículos visibles, cero imágenes dentro del mapa y sin errores de consola.
