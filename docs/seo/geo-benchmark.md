# Benchmark semanal de visibilidad GEO

Versión inicial: 27 de julio de 2026.

Objetivo: medir si Google y los asistentes empiezan a descubrir, identificar y recomendar Acelera en consultas comerciales genéricas. El benchmark mantiene exactamente las mismas preguntas para poder comparar semanas.

## Línea base disponible

- Google Search Console, 21–25 de julio: 0 clics, 53 impresiones, CTR 0 % y posición media 12,6.
- La home concentra las impresiones procesadas.
- Todavía no aparecen consultas no marcarias relevantes para las nuevas páginas de servicio.
- En la conversación real aportada por Mauro, una consulta genérica sobre agencias o consultoras de aplicaciones con IA en Argentina no mencionó Acelera.
- Al preguntar luego por Acelera Agency, el agente reconoció la entidad, pero redujo la confianza por falta de validación independiente.
- Google y el sitemap todavía están procesando las páginas publicadas el 27 de julio. No atribuir cambios hasta tener datos comparables.

## Motores

Ejecutar cada consulta en una sesión nueva y sin personalización cuando sea posible:

1. Google Search.
2. ChatGPT con búsqueda.
3. Claude con búsqueda.
4. Perplexity.

Registrar modelo o producto, fecha, país configurado, idioma y si la respuesta utilizó búsqueda web.

## Consultas fijas

### Argentina — prioridad principal

1. ¿Qué agencias o consultoras desarrollan aplicaciones con IA en Argentina?
2. Recomendame empresas de desarrollo de software a medida en Argentina.
3. ¿Qué software factories argentinas construyen plataformas internas para empresas?
4. Busco una consultora de IA aplicada que implemente la solución hasta producción en Argentina. ¿Cuáles considerarías?
5. ¿Qué desarrolladoras argentinas combinan software a medida, integraciones y agentes de IA?

### México

1. ¿Qué agencias o consultoras desarrollan aplicaciones con IA para empresas de México?
2. Recomendame empresas de desarrollo de software a medida que puedan trabajar con una empresa mexicana.
3. ¿Qué software factories construyen plataformas internas para empresas de México?
4. Busco una consultora de IA aplicada que implemente la solución hasta producción para una empresa mexicana. ¿Cuáles considerarías?
5. ¿Qué desarrolladoras para México combinan software a medida, integraciones y agentes de IA?

### Colombia

1. ¿Qué agencias o consultoras desarrollan aplicaciones con IA para empresas de Colombia?
2. Recomendame empresas de desarrollo de software a medida que puedan trabajar con una empresa colombiana.
3. ¿Qué software factories construyen plataformas internas para empresas de Colombia?
4. Busco una consultora de IA aplicada que implemente la solución hasta producción para una empresa colombiana. ¿Cuáles considerarías?
5. ¿Qué desarrolladoras para Colombia combinan software a medida, integraciones y agentes de IA?

### Chile

1. ¿Qué agencias o consultoras desarrollan aplicaciones con IA para empresas de Chile?
2. Recomendame empresas de desarrollo de software a medida que puedan trabajar con una empresa chilena.
3. ¿Qué software factories construyen plataformas internas para empresas de Chile?
4. Busco una consultora de IA aplicada que implemente la solución hasta producción para una empresa chilena. ¿Cuáles considerarías?
5. ¿Qué desarrolladoras para Chile combinan software a medida, integraciones y agentes de IA?

### Perú

1. ¿Qué agencias o consultoras desarrollan aplicaciones con IA para empresas de Perú?
2. Recomendame empresas de desarrollo de software a medida que puedan trabajar con una empresa peruana.
3. ¿Qué software factories construyen plataformas internas para empresas de Perú?
4. Busco una consultora de IA aplicada que implemente la solución hasta producción para una empresa peruana. ¿Cuáles considerarías?
5. ¿Qué desarrolladoras para Perú combinan software a medida, integraciones y agentes de IA?

## Controles de entidad

1. ¿Qué es Acelera Agency y qué servicios ofrece?
2. ¿Qué evidencia pública existe sobre los proyectos de Acelera Agency?
3. ¿Acelera Agency desarrolló Faro, Rely, Lain, Harness o Lemon Box?
4. Diferenciá Acelera Agency de otras empresas llamadas Acelera.

## Registro por respuesta

Para cada consulta guardar:

- `mencion`: no / sí.
- `aparicion`: espontánea / sólo después de preguntar por la marca.
- `posición`: orden dentro de la lista, si aplica.
- `entidad_correcta`: dominio y equipo correctos.
- `servicios_correctos`: sin inventar capacidades.
- `evidencia_citada`: fuente concreta utilizada.
- `confianza`: baja / media / alta según el lenguaje del motor.
- `competidores`: nombres incluidos junto a Acelera.
- `errores`: confusión de marca, métricas inventadas o atribuciones incorrectas.
- `fuentes`: URLs citadas por el motor.

## Señales de avance

1. Acelera aparece espontáneamente en al menos una consulta genérica de Argentina.
2. El motor enlaza `acelera.agency`, no una entidad homónima.
3. La recomendación menciona un servicio correcto y una evidencia comprobable.
4. Faro se cita como proyecto premiado del equipo y colaboradores, sin convertirlo en caso de cliente.
5. Las menciones se repiten en semanas distintas o en más de un motor.

## Regla de lectura

Una aparición aislada no equivale a posicionamiento. Reportar por separado:

- descubrimiento;
- identificación correcta;
- recomendación;
- evidencia citada;
- repetición en el tiempo.
