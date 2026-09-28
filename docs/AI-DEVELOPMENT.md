# Cogmit AI Development

## 1. Purpose

This document defines how AI agents should execute development work on Cogmit. It complements the rules established in `YVS-AGENTS.md` and provides the tactical workflow for AI-assisted development.

---

# 2. Repository Inspection

**Inspect before modifying.**

Before changing code, agents must:
- inspect relevant files
- inspect surrounding architecture
- inspect package configuration
- inspect existing components and APIs
- inspect documentation

Do not implement from the task description alone when repository evidence is available.

---

# 3. Search Before Creation

**Search before adding.**

Before creating new code, agents must search the repository for:
- components
- hooks
- utilities
- services
- repositories
- abstractions
- dependencies

---

# 4. Reuse

**Reuse before creating. Modify before duplicating.**

Prefer existing patterns where appropriate.
If a similar capability exists, evaluate whether it should be reused or generalized instead of creating a duplicate implementation.
Prefer native framework capabilities before introducing new dependencies.

---

# 5. Minimal Change Surface

**No unrelated refactoring. No speculative abstraction.**

Prefer the smallest, most localized change that satisfies the requirement.
Avoid:
- Unrelated refactoring (do not use a feature request as an excuse to refactor unrelated systems)
- Premature optimization
- Speculative abstraction

---

# 6. Evidence

**Evidence before invention.**

Agents must strictly classify their conclusions and avoid presenting assumptions as facts.

**OBSERVED**: Directly seen in the repository or runtime.
**DOCUMENTED**: Explicitly stated in project documentation.
**TESTED**: Confirmed through an executed test or verification.
**INFERRED**: Reasoned from available evidence but not directly established.
**UNKNOWN**: Not currently established.

Inferred or unknown information must not be presented as established fact.

---

# 7. Validation

After implementation, use the appropriate validation:
- type checking
- linting
- tests
- build
- runtime verification
- UI verification
- responsive verification
- accessibility verification

---

# 8. Architecture Boundaries

**No architecture drift.**

Agents must require asking the user before making high-impact decisions involving:
- database technology
- authentication architecture
- hosting
- major frameworks
- major dependencies
- security boundaries
- roles/permissions
- sensitive data
- major data-model changes
- production migrations
- destructive operations

---

# 9. Error Handling

Agents should investigate actual failures rather than hide them.
When an implementation fails:
1. inspect the actual error
2. identify the failing boundary
3. reproduce where practical
4. fix the underlying issue
5. verify the fix

Do not hide or swallow errors merely to make the UI appear successful.

---

# 10. Reporting

After completing a task, agents must report concisely:

### Changed
What actually changed.

### Verified
What was actually tested or inspected. (Do not claim anything was tested if it was not tested).

### Not verified
What could not be verified.

### Decisions
Important decisions made during implementation.