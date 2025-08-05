const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');

function agregarMensaje(mensaje, tipo) {
  const div = document.createElement('div');
  div.className = tipo === 'usuario' ? 'user-message' : 'bot-message';
  div.innerText = mensaje;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function enviarMensaje() {
  const mensaje = userInput.value.trim();
  if (!mensaje) return;

  agregarMensaje(mensaje, 'usuario');
  userInput.value = '';

  fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mensaje })
  })
    .then(res => res.json())
    .then(data => {
      agregarMensaje(data.respuesta, 'bot');
    })
    .catch(err => {
      agregarMensaje('Hubo un error al conectar con el servidor.', 'bot');
      console.error(err);
    });
}
