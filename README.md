# Valmont · Josserand

Proyecto universitario. Valmont es una marca ficticia: este sitio no vende productos ni envía datos.

## Páginas

- `index.html`: sitio de marca de Valmont, con la página de producto de la Josserand en `index.html#josserand`.
- `josserand.html`: landing page independiente de la Josserand. No tiene enlaces que salgan de la página. Su única acción es crear una cuenta, confirmarla con un código por WhatsApp y probarse el reloj en 3D con la cámara.

## Prueba virtual en 3D

- El reloj es un modelo 3D hecho con three.js (recreación ilustrativa, no un escaneo del reloj real).
- El seguimiento de la mano usa MediaPipe Hands y corre en el dispositivo: la imagen de la cámara no se graba ni se envía.
- La cuenta es de demostración: el código de WhatsApp se muestra en pantalla y la cuenta se guarda solo en el navegador del visitante.
- La cámara solo funciona en una página servida por HTTPS (por ejemplo, GitHub Pages) o en `localhost`.

## Publicar con GitHub Pages

En el repositorio: **Settings → Pages → Build and deployment → Deploy from a branch**, rama `main`, carpeta `/ (root)`.

## Créditos

- Videos con licencia Pexels: iris entre columnas (Pexels), Tima Miroshnichenko (relojero), Quang Viet Nguyen (movimiento de referencia), Artem Podrez (satén).
- three.js (licencia MIT) · MediaPipe Hands (Google, licencia Apache 2.0).
- Razón social, domicilios, productor y contactos que aparecen en el sitio son ficticios.
