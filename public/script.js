const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
let isLoading = false;

// Enfocar input al cargar
window.addEventListener('load', () => {
  userInput.focus();
});

// Manejar Enter
userInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !isLoading) {
    enviarMensaje();
  }
});

function agregarMensaje(mensaje, tipo) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${tipo}-message`;
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.textContent = mensaje;
  
  messageDiv.appendChild(contentDiv);
  chatBox.appendChild(messageDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function mostrarCargando() {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message bot-message';
  messageDiv.id = 'loading-message';
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content loading';
  contentDiv.innerHTML = `
    FerreBot está escribiendo
    <div class="loading-dots">
      <span></span>
      <span></span>
      <span></span>
    </div>
  `;
  
  messageDiv.appendChild(contentDiv);
  chatBox.appendChild(messageDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function quitarCargando() {
  const loadingMessage = document.getElementById('loading-message');
  if (loadingMessage) {
    loadingMessage.remove();
  }
}

function enviarMensajeRapido(mensaje) {
  if (isLoading) return;
  userInput.value = mensaje;
  enviarMensaje();
}

function enviarMensaje() {
  const mensaje = userInput.value.trim();
  if (!mensaje || isLoading) return;

  // UI feedback
  isLoading = true;
  sendButton.disabled = true;
  sendButton.textContent = '...';
  
  agregarMensaje(mensaje, 'user');
  userInput.value = '';
  mostrarCargando();

  fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mensaje })
  })
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      return res.json();
    })
    .then(data => {
      quitarCargando();
      agregarMensaje(data.respuesta, 'bot');
    })
    .catch(err => {
      quitarCargando();
      console.error('Error:', err);
      agregarMensaje('❌ Lo siento, hubo un problema conectando con el servidor. Por favor, intenta de nuevo.', 'bot');
    })
    .finally(() => {
      isLoading = false;
      sendButton.disabled = false;
      sendButton.textContent = 'Enviar';
      userInput.focus();
    });
}