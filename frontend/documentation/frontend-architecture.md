# NYSC MEDICAL VERIFICATION SYSTEM

# FRONTEND UI ARCHITECTURE (FULL DRAFT)

## IMPLEMENTATION TRACKER (2026-05-20)

Current frontend status:

* Landing page redesigned into a single-screen operational layout (100vh intent)
* National infrastructure visual language established
* Interactive operational visualization present
* Trust indicator cards present
* MEDVERIFY branding now visible in nav + hero context
* NYSC favicobn configured

What we are working on now (Active):

1. Stabilize landing responsiveness and viewport fit across desktop/tablet/mobile
2. Align landing interactions and nav destinations with architecture intent
3. Prepare multi-portal shell architecture (role-separated frontend structure)

What we need to do next (priority order):

1. Multi-portal route and shell foundation (Corper, Hospital, Doctor, Coordinator, HQ, DG)
2. Corper Activation flow UI (Call-Up -> NIN -> OTP -> Password Setup)
3. Public entry pages:
   * Verify Status
   * Hospital Access
   * Activate Access
   * Security Notice / Help
4. Corper portal MVP:
   * Dashboard
   * Medical Request Flow
   * Case Status (restricted visibility)
   * Appeal
   * Profile & Identity
5. Shared design system extraction:
   * tokens, cards, buttons, status components
6. Security UX enforcement:
   * asymmetric visibility model in UI layer

Definition of done for current phase:

* role-based frontend shells exist and are navigable
* activation flow screens are complete and coherent
* public entry layer pages exist and match trust/government tone
* no role sees unauthorized internal intelligence fields in UI



──────────────────────────────────────────────

1. PUBLIC ENTRY LAYER
   ──────────────────────────────────────────────

This is the public-facing infrastructure layer.

Purpose:

* communicate trust
* explain system purpose
* direct users into secured environments

Pages:

* Landing Page
* Verification Status Lookup
* System Information
* Access Activation
* Help / Support
* Security Notice

UI Style:

* highly polished
* cinematic operational feel
* intelligence-system inspired
* no clutter
* no unnecessary scrolling

Transition:
Users move from public layer → secure role-based systems.

──────────────────────────────────────────────
2. CORPER ACCESS FLOW
──────────────────────────────────────────────

FIRST PAGE AFTER LANDING:
→ Corper Activation Page

Purpose:
Activate identity already pre-created by NYSC.

Flow:
Call-Up Number
→ NIN
→ OTP Verification
→ Password Setup
→ Access Dashboard

IMPORTANT:
Do NOT use “Sign Up”.
Use:
“Activate Access”

UI Feel:

* guided
* simple
* reassuring
* secure
* mobile-first

──────────────────────────────────────────────
3. CORPER PORTAL ARCHITECTURE
──────────────────────────────────────────────

Purpose:
Allow corps members manage and track medical relocation requests.

PAGES:

A. Dashboard

* Case status overview
* Timeline progress
* Notification center
* Recent actions

B. Medical Request Flow

* Begin request
* Select hospital
* Submit verification code
* Referral tracking

C. Case Status Page
Visible states ONLY:

* Pending
* Under Review
* Escalated
* Approved
* Rejected

IMPORTANT:
Corpers DO NOT see:

* risk scores
* fraud flags
* internal reasoning
* approval probabilities

D. Appeal / Additional Review

* submit supporting information
* track appeal state

E. Profile & Identity

* NIN verification state
* call-up info
* session/device management

UI Direction:

* calm
* minimal
* patient-friendly
* low cognitive load

──────────────────────────────────────────────
4. HOSPITAL ACCESS FLOW
──────────────────────────────────────────────

Hospitals DO NOT sign up publicly.

NYSC provisions access.

Flow:
Invite Link
→ MFA Setup
→ Password Setup
→ Hospital Dashboard

UI Feel:

* institutional
* enterprise operational system
* workflow-heavy

──────────────────────────────────────────────
5. HOSPITAL ADMIN PORTAL
──────────────────────────────────────────────

Purpose:
Manage hospital operations inside verification ecosystem.

PAGES:

A. Hospital Operations Dashboard

* active cases
* pending verifications
* throughput indicators
* alerts

B. Doctor Management

* add doctor
* MDCN verification
* role assignment
* doctor activity status

C. Case Management Queue

* all active medical requests
* filters
* review queues

D. Verification Code System

* code issuance
* expiry management
* validation state

E. Audit Logs

* actions taken
* who issued what
* timestamps

F. Hospital Analytics

* case volume
* doctor workload
* flagged patterns

IMPORTANT:
Hospitals only see operational outcomes.
They DO NOT see:

* risk scoring logic
* fraud engine internals
* HQ intelligence systems

──────────────────────────────────────────────
6. DOCTOR PORTAL
──────────────────────────────────────────────

Purpose:
Focused medical workflow execution.

PAGES:

A. Assigned Cases
B. Diagnosis Entry
C. Report Creation
D. Verification Code Issuance
E. Patient Referral Management
F. Case History

UX:

* minimal clicks
* fast interaction
* medical workflow optimized

Doctors should feel:

* accountable
* monitored
* efficient

──────────────────────────────────────────────
7. STATE COORDINATOR PORTAL
──────────────────────────────────────────────

Purpose:
Camp-level monitoring and recommendation system.

PAGES:

A. State Dashboard
B. Camp Case Queue
C. Recommendation Submission
D. Escalation Tracker
E. Decision History

IMPORTANT:
State coordinators:

* cannot approve final relocation
* only recommend/escalate

All actions require:

* justification notes
* audit trace

──────────────────────────────────────────────
8. NYSC HQ ADMIN PORTAL
──────────────────────────────────────────────

This is the NATIONAL COMMAND CENTER.

Purpose:
Centralized national oversight and fraud intelligence.

UI Style:

* Palantir-like
* Stripe Radar inspired
* operational intelligence interface

PAGES:

A. National Operations Dashboard

* live nationwide activity
* system health
* active escalations

B. Fraud Intelligence Center

* risk analytics
* behavioral anomaly monitoring
* heatmaps
* geo intelligence

C. Case Review Workspace

* decision panels
* explainability interface
* timeline reconstruction

D. Hospital Monitoring

* hospital performance
* suspicious behavior tracking
* throughput anomalies

E. Doctor Oversight

* doctor activity
* overload detection
* flagging system

F. Audit Explorer

* complete audit trail
* filterable action history

IMPORTANT:
ONLY HQ sees:

* risk scores
* decision intelligence
* fraud reasoning
* explainability breakdowns

──────────────────────────────────────────────
9. DG EXECUTIVE PORTAL
──────────────────────────────────────────────

Purpose:
Final authority layer.

UI should feel:

* executive
* minimal
* powerful
* uncluttered

PAGES:

A. Executive Queue

* escalated cases only

B. Decision Workspace

* summarized intelligence
* comparison views
* recommendation summaries

C. Final Approval System

* approve
* reject
* defer
* executive notes

D. Audit Confirmation

* immutable decision log

IMPORTANT:
DG interface should NOT show raw analytics overload.
Only:

* distilled intelligence
* actionable decisions

──────────────────────────────────────────────
10. GLOBAL FRONTEND SYSTEM DESIGN
──────────────────────────────────────────────

Architecture Style:
Multi-portal system.

NOT:
one app with role switching.

Each role should feel like:
its own secure environment.

──────────────────────────────────────────────
11. FRONTEND DESIGN SYSTEM
──────────────────────────────────────────────

Visual Feel:

* Government-grade
* Cybersecurity-inspired
* Enterprise intelligence systems

Colors:

* Deep NYSC green
* Navy blue
* White/light gray
* Soft teal accents
* Soft amber warnings
* Soft red risk states

Typography:

* Inter / SF Pro

UI Characteristics:

* structured spacing
* strong hierarchy
* subtle animations
* glowing intelligence indicators
* operational dashboards

──────────────────────────────────────────────
12. SECURITY UX PRINCIPLES
──────────────────────────────────────────────

NEVER expose:

* risk engine logic
* approval probability
* fraud reasoning
* system scoring to lower actors

Use:
asymmetric visibility model.

Meaning:
users only see the stage they are in,
NOT how they are being judged internally.

──────────────────────────────────────────────
13. RESPONSIVENESS
──────────────────────────────────────────────

Primary:
Desktop-first operational systems.

Secondary:
Mobile-first for corper portal.

Admin dashboards:
tablet-compatible.

──────────────────────────────────────────────
14. FINAL UX GOAL
──────────────────────────────────────────────

The frontend should feel like:

“a secure national operational infrastructure coordinating trusted medical relocation verification across Nigeria.”

NOT:
a startup dashboard,
hospital app,
or generic government portal.
