# Cogmit — YVS AI Agent Instructions

## 1. Scope

This file contains the Yet Vast Solutions (YVS) project-level instructions
for AI agents working on Cogmit.

Cogmit is a product of Yet Vast Solutions.

These instructions apply to all AI-assisted development performed inside
this repository.

The repository also contains `AGENTS.md`.

Both files must be followed.

`AGENTS.md` contains Next.js-generated agent instructions and must not be
removed or replaced.

`YVS-AGENTS.md` contains YVS and Cogmit-specific AI development rules.

---

# 2. Instruction Hierarchy

When implementing a task, use this order:

1. System/developer instructions
2. User/task-specific instructions
3. `AGENTS.md`
4. `YVS-AGENTS.md`
5. YVS Guidelines v1.2.2
6. Cogmit project documentation
7. Existing repository implementation as evidence
8. AI inference

If instructions conflict:

* resolve using the hierarchy
* preserve security and architectural constraints
* identify the conflict explicitly when necessary
* do not silently invent a resolution for high-impact decisions

---

# 3. YVS Guidelines

Cogmit follows:

**YVS Guidelines v1.2.2**

Repository:

`yetvastsolutions/yvs-guidelines`

YVS Guidelines is the canonical YVS development and product-development
standard.

It covers:

- engineering constitution
- AI development guidance
- architecture
- security
- development standards
- deployment
- YVS Visual Language
- canonical visual tokens
- standards/versioning

The pinned version for Cogmit is:

**v1.2.2**

Do not silently change the effective YVS Guidelines version.

---

# 4. How to Use YVS Guidelines

YVS Guidelines is a development/reference standard.

It is NOT a Cogmit runtime dependency.

Do not:

- import it into Cogmit
- install it as an npm dependency
- fetch it during application runtime
- require GitHub access for Cogmit to operate
- dynamically retrieve design tokens
- use it as a runtime configuration service

Applicable YVS standards must be implemented locally in Cogmit.

---

# 5. Required AI Workflow

For every non-trivial task:

1. Inspect the existing implementation.
2. Read the relevant local documentation.
3. Search for existing implementations.
4. Check the applicable YVS Guidelines section.
5. Reuse existing patterns where appropriate.
6. Implement the smallest justified change.
7. Validate the result.
8. Report what was actually changed and verified.

Use:

**Inspect → Search → Reuse → Implement → Verify**

Avoid:

**Assume → Invent → Abstract → Refactor**

---

# 6. Repository Before Invention

Before creating:

- components
- hooks
- utilities
- services
- repositories
- abstractions
- dependencies
- data structures
- architecture layers

search the repository first.

Determine whether an existing implementation already solves the problem.

Prefer modifying or reusing an existing implementation when appropriate.

Do not create duplicate abstractions.

---

# 7. YVS Visual Language

Cogmit must follow the YVS Visual Language defined by YVS Guidelines v1.2.2.

The YVS visual direction is:

- simple
- restrained
- modern
- readable
- information-clear
- strong hierarchy
- disciplined whitespace
- subtle structural borders
- limited shadows
- purposeful color
- accessible
- responsive
- polished without unnecessary decoration

Avoid:

- excessive gradients
- glassmorphism
- decorative blobs
- oversized hero typography
- excessive shadows
- excessive rounded cards
- unnecessary animation
- visual noise

Target:

**simple but polished**

Cogmit should feel like a YVS product without becoming visually identical
to other YVS products.

---

# 8. YVS Brand Foundation

Canonical YVS colors:

YVS Yellow:

`#FFFF11`

YVS Indigo-Violet:

`#4B0084`

Do not introduce arbitrary replacement brand colors without an intentional
product/design decision.

Brand colors should not dominate the entire interface.

Neutral colors should carry most of the UI.

---

# 9. Theme Direction

## Light

Indigo-Violet is the primary brand/action color.

Yellow is the distinctive accent.

## Dark

Yellow becomes the primary/high-attention brand color.

Indigo-Violet becomes the structural/brand accent.

Accessibility takes precedence over decorative brand usage.

---

# 10. Typography

YVS standard typography:

Primary:

**Inter**

Monospace:

**JetBrains Mono**

Do not introduce arbitrary fonts without justification.

---

# 11. Icons

YVS standard icon library:

**Lucide**

Do not casually introduce additional icon libraries.

Icons should communicate meaning and maintain consistent sizing and alignment.

---

# 12. Semantic Design Tokens

Use semantic design tokens rather than scattering raw color values throughout
components.

### Light

```text
background             #FFFFFF
foreground             #17121C
card                   #FFFFFF
card-foreground        #17121C
muted                  #F4F1F6
muted-foreground       #655C6B
border                 #DDD6E2
input                  #DDD6E2
primary                #4B0084
primary-foreground     #FFFFFF
secondary              #F1EDF4
secondary-foreground   #4B0084
accent                 #FFFF11
accent-foreground      #160020
destructive             #C62828
destructive-foreground  #FFFFFF
success                 #16803C
success-foreground      #FFFFFF
warning                 #A15C00
warning-foreground      #FFFFFF
ring                    #4B0084
brand-border            #4B0084
```

### Dark

```text
background             #09060D
foreground             #F8F5FA
card                   #100B16
card-foreground        #F8F5FA
muted                  #17121F
muted-foreground       #B9AFBF
border                 #3A2450
input                  #3A2450
primary                #FFFF11
primary-foreground     #160020
secondary              #21152A
secondary-foreground   #F8F5FA
accent                 #FFFF11
accent-foreground      #160020
destructive             #FF6B6B
destructive-foreground  #240006
success                 #55D98A
success-foreground      #06180D
warning                 #FFC44D
warning-foreground      #241400
ring                    #FFFF11
brand-border            #4B0084
```

These tokens should be implemented according to Cogmit's architecture rather
than copied into individual components.

---

# 13. Product Individuality

YVS standardization has three conceptual layers.

## Layer 1 — YVS Foundation

Mandatory:

* typography foundation
* semantic token architecture
* spacing foundation
* accessibility
* icon family
* control conventions

## Layer 2 — Common YVS Patterns

Examples:

* cards
* content surfaces
* metadata
* navigation
* buttons

### Button/Control Conventions

> Standard YVS buttons use YVS Yellow `#FFFF11` for text, a `0.1px solid #000000` text stroke, YVS Indigo-Violet `#4B0084` for the button background, and a `0.5px solid #000000` button border. This treatment is the same in light and dark themes.

Note: This is a button-specific canonical treatment, not a requirement that every YVS component use these colors.

* forms
* content presentation

## Layer 3 — Cogmit Expression

Cogmit may independently develop:

* publishing layouts
* editorial layouts
* post presentation
* media presentation
* feeds
* author presentation
* publishing interactions
* rich-media interactions
* product-specific visual elements

provided they remain compatible with the YVS foundation.

---

# 14. Cogmit Content Philosophy

Cogmit is a personal publishing/social content platform.

Content itself should remain the primary visual focus.

Content presentation may include:

* author
* title
* excerpt
* media
* metadata
* reading time
* publication date

Clearly distinguish:

* content
* metadata
* actions
* navigation
* system state

Do not allow decorative UI to overwhelm user-generated content.

---

# 15. Architecture

Cogmit architecture is defined primarily by:

`docs/architecture.md`

Do not invent architectural decisions that contradict that document.

If architecture.md does not answer an important architectural question,
inspect the existing implementation and then ask before making a
high-impact architectural decision.

High-impact decisions include:

* database technology
* authentication architecture
* hosting
* major frameworks
* major dependencies
* security boundaries
* roles and permissions
* sensitive data handling
* major data-model changes
* production migrations
* destructive operations

---

# 16. Product Definition

Cogmit product behavior and scope are defined by:

`docs/product.md`

Do not introduce major product behavior merely because it appears technically
interesting.

Separate:

* existing product behavior
* planned behavior
* experimental behavior
* AI inference

Do not present planned or inferred behavior as implemented functionality.

---

# 17. AI Development

AI-specific development rules are defined by:

`docs/AI-DEVELOPMENT.md`

That document should be consulted when:

* implementing AI-assisted features
* changing AI workflows
* creating AI agent instructions
* designing AI-generated content workflows
* deciding how AI interacts with Cogmit data
* changing AI-related architecture

---

# 18. Evidence

AI agents must distinguish between:

* OBSERVED
* DOCUMENTED
* TESTED
* INFERRED
* UNKNOWN

Never present inferred or unknown information as established fact.

---

# 19. Dependencies

Before adding a dependency:

1. search the repository
2. check native framework/platform capabilities
3. check existing dependencies
4. determine whether the dependency is actually required
5. consider maintenance, security, bundle size, and operational impact

Avoid dependency accumulation.

---

# 20. Change Discipline

Do not:

* refactor unrelated code
* redesign unrelated UI
* rename unrelated APIs
* restructure the repository without need
* introduce speculative abstractions
* upgrade dependencies without justification
* replace working code merely because another implementation looks cleaner
* silently change architecture

Prefer the smallest change that satisfies the requirement.

---

# 21. Security

Never expose:

* credentials
* API keys
* tokens
* secrets
* private user information
* authentication material

Never commit secrets.

Do not weaken security controls merely to simplify development.

Follow the security requirements of YVS Guidelines.

---

# 22. Validation

After implementation, use the appropriate validation:

* type checking
* linting
* tests
* build
* runtime verification
* UI inspection
* responsive verification
* accessibility verification

Only claim something is verified if it was actually verified.

---

# 23. Reporting

After completing a task, report concisely:

### Changed

What changed.

### Verified

What was actually tested or inspected.

### Not verified

Anything that could not be verified.

### Decisions

Important decisions made.

Do not provide generic filler.

---

# 24. YVS Standards Are Not Modified From Cogmit

Cogmit must not modify `yvs-guidelines` merely to make implementation easier.

If Cogmit exposes a genuine standards problem:

1. document the problem
2. explain why the current standard is insufficient
3. request a standards-level decision
4. modify YVS Guidelines only after that decision

---

# 25. Final Rule

When uncertain:

**Inspect → Search → Reuse → Implement minimally → Verify**

Never silently invent architecture or standards.
