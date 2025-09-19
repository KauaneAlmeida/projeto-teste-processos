// chat.js
(function(){
  // pega atributo data-api se setado no <script>, ou ?api= na URL, ou localStorage, ou fallback
  var thisScript = document.currentScript || (function(){ var s = document.getElementsByTagName('script'); return s[s.length-1]; })();
  var API_BASE_URL = (thisScript && thisScript.getAttribute('data-api')) 
                     || (new URLSearchParams(window.location.search).get('api')) 
                     || localStorage.getItem('backend_url') 
                     || null;

  // monta UI dentro de #chat-root (cria se não existir)
  function mount() {
    var root = document.getElementById('chat-root');
    if(!root){ root = document.createElement('div'); root.id = 'chat-root'; document.body.appendChild(root); }
    root.innerHTML = `
      <div class="chat-container" role="dialog" aria-label="Chat">
        <div class="chat-header">
          💬 Chat Advocacia — Escritório m.lima
          <button class="chat-close-btn" id="chat-close" aria-label="Fechar chat">×</button>
        </div>
        <div id="chat-messages" class="messages"></div>
        <div class="input-area">
          <input id="chat-input" placeholder="Digite sua mensagem... ⚖️" aria-label="Mensagem"/>
          <button id="chat-send">Enviar</button>
        </div>
      </div>
    `;
    document.getElementById('chat-send').addEventListener('click', sendMessage);
    document.getElementById('chat-input').addEventListener('keypress', function(e){ if(e.key==='Enter') sendMessage(); });
    document.getElementById('chat-close').addEventListener('click', function(){ 
      document.getElementById('chat-root').classList.remove('active'); 
    });
    // mensagem inicial
    addMessage("Olá! Bem-vindo — pronto pra conversar?", 'bot');
  }

  function addMessage(text, sender){
    var mroot = document.getElementById('chat-messages');
    if(!mroot) return;
    var wrap = document.createElement('div');
    wrap.className = 'message ' + (sender==='user' ? 'user' : 'bot');

    var avatar = document.createElement('img');
    avatar.className = 'avatar';
    avatar.src = sender==='user' ? './assets/user.png' : './assets/bot.png'; // use assets locais
    avatar.alt = sender;

    var bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = text;

    if(sender==='user'){ wrap.appendChild(bubble); wrap.appendChild(avatar); }
    else { wrap.appendChild(avatar); wrap.appendChild(bubble); }

    mroot.appendChild(wrap);
    mroot.scrollTop = mroot.scrollHeight;
  }

  function setSessionId(id){ try{ localStorage.setItem('chat_session_id', id);}catch(e){} }
  function getSessionId(){ try{ return localStorage.getItem('chat_session_id'); }catch(e){ return null; } }

  // Faz chamada real ao backend; se falhar, usa mock
  async function sendMessage(){
    var input = document.getElementById('chat-input');
    var text = (input.value||'').trim();
    if(!text) return;
    addMessage(text,'user');
    input.value = '';

    var payload = { message: text, session_id: getSessionId() || ('web_' + Date.now()) };

    if(!API_BASE_URL){
      // mock: responde local sem backend
      setTimeout(function(){
        addMessage("🤖 (mock) Resposta simulada para: " + text, 'bot');
      }, 800);
      return;
    }

    try {
      var res = await fetch(API_BASE_URL + '/api/v1/conversation/respond', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify(payload)
      });
      if(!res.ok) throw new Error('bad response');
      var data = await res.json();
      if(data.session_id) setSessionId(data.session_id);
      var botMsg = data.response || data.reply || data.question || '🤔 O bot não respondeu.';
      addMessage(botMsg, 'bot');
    } catch(err) {
      console.warn('Fetch fail, using mock, error:', err);
      // fallback mock so UI still works
      setTimeout(function(){
        addMessage("⚠️ (fallback) Não consegui falar com o backend — resposta mock: " + text, 'bot');
      }, 700);
    }
  }

  // tenta iniciar conversa (rota /start) - não falha se der erro
  async function tryStart(){
    if(!API_BASE_URL) return;
    try {
      var r = await fetch(API_BASE_URL + '/api/v1/conversation/start', { method:'POST', headers:{'Content-Type':'application/json'} });
      if(!r.ok) return;
      var d = await r.json();
      if(d.session_id) setSessionId(d.session_id);
      if(d.question) addMessage(d.question,'bot');
    }catch(e){ /* ignore */ }
  }

  // init
  document.addEventListener('DOMContentLoaded', function(){
    mount();
    tryStart();
  });
  
  // botão para abrir/fechar chat
  var launcher = document.getElementById('chat-launcher');
  launcher.addEventListener('click', function(){
    document.getElementById('chat-root').classList.toggle('active');
  });

  // expose function to set backend dynamically (útil)
  window.ChatWidget = {
    setBackend: function(url){ API_BASE_URL = url; localStorage.setItem('backend_url', url); }
  };

})();
