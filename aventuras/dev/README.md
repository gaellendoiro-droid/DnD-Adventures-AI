# Recursos de Desarrollo para Aventuras JSON

Este directorio contiene los recursos necesarios para crear y validar aventuras en formato JSON para D&D Adventures AI.

## Archivos Disponibles

### 1. `_template.json`
**Propósito:** Plantilla de ejemplo con la estructura básica de una aventura.

**Cuándo usarlo:**
- Como punto de partida para crear una nueva aventura
- Para ver ejemplos de cada tipo de campo
- Para copiar y pegar estructuras comunes

**Uso:**
```bash
# Copia el template y renómbralo
cp _template.json ../mi-aventura.json
```

### 2. `adventure.schema.json`
**Propósito:** Schema JSON formal para validación automática.

**Cuándo usarlo:**
- Para validar que tu JSON cumple con la estructura correcta
- En editores que soporten JSON Schema (VS Code, etc.)
- Para autocompletado y detección de errores

**Uso en VS Code:**
1. Añade `"$schema": "./dev/adventure.schema.json"` al inicio de tu JSON
2. VS Code validará automáticamente y ofrecerá autocompletado

**Ejemplo:**
```json
{
  "$schema": "./dev/adventure.schema.json",
  "adventureId": "mi-aventura",
  ...
}
```

### 3. `guia-construccion-aventuras.md`
**Propósito:** Guía completa y detallada que explica todas las posibilidades del formato.

**Cuándo usarlo:**
- Para entender qué hace cada campo y cómo usarlo
- Para ver casos de uso avanzados y patrones comunes
- Para aprender mejores prácticas
- Cuando el template o schema no son suficientes

**Contenido:**
- Explicación detallada de cada campo
- Ejemplos prácticos
- Mejores prácticas
- Patrones comunes
- Ejemplos avanzados

## Flujo de Trabajo Recomendado

1. **Empieza con el template:**
   ```bash
   cp _template.json ../mi-aventura.json
   ```

2. **Configura el schema en tu editor:**
   Añade `"$schema": "./dev/adventure.schema.json"` al inicio del JSON

3. **Consulta la guía:**
   Abre `guia-construccion-aventuras.md` cuando necesites:
   - Entender qué hace un campo específico
   - Ver ejemplos de uso
   - Aprender mejores prácticas

4. **Valida tu trabajo:**
   - El editor validará automáticamente con el schema
   - Revisa que todos los IDs referenciados existan
   - Prueba la aventura en el sistema

## Relación entre los Archivos

```
_template.json              →  Estructura básica y ejemplos
         ↓
adventure.schema.json       →  Validación formal y reglas
         ↓
guia-construccion-aventuras.md  →  Explicación completa y casos de uso
```

- **Template:** "¿Cómo se ve?"
- **Schema:** "¿Es válido?"
- **Guía:** "¿Cómo y por qué usarlo?"

## Ejemplos de Aventuras

Para ver ejemplos reales de aventuras completas, consulta:
- `../el-dragon-del-pico-agujahelada.json` - Aventura completa grande
- `../test/ambush_test.json` - Aventura de prueba con combate

## Notas

- El schema y la guía se actualizan cuando se añaden nuevas características
- Si encuentras inconsistencias entre los archivos, reporta el problema
- La guía es más detallada que el schema; úsala para entender el "por qué"




