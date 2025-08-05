// server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Cargar productos desde el archivo que tenemos JSON
const productos = JSON.parse(fs.readFileSync('./data/productos.json'));

// Endpoint POST para procesar los mensajes
app.post('/api/chat', (req, res) => {
  const mensaje = req.body.mensaje.toLowerCase();
  let respuesta = 'No entendí tu solicitud. ¿Podrías repetirlo?';

  const categorias = productos.map(p => p.categoria.toLowerCase());

  // Simular lógica inteligente por palabras clave o conocidas 
  if (mensaje.includes('hola') || mensaje.includes('buenas')) {
    respuesta = '¡Hola! ¿Qué estás buscando hoy? Tenemos herramientas, pinturas, tornillos y más.';
  } else if (mensaje.includes('precio')) {
    const producto = productos.find(p => mensaje.includes(p.nombre.toLowerCase()));
    respuesta = producto
      ? `El precio del ${producto.nombre} es $${producto.precio} COP.`
      : '¿De qué producto quieres saber el precio?';
  } else if (mensaje.includes('tiene') || mensaje.includes('hay')) {
    const producto = productos.find(p => mensaje.includes(p.nombre.toLowerCase()));
    respuesta = producto
      ? `Sí, tenemos ${producto.nombre} disponible.`
      : 'No estoy seguro. ¿Puedes decirme el nombre exacto del producto?';
  } else if (mensaje.includes('comprar') || mensaje.includes('quiero') || mensaje.includes('llevar')) {
    const producto = productos.find(p => mensaje.includes(p.nombre.toLowerCase()));
    respuesta = producto
      ? `¡Gracias por tu compra! El ${producto.nombre} será despachado en 2 días.`
      : 'Perfecto, pero necesito saber qué producto deseas comprar.';
  } else if (categorias.some(c => mensaje.includes(c))) {
    respuesta = 'Aquí tienes algunos productos de esa categoría:\n';
    productos.forEach(p => {
      if (mensaje.includes(p.categoria.toLowerCase())) {
        respuesta += `- ${p.nombre}: $${p.precio} COP\n`;
      }
    });
  }

  res.json({ respuesta });
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
