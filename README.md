# Sitio comercial de Acelera

Este paquete contiene la landing pública actual de Acelera y sus páginas legales.

## Páginas activas

- `index.html`
- `privacidad.html`
- `terminos.html`
- `tracking-demo.html`

## Posicionamiento vigente

- Categoría: adopción de IA con criterio.
- Modelo: consultoría e implementación para empresas que necesitan entender si un proceso realmente requiere IA y, si aplica, incorporarla con capacidad transferida al equipo interno.
- Promesa: si el proceso no necesita IA, se dice; si la necesita, se implementa y queda operado por el cliente.

## Configuración rápida

Toda la configuración operativa mínima está centralizada en `assets/app.js`:

- `workingBrand`
- `formEndpoint`
- `calendlyUrl`

El formulario de contacto publica en `/api/lead` y envía la notificación por Resend. En Vercel configurar:

- `RESEND_API_KEY`
- `LEAD_TO_EMAIL` — por ejemplo `contacto@acelera.agency`
- `LEAD_FROM_EMAIL` — remitente verificado en Resend, por ejemplo `Acelera <contacto@acelera.agency>`

Antes de publicar:

1. Confirmar variables de Resend o `calendlyUrl`.
2. Revisar dominio, mail profesional y metadata final.
3. Confirmar que los formularios sigan inyectando `variant`, `utm_source` y la ruta de origen sin parámetros sensibles.
4. Confirmar que el consentimiento de privacidad sea obligatorio y llegue registrado en el correo del lead.
5. Validar la home en mobile y desktop.

## Cómo probar local

1. Desde la raíz del repo ejecutar `npm run dev`.
2. Abrir `http://127.0.0.1:4173/`.
3. Navegar home, términos y privacidad.
4. Probar una URL con UTM, por ejemplo:
   - `http://127.0.0.1:4173/?utm_source=email`
5. Verificar que el formulario muestre mensaje de configuración si faltan variables de Resend.

## Operación de privacidad

- Las consultas que no deriven en una relación contractual deben eliminarse o anonimizarse a más tardar 24 meses después de la última interacción, salvo una obligación legal o necesidad documentada de conservarlas.
- Las solicitudes de acceso deben responderse dentro de 10 días corridos; las de rectificación, actualización o supresión, dentro de 5 días hábiles.
- Antes de cambiar hosting, correo, formularios, analytics o píxeles, actualizar `privacidad.html` y revisar transferencias internacionales.
- Mantener identificado quién accede a `LEAD_TO_EMAIL` y retirar accesos que ya no sean necesarios.
- Completar y mantener al día la inscripción del responsable y de la base de contactos ante el Registro Nacional de Bases de Datos Personales cuando corresponda.
