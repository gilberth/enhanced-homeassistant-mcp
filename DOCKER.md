# Docker Deployment Guide

Este documento explica cómo construir y desplegar el Enhanced Home Assistant MCP Server usando Docker.

## 🐳 Construcción Local

### Prerrequisitos

- Docker instalado y funcionando
- Git (para clonar el repositorio)

### Pasos para Construir

1. **Clonar el repositorio**:

```bash
git clone <repository-url>
cd enhanced-homeassistant-mcp
```

2. **Construir la imagen Docker**:

```bash
docker build -t enhanced-homeassistant-mcp .
```

3. **Probar la construcción**:

```bash
./test-docker.sh
```

## 🚀 Despliegue

### Usando Docker Run

```bash
docker run -d \
  --name homeassistant-mcp \
  --restart unless-stopped \
  -e HOME_ASSISTANT_URL="http://your-hass-ip:8123" \
  -e HOME_ASSISTANT_TOKEN="your_long_lived_token" \
  -e DEBUG="false" \
  -e REQUEST_TIMEOUT="10000" \
  enhanced-homeassistant-mcp
```

### Usando Docker Compose

Crea un archivo `docker-compose.yml`:

```yaml
version: "3.8"

services:
  homeassistant-mcp:
    build: .
    container_name: homeassistant-mcp
    restart: unless-stopped
    environment:
      - HOME_ASSISTANT_URL=http://homeassistant:8123
      - HOME_ASSISTANT_TOKEN=your_long_lived_token
      - DEBUG=false
      - REQUEST_TIMEOUT=10000
    networks:
      - homeassistant

networks:
  homeassistant:
    external: true
```

Luego ejecuta:

```bash
docker-compose up -d
```

## 🛡️ Características de Seguridad

- **Multi-stage build**: Reduce el tamaño de la imagen final
- **Usuario no-root**: El contenedor ejecuta como usuario `mcpuser`
- **Imagen base reciente**: Usa Node.js 22 Alpine para menos vulnerabilidades
- **Dependencias mínimas**: Solo dependencias de producción en la imagen final

## 🔧 Variables de Entorno

| Variable               | Descripción                           | Requerida | Valor por Defecto           |
| ---------------------- | ------------------------------------- | --------- | --------------------------- |
| `HOME_ASSISTANT_URL`   | URL de tu instancia de Home Assistant | ✅        | `http://homeassistant:8123` |
| `HOME_ASSISTANT_TOKEN` | Token de acceso de larga duración     | ✅        | `your_token_here`           |
| `DEBUG`                | Habilitar logs de depuración          | ❌        | `false`                     |
| `REQUEST_TIMEOUT`      | Timeout de requests en milisegundos   | ❌        | `10000`                     |

## 📊 Monitoreo

### Health Check

El contenedor incluye un health check que se ejecuta cada 30 segundos:

```bash
# Verificar estado del contenedor
docker ps
docker inspect homeassistant-mcp --format='{{.State.Health.Status}}'
```

### Logs

```bash
# Ver logs en tiempo real
docker logs -f homeassistant-mcp

# Ver últimos 100 logs
docker logs --tail 100 homeassistant-mcp
```

## 🔍 Troubleshooting

### Problema: Build Falla con "tsc: not found"

**Solución**: Este error indica que TypeScript no está disponible. El Dockerfile actualizado lo resuelve usando multi-stage build.

### Problema: Token Inválido

**Solución**:

1. Verifica que el token sea válido
2. Asegúrate de que Home Assistant sea accesible desde el contenedor
3. Revisa los logs: `docker logs homeassistant-mcp`

### Problema: Cannot connect to Home Assistant

**Solución**:

1. Verifica la URL de Home Assistant
2. Asegúrate de que ambos contenedores estén en la misma red Docker
3. Para Home Assistant en el mismo host, usa `host.docker.internal:8123`

## 🐛 Debug Mode

Para habilitar el modo debug:

```bash
docker run -d \
  --name homeassistant-mcp-debug \
  -e DEBUG="true" \
  -e HOME_ASSISTANT_URL="http://your-hass-ip:8123" \
  -e HOME_ASSISTANT_TOKEN="your_token" \
  enhanced-homeassistant-mcp
```

Luego verifica los logs detallados:

```bash
docker logs -f homeassistant-mcp-debug
```

## 📦 Optimización de Imagen

El Dockerfile está optimizado para:

- **Tamaño mínimo**: Multi-stage build elimina herramientas de desarrollo
- **Seguridad**: Usuario no-root, imagen base reciente
- **Performance**: Caché de capas Docker optimizado
- **Mantenibilidad**: Estructura clara y documentada

### Tamaños Típicos

- Imagen de desarrollo: ~400MB
- Imagen de producción: ~150MB
- Código compilado: ~1MB

## 🔄 Actualización

Para actualizar a una nueva versión:

```bash
# Detener contenedor actual
docker stop homeassistant-mcp

# Reconstruir imagen
git pull
docker build -t enhanced-homeassistant-mcp .

# Reiniciar con nueva imagen
docker start homeassistant-mcp
```

## 📋 Checklist de Despliegue

- [ ] Docker instalado y funcionando
- [ ] Token de Home Assistant válido
- [ ] URL de Home Assistant accesible
- [ ] Variables de entorno configuradas
- [ ] Red Docker configurada (si es necesario)
- [ ] Logs verificados tras el despliegue
- [ ] Health check funcionando
- [ ] Conectividad con Home Assistant confirmada
