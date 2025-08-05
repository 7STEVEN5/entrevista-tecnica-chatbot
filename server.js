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

// Función para normalizar texto (quitar tildes y convertir a minúsculas)
const limpiarTexto = (texto) => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

let ultimoProductoMencionado = null;

// Endpoint para recibir los mensajes de los usuarios
app.post('/api/chat', (req, res) => {
  const mensaje = limpiarTexto(req.body.mensaje);
  let respuesta = '';
  const categorias = [...new Set(productos.map(p => p.categoria.toLowerCase()))];

  // Intenciones esperadas 
  const saludos = ['hola', 'buenos dias', 'buenas', 'que tal'];
  const despedidas = ['chao', 'adios', 'gracias', 'hasta luego'];
  const ayuda = ['ayuda', 'necesito', 'asesoria', 'me orientas'];
  const compra = ['comprar', 'quiero', 'llevar', 'dame', 'adquirir'];

  
  if (saludos.some(s => mensaje.includes(s))) {
    respuesta = '¡Hola! Soy FerreBot 🤖. ¿Qué necesitas hoy? Tenemos herramientas, pinturas, adhesivos, electricidad y más.';
  } else if (despedidas.some(d => mensaje.includes(d))) {
    respuesta = '¡Gracias por visitarnos! Si necesitas algo más, aquí estaré. 🛠️';
  } else if (ayuda.some(a => mensaje.includes(a))) {
    respuesta = 'Estoy aquí para ayudarte. Puedes preguntarme por productos, precios, disponibilidad o cómo comprar.';
  } else if (mensaje.includes('precio') || mensaje.includes('cuanto') || mensaje.includes('vale')) {
    const producto = productos.find(p => mensaje.includes(limpiarTexto(p.nombre)));
    if (producto) {
      ultimoProductoMencionado = producto;
      respuesta = `${producto.nombre}: $${producto.precio} COP – ${producto.descripcion}`;
    } else {
      respuesta = '¿De qué producto quieres saber el precio?';
    }
  } else if (compra.some(p => mensaje.includes(p))) {
    const producto = productos.find(p => mensaje.includes(limpiarTexto(p.nombre)));
    if (producto) {
      ultimoProductoMencionado = null;
      respuesta = `¡Perfecto! Tu compra de ${producto.nombre} ha sido registrada. Será despachada en 2 días hábiles. 📦`;
    } else if (ultimoProductoMencionado) {
      respuesta = `¡Perfecto! Tu compra de ${ultimoProductoMencionado.nombre} ha sido registrada. Será despachada en 2 días hábiles. 📦`;
      ultimoProductoMencionado = null;
    } else {
      respuesta = '¿Cuál producto deseas comprar? Puedo ayudarte a elegir si me das más detalles.';
    }
  } else if (categorias.some(cat => mensaje.includes(cat))) {
    respuesta = 'Estos productos pueden interesarte:\n';
    productos.forEach(p => {
      if (mensaje.includes(p.categoria.toLowerCase())) {
        respuesta += `- ${p.nombre}: $${p.precio} COP (${p.descripcion})\n`;
      }
    });
  } else if (mensaje.includes('pegar') || mensaje.includes('adherir') || mensaje.includes('unir') || mensaje.includes('juntar')) {
    respuesta = '¿Estás buscando algo para pegar cosas? Te recomiendo:\n- Adhesivo industrial\n- Cinta aislante';
  } else {
    respuesta = 'No estoy seguro de haber entendido. ¿Puedes darme más detalles o decirme qué producto buscas?';
  }

  res.json({ respuesta });
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
