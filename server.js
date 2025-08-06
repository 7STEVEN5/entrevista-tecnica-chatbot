const express = require('express');
const cors = require('cors');
const fs = require('fs');
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Cargar productos desde el archivo JSON
const productos = JSON.parse(fs.readFileSync('./data/productos.json'));
const limpiar = texto => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

const INTENCIONES = {
  saludo: ['hola', 'buenas', 'que tal', 'buenos dias', 'buenas tardes'],
  despedida: ['chao', 'adios', 'gracias', 'hasta luego', 'bye'],
  categorias: ['herramientas', 'pinturas', 'electricidad', 'accesorios', 'protección', 'proteccion', 'fijación', 'fijacion', 'fontanería', 'fontaneria', 'iluminación', 'iluminacion', 'abrasivos', 'pegamentos'],
  precio: ['precio', 'cuesta', 'vale', 'cuanto', 'cuánto'],
  compra: ['quiero', 'llevar', 'también', 'tambien', 'me sirve', 'adquirir', 'comprar', 'agregar', 'añadir'],
  quitar: ['quitar', 'eliminar', 'no quiero', 'borra', 'quita', 'remover'],
  envio: ['envio', 'envío', 'enviamelo', 'envíamelo', 'cuanto cuesta el envio', 'dirección', 'direccion'],
  recogida: ['recoger', 'tienda', 'yo voy', 'paso por el', 'paso por él', 'presencial', 'buscar'],
  total: ['eso es todo', 'cuanto es', 'cuánto es', 'cuanto seria', 'cuánto sería', 'total', 'resumen'],
  finalizar: ['datos de compra', 'confirmo', 'finalizar', 'comprar', 'proceder'],
  carrito: ['carrito', 'que tengo', 'qué tengo', 'mis productos', 'ver carrito'],
  ayuda: ['ayuda', 'como funciona', 'cómo funciona', 'que puedes hacer', 'qué puedes hacer']
};

let estado = {
  carrito: [],
  modoEntrega: null,
  esperandoEntrega: false,
  esperandoConfirmacion: false,
  ultimaCategoria: null,
  paginaCategoria: 0
};

function buscarProductoPorNombreYCantidad(mensaje) {
  let cantidad = 1;
  const matchCantidad = mensaje.match(/\b(\d+)\b/);
  if (matchCantidad) {
    cantidad = parseInt(matchCantidad[1]);
  }

  // Buscar por nombre exacto primero
  let producto = productos.find(p => 
    limpiar(mensaje).includes(limpiar(p.nombre))
  );

  // Si no encuentra, buscar por palabras clave
  if (!producto) {
    producto = productos.find(p => {
      const palabrasProducto = limpiar(p.nombre).split(' ');
      const palabrasMensaje = limpiar(mensaje).split(' ');
      return palabrasProducto.some(palabra => 
        palabrasMensaje.some(msgPalabra => 
          msgPalabra.includes(palabra) && palabra.length > 2
        )
      );
    });
  }

  return producto ? { producto, cantidad } : null;
}

function sugerenciasDe(producto) {
  return (producto.sugerencias || [])
    .map(nombre => productos.find(p => limpiar(p.nombre) === limpiar(nombre)))
    .filter(p => p);
}

function esAfirmativo(texto) {
  const afirmaciones = ['si', 'sí', 'claro', 'ok', 'dale', 'mostrar mas', 'mostrar más', 'ver mas', 'ver más', 'mas', 'más'];
  const limpio = limpiar(texto);
  return afirmaciones.some(p => limpiar(p) === limpio || limpio.includes(limpiar(p)));
}

function mostrarCarrito() {
  if (estado.carrito.length === 0) {
    return '🛒 Tu carrito está vacío. ¿Te ayudo a encontrar algo?';
  }

  const resumen = {};
  let total = 0;
  
  estado.carrito.forEach(p => {
    if (!resumen[p.nombre]) {
      resumen[p.nombre] = { precio: p.precio, cantidad: 0 };
    }
    resumen[p.nombre].cantidad += 1;
    total += p.precio;
  });

  let respuesta = '🛒 Tu carrito actual:\n';
  for (const [nombre, info] of Object.entries(resumen)) {
    respuesta += `- ${nombre} x${info.cantidad}: $${(info.precio * info.cantidad).toLocaleString()} COP\n`;
  }
  
  if (estado.modoEntrega === 'envio') {
    total += 10000;
    respuesta += '+ Envío: $10,000 COP\n';
  }
  
  respuesta += `💰 Subtotal: $${total.toLocaleString()} COP`;
  return respuesta;
}

app.post('/api/chat', (req, res) => {
  const mensajeOriginal = req.body.mensaje || '';
  const mensaje = limpiar(mensajeOriginal);
  let respuesta = '';

  // Ayuda
  if (INTENCIONES.ayuda.some(p => mensaje.includes(p))) {
    return res.json({ 
      respuesta: `🤖 ¡Hola! Soy FerreBot, tu asistente virtual. Puedo ayudarte con:

📦 Ver productos por categoría (herramientas, pinturas, electricidad, etc.)
💰 Consultar precios
🛒 Agregar productos al carrito
📋 Ver tu carrito actual
🚚 Gestionar envío o recogida
✅ Finalizar tu compra

Solo dime qué necesitas, por ejemplo:
• "Quiero herramientas"
• "Precio del martillo"
• "Agregar 2 destornilladores"
• "Ver mi carrito"`
    });
  }

  // Saludo
  if (INTENCIONES.saludo.some(p => mensaje.includes(p))) {
    return res.json({ 
      respuesta: '¡Hola! 👋 Soy FerreBot, tu asistente de ferretería 🔧\n\n¿Qué necesitas hoy? Puedo mostrarte productos por categorías, ayudarte con precios o gestionar tu compra.\n\nEscribe "ayuda" si necesitas más información.' 
    });
  }

  // Despedida
  if (INTENCIONES.despedida.some(p => mensaje.includes(p))) {
    return res.json({ 
      respuesta: '¡Gracias por visitarnos! 🛠️ Que tengas un excelente día. Siempre estamos aquí para atenderte.' 
    });
  }

  // Ver carrito
  if (INTENCIONES.carrito.some(p => mensaje.includes(p))) {
    return res.json({ respuesta: mostrarCarrito() });
  }

  // Mostrar productos por categoría
  const categoria = INTENCIONES.categorias.find(c => mensaje.includes(c));
  if (categoria) {
    estado.ultimaCategoria = categoria;
    estado.paginaCategoria = 0;
    const productosCategoria = productos.filter(p => 
      limpiar(p.categoria).includes(categoria)
    );
    
    if (productosCategoria.length) {
      respuesta = `📦 Productos de ${categoria.toUpperCase()} disponibles:\n\n`;
      productosCategoria.slice(0, 5).forEach((p, index) => {
        respuesta += `${index + 1}. ${p.nombre}\n   💰 $${p.precio.toLocaleString()} COP\n   📝 ${p.descripcion}\n\n`;
      });
      
      if (productosCategoria.length > 5) {
        respuesta += `Mostrando 5 de ${productosCategoria.length} productos. ¿Quieres ver más?`;
      } else {
        respuesta += '¿Te interesa alguno? Puedes decir "quiero [nombre del producto]"';
      }
      return res.json({ respuesta });
    }
  }

  // Mostrar más productos de la última categoría
  if (esAfirmativo(mensaje) && estado.ultimaCategoria) {
    estado.paginaCategoria++;
    const productosCategoria = productos.filter(p => 
      limpiar(p.categoria).includes(estado.ultimaCategoria)
    );
    const inicio = estado.paginaCategoria * 5;
    const siguientes = productosCategoria.slice(inicio, inicio + 5);
    
    if (siguientes.length) {
      respuesta = `📦 Más productos de ${estado.ultimaCategoria.toUpperCase()}:\n\n`;
      siguientes.forEach((p, index) => {
        respuesta += `${inicio + index + 1}. ${p.nombre}\n   💰 $${p.precio.toLocaleString()} COP\n   📝 ${p.descripcion}\n\n`;
      });
      
      if (productosCategoria.length > inicio + 5) {
        respuesta += '¿Deseas ver más productos?';
      } else {
        respuesta += 'Estos son todos los productos disponibles en esta categoría.';
      }
    } else {
      respuesta = `Ya te mostré todos los productos de ${estado.ultimaCategoria}.`;
      estado.ultimaCategoria = null;
    }
    return res.json({ respuesta });
  }

  // Eliminar producto del carrito
  if (INTENCIONES.quitar.some(k => mensaje.includes(k))) {
    const resultado = buscarProductoPorNombreYCantidad(mensaje);
    if (resultado) {
      const { producto, cantidad } = resultado;
      let eliminados = 0;
      estado.carrito = estado.carrito.filter(p => {
        if (p.nombre === producto.nombre && eliminados < cantidad) {
          eliminados++;
          return false;
        }
        return true;
      });

      if (eliminados > 0) {
        respuesta = `❌ Se eliminó ${eliminados} ${producto.nombre}(s) del carrito.\n\n${mostrarCarrito()}`;
      } else {
        respuesta = `Ese producto no estaba en tu carrito. ${mostrarCarrito()}`;
      }
    } else {
      respuesta = '¿Cuál producto deseas eliminar del carrito?';
    }
    return res.json({ respuesta });
  }

  // Consultar precio
  if (INTENCIONES.precio.some(k => mensaje.includes(k))) {
    const resultado = buscarProductoPorNombreYCantidad(mensaje);
    if (resultado) {
      const { producto } = resultado;
      respuesta = `💰 ${producto.nombre}: $${producto.precio.toLocaleString()} COP\n📝 ${producto.descripcion}\n\n¿Te interesa? Puedes decir "quiero ${producto.nombre}"`;
    } else {
      respuesta = '¿Sobre qué producto deseas saber el precio? Puedes ser más específico.';
    }
    return res.json({ respuesta });
  }

  // Agregar al carrito
  if (INTENCIONES.compra.some(k => mensaje.includes(k))) {
    const resultado = buscarProductoPorNombreYCantidad(mensaje);
    if (resultado) {
      const { producto, cantidad } = resultado;
      for (let i = 0; i < cantidad; i++) {
        estado.carrito.push(producto);
      }
      
      const relacionados = sugerenciasDe(producto);
      respuesta = `✅ Se agregó ${cantidad} ${producto.nombre}(s) al carrito.\n\n`;
      
      if (relacionados.length > 0) {
        respuesta += `💡 También podrías necesitar:\n`;
        relacionados.slice(0, 3).forEach(r => {
          respuesta += `• ${r.nombre}: $${r.precio.toLocaleString()} COP\n`;
        });
        respuesta += '\n';
      }
      
      respuesta += `${mostrarCarrito()}\n\n¿Deseas continuar comprando o proceder con el pedido?`;
      estado.esperandoEntrega = true;
    } else {
      respuesta = '🤔 No encontré ese producto. ¿Podrías ser más específico? Puedes ver las categorías disponibles escribiendo el nombre de una (herramientas, pinturas, electricidad, etc.)';
    }
    return res.json({ respuesta });
  }

  // Método de entrega - envío
  if (estado.esperandoEntrega && INTENCIONES.envio.some(k => mensaje.includes(k))) {
    estado.modoEntrega = 'envio';
    estado.esperandoEntrega = false;
    estado.esperandoConfirmacion = true;
    return res.json({ 
      respuesta: `📦 Perfecto! El envío tiene un costo de $10,000 COP.\n\n${mostrarCarrito()}\n\n¿Deseas finalizar tu compra?` 
    });
  }

  // Método de entrega - recogida
  if (estado.esperandoEntrega && INTENCIONES.recogida.some(k => mensaje.includes(k))) {
    estado.modoEntrega = 'recogida';
    estado.esperandoEntrega = false;
    estado.esperandoConfirmacion = true;
    return res.json({ 
      respuesta: `🏪 Excelente! Puedes recoger tu pedido en nuestra tienda sin costo adicional.\n\n${mostrarCarrito()}\n\n¿Deseas finalizar tu compra?` 
    });
  }

  // Mostrar total/resumen
  if (INTENCIONES.total.some(k => mensaje.includes(k))) {
    if (estado.carrito.length === 0) {
      return res.json({ respuesta: '🛒 Tu carrito está vacío. ¿Te ayudo a encontrar algo?' });
    }
    
    respuesta = mostrarCarrito();
    if (!estado.modoEntrega) {
      respuesta += '\n\n🚚 ¿Prefieres envío a domicilio ($10,000 COP) o recoger en tienda (gratis)?';
      estado.esperandoEntrega = true;
    } else {
      respuesta += '\n\n¿Deseas finalizar tu compra?';
    }
    return res.json({ respuesta });
  }

  // Finalizar compra
  if (INTENCIONES.finalizar.some(k => mensaje.includes(k))) {
    if (estado.carrito.length === 0) {
      return res.json({ respuesta: '🛒 Tu carrito está vacío. ¿Te ayudo a encontrar algo?' });
    }
    
    const tiempoEntrega = estado.modoEntrega === 'envio' ? '2-3 días hábiles' : 'inmediatamente';
    const metodo = estado.modoEntrega === 'envio' ? 'será enviado' : 'estará listo para recoger';
    
    // Resetear estado
    estado = {
      carrito: [],
      modoEntrega: null,
      esperandoEntrega: false,
      esperandoConfirmacion: false,
      ultimaCategoria: null,
      paginaCategoria: 0
    };
    
    return res.json({ 
      respuesta: `✅ ¡Compra finalizada con éxito!\n\n🎉 Gracias por tu compra. Tu pedido ${metodo} en ${tiempoEntrega}.\n\n📞 Te contactaremos pronto con los detalles.\n\n¿Hay algo más en lo que pueda ayudarte?` 
    });
  }

  // Respuesta por defecto
  res.json({ 
    respuesta: `🤖 No entendí muy bien tu solicitud.\n\n💡 Puedes probar con:\n• "Mostrar herramientas"\n• "Precio del martillo"\n• "Quiero 2 destornilladores"\n• "Ver mi carrito"\n• "Ayuda"\n\n¿En qué más puedo ayudarte?` 
  });
});

app.listen(port, () => {
  console.log(` Servidor FerreBot ejecutándose en http://localhost:${port}`);
});