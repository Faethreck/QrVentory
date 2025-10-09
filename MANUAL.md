# Manual de Usuario — QrVentory (Borrador)

Esta guía explica, en su versión inicial, cómo instalar y utilizar QrVentory desde la perspectiva de un usuario final. Iremos ampliándola con tus comentarios.

## 1. ¿Qué es QrVentory?

- Aplicación de escritorio para registrar artículos de inventario y generar códigos QR con sus datos.
- Almacena cada registro en un archivo de Excel (`data.xlsx`) que la app gestiona automáticamente.
- La interfaz está en español y sigue el formato chileno de RUT cuando corresponde.

## 2. Antes de comenzar

- Necesitas un equipo con Windows 10 u 11.
- Descarga el instalador oficial de QrVentory proporcionado por tu organización.
- Ten a mano la información del inventario (nombre del artículo, categoría, proveedor, etc.) y, si es posible, una fotografía por ítem.

## 3. Instalación rápida

1. Ejecuta el instalador (`.exe`) de QrVentory.
2. Sigue los pasos del asistente hasta finalizar.
3. Una vez instalado, encontrarás QrVentory en el menú Inicio. Ábrelo para comenzar.

> Tip: Si recibes advertencias de Windows SmartScreen, confirma que el instalador provenga de una fuente confiable antes de continuar.

## 4. Primera ejecución

Al abrir QrVentory por primera vez:

- Se crea automáticamente el archivo `data.xlsx` dentro de tu carpeta de datos de aplicación (`%APPDATA%\QrVentory\data.xlsx`). No necesitas buscarlo, pero conviene saber dónde reside para realizar respaldos.
- La ventana muestra dos pestañas principales:
  - **Nuevo ítem**: formulario para capturar y guardar artículos.
  - **Ítems guardados**: tabla con todos los registros almacenados.
- En la parte superior aparece un área de notificaciones donde la app mostrará mensajes de éxito, advertencia o error.

## 5. Registrar un ítem

1. Permanece en la pestaña **Nuevo ítem**.
2. Completa los campos necesarios:
   - **Nombre**: obligatorio. Sin este dato, la app no permite guardar.
   - **NoSerie**: se completa de forma automática al guardar. Puedes dejarlo vacío si no tienes uno propio.
   - **Categoría, Cantidad, Fecha de ingreso, Proveedor, RUT, Número de factura, Estado, Responsable, Ubicación y Notas**: opcionales, pero útiles para clasificar y buscar ítems.
   - **RUT**: escribe solo números y la letra K. Al salir del campo, QrVentory aplicará formato (puntos y guion) y validará el dígito verificador.
   - **Imagen del ítem** (opcional): selecciona un archivo de imagen menor a 2 MB. Si es válido, verás una vista previa; de lo contrario, la app indicará el error.
3. Presiona **Guardar ítem**:
   - Si falta algún dato obligatorio, aparecerá una advertencia.
   - Si todo es correcto, recibirás un mensaje de éxito, el formulario se limpia y se generará un código QR.
   - La app abrirá automáticamente el detalle del ítem recién creado (ver sección 7) y actualizará la lista en “Ítems guardados”.

## 6. Administrar ítems guardados

### 6.1 Tabla de registros

- Cambia a la pestaña **Ítems guardados**.
- Si todavía no hay registros, verás un mensaje informativo.
- Cada fila muestra los datos del ítem y, si existe, una miniatura de la imagen cargada.
- El primer encabezado incluye un checkbox para seleccionar todas las filas de la tabla. También puedes seleccionar ítems individualmente.
- Al hacer clic sobre una fila, se abrirá su detalle en un modal y la fila quedará resaltada para que la ubiques fácilmente.

### 6.2 Eliminar y deshacer

- Selecciona uno o varios ítems mediante los checkboxes.
- Haz clic en **Eliminar seleccionados**.
- Confirma la pregunta “¿Quieres eliminar los ítems seleccionados?” para proceder.
- Si la operación se completa, se mostrará un mensaje de éxito y los registros desaparecerán de la tabla.
- Para revertir la última eliminación, utiliza **Deshacer última eliminación**:
  - El botón solo está activo cuando hay elementos recientes por restaurar.
  - Tras restaurar, verás un mensaje confirmando cuántos ítems volvieron a la lista.
  - Ten en cuenta que este historial se borra al cerrar la aplicación o cuando realizas otra eliminación sin deshacer.

## 7. Ver el detalle y el código QR

- Cada vez que guardas un ítem, QrVentory abre un modal con:
  - Todos los campos capturados, organizados en una cuadrícula.
  - El código QR generado. Este QR contiene un archivo JSON con la información del registro y una marca de tiempo interna (`_meta.savedAt`).
- Puedes reabrir el detalle en cualquier momento desde la tabla de “Ítems guardados”.
- Para cerrar el modal usa la tecla **Esc**, la “X” de la esquina superior derecha, el botón **Cerrar** o haz clic en el fondo sombreado.

## 8. Respaldo y recuperación de datos

- **Ubicación del archivo**: `data.xlsx` se guarda en la carpeta de datos del usuario de QrVentory. Utiliza el explorador de archivos y escribe `%APPDATA%\QrVentory` en la barra de direcciones para acceder.
- **Contenido**: el archivo contiene todas las columnas visibles en la aplicación. Las imágenes se almacenan como datos codificados, por lo que el archivo puede crecer rápidamente.
- **Recomendaciones**:
  - Realiza copias de seguridad periódicas de `data.xlsx`.
  - Para trasladar el inventario a otra computadora, instala QrVentory allí y reemplaza el `data.xlsx` en la misma ruta.

## 9. Resolución de problemas frecuentes

- **No se genera el código QR**: revisa que el nombre del ítem esté lleno y que hayas guardado correctamente. Si el problema persiste, intenta guardar sin imagen o reinicia la aplicación.
- **Imágenes rechazadas**: confirma que el archivo pese menos de 2 MB y que tenga formato compatible (`.png`, `.jpg`, `.jpeg`, etc.).
- **RUT invalido**: verifica el dígito verificador. Si no lo conoces, es preferible dejar el campo en blanco y completarlo más adelante.
- **No se ven mis ítems guardados**: asegúrate de estar en la pestaña “Ítems guardados”. Si sigues sin verlos, puede que el archivo `data.xlsx` haya sido movido o reemplazado; restaura una copia de seguridad.

## 10. Próximos pasos para mejorar este manual

1. Añadir capturas de pantalla señalando cada sección relevante.
2. Incorporar ejemplos reales de registro (por categoría o ubicación).
3. Documentar preguntas frecuentes según la retroalimentación de usuarios y soporte.

> Mantén este borrador actualizado registrando fecha y responsable cada vez que hagas cambios significativos.

