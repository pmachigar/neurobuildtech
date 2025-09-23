# NeuroBuildTech Platform

## 🚀 Descripción General

NeuroBuildTech es una plataforma integral que ofrece servicios especializados en:
- **Inteligencia Artificial y Machine Learning**
- **Automatización de Procesos con n8n**
- **Internet de las Cosas (IoT)**
- **Domótica y Automatización del Hogar**

## 🏗️ Arquitectura

### Backend - Microservicios Hexagonales
```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Users Service │  │ Services Service│  │Consulting Service│
│    (Port 3010)  │  │   (Port 3011)   │  │   (Port 3012)   │
└─────────────────┘  └─────────────────┘  └─────────────────┘

┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   AI Service    │  │   n8n Service   │  │   IoT Service   │
│   (Port 3013)   │  │   (Port 3014)   │  │   (Port 3015)   │
└─────────────────┘  └─────────────────┘  └─────────────────┘

┌─────────────────┐  ┌─────────────────┐
│ Payments Service│  │   API Gateway   │
│   (Port 3016)   │  │   (Port 3000)   │
└─────────────────┘  └─────────────────┘
```

### Frontend - Micro Frontends
```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Shell App     │  │  Landing MFE    │  │ Services MFE    │
│  (Port 3100)    │  │  (Port 3001)    │  │  (Port 3002)    │
└─────────────────┘  └─────────────────┘  └─────────────────┘

┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Dashboard MFE   │  │ AI Tools MFE    │  │   IoT MFE       │
│  (Port 3003)    │  │  (Port 3005)    │  │  (Port 3006)    │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Aplicaciones Móviles
- **iOS**: Aplicación nativa en SwiftUI
- **Android**: Aplicación nativa en Kotlin con Jetpack Compose

## 🛠️ Stack Tecnológico

### Backend
- **Framework**: NestJS (Node.js + TypeScript)
- **Base de Datos**: PostgreSQL
- **Cache**: Redis
- **API**: GraphQL con Apollo Server
- **Autenticación**: JWT + Passport
- **ORM**: TypeORM
- **Containerización**: Docker

### Frontend
- **Framework**: Next.js (React + TypeScript)
- **Module Federation**: Webpack Module Federation
- **Estilos**: Tailwind CSS
- **Estado**: React Context + Apollo Client
- **Testing**: Jest + React Testing Library

### Infraestructura
- **Orquestación**: Docker Compose (dev) / Kubernetes (prod)
- **CI/CD**: GitHub Actions
- **Monitoreo**: Prometheus + Grafana
- **Proxy**: NGINX

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js 18+
- Docker y Docker Compose
- Git

### Instalación

1. **Clonar el repositorio**
```bash
git clone https://github.com/pmachigar/neurobuildtech.git
cd neurobuildtech
```

2. **Configurar variables de entorno**
```bash
cp .env.example .env
# Editar .env con tus configuraciones
```

3. **Iniciar servicios con Docker Compose**
```bash
docker-compose up -d
```

4. **Verificar servicios**
```bash
# API Gateway
curl http://localhost:3000/health

# GraphQL Playground
open http://localhost:3010/graphql
```

### URLs de Servicios

| Servicio | URL | Descripción |
|----------|-----|-------------|
| API Gateway | http://localhost:3000 | Punto de entrada principal |
| Shell App | http://localhost:3100 | Aplicación contenedora |
| Landing MFE | http://localhost:3001 | Página de inicio |
| Services MFE | http://localhost:3002 | Catálogo de servicios |
| Users Service | http://localhost:3010/graphql | Gestión de usuarios |
| GraphQL Playground | http://localhost:3010/graphql | Explorador GraphQL |

## 📁 Estructura del Proyecto

```
neurobuildtech/
├── backend/                    # Microservicios backend
│   ├── users-service/         # Gestión de usuarios y autenticación
│   ├── services-service/      # Catálogo de servicios
│   ├── consulting-service/    # Sistema de tickets y consultoría
│   ├── ai-service/           # Procesamiento de IA
│   ├── n8n-service/          # Integración con n8n
│   ├── iot-service/          # Gestión de dispositivos IoT
│   ├── payments-service/     # Procesamiento de pagos
│   └── api-gateway/          # Gateway de APIs
├── frontend/                  # Micro frontends
│   ├── shell-app/            # Aplicación contenedora
│   ├── mfe-landing/          # Landing page
│   ├── mfe-services/         # Catálogo de servicios
│   ├── mfe-dashboard/        # Dashboard de usuario
│   ├── mfe-consulting/       # Portal de consultoría
│   ├── mfe-ai-tools/         # Herramientas de IA
│   └── mfe-iot/              # Control IoT
├── mobile/                    # Aplicaciones móviles
│   ├── ios-app/              # Aplicación iOS (SwiftUI)
│   └── android-app/          # Aplicación Android (Kotlin)
├── docs/                      # Documentación
│   ├── api/                  # Documentación de APIs
│   ├── architecture/         # Arquitectura del sistema
│   └── deployment/           # Guías de despliegue
├── docker-compose.yml         # Configuración de desarrollo
└── .github/workflows/         # Pipelines CI/CD
```

## 🔧 Desarrollo

### Ejecutar servicios individualmente

```bash
# Backend - Users Service
cd backend/users-service
npm install
npm run start:dev

# Frontend - Landing MFE
cd frontend/mfe-landing
npm install
npm run dev
```

### Ejecutar tests

```bash
# Tests de backend
cd backend/users-service
npm test

# Tests de frontend
cd frontend/mfe-landing
npm test
```

### Debugging

```bash
# Ver logs de servicios
docker-compose logs -f users-service

# Conectar a base de datos
docker-compose exec postgres psql -U neurobuild -d neurobuildtech
```

## 📚 Documentación

- [📖 Documentación de APIs](./docs/api/API_DOCUMENTATION.md)
- [🏗️ Arquitectura del Sistema](./docs/architecture/ARCHITECTURE.md)
- [🚀 Guía de Despliegue](./docs/deployment/DEPLOYMENT.md)

## 🧪 Testing

### Cobertura de Tests
- **Backend**: 80%+ cobertura de código
- **Frontend**: Tests de componentes críticos
- **E2E**: Flujos de usuario principales

### Ejecutar todos los tests
```bash
# Backend
npm run test:backend

# Frontend
npm run test:frontend

# E2E
npm run test:e2e
```

## 🔒 Seguridad

- **Autenticación**: JWT con expiración
- **Autorización**: RBAC (Role-Based Access Control)
- **Encriptación**: HTTPS en producción
- **Validación**: Validación de entrada en todas las APIs
- **Rate Limiting**: Límites de velocidad por usuario/IP

## 🌍 Despliegue

### Desarrollo
```bash
docker-compose up -d
```

### Staging
```bash
docker-compose -f docker-compose.staging.yml up -d
```

### Producción
```bash
# Usar Kubernetes
kubectl apply -f k8s/
```

## 🤝 Contribución

1. Fork el proyecto
2. Crea tu feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver [LICENSE](LICENSE) para más detalles.

## 👥 Equipo

- **Arquitecto de Software**: Diseño y arquitectura del sistema
- **Desarrolladores Backend**: Microservicios y APIs
- **Desarrolladores Frontend**: Micro frontends y UI/UX
- **Desarrolladores Mobile**: Aplicaciones iOS y Android
- **DevOps**: Infraestructura y despliegue

## 📞 Contacto

- **Website**: [neurobuildtech.com](https://neurobuildtech.com)
- **Email**: info@neurobuildtech.com
- **GitHub**: [pmachigar/neurobuildtech](https://github.com/pmachigar/neurobuildtech)

## 🎯 Roadmap

### Q1 2024
- [x] Arquitectura base de microservicios
- [x] Micro frontends básicos
- [x] Aplicaciones móviles
- [x] Pipeline CI/CD

### Q2 2024
- [ ] Capacidades avanzadas de IA
- [ ] Soporte extendido para IoT
- [ ] Funciones de colaboración en tiempo real
- [ ] Dashboard de analytics avanzado

### Q3 2024
- [ ] Recomendaciones con machine learning
- [ ] Integración de interfaces de voz
- [ ] Edge computing para IoT
- [ ] Arquitectura multi-tenant

### Q4 2024
- [ ] Expansión internacional
- [ ] Workflows de automatización avanzados
- [ ] Analytics predictivos
- [ ] Integración blockchain

---

**🚀 ¡Construyendo el futuro de la tecnología, una neurona a la vez!** 
