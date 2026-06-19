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
3. Confirmar que formularios sigan inyectando `variant` y UTM correctamente.
4. Validar la home en mobile y desktop.

## Cómo probar local

1. Desde la raíz del repo ejecutar `npm run dev`.
2. Abrir `http://127.0.0.1:4173/`.
3. Navegar home, términos y privacidad.
4. Probar una URL con UTM, por ejemplo:
   - `http://127.0.0.1:4173/?utm_source=email&utm_medium=outbound&utm_campaign=diagnostico_q2`
5. Verificar que el formulario muestre mensaje de configuración si faltan variables de Resend.
