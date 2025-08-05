const express = require('express');
const cors = require('cors');
const fs = require('fs');
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const productos = JSON.parse(fs.readFileSync('./data/productos.json'));
const limpiar = texto => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

const INTENCIONES = {
  saludo: ['hola', 'buenas', 'qué tal'],
  despedida: ['chao', 'adios', 'gracias', 'hasta luego'],
  categorias: ['herramientas', 'pinturas', 'electricidad', 'accesorios', 'protección', 'fijación', 'fontanería', 'iluminación', 'abrasivos', 'pegamentos'],
  precio: ['precio', 'cuesta', 'vale', 'cuánto'],
  compra: ['quiero', 'llevar', 'también', 'me sirve', 'adquirir'],
  quitar: ['quitar', 'eliminar', 'no quiero', 'borra', 'quita'],
  envio: ['envio', 'enviamelo', 'cuánto cuesta el envío', 'dirección'],
  recogida: ['recoger', 'tienda', 'yo voy', 'paso por él', 'presencial'],
  total: ['eso es todo', 'cuánto es', 'cuánto sería', 'total'],
  finalizar: ['datos de compra', 'confirmo', 'finalizar']
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

  const producto = productos.find(p => mensaje.includes(limpiar(p.nombre)));
  return producto ? { producto, cantidad } : null;
}

function sugerenciasDe(producto) {
  return (producto.sugerencias || [])
    .map(nombre => productos.find(p => limpiar(p.nombre) === limpiar(nombre)))
    .filter(p => p);
}

function esAfirmativo(texto) {
  const afirmaciones = ['sí', 'si', 'claro', 'ok', 'dale', 'mostrar más', 'ver más', 'mas', 'más'];
  const limpio = limpiar(texto);
  return afirmaciones.some(p => limpiar(p) === limpio || limpio.includes(limpiar(p)));
}

app.post('/api/chat', (req, res) => {
  const mensaje = limpiar(req.body.mensaje);
  let respuesta = '';

  if (INTENCIONES.saludo.some(p => mensaje.includes(p))) {
    return res.json({ respuesta: '¡Hola! Soy FerreBot 🤖 ¿Qué necesitas hoy? Puedes preguntarme por productos, precios o comprar algo.' });
  }

  if (INTENCIONES.despedida.some(p => mensaje.includes(p))) {
    return res.json({ respuesta: '¡Gracias por visitarnos! 🛠️ Siempre estamos para atenderte.' });
  }

  // Mostrar productos por categoría (primera tanda)
  const categoria = INTENCIONES.categorias.find(c => mensaje.includes(c));
  if (categoria) {
    estado.ultimaCategoria = categoria;
    estado.paginaCategoria = 0;
    const productosCategoria = productos.filter(p => limpiar(p.categoria).includes(categoria));
    if (productosCategoria.length) {
      respuesta = `Estos productos de ${categoria} están disponibles:\n`;
      productosCategoria.slice(0, 5).forEach(p => {
        respuesta += `- ${p.nombre}: $${p.precio} COP. ${p.descripcion}\n`;
      });
      if (productosCategoria.length > 5) {
        respuesta += '¿Quieres ver más?';
      }
      return res.json({ respuesta });
    }
  }

  // Mostrar más productos de la última categoría
  if (esAfirmativo(mensaje) && estado.ultimaCategoria) {
    estado.paginaCategoria++;
    const productosCategoria = productos.filter(p => limpiar(p.categoria).includes(estado.ultimaCategoria));
    const inicio = estado.paginaCategoria * 5;
    const siguientes = productosCategoria.slice(inicio, inicio + 5);
    if (siguientes.length) {
      respuesta = `Más productos de ${estado.ultimaCategoria}:\n`;
      siguientes.forEach(p => {
        respuesta += `- ${p.nombre}: $${p.precio} COP. ${p.descripcion}\n`;
      });
      if (productosCategoria.length > inicio + 5) {
        respuesta += '¿Deseas ver más?';
      }
    } else {
      respuesta = `Ya te mostré todos los productos disponibles en la categoría ${estado.ultimaCategoria}.`;
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
        respuesta = `❌ ${eliminados} ${producto.nombre}(s) eliminado(s) del carrito.`;
      } else {
        respuesta = `Ese producto no estaba en tu carrito.`;
      }
    } else {
      respuesta = '¿Cuál producto deseas eliminar?';
    }
    return res.json({ respuesta });
  }

  // Precio + descripción de producto
  if (INTENCIONES.precio.some(k => mensaje.includes(k))) {
    const resultado = buscarProductoPorNombreYCantidad(mensaje);
    if (resultado) {
      const { producto } = resultado;
      respuesta = `${producto.nombre} cuesta $${producto.precio} COP. ${producto.descripcion}`;
    } else {
      respuesta = '¿Sobre qué producto deseas saber el precio?';
    }
    return res.json({ respuesta });
  }

  // Agregar al carrito con cantidad
  if (INTENCIONES.compra.some(k => mensaje.includes(k))) {
    const resultado = buscarProductoPorNombreYCantidad(mensaje);
    if (resultado) {
      const { producto, cantidad } = resultado;
      for (let i = 0; i < cantidad; i++) {
        estado.carrito.push(producto);
      }
      const relacionados = sugerenciasDe(producto);
      if (relacionados.length > 0) {
        respuesta = `✅ ${cantidad} ${producto.nombre}(s) agregado(s) al carrito. ¿Necesitas algo más?\nTambién podrías necesitar:\n`;
        relacionados.forEach(r => {
          respuesta += `- ${r.nombre}: $${r.precio} COP. ${r.descripcion}\n`;
        });
      } else {
        respuesta = `✅ ${cantidad} ${producto.nombre}(s) agregado(s) al carrito. ¿Deseas algo más?`;
      }
      estado.esperandoEntrega = true;
    } else {
      respuesta = 'No encontré ese producto. ¿Podrías repetirlo?';
    }
    return res.json({ respuesta });
  }

  // Método de entrega
  if (estado.esperandoEntrega && INTENCIONES.envio.some(k => mensaje.includes(k))) {
    estado.modoEntrega = 'envio';
    estado.esperandoEntrega = false;
    estado.esperandoConfirmacion = true;
    return res.json({ respuesta: '📦 El envío cuesta $10000 COP. ¿Eso es todo o deseas algo más?' });
  }

  if (estado.esperandoEntrega && INTENCIONES.recogida.some(k => mensaje.includes(k))) {
    estado.modoEntrega = 'recogida';
    estado.esperandoEntrega = false;
    estado.esperandoConfirmacion = true;
    return res.json({ respuesta: '🏪 Perfecto, puedes recoger tu pedido en tienda sin costo adicional. ¿Eso es todo o deseas algo más?' });
  }

  // Mostrar total
  if (INTENCIONES.total.some(k => mensaje.includes(k))) {
    let total = estado.carrito.reduce((sum, p) => sum + p.precio, 0);
    if (estado.modoEntrega === 'envio') total += 10000;
    const resumen = {};
    estado.carrito.forEach(p => {
      resumen[p.nombre] = (resumen[p.nombre] || { precio: p.precio, cantidad: 0 });
      resumen[p.nombre].cantidad += 1;
    });

    respuesta = '🧾 Este es el resumen de tu compra:\n';
    for (const [nombre, info] of Object.entries(resumen)) {
      respuesta += `- ${nombre} x${info.cantidad}: $${info.precio * info.cantidad} COP\n`;
    }
    if (estado.modoEntrega === 'envio') {
      respuesta += '+ Envío: $10000 COP\n';
    }
    respuesta += `💰 Total: $${total} COP\n¿Deseas finalizar tu compra? Puedes decir "datos de compra" o "confirmo".`;
    return res.json({ respuesta });
  }

  // Finalizar compra
  if (INTENCIONES.finalizar.some(k => mensaje.includes(k))) {
    estado = {
      carrito: [],
      modoEntrega: null,
      esperandoEntrega: false,
      esperandoConfirmacion: false,
      ultimaCategoria: null,
      paginaCategoria: 0
    };
    return res.json({ respuesta: '✅ Gracias por tu compra. El pedido será preparado de inmediato. ¡Siempre estamos para atenderte! 🛒' });
  }

  // Default
  res.json({ respuesta: 'No entendí muy bien. Puedes preguntarme por categorías, precios o decir "quiero un producto".' });
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
