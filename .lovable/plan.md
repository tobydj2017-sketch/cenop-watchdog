# Planilla Diaria — Vista de Conjunto

Nueva vista tipo grilla donde se cargan todos los servicios del día proyectado en una sola pantalla (como Excel), con guardado automático fila por fila en el sistema (Azure + local), evitando la doble carga.

## Objetivo
Reemplazar el flujo actual (Excel externo → imprimir → cargar servicio por servicio) por una **única planilla dentro de la app** que permita:
- Ver todos los servicios del día en una sola vista (rebotes, distribución de móviles, choferes/custodios, cargas parejas).
- Editar cualquier celda inline.
- Autoguardado al salir de cada celda (blur) — se sincroniza a Azure como el resto.
- Agregar/eliminar filas dinámicamente.

## Ubicación en la app
- Nueva pestaña en `Index.tsx`: **"Planilla del día"** (junto a "Carga de Datos" y "Panel de Análisis"), visible para Admin y roles con permiso de carga.
- Botón "Cargar Servicio" existente se mantiene para carga individual/rápida; ambos flujos conviven y usan el mismo store.

## Columnas de la planilla (orden operativo para "visión de conjunto")
Fila = 1 servicio. Encabezados sticky. Alto de fila compacto.

1. Nº (auto, editable)
2. Hora solicitud
3. Cliente (SearchableSelect)
4. Lugar salida
5. Destino
6. Chofer (SearchableSelect) + Cita
7. Custodio (SearchableSelect) + Cita
8. Móvil (SearchableSelect) → autocompleta Celular
9. Salida CENOP / Llegada servicio / Inicia / Llegada destino / Finaliza / Llegada CENOP
10. Franco Chofer / Franco Custodio
11. Orden de carga / Remito / Continúa
12. KM salida / KM llegada (auto KM recorridos)
13. Observaciones
14. Acciones (duplicar fila, eliminar)

Encima de la grilla:
- Selector de fecha del día proyectado.
- Contador de servicios, choferes únicos, custodios únicos, móviles únicos (para detectar solapamientos/desbalance).
- Botón "Agregar fila" y "Duplicar última".
- Indicador de guardado ("Guardado ✓" / "Guardando…").

## Comportamiento
- Al cambiar la fecha, se listan todos los servicios existentes de ese día y se agregan filas vacías al final para nueva carga.
- Cada celda edita el `ServiceEntry` en memoria; al hacer blur (o Enter) se llama `saveService` (mismo path que el formulario actual → Azure sync).
- Validaciones existentes se mantienen (remito único, solapamientos de personal). Si falla, la celda se marca en rojo con tooltip; el resto queda guardado.
- Inputs de tiempo usan `TimeInput` (4 dígitos, autoformato). Selectores usan `SearchableSelect` en modo compacto.
- Detección visual de conflictos: si un chofer/custodio/móvil aparece con horarios solapados en dos filas, se resalta la celda en amarillo (no bloquea; es aviso visual — clave para la "visión de conjunto").
- Fila con datos mínimos (cliente + al menos un horario) se guarda; filas totalmente vacías se ignoran.

## Archivos a crear/modificar

**Nuevos**
- `src/components/PlanillaDia.tsx` — la grilla completa (grid CSS con columnas fijas, scroll horizontal si hace falta, sticky header y primera columna Nº).
- `src/components/planilla/PlanillaRow.tsx` — fila editable, maneja estado local + debounce de guardado.
- `src/components/planilla/PlanillaCell.tsx` — celda genérica (texto, tiempo, selector).

**Modificados**
- `src/pages/Index.tsx` — agregar la tab "Planilla del día".
- `src/lib/store.ts` — reusar `saveService` existente; agregar helper `getServicesByDate(fecha)` si no existe.

## Detalles técnicos

- **Rendimiento**: la grilla mantiene estado local por fila; solo la fila editada re-renderiza. `saveService` se llama con debounce de 400ms por fila para no saturar Azure.
- **Layout**: `overflow-x-auto` con `min-width` para forzar todas las columnas visibles con scroll horizontal en monitores chicos; sticky top para encabezados y sticky left para Nº+Cliente para no perder referencia.
- **Detección de solapamiento**: función pura que recibe todas las filas del día y devuelve, para cada persona/móvil, los rangos que se pisan → set de `{rowId, campo}` para resaltar.
- **Compatibilidad**: los servicios cargados desde la planilla son idénticos a los del formulario; se sincronizan con Azure con el mismo mecanismo (IDs, tombstones, merge remoto).
- **Sin cambios en tipos ni en lógica de horas productivas/improductivas**.

## Fuera de alcance de esta iteración
- Importar directamente el Excel viejo (se puede agregar después).
- Edición offline con reconciliación (ya está cubierta por el sync general).
- Impresión con formato AIPEM desde la planilla (ya existe la exportación desde reportes).
