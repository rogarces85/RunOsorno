# Harness decisions

- Accepted plan `b0b270feedb2c9fd9f043779e710110b9613fc5514e4747850ed5c6f4fd5d22a`.
- Project kind: software.
- SDD: selected.
- [2026-10-27] Documentación del sistema en el wiki. Requisitos: el dueño pidió documentar el sistema antes de cualquier tarea concreta; el repo ya tiene AGENTS.md (canónico), README y 10 guías en docs/. Opciones: (1) duplicar la documentación completa en el wiki, (2) destilar artículos cortos que enlacen las fuentes canónicas, (3) solo índice de enlaces. Elegida: (2), porque AGENTS.md y docs/ ya son verdadera fuente y un duplicado se vuelve mentira a la primera edición (sincronización manual indefinida); y un índice seco no destila nada (la primera lectura del agente sigue costando 10 archivos). Artículos: 5 (arquitectura ×2, operaciones ×2, meta ×1), copias raw de README/AGENTS como evidencia de estado. Contradicción detectada (frecuencia del cron de calentamiento) anotada, no resuelta.
- [2026-10-27] Sin carpetas 01-TOOLS en esta corrida. Evidence: R2, Resend, Sentry y Hyperdrive detectados en código, pero la regla no-speculative-tools exige que la carpeta la construya `connect-tool` cuando el dueño pida esa herramienta a mano. Queda como oferta pendiente.

