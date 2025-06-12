Claro! Abaixo está um passo a passo para montar um projeto Django com suporte a **WebSockets** usando o **Django Channels**, com um exemplo funcional de **chat em tempo real**.

---

## 🔧 Pré-requisitos

* Python 3.8+
* Django (>= 3.0)
* `pip` ou `poetry`
* Redis (para uso como backend de canal)

---

## ✅ 1. Crie o projeto Django

```bash
django-admin startproject websocket_project
cd websocket_project
python manage.py startapp chat
```

---

## ✅ 2. Instale as dependências

```bash
pip install django channels channels-redis
```

Ou com `poetry`:

```bash
poetry add django channels channels-redis
```

---

## ✅ 3. Configure o `settings.py`

### Em `INSTALLED_APPS`, adicione:

```python
INSTALLED_APPS = [
    ...
    'channels',
    'chat',
]
```

### Configure o `ASGI_APPLICATION`:

```python
ASGI_APPLICATION = 'websocket_project.asgi.application'
```

### Adicione a configuração do Redis:

```python
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [("127.0.0.1", 6379)],
        },
    },
}
```

---

## ✅ 4. Crie o `asgi.py`

Substitua o conteúdo do `websocket_project/asgi.py` por:

```python
import os
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application
from channels.auth import AuthMiddlewareStack
import chat.routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'websocket_project.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            chat.routing.websocket_urlpatterns
        )
    ),
})
```

---

## ✅ 5. Defina o roteamento WebSocket

Crie `chat/routing.py`:

```python
from django.urls import path
from . import consumers

websocket_urlpatterns = [
    path("ws/chat/", consumers.ChatConsumer.as_asgi()),
]
```

---

## ✅ 6. Crie o `Consumer` WebSocket

Crie `chat/consumers.py`:

```python
import json
from channels.generic.websocket import AsyncWebsocketConsumer

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_group_name = "chat_global"
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        message = data['message']

        # Broadcast para todos no grupo
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat_message",
                "message": message
            }
        )

    async def chat_message(self, event):
        message = event["message"]

        await self.send(text_data=json.dumps({
            "message": message
        }))
```

---

## ✅ 7. Crie um template para teste

Em `chat/templates/chat.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Chat</title>
</head>
<body>
  <h1>Chat</h1>
  <textarea id="chat-log" cols="100" rows="20" readonly></textarea><br>
  <input id="chat-message-input" type="text" size="100">
  <button id="chat-send">Send</button>

  <script>
    const socket = new WebSocket('ws://' + window.location.host + '/ws/chat/');

    socket.onmessage = function(e) {
      const data = JSON.parse(e.data);
      document.querySelector('#chat-log').value += data.message + '\n';
    };

    document.querySelector('#chat-send').onclick = function() {
      const input = document.querySelector('#chat-message-input');
      const message = input.value;
      socket.send(JSON.stringify({ 'message': message }));
      input.value = '';
    };
  </script>
</body>
</html>
```

---

## ✅ 8. Rotas e Views

No `chat/views.py`:

```python
from django.shortcuts import render

def chat_view(request):
    return render(request, "chat.html")
```

No `websocket_project/urls.py`:

```python
from django.contrib import admin
from django.urls import path
from chat.views import chat_view

urlpatterns = [
    path('admin/', admin.site.urls),
    path('chat/', chat_view),
]
```

---

## ✅ 9. Execute o Redis (se não tiver em execução)

```bash
sudo service redis-server start
# ou com docker:
# docker run -p 6379:6379 redis
```

---

## ✅ 10. Teste a aplicação

```bash
python manage.py runserver
```

Acesse [http://localhost:8000/chat/](http://localhost:8000/chat/) em duas abas e envie mensagens.

---

Quer que eu monte esse projeto inicial para você em um repositório zipado ou quer adicionar funcionalidades (como múltiplas salas ou autenticação)?
