# Enhanced Home Assistant MCP Client Examples

Este directorio contiene ejemplos de cómo usar el Enhanced Home Assistant MCP Server desplegado en Smithery.

## 📋 Ejemplos Disponibles

### 1. Simple Client (`simple-client.js`)
Ejemplo básico que muestra cómo conectarse y llamar herramientas.

### 2. Full Featured Client (`smithery-client.js`)
Ejemplo completo que demuestra múltiples funcionalidades del servidor.

## 🚀 Configuración

1. **Instalar dependencias**:
```bash
cd examples
npm install
```

2. **Configurar credenciales**:
Edita los archivos JavaScript y reemplaza:
- `your_long_lived_access_token_here` con tu token de Home Assistant
- `homeassistant.local:8123` con la URL de tu instancia de Home Assistant
- `your-smithery-api-key-here` con tu API key de Smithery

### Obtener Token de Home Assistant

1. Ve a tu instancia de Home Assistant
2. Haz clic en tu perfil (sidebar)
3. Scroll hasta "Long-Lived Access Tokens"
4. Clic en "Create Token"
5. Dale un nombre y copia el token

### Obtener API Key de Smithery

1. Ve a [Smithery.ai](https://smithery.ai)
2. Inicia sesión en tu cuenta
3. Ve a configuración/API keys
4. Crea una nueva API key

## 🎮 Ejecutar Ejemplos

```bash
# Ejemplo simple
npm run simple

# Ejemplo completo
npm run full

# Prueba rápida
npm test
```

## 🔧 Configuración Avanzada

### Variables de Entorno

Puedes usar variables de entorno en lugar de hardcodear las credenciales:

```bash
export HOME_ASSISTANT_TOKEN="tu_token_aqui"
export HOME_ASSISTANT_URL="http://tu-ip:8123"
export SMITHERY_API_KEY="tu_api_key_aqui"
```

Luego modifica el código para usar `process.env.HOME_ASSISTANT_TOKEN`, etc.

### Personalización

Los ejemplos incluyen llamadas a diferentes herramientas:

- **homeassistant_api**: Verificar conexión
- **homeassistant_list_entities**: Listar entidades
- **homeassistant_get_state**: Obtener estado de entidad
- **homeassistant_list_automations**: Listar automatizaciones
- **homeassistant_get_system_info**: Información del sistema
- **homeassistant_search_entities**: Buscar entidades

## 🐛 Troubleshooting

### Error de Conexión
- Verifica que tu URL de Home Assistant sea correcta
- Asegúrate de que Home Assistant sea accesible desde internet (para Smithery)
- Revisa que el token sea válido

### Error de API Key
- Verifica tu API key de Smithery
- Asegúrate de que el servidor esté desplegado en Smithery

### Entidades No Encontradas
- Los ejemplos usan entidades comunes (`sun.sun`)
- Ajusta los `entity_id` según tu configuración específica

## 📝 Usar en tu Aplicación

Para integrar en tu propia aplicación:

```javascript
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createSmitheryUrl } from "@smithery/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

// Tu configuración
const config = {
  homeAssistantToken: process.env.HOME_ASSISTANT_TOKEN,
  homeAssistantUrl: process.env.HOME_ASSISTANT_URL,
  debug: false,
  requestTimeout: 10000
};

// Crear cliente
const serverUrl = createSmitheryUrl("https://server.smithery.ai/@gilberth/enhanced-homeassistant-mcp", { config, apiKey: process.env.SMITHERY_API_KEY });
const transport = new StreamableHTTPClientTransport(serverUrl);
const client = new Client({ name: "Mi App", version: "1.0.0" });

// Conectar y usar
await client.connect(transport);
const result = await client.callTool({ name: "homeassistant_get_state", arguments: { entity_id: "light.living_room" } });
```

## 🎯 Próximos Pasos

1. Ejecuta los ejemplos para verificar la conexión
2. Modifica los ejemplos según tus necesidades
3. Integra el cliente en tu aplicación de IA
4. Explora todas las herramientas disponibles (25+ herramientas)

¡Disfruta automatizando tu hogar con IA! 🏠🤖
