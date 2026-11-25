# FleetFlow Project Rules

1. Source of truth: `docs/reference/FleetFlow_Product_UX_Specification_and_Implementation_Blueprint.docx`.

2. The approved technology stack is fixed. Never add, remove, or replace dependencies without asking me first.

3. Zustand is the single source of truth. Application code must never access localStorage directly. Zustand persist may manage persistence internally.

4. Business logic belongs in feature services, not UI components.

5. Follow the DOCX feature priorities: Must Have first, then Should Have, then Could Have.

6. Out of scope: GPS tracking, real maps, payments, production backend, database, and vehicle maintenance.

7. Follow the approved domain model, workflows, business rules, and architecture decisions.

8. Work on one approved phase at a time. After completing it, stop and report the results. Wait for my approval before proceeding.

9. If you discover a new requirement gap, contradiction, or architectural decision, explain the issue, impact, simplest recommendation, and trade-off. Do not decide silently.

10. Keep implementation and reports concise. Avoid unnecessary abstractions and over-engineering.

11. All UI implementation and components must strictly follow `docs/architecture/UI_UX_DESIGN_GUIDELINES.md` across visual hierarchy, semantic colors, component consistency, responsive viewports (desktop, tablet, mobile), and accessibility standards.
