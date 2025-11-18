<<<<<<< HEAD
# QrVentory

QrVentory es una aplicación de escritorio construida con Electron que simplifica la gestión de inventario escolar. Permite registrar ítems, mantener fichas históricas dentro de un libro de Excel y generar códigos QR para identificar rápidamente cada registro. También incluye herramientas para lotes, exportación y generación de etiquetas adhesivas listas para imprimir.

## Características principales

- **Registro individual y masivo** de ítems con validaciones básicas y seriales automáticos opcionales.
- **Generación y vista previa de códigos QR** asociados a cada artículo.
- **Gestión de inventario guardado** con filtros, ordenamiento y acciones masivas (dar de baja, eliminar, exportar).
- **Exportación a Excel** (`.xlsx`) conservando el orden y formateo del inventario.
- **Impresión de etiquetas adhesivas**: genera un PDF con códigos QR centrados en stickers de 101 × 51 mm (10 por hoja de 216 × 279 mm).
- **Persistencia local** en un único archivo `data.xlsx` dentro de la carpeta de datos del usuario (`%APPDATA%\QrVentory`). No requiere servidores externos.

## Requisitos

- Node.js 20 o superior y npm.
- Windows 10/11 para ejecutar el instalador empaquetado (el código también puede ejecutarse en macOS/Linux mediante `npm start`, pero la distribución empaquetada está enfocada en Windows).

## Primeros pasos

```bash
git clone https://github.com/<tu-usuario>/QrVentoryApp.git
cd QrVentoryApp
npm install
npm start
```

El comando `npm start` inicia la aplicación en modo desarrollo usando Electron Forge y Vite. Las vistas se recargan automáticamente ante cambios en `src/`.

### Scripts disponibles

| Comando          | Descripción                                                                 |
| ---------------- | --------------------------------------------------------------------------- |
| `npm start`      | Ejecuta la app en modo desarrollo con recarga en caliente.                  |
| `npm run make`   | Genera instaladores/paquetes listos para distribución en `out/make/`.       |
| `npm run package`| Empaqueta la aplicación sin crear instaladores (útil para inspección rápida).|
| `npm run publish`| Flujo de publicación soportado por Electron Forge (requiere configuración). |

## Construcción del instalador y firma

1. Actualiza la versión en `package.json` antes de crear un nuevo instalador (`"version": "1.1.0"` por ejemplo).
2. Configura las variables de entorno para apuntar a tu certificado Authenticode (`WINDOWS_PFX_PATH` y `WINDOWS_PFX_PASS`) si quieres firmar automáticamente desde Forge.
3. Ejecuta `npm run make`. Encontrarás el instalador de Squirrel en `out\make\squirrel.windows\x64\`.
4. (Opcional) Usa `signtool` para aplicar un sello de tiempo si la firma no fue automatizada.

## Flujo de trabajo diario

1. **Registrar ítems**: desde la pestaña Registrar items, completa el formulario individual o carga un lote. La aplicación almacena los registros en `data.xlsx` y genera QR automáticamente.
2. **Gestionar inventario**: la pestaña Items guardados permite filtrar por categoría, subvención, estado, etc., ordenar por cualquier columna y realizar acciones masivas sobre selecciones.
3. **Cargar ítems de demostración (opcional)**: usa el botón **Cargar demo** en Items guardados para poblar `data.xlsx` con ejemplos listos para imprimir o probar filtros. Los registros se agregan una sola vez por nombre/ubicación.
4. **Imprimir etiquetas adhesivas**:
   - Selecciona hasta 10 ítems (o más: se paginan automáticamente) en Items guardados.
   - Haz clic en **Imprimir etiquetas** y elige dónde guardar el PDF.
   - El PDF resultante coloca cada QR centrado en stickers de 101 × 51 mm, distribuidos en dos columnas y cinco filas por hoja (10 por página, formato carta 216 × 279 mm). Ajusta la impresora para tamaño real/sin escalado y verifica la alineación con una hoja de prueba antes de usar el papel adhesivo.
5. **Exportar**: desde la misma pestaña, utiliza **Exportar** para generar un Excel compartible o de respaldo.

## Estructura de carpetas relevante

- `src/main.js`: proceso principal de Electron (ventanas, diálogos, IPC).
- `src/preload.js`: puente seguro entre renderer y main (exposición de API).
- `src/renderer.js`: lógica de la interfaz (tabs, filtros, tabla, selección, PDF de etiquetas).
- `src/utils.js`: utilidades para lectura/escritura de Excel (ExcelJS), generación de QR y PDF de etiquetas (`pdf-lib`).
- `assets/icons/`: iconografía usada en la ventana y el instalador.
- `scripts/add-test-items.js`: utilitario para sembrar datos de prueba en el Excel (opcional, no se ejecuta automáticamente).

## Notas sobre datos

- El inventario se guarda automáticamente en `data.xlsx` dentro de la carpeta de datos del usuario (por defecto `%APPDATA%\QrVentory\data.xlsx`). Respáldalo periódicamente.
- Borrar ese archivo restablece la aplicación a un estado sin ítems (se recreará al reiniciar la app).

## Mantenimiento y contribuciones

- Ejecuta `npm install` tras cualquier cambio en dependencias (`package.json`).
- El proyecto no incluye linters ni pruebas automatizadas por defecto. Puedes añadir ESLint o tu herramienta preferida.
- Las contribuciones son bienvenidas: abre un issue o pull request con una descripción clara del cambio y pasos para probarlo.

## Licencia

QrVentory se distribuye bajo licencia MIT. Consulta el archivo `LICENSE` si necesitas más detalles.
=======
QrVentory

Gestión de inventario escolar con códigos QR, simple y eficiente.

⸻

🧾 Descripción general

QrVentory es una aplicación de escritorio creada para facilitar el control del inventario en establecimientos educacionales.
Permite registrar, organizar y mantener actualizado todo el material institucional mediante un sistema claro, rápido y completamente local.

La aplicación genera códigos QR únicos para cada artículo, permitiendo identificar y rastrear fácilmente los ítems dentro del colegio.

⸻

⚙️ Funciones principales

📋 Registro de ítems
	•	Agrega artículos de forma individual o masiva.
	•	Opción de seriales automáticos para numerar los registros sin esfuerzo.
	•	Los datos se guardan automáticamente en un libro histórico de inventario.

🧭 Gestión del inventario
	•	Visualiza todos los ítems guardados en una tabla interactiva.
	•	Aplica filtros por categoría, estado, subvención u otros campos.
	•	Permite acciones masivas: dar de baja, eliminar o exportar varios artículos al mismo tiempo.
	•	Todo se guarda localmente, sin conexión a internet ni servidores externos.

🏷️ Generación de etiquetas QR
	•	Cada registro obtiene su código QR único.
	•	QrVentory genera un PDF con etiquetas adhesivas listas para imprimir, distribuidas en formato carta (10 etiquetas por hoja, tamaño 101 × 51 mm).
	•	Solo debes imprimir en tamaño real sobre papel adhesivo estándar.

📤 Exportación de datos
	•	Exporta tu inventario completo o filtrado a Excel (.xlsx), conservando el formato y el orden de las columnas.
	•	Ideal para respaldos, reportes o entregas de auditoría.

⸻

💾 Seguridad y almacenamiento
	•	Toda la información se guarda en un único archivo local (data.xlsx) dentro de la carpeta de datos del usuario.
	•	No requiere internet: tus datos no salen del equipo.
	•	Puedes realizar copias de respaldo o restaurar el inventario fácilmente reemplazando ese archivo.

⸻

🔁 Flujo de trabajo sugerido
	1.	**Registrar ítems:** agrega artículos manualmente o carga un lote desde Excel.
	2.	**Revisar inventario:** usa los filtros para encontrar, modificar o eliminar registros.
	3.	**Generar etiquetas:** selecciona los artículos y crea el PDF de códigos QR.
	4.	**Exportar:** guarda un archivo Excel con el inventario actualizado.

⸻

🧩 Ideal para
	•	Escuelas, liceos o instituciones que necesiten un control visual y documentado de su equipamiento.
	•	Encargados de inventario que busquen un sistema intuitivo, rápido y sin conexión a internet.
	•	Proyectos que requieran etiquetado físico con códigos QR para mejorar la trazabilidad de materiales.

⸻

🪪 Licencia

QrVentory se distribuye bajo licencia MIT.
Puedes utilizarlo libremente dentro de tu institución sin costos ni dependencias externas.
>>>>>>> 73f10b2de4abe6db5d799928a4c3833cf34d1826
