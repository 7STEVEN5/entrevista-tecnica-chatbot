const express = require('express');
const cors = require('cors');
const fs = require('fs');
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Cargar productos desde el archivo JSON
const productos = JSON.parse(fs.readFileSync('./data/productos.json'));

// Función mejorada para limpiar texto (mantiene acentos para mejor comparación)
const limpiarTexto = (texto) => {
  return texto.toLowerCase().trim();
};

// Función para normalizar texto (sin acentos para búsquedas flexibles)
const normalizarTexto = (texto) => {
  return texto.normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
};

// Patrones de intenciones mejorados
const INTENCIONES = {
  saludo: ['hola', 'buenas', 'que tal', 'buenos dias', 'buenos días', 'buenas tardes', 'buenas noches', 'hey', 'saludos'],
  despedida: ['chao', 'adiós', 'adios', 'gracias', 'hasta luego', 'bye', 'nos vemos', 'que tengas buen día'],
  categorias: ['herramientas', 'pinturas', 'electricidad', 'accesorios', 'protección', 'proteccion', 'fijación', 'fijacion', 'fontanería', 'fontaneria', 'iluminación', 'iluminacion', 'abrasivos', 'pegamentos'],
  precio: ['precio', 'cuesta', 'vale', 'cuanto', 'cuánto', 'valor', 'coste', 'cost'],
  compra: ['quiero', 'llevar', 'también', 'tambien', 'me sirve', 'adquirir', 'comprar', 'agregar', 'añadir', 'meter al carrito', 'añadir al carrito'],
  quitar: ['quitar', 'eliminar', 'no quiero', 'borra', 'quita', 'remover', 'sacar', 'eliminar del carrito'],
  envio: ['envio', 'envío', 'enviamelo', 'envíamelo', 'enviar', 'delivery', 'domicilio', 'entrega', 'enviar a casa'],
  costoEnvio: ['cuanto cuesta el envio', 'cuánto cuesta el envío', 'precio del envio', 'precio del envío', 'costo de envio', 'costo de envío'],
  direccion: ['dirección', 'direccion', 'donde enviar', 'dónde enviar', 'mi dirección'],
  recogida: ['recoger', 'tienda', 'yo voy', 'paso por el', 'paso por él', 'presencial', 'buscar', 'recoger en tienda', 'ir por el'],
  total: ['eso es todo', 'cuanto es', 'cuánto es', 'cuanto seria', 'cuánto sería', 'total', 'resumen', 'cuanto pago', 'cuánto pago'],
  finalizar: ['datos de compra', 'confirmo', 'finalizar', 'proceder', 'terminar compra', 'hacer el pedido'],
  carrito: ['carrito', 'que tengo', 'qué tengo', 'mis productos', 'ver carrito', 'mostrar carrito'],
  ayuda: ['ayuda', 'como funciona', 'cómo funciona', 'que puedes hacer', 'qué puedes hacer', 'help', 'comandos']
};

// Estado del chatbot
let estado = {
  carrito: [],
  modoEntrega: null,
  esperandoEntrega: false,
  esperandoConfirmacion: false,
  ultimaCategoria: null,
  paginaCategoria: 0
};

// Función mejorada para detectar intenciones
function detectarIntencion(mensaje) {
  const mensajeNormalizado = normalizarTexto(mensaje);
  const mensajeLimpio = limpiarTexto(mensaje);
  
  for (const [intencion, patrones] of Object.entries(INTENCIONES)) {
    for (const patron of patrones) {
      const patronNormalizado = normalizarTexto(patron);
      const patronLimpio = limpiarTexto(patron);
      
      // Buscar coincidencia exacta o parcial
      if (mensajeLimpio.includes(patronLimpio) || 
          mensajeNormalizado.includes(patronNormalizado) ||
          mensajeLimpio === patronLimpio ||
          mensajeNormalizado === patronNormalizado) {
        return intencion;
      }
    }
  }
  return null;
}

// Función mejorada para buscar productos
function buscarProductoPorNombreYCantidad(mensaje) {
  let cantidad = 1;
  const matchCantidad = mensaje.match(/\b(\d+)\b/);
  if (matchCantidad) {
    cantidad = parseInt(matchCantidad[1]);
  }

  const mensajeNormalizado = normalizarTexto(mensaje);
  
  // Buscar por nombre exacto primero (sin normalizar)
  let producto = productos.find(p => 
    limpiarTexto(mensaje).includes(limpiarTexto(p.nombre))
  );

  // Si no encuentra, buscar normalizado
  if (!producto) {
    producto = productos.find(p => 
      mensajeNormalizado.includes(normalizarTexto(p.nombre))
    );
  }

  // Búsqueda por palabras clave mejorada
  if (!producto) {
    producto = productos.find(p => {
      const palabrasProducto = normalizarTexto(p.nombre).split(' ');
      const palabrasMensaje = mensajeNormalizado.split(' ');
      
      return palabrasProducto.some(palabra => {
        if (palabra.length < 3) return false; // Ignorar palabras muy cortas
        return palabrasMensaje.some(msgPalabra => 
          msgPalabra.includes(palabra) || palabra.includes(msgPalabra)
        );
      });
    });
  }

  return producto ? { producto, cantidad } : null;
}

function sugerenciasDe(producto) {
  return (producto.sugerencias || [])
    .map(nombre => productos.find(p => normalizarTexto(p.nombre) === normalizarTexto(nombre)))
    .filter(p => p);
}

function esAfirmativo(texto) {
  const afirmaciones = ['si', 'sí', 'claro', 'ok', 'dale', 'mostrar mas', 'mostrar más', 'ver mas', 'ver más', 'mas', 'más', 'continuar', 'seguir'];
  const textoNormalizado = normalizarTexto(texto);
  return afirmaciones.some(p => normalizarTexto(p) === textoNormalizado || textoNormalizado.includes(normalizarTexto(p)));
}

function mostrarCarrito() {
  if (estado.carrito.length === 0) {
    return '🛒 Tu carrito está vacío. ¿Te ayudo a encontrar algo?';
  }

  const resumen = {};
  let subtotal = 0;
  
  estado.carrito.forEach(p => {
    if (!resumen[p.nombre]) {
      resumen[p.nombre] = { precio: p.precio, cantidad: 0 };
    }
    resumen[p.nombre].cantidad += 1;
    subtotal += p.precio;
  });

  let respuesta = '🛒 Tu carrito actual:\n\n';
  for (const [nombre, info] of Object.entries(resumen)) {
    respuesta += `• ${nombre} x${info.cantidad}: $${(info.precio * info.cantidad).toLocaleString()} COP\n`;
  }
  
  respuesta += `\n💰 Subtotal: $${subtotal.toLocaleString()} COP\n`;
  
  if (estado.modoEntrega === 'envio') {
    respuesta += `🚚 Envío: $10,000 COP\n`;
    respuesta += `💳 TOTAL: $${(subtotal + 10000).toLocaleString()} COP`;
  } else if (estado.modoEntrega === 'recogida') {
    respuesta += `🏪 Recogida en tienda: GRATIS\n`;
    respuesta += `💳 TOTAL: $${subtotal.toLocaleString()} COP`;
  } else {
    respuesta += `\n🚚 ¿Prefieres envío a domicilio o recoger en tienda?`;
  }
  
  return respuesta;
}

// Endpoint principal del chat
app.post('/api/chat', (req, res) => {
  const mensajeOriginal = req.body.mensaje || '';
  const mensaje = limpiarTexto(mensajeOriginal);
  let respuesta = '';

  console.log('Mensaje recibido:', mensajeOriginal); // Para debugging

  // Detectar intención principal
  const intencion = detectarIntencion(mensaje);
  console.log('Intención detectada:', intencion); // Para debugging

  // Procesar la intención detectada
  switch (intencion) {
    case 'ayuda':
      return res.json({ 
        respuesta: `🤖 ¡Hola! Soy FerreBot, tu asistente virtual. Puedo ayudarte con:

📦 Ver productos por categoría (herramientas, pinturas, electricidad, etc.)
💰 Consultar precios de productos
🛒 Agregar y quitar productos del carrito
📋 Ver tu carrito actual
🚚 Gestionar envío a domicilio o recogida en tienda
✅ Finalizar tu compra

Ejemplos de lo que puedes decir:
• "Mostrar herramientas"
• "Precio del martillo"
• "Quiero 2 destornilladores"
• "Ver mi carrito"
• "Envío a domicilio"
• "Finalizar compra"`
      });

    case 'saludo':
      return res.json({ 
        respuesta: '¡Hola! 👋 Soy FerreBot, tu asistente de ferretería 🔧\n\n¿Qué necesitas hoy? Puedo mostrarte productos, ayudarte con precios o gestionar tu compra.\n\nEscribe "ayuda" si necesitas más información.' 
      });

    case 'despedida':
      return res.json({ 
        respuesta: '¡Gracias por visitarnos! 🛠️ Que tengas un excelente día. Siempre estamos aquí para ayudarte. 😊' 
      });

    case 'carrito':
      return res.json({ respuesta: mostrarCarrito() });

    case 'costoEnvio':
      return res.json({ 
        respuesta: '🚚 El costo del envío a domicilio es de $10,000 COP.\n\n📍 También puedes recoger tu pedido en nuestra tienda sin costo adicional.\n\n¿Cuál prefieres?' 
      });

    case 'envio':
      if (estado.carrito.length === 0) {
        return res.json({ 
          respuesta: '🛒 Primero necesitas agregar productos a tu carrito.\n\n¿Qué te gustaría comprar?' 
        });
      }
      estado.modoEntrega = 'envio';
      estado.esperandoEntrega = false;
      estado.esperandoConfirmacion = true;
      return res.json({ 
        respuesta: `🚚 Perfecto! Has elegido envío a domicilio.\n\nCosto del envío: $10,000 COP\nTiempo de entrega: 2-3 días hábiles\n\n${mostrarCarrito()}\n\n¿Deseas finalizar tu compra?` 
      });

    case 'recogida':
      if (estado.carrito.length === 0) {
        return res.json({ 
          respuesta: '🛒 Primero necesitas agregar productos a tu carrito.\n\n¿Qué te gustaría comprar?' 
        });
      }
      estado.modoEntrega = 'recogida';
      estado.esperandoEntrega = false;
      estado.esperandoConfirmacion = true;
      return res.json({ 
        respuesta: `🏪 Excelente! Has elegido recoger en tienda.\n\n¡Sin costo adicional de envío!\nListo para recoger inmediatamente\n\n${mostrarCarrito()}\n\n¿Deseas finalizar tu compra?` 
      });
  }

  // Mostrar productos por categoría
  const categoria = INTENCIONES.categorias.find(c => normalizarTexto(mensaje).includes(normalizarTexto(c)));
  if (categoria) {
    estado.ultimaCategoria = categoria;
    estado.paginaCategoria = 0;
    const productosCategoria = productos.filter(p => 
      normalizarTexto(p.categoria).includes(normalizarTexto(categoria))
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
      normalizarTexto(p.categoria).includes(normalizarTexto(estado.ultimaCategoria))
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
  if (intencion === 'quitar') {
    const resultado = buscarProductoPorNombreYCantidad(mensaje);
    if (resultado) {
      const { producto, cantidad } = resultado;
      let eliminados = 0;
      estado.carrito = estado.carrito.filter(p => {
        if (normalizarTexto(p.nombre) === normalizarTexto(producto.nombre) && eliminados < cantidad) {
          eliminados++;
          return false;
        }
        return true;
      });

      if (eliminados > 0) {
        respuesta = `❌ Se eliminó ${eliminados} ${producto.nombre}(s) del carrito.\n\n${mostrarCarrito()}`;
      } else {
        respuesta = `Ese producto no estaba en tu carrito.\n\n${mostrarCarrito()}`;
      }
    } else {
      respuesta = '¿Cuál producto deseas eliminar del carrito? Puedes ser más específico.';
    }
    return res.json({ respuesta });
  }

  // Consultar el precio
  if (intencion === 'precio') {
    const resultado = buscarProductoPorNombreYCantidad(mensaje);
    if (resultado) {
      const { producto } = resultado;
      const sugerencias = sugerenciasDe(producto);
      respuesta = `💰 ${producto.nombre}: $${producto.precio.toLocaleString()} COP\n📝 ${producto.descripcion}`;
      
      if (sugerencias.length > 0) {
        respuesta += `\n\n💡 También podrías necesitar:\n`;
        sugerencias.slice(0, 2).forEach(s => {
          respuesta += `• ${s.nombre}: $${s.precio.toLocaleString()} COP\n`;
        });
      }
      
      respuesta += `\n\n¿Te interesa? Puedes decir "quiero ${producto.nombre}"`;
    } else {
      respuesta = '¿Sobre qué producto deseas saber el precio? Puedes ser más específico o ver nuestras categorías: herramientas, pinturas, electricidad, etc.';
    }
    return res.json({ respuesta });
  }

  // Agregar al carrito
  if (intencion === 'compra') {
    const resultado = buscarProductoPorNombreYCantidad(mensaje);
    if (resultado) {
      const { producto, cantidad } = resultado;
      for (let i = 0; i < cantidad; i++) {
        estado.carrito.push(producto);
      }
      
      const relacionados = sugerenciasDe(producto);
      respuesta = `✅ Se agregó ${cantidad} ${producto.nombre}(s) al carrito por $${(producto.precio * cantidad).toLocaleString()} COP.\n\n`;
      
      if (relacionados.length > 0) {
        respuesta += `💡 También podrías necesitar:\n`;
        relacionados.slice(0, 3).forEach(r => {
          respuesta += `• ${r.nombre}: $${r.precio.toLocaleString()} COP\n`;
        });
        respuesta += '\n';
      }
      
      respuesta += `${mostrarCarrito()}\n\n¿Deseas continuar comprando o proceder con el pedido?`;
    } else {
      respuesta = '🤔 No encontré ese producto. ¿Podrías ser más específico?\n\nPuedes ver nuestras categorías:\n• Herramientas 🔧\n• Pinturas 🎨\n• Electricidad ⚡\n• Protección 🦺\n• Fijación 🔩\n• Fontanería 🔧\n• Iluminación 💡';
    }
    return res.json({ respuesta });
  }

  // Mostrar total/resumen
  if (intencion === 'total') {
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

  // Finalizar la compra
  if (intencion === 'finalizar') {
    if (estado.carrito.length === 0) {
      return res.json({ respuesta: '🛒 Tu carrito está vacío. ¿Te ayudo a encontrar algo?' });
    }
    
    if (!estado.modoEntrega) {
      return res.json({ 
        respuesta: `Antes de finalizar, necesito saber:\n\n🚚 ¿Prefieres envío a domicilio ($10,000 COP) o recoger en tienda (gratis)?\n\n${mostrarCarrito()}` 
      });
    }
    
    const tiempoEntrega = estado.modoEntrega === 'envio' ? '2-3 días hábiles' : 'inmediatamente en tienda';
    const metodo = estado.modoEntrega === 'envio' ? 'será enviado a tu domicilio' : 'estará listo para recoger en tienda';
    
    // Calcular el total final
    const subtotal = estado.carrito.reduce((sum, p) => sum + p.precio, 0);
    const costoEnvio = estado.modoEntrega === 'envio' ? 10000 : 0;
    const total = subtotal + costoEnvio;
    
    // Resetear el estado
    estado = {
      carrito: [],
      modoEntrega: null,
      esperandoEntrega: false,
      esperandoConfirmacion: false,
      ultimaCategoria: null,
      paginaCategoria: 0
    };
    
    return res.json({ 
      respuesta: `✅ ¡COMPRA FINALIZADA CON ÉXITO!\n\n🎉 Gracias por tu compra por $${total.toLocaleString()} COP.\n\n📦 Tu pedido ${metodo} en ${tiempoEntrega}.\n\n📞 Te contactaremos pronto con los detalles de entrega.\n\n¿Hay algo más en lo que pueda ayudarte?` 
    });
  }

  // Respuesta por defecto mejorada
  res.json({ 
    respuesta: `🤖 No estoy seguro de entender tu solicitud.\n\n💡 Puedes probar con:\n• "Mostrar herramientas"\n• "Precio del martillo"\n• "Quiero 2 destornilladores"\n• "Ver mi carrito"\n• "Envío a domicilio"\n• "Ayuda"\n\n¿En qué más puedo ayudarte?` 
  });
});

app.listen(port, () => {
  console.log(`Servidor FerreBot ejecutándose en http://localhost:${port}`);
  
});