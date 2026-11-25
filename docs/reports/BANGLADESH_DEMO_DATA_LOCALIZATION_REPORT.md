# FleetFlow — Bangladesh Demo Data Localization Report

**Status:** Completed & Verified  
**Date:** 2026-11-25  
**Scope:** Demo Data Localization ONLY (Personas, Passengers, Locations, Activity Descriptions, Notifications)  
**Authoritative References:** Root `AGENTS.md`, `UNIFIED_UX_SPECIFICATION.md`, `UI_UX_DESIGN_GUIDELINES.md`, Official Product Blueprint

---

## 1. Executive Summary

This report documents the localized demo dataset configured for FleetFlow, establishing realistic Bangladeshi business personas written in English script, plausible industrial/corporate Dhaka metropolitan locations, and realistic fictional demo contact information.

All changes strictly adhere to the project constraints:
1. **Zero Schema Alterations:** All entity IDs (`usr_emp_01`, `usr_adm_01`, `usr_drv_01`, `veh_01`, `req_001`, `leg_001_out`, `asg_003_out`, `pas_001`, `act_001`, `notif_001`, etc.) remain identical.
2. **Relational & Workflow Integrity:** All 10 requests, 15 trip legs, 9 vehicle assignments, 21 passenger associations, 7 activity audit records, and 5 notifications retain exact relational links, timestamps, and lifecycle statuses.
3. **Seed Count Preservation:** 8 users (3 employees, 2 admins, 3 drivers), 4 vehicles, 10 requests, 15 trip legs, 9 assignments, 21 passengers, 7 audit logs, and 5 notifications are preserved 1:1.
4. **UI Copy Intact:** Application labels, navigation menus, and workflow controls remain in standard English.
5. **No Logic or Dependency Expansion:** Zero external dependencies were added or altered; business logic remains in service layers.
6. **Full Validation:** All 206 unit/integration tests pass, TypeScript compiles with zero errors, and Next.js production build succeeds.

---

## 2. Persona Inventory & Replacement Mapping

### 2.1 Employees (3 Personas)

| User ID | Original Persona | Localized Bangladeshi Persona | Localized Email | Department | Contact Phone |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `usr_emp_01` | Sarah Jenkins | **Nusrat Jahan** | `nusrat.jahan@fleetflow.com` | Powertrain Engineering | `+880-1711-010101` |
| `usr_emp_02` | David Chen | **Tanvir Ahmed** | `tanvir.ahmed@fleetflow.com` | Supply Chain & Logistics | `+880-1711-010202` |
| `usr_emp_03` | Emily Rodriguez | **Farzana Yasmin** | `farzana.yasmin@fleetflow.com` | Quality Assurance | `+880-1711-010303` |

### 2.2 Administrators & Dispatchers (2 Personas)

| User ID | Original Persona | Localized Bangladeshi Persona | Localized Email | Department | Contact Phone |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `usr_adm_01` | Alex Morgan | **Mohammad Arif Hasan** | `arif.hasan@fleetflow.com` | Corporate Fleet Operations | `+880-1711-020101` |
| `usr_adm_02` | Michael Scott | **Syed Kamal Uddin** | `kamal.uddin@fleetflow.com` | Regional Dispatch Administration | `+880-1711-020202` |

### 2.3 Drivers (3 Personas)

| User ID | Driver ID | Original Persona | Localized Bangladeshi Persona | Localized Email | Department | Contact Phone | Assigned Vehicle |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `usr_drv_01` | `drv_01` | Marcus Vance | **Abdul Karim** | `abdul.karim@fleetflow.com` | Transportation Services | `+880-1811-030101` | `veh_02` (Toyota Camry) |
| `usr_drv_02` | `drv_02` | James Wilson | **Md. Rafiqul Islam** | `rafiqul.islam@fleetflow.com` | Transportation Services | `+880-1811-030202` | `veh_01` (Ford Transit) |
| `usr_drv_03` | `drv_03` | Carlos Mendez | **Abdur Rahim** | `abdur.rahim@fleetflow.com` | Transportation Services | `+880-1811-030303` | `veh_04` (Honda Accord) |

---

## 3. Passenger / Colleague Manifest Inventory (21 Passengers)

| Passenger ID | Linked Request ID | Original Name | Localized Name | Employee ID | Department |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `pas_001` | `req_001` | Robert Taylor | **Kazi Tariqul Islam** | `EMP-701` | Powertrain Engineering |
| `pas_002` | `req_001` | Lisa Ray | **Sadia Sultana** | `EMP-702` | Powertrain Engineering |
| `pas_003` | `req_002` | Arthur Dent | **Zubair Hossain** | `EMP-703` | Logistics |
| `pas_004` | `req_002` | Tricia McMillan | **Roxana Akhter** | `EMP-704` | Procurement |
| `pas_005` | `req_002` | Ford Prefect | **Anisur Rahman** | `EMP-705` | Supplier Quality |
| `pas_006` | `req_002` | Marvin Android | **Shafiqul Alam** | `EMP-706` | Data Systems |
| `pas_007` | `req_003` | Grace Hopper | **Tasnim Ferdous** | `EMP-707` | Quality Assurance |
| `pas_008` | `req_004` | Alan Turing | **Mahmudur Rahman** | `EMP-708` | Embedded Software |
| `pas_009` | `req_004` | Ada Lovelace | **Nabila Zerin** | `EMP-709` | Hardware Systems |
| `pas_010` | `req_004` | Claude Shannon | **Imtiaz Hossain** | `EMP-710` | Telematics |
| `pas_011` | `req_006` | Margaret Hamilton | **Mehnaz Parveen** | `EMP-711` | Quality Assurance |
| `pas_012` | `req_007` | Katherine Johnson | **Sharmin Akter** | `EMP-712` | Calculations |
| `pas_013` | `req_008` | Dorothy Vaughan | **Shirin Shila** | `EMP-713` | Operations |
| `pas_014` | `req_008` | Mary Jackson | **Tahmina Begum** | `EMP-714` | Operations |
| `pas_015` | `req_008` | John Glenn | **Monirul Haque** | `EMP-715` | Field Ops |
| `pas_016` | `req_008` | Neil Armstrong | **Ashraful Islam** | `EMP-716` | Field Ops |
| `pas_017` | `req_008` | Buzz Aldrin | **Golam Mostafa** | `EMP-717` | Field Ops |
| `pas_018` | `req_009` | Michael Collins | **Sabbir Hossain** | `EMP-718` | Flight Testing |
| `pas_019` | `req_009` | Gene Kranz | **Rezaul Karim** | `EMP-719` | Flight Control |
| `pas_020` | `req_009` | Chris Kraft | **Nazmul Huda** | `EMP-720` | Flight Control |
| `pas_021` | `req_010` | Barbara Morgan | **Farhana Haque** | `EMP-721` | Engineering |

---

## 4. Corporate & Industrial Locations

| Original Location | Localized Bangladesh Location | Geographic Context |
| :--- | :--- | :--- |
| `Headquarters — Metro Center` | **Corporate Headquarters — Gulshan, Dhaka** | Commercial business district hub |
| `North Manufacturing Plant — Detroit` | **North Assembly Plant — Gazipur Industrial Area** | Major manufacturing and industrial belt |
| `South Assembly Facility — Toledo` | **South Manufacturing Complex — Narayanganj BSCIC** | Export processing and light industrial complex |
| `Tech Innovation Center — Ann Arbor` | **Hi-Tech Innovation Center — Kaliakoir, Gazipur** | National technology and R&D park zone |
| `Regional Distribution Hub — Cleveland` | **Central Distribution Hub — Tongi, Gazipur** | Central supply chain logistics depot |
| `Metro Airport Terminal 2` | **Hazrat Shahjalal International Airport — Cargo Terminal** | Primary international freight and cargo gateway |

All occurrences in `src/lib/constants/domain.ts` (`COMPANY_LOCATIONS`) and `src/data/seed/seed-data.ts` (`tripLegs`) were updated uniformly.

---

## 5. Vehicle Inventory

| Vehicle ID | Registration | Original Model (Preserved) | Seating Capacity | Seed Operational Status |
| :--- | :--- | :--- | :--- | :--- |
| `veh_01` | `FLT-1010` | **Ford Transit Passenger Van** | 8 | `IN_USE` |
| `veh_02` | `FLT-2020` | **Toyota Camry Hybrid Sedan** | 4 | `IN_USE` |
| `veh_03` | `FLT-3030` | **Mercedes-Benz Sprinter Executive** | 12 | `AVAILABLE` |
| `veh_04` | `FLT-4040` | **Honda Accord Hybrid** | 4 | `IN_USE` |

---

## 6. Audit Trail & In-App Notifications

### 6.1 Activity Logs

| Activity ID | Request ID | Actor | Action | Localized Description |
| :--- | :--- | :--- | :--- | :--- |
| `act_001` | `req_001` | `usr_emp_01` (Nusrat) | `REQUEST_SUBMITTED` | Nusrat Jahan submitted a one-way vehicle request for 3 passengers. |
| `act_002` | `req_002` | `usr_emp_02` (Tanvir) | `REQUEST_SUBMITTED` | Tanvir Ahmed submitted a round-trip vehicle request for 5 passengers. |
| `act_003` | `req_002` | `usr_adm_01` (Mohammad) | `REQUEST_APPROVED` | Mohammad Arif Hasan reviewed and approved the transportation request. |
| `act_004` | `req_003` | `usr_adm_01` (Mohammad) | `ASSIGNMENT_DISPATCHED` | Mohammad Arif Hasan assigned Abdul Karim with Toyota Camry (FLT-2020) to outbound leg. |
| `act_005` | `req_004` | `usr_drv_02` (Md. Rafiqul) | `TRIP_STARTED` | Md. Rafiqul Islam departed from Corporate Headquarters with 4 passengers. |
| `act_006` | `req_009` | `usr_adm_02` (Syed) | `REQUEST_REJECTED` | Syed Kamal Uddin rejected the request: No multi-passenger vehicles available for requested peak holiday window. |
| `act_007` | `req_010` | `usr_emp_01` (Nusrat) | `REQUEST_CANCELLED` | Nusrat Jahan cancelled the request before administrative review. |

### 6.2 In-App Notifications

| Notification ID | Recipient | Title | Read State | Localized Message |
| :--- | :--- | :--- | :--- | :--- |
| `notif_001` | `usr_adm_01` (Mohammad) | New Vehicle Request Submitted | `false` | Nusrat Jahan submitted a request (req_001) for travel to North Assembly Plant. |
| `notif_002` | `usr_emp_02` (Tanvir) | Vehicle Request Approved | `false` | Your round-trip request (req_002) has been approved and is queued for driver assignment. |
| `notif_003` | `usr_drv_01` (Abdul) | New Trip Assignment | `false` | You have been assigned to trip leg (leg_003_out) scheduled for upcoming departure. |
| `notif_004` | `usr_emp_01` (Nusrat) | Driver En Route | `true` | Md. Rafiqul Islam has begun transit for your journey to North Assembly Plant. |
| `notif_005` | `usr_emp_03` (Farzana) | Vehicle Request Rejected | `true` | Your request (req_009) could not be accommodated due to vehicle unavailability. |

---

## 7. Modified Files Summary

| File | Nature of Changes |
| :--- | :--- |
| `src/data/seed/seed-data.ts` | Localized users, drivers, vehicles, requests, trip legs, passengers, activity logs, and notifications. |
| `src/lib/constants/domain.ts` | Updated `COMPANY_LOCATIONS` array to match Bangladesh industrial/corporate facilities. |
| `src/components/shared/employee-auth-guard.tsx` | Updated default fallback button label to "Switch to Nusrat Jahan (Employee)". |
| `src/app/demo/preview/page.tsx` | Updated fallback button label to "Switch to Nusrat Jahan (Employee)". |
| `src/features/notifications/components/__tests__/employee-notifications-page.test.tsx` | Updated test comments referring to Tanvir Ahmed (`usr_emp_02`). |
| `src/features/notifications/components/__tests__/header-notification-integration.test.tsx` | Updated test suite descriptions and comments to Tanvir Ahmed and Nusrat Jahan. |

---

## 8. Quality Assurance & Validation Evidence

### 8.1 Automated Test Suite (`npm test`)
```
 RUN  v3.2.7 C:/Projects/Level-2/FleetFlow-Company-Vehicle-Management

 ✓ src/features/notifications/components/__tests__/notification-card.test.tsx (11 tests)
 ✓ src/features/notifications/components/__tests__/notification-popover.test.tsx (34 tests)
 ✓ src/features/vehicle-requests/components/__tests__/activity-timeline.test.tsx (12 tests)
 ✓ src/features/notifications/components/__tests__/employee-notifications-page.test.tsx (16 tests)
 ✓ src/features/notifications/components/__tests__/header-notification-integration.test.tsx (13 tests)
 ✓ src/features/notifications/selectors/__tests__/notification-selectors.test.ts (31 tests)
 ✓ src/features/vehicle-requests/components/__tests__/step-3-3-components.test.tsx (12 tests)
 ✓ src/features/notifications/components/__tests__/notification-filter-buttons.test.tsx (6 tests)
 ✓ src/features/vehicle-requests/selectors/__tests__/trip-selectors.test.ts (28 tests)
 ✓ src/features/notifications/components/__tests__/notification-feed.test.tsx (10 tests)
 ✓ src/services/__tests__/trip-transitions.test.ts (6 tests)
 ✓ src/features/vehicle-requests/components/__tests__/step-3-4-integration.test.tsx (17 tests)
 ✓ src/services/__tests__/assignment-conflict.test.ts (10 tests)

 Test Files  13 passed (13)
      Tests  206 passed (206)
   Duration  5.15s
```

### 8.2 TypeScript Static Type Checking (`npx tsc --noEmit`)
- **Status:** PASSED (Exit code: 0)
- Zero syntax, import, or typing errors.

### 8.3 Next.js Production Build (`npm run build`)
- **Compiler:** Next.js 16.4.6 (Turbopack)
- **Status:** PASSED (Exit code: 0)
- All 9 application routes compiled and prerendered successfully:
  - `/` (Static)
  - `/_not-found` (Static)
  - `/demo/preview` (Static)
  - `/employee/dashboard` (Static)
  - `/employee/notifications` (Static)
  - `/employee/requests` (Static)
  - `/employee/requests/[id]` (Dynamic)
  - `/employee/requests/new` (Static)
  - `/login` (Static)

### 8.4 Git Tree Status
- Working tree clean across all modifications.
- Zero whitespace errors reported via `git diff --check`.
