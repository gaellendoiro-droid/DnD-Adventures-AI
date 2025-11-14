# D&D Adventures AI - Visión y Estado del Proyecto

## 🎯 Visión General

D&D Adventures AI es una aplicación web que permite jugar partidas de Dungeons & Dragons 5e con un Dungeon Master potenciado por IA (Google Gemini 2.5 Flash). El proyecto combina la flexibilidad narrativa de la IA con las mecánicas estructuradas de D&D 5e para crear una experiencia de juego inmersiva y dinámica.

## ✅ Características Implementadas

### Sistema de IA y Narrativa
- **AI Dungeon Master**: Google Gemini 2.5 Flash actúa como DM, interpretando acciones del jugador y narrando el mundo del juego basándose en reglas de D&D 5e
- **Compañeros IA**: Personajes controlados por IA que reaccionan a las situaciones y participan activamente en el juego
- **Asistente Fuera de Personaje (OOC)**: Para preguntas sobre reglas o información del mundo sin romper la inmersión
- **Memoria Contextual**: Sistema de historial de conversación para mantener coherencia narrativa

### Gestión de Personajes
- **Creación de Personajes**: Soporte para hasta 4 personajes, controlados por humano o IA
- **Fichas Completas**: Estadísticas, habilidades, inventario, conjuros, HP, AC, modificadores
- **Cálculo Automático**: Modificadores de habilidad calculados automáticamente
- **Persistencia**: Sistema de guardado y carga de partidas

### Sistema de Combate ⚔️ (Completado v0.5.x)
- **Combate por Turnos**: Sistema completamente funcional siguiendo reglas de D&D 5e
- **Orden de Iniciativa**: Cálculo automático y gestión de turnos
- **Tiradas de Dados**: Sistema robusto con detección automática de críticos (20 natural) y pifias (1 natural)
- **IA Táctica**: Enemigos y compañeros toman decisiones inteligentes basadas en el estado del combate
- **Gestión de HP**: Seguimiento de puntos de vida, aplicación de daño y curación
- **Detección de Fin de Combate**: Automática cuando todos los enemigos o aliados son derrotados
- **Panel de Tiradas**: Visualización detallada de todas las tiradas con información de combate (AC, acierto/fallo, daño, etc.)
- **Resaltado Visual**: Críticos y pifias destacados visualmente con animaciones

### Sistema de Tiradas de Dados
- **Notación Estándar D&D**: Soporta notaciones como "1d20+5", "2d6", "1d8+3"
- **Resultados Detallados**: Muestra resultados individuales de cada dado más el modificador
- **Críticos y Pifias**: Detección automática en tiradas de d20
- **Contexto de Combate**: Información adicional en combate (objetivo, AC, daño infligido, etc.)
- **Tipos de Ataque**: Sistema de metadata explícita (`attack_roll`, `saving_throw`, `healing`)

### Integración con D&D 5e API
- **Consulta de Monstruos**: Obtiene estadísticas oficiales de monstruos
- **Consulta de Hechizos**: Información de hechizos de D&D 5e
- **Mapeo Español-Inglés**: Traduce nombres de monstruos/hechizos comunes
- **Fallback Inteligente**: Sistema de retry y fallback para problemas de conectividad

### Aventuras y Mundo del Juego
- **Carga de Aventuras JSON**: Sistema flexible para cargar aventuras en formato JSON
- **Navegación por Ubicaciones**: Sistema de exploración de diferentes localizaciones
- **Entidades y PNJs**: Interacción con personajes no jugadores y objetos del mundo
- **Descripción de Ambientes**: Narraciones detalladas generadas por IA

### Interfaz de Usuario
- **Diseño Moderno**: Interfaz limpia construida con React, Next.js 15 y Tailwind CSS
- **Panel de Chat**: Historial de conversación con formato Markdown
- **Panel de Grupo**: Visualización de HP, AC y estado de todos los personajes
- **Panel de Tiradas**: Log detallado de todas las tiradas de dados con resaltado visual
- **Tracker de Iniciativa**: Orden de turnos en combate con indicador de turno actual
- **Fichas de Personaje**: Vista detallada de estadísticas, inventario y hechizos
- **Responsive**: Adaptable a diferentes tamaños de pantalla

### Sistemas Técnicos
- **Arquitectura Cliente-Servidor**: Separación clara entre frontend (React) y backend (Genkit IA)
- **Server Actions**: Comunicación segura mediante Next.js Server Actions
- **Validación con Zod**: Esquemas tipados y validación en runtime
- **Sistema de Logging**: Logging estructurado centralizado (servidor y cliente)
- **Sanitización HTML**: Protección contra XSS con DOMPurify
- **Manejo de Errores**: Sistema robusto de try-catch con mensajes claros al usuario

## 🚧 En Desarrollo / Mejoras Pendientes

### Prioridad Alta
- **Refactoring de `combat-manager.ts`**: Dividir en módulos más pequeños y manejables (Issue #21 - Código duplicado) - **EN CURSO**
- **Sistema de Turnos Paso a Paso**: Permitir al jugador controlar manualmente cada turno en lugar de procesar todos de golpe (se implementará después de la refactorización)
- **Sistema de Progresión**: XP, subida de nivel, mejora de estadísticas
- **Inicio de Combate Dinámico**: Evaluación automática de hostilidad para iniciar combate cuando las acciones del jugador lo provoquen
- **Mejora de Fichas de Personaje**: Mejor organización, visualización de estados temporales, pestañas colapsables

### Prioridad Media
- **Sistema Completo de Saving Throws**: Implementar tiradas de salvación del objetivo y cálculo de Spell Save DC (Issue #22)
- **Compendio de D&D Local**: Base de datos local con información de monstruos, hechizos y reglas para consultas rápidas
- **Sistema de Estados y Condiciones**: Gestión de estados temporales (aturdido, envenenado, etc.) y recursos gastados
- **IA Conversacional Avanzada**: Streaming y reacciones en tiempo real
- **Convertidor PDF a JSON**: Aplicación auxiliar para convertir aventuras en PDF a JSON

### Deuda Técnica Identificada
- **Issue #21**: ~520 líneas de código duplicado en procesamiento de rolls
- **Issue #16**: Gestión de nombres de enemigos debería estar en módulo separado
- **Issue #14**: Mejorar prompts de enemigos para evitar turnos sin acción

## 🎨 Diseño e Interfaz

### Tema Visual
- **Paleta de Colores**: Tonos oscuros con acentos vibrantes para críticos/pifias
- **Tipografía**: Fuentes claras y legibles optimizadas para lectura extendida
- **Componentes UI**: shadcn/ui + Radix UI para componentes accesibles
- **Estilos**: Tailwind CSS para diseño responsive y moderno
- **Animaciones**: Efectos sutiles para tiradas críticas, pifias y transiciones

### Paneles Principales
- **Chat Panel**: Narración del DM y diálogos de personajes
- **Dice Log Panel**: Registro detallado de tiradas con resaltado visual
- **Party Panel**: Estado del grupo (HP, AC, estados)
- **Initiative Tracker**: Orden de combate con indicador visual
- **Debug Panel**: Logs de desarrollo (solo en desarrollo)

## 📚 Documentación

- **[Inicio Rápido](./inicio-rapido.md)**: Guía de instalación y configuración
- **[Roadmap](./roadmap.md)**: Mejoras futuras planificadas
- **[Plan Maestro](./planes-desarrollo/plan-maestro.md)**: Estado y coordinación de planes de desarrollo
- **[Arquitectura](./arquitectura/vision-general.md)**: Documentación técnica del proyecto
- **[Referencia API](./arquitectura/referencia-api.md)**: Esquemas y contratos de las herramientas de IA
- **[CHANGELOG](../CHANGELOG.md)**: Historial completo de cambios

## 🎯 Visión a Largo Plazo

El objetivo es crear una plataforma completa para jugar D&D 5e con IA que:
- **Sea fiel a las reglas oficiales** de D&D 5e
- **Ofrezca experiencias narrativas ricas** gracias a la IA generativa
- **Permita campañas largas** con sistema de progresión y persistencia
- **Facilite la creación de contenido** mediante herramientas de conversión (PDF→JSON)
- **Funcione offline** con compendio local de D&D
- **Sea extensible** permitiendo añadir nuevas aventuras y mecánicas fácilmente

---

**Estado del Proyecto**: Fase Alpha - Sistema de combate completado, sistema de progresión pendiente

**Última Actualización**: Noviembre 2024