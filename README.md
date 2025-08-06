# Chatbot para Ferretería
Hola, este proyecto es un chatbot hecho para una ferretería. La idea es que el cliente pueda hablar con el bot, pedir productos, saber cuánto cuestan, agregarlos al carrito, elegir si quiere envío o recoger en tienda, y al final simular una compra.

¿Qué hace este proyecto?:
-Responde en español como si fuera un vendedor.
-Te muestra productos por categoría (como herramientas, pinturas, etc).
-Si escribes “quiero 2 martillos”, los agrega al carrito.
-Te dice el precio de los productos.
-Te recomienda otros productos relacionados.
-Te pregunta si quieres envío o recoger en tienda.
-Muestra el total y finaliza la compra.
-No hace el pago real, solo simula que ya compraste.

¿Que use para crearlo?
-HTML + CSS + JavaScript: para la parte visual del chat y la logica (del Frontend).
-Node.js  (el Backend) + Express (Framework web para crear el endpoint).
-Archivo JSON: donde están todos los productos (la base de datos).

Justificación:
- Se usaron herramientas del stack declarado en mi CV (JS, Node, HTML/CSS) ya que es en lo que tengo conocimiento.

Archivos importantes:
-index.html
-style.css
-script.js
-server.js
-data = productos.json

Cómo usarlo:
-clona el repositorio
-Abre la terminal y ve a la carpeta del proyecto.
-Asegúrate de tener Node.js instalado.
-Ejecuta este comando:(npm install express cors)para instalar las dependencias y luego (node server.js.) para ejecuar el servidor.
-instala la extension de liveserver si no la tienes.
-Luego abre el archivo index.html con tu navegador(liveserver).
-Ya puedes empezar a escribir en el chat.

Cosas que aprendí / Mejoraría
-Hacer respuestas naturales y personalizadas sin IA real
-usar Express para crear rutas que respondan a lo que el usuario escribe.
-Usar normalize y palabras clave para que el bot entienda mejor.
-Mejoraría la interfaz, pondría íconos o imágenes de los productos.
-le agregaria ubicación en tiempo real para que lleguen a la tienda directamente 
-opciones para calificar la atencion 
-Incluir búsqueda por voz o filtros visuales


Estado actual:
El bot funciona bien:
-Entiende lo que le escribes.
-Muestra productos por partes (paginado).
-Puedes agregar varios productos y cantidades.
-Hace recomendaciones automáticas.
-Simula todo el proceso de compra.

