# Pirro: escenarios de prueba 2026

El corredor prioritario se transcribió del recuadro del usuario a `MAP.focusZone`. No se dibuja el recuadro ni las flechas sobre el mapa limpio. El botón «Enfocar Pirro» centra el corredor y el panel muestra vehículos detenidos dentro de él, cruces bloqueados en ese instante y segundos con al menos un bloqueo activo. Este último valor es tiempo de reloj simulado, no la suma de duración de todos los cruces.

## Referencias y demanda

- El estudio de mayo de 2023, sección 5.3, páginas PDF 213–214 (impresas 207–208), identifica problemas en la salida sobre Calle 7 hasta el ferrocarril, la entrada desde Ruta 5, A5C7 y el paso del puente del río Pirro. La sección 3.2, página PDF 27 (impresa 21), informa ventanas de conteo de 5:30–9:00, 10:30–13:30 y 16:00–20:00, en intervalos de 15 minutos.
- Se usan los horarios 6–8 a. m. y 3–5 p. m. que el usuario describe para 2026. El informe de 2023 señala mayor congestión global matutina; el usuario observa ahora mayor severidad vespertina en Pirro. No se confunden ambos contextos.
- El factor 1,2 solicitado es un aumento TOTAL del 20 % de 2023 a 2026. No se aplica como aumento anual compuesto. Demanda efectiva = demanda base × factor.
- La base inicial de 2.000 veh/h es sintética y editable: **no es un aforo extraído del estudio**. El apéndice de aforos no se ha integrado ni agregado numéricamente. No deben sumarse conteos de varios cruces sin descontar vehículos que aparecen en más de uno. Con el factor inicial, la demanda efectiva es 2.400 veh/h para toda la red.
- El escenario matutino dirige inicialmente el 60 % de los viajes a Pirro y el vespertino el 75 %, desde accesos conectados al este (San Pablo) y al sur (Miraflores/San José). Estos porcentajes son supuestos editables, no proporciones medidas. El resto usa los accesos generales y también puede pasar por Pirro. Los destinos, caminos y llegadas se mantienen iguales en ambos controladores antes de que el estado de sus colas produzca decisiones diferentes. La redistribución usa rutas legales de la red y conserva el paso inicial por Pirro de los viajes orientados a ese punto.
- Los 15 minutos iniciales representan una muestra del periodo seleccionado, no una reproducción completa de sus dos horas. Elegir un horario modifica la concentración inicial de viajes, no simula un perfil temporal medido.

## Conductores que bloquean el cruce

La proporción inicial del 15 % es un supuesto de estrés editable entre 0 y 100; no una estimación de la educación vial de la población. Cada vehículo recibe una conducta reproducible a partir de su identificador y la semilla. Se aplica solo a cruces dentro del corredor prioritario.

Un vehículo que respeta el cruce espera antes de la línea de entrada si el siguiente tramo no admite otro vehículo, incluso con verde. Un vehículo que invade puede entrar y quedar detenido dentro del espacio simplificado de cruce. Mientras hay un vehículo atravesado, otras aproximaciones esperan antes de entrar aunque tengan verde. El bloqueo desaparece cuando la salida vuelve a admitir vehículos; el conductor que ya cruzó la línea continúa despejando aunque cambie la señal.

Se trata de ocupación simplificada del cruce, con colas que se propagan hacia atrás. No es una geometría detallada de carriles de giro, una simulación de choques ni una validación de tiempos reales. El modelo no inventa giros obligatorios independientes de los sentidos transcritos. Los sentidos de calles sin referencia legible siguen pendientes de validar.

Los CSV incluyen periodo, demanda base y efectiva, factor, porcentajes de concentración y bloqueo, cola de Pirro, bloqueos activos y tiempo de bloqueo. Los resultados son experimentales: un controlador adaptativo puede mejorar o empeorar el escenario.
