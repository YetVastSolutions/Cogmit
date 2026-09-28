# Cogmit Product Definition

## 1. Product

Cogmit is a Yet Vast Solutions product.

Cogmit is a personal publishing/social content platform.

Its primary purpose is to allow people to create, manage, and publish personal content.

---

# 2. Product Philosophy

Cogmit should make publishing personal content straightforward.

The product prioritizes:
- content
- authorship
- readability
- publishing
- discoverability
- useful metadata
- future media support

The interface should not allow platform mechanics to overwhelm the content.

---

# 3. Content and Storage Model

**Status: IMPLEMENTED**

Cogmit utilizes the user's connected GitHub repository to store content and product data.
Content is organized into specific structures within the repository:
- `cogsIndex.json`
- `projects/`
- `NPPCogs/`

A Cogmit publication may conceptually contain titles, authors, bodies/content, excerpts, media, metadata, reading time, and publication dates. The exact schema is constrained by the GitHub storage implementation.

---

# 4. Publishing

**Status: PLANNED**

Cogmit separates content creation from public presentation.
A user may create or edit content before publishing it.
Published content should have a stable public representation. The exact mechanisms for public CDN and viewing layouts are planned but not fully established.

---

# 5. Future Direction

**Status: EXPERIMENTAL / PLANNED**

Cogmit may evolve toward richer user-generated media.
Possible future capabilities include:
- vlogs
- richer media posts
- multimedia publishing
- social interactions
- expanded discovery

These are future product directions unless explicitly implemented.
Do not treat planned functionality as existing functionality.

---

# 6. Product UI

**Status: IMPLEMENTED**

Cogmit follows the YVS Visual Language and employs the YVS Dark/Light semantic token sets.
The product should feel like a member of the YVS product family while maintaining its own publishing-oriented identity.
Content should remain visually primary.

---

# 7. Product Scope Discipline

Do not introduce a product capability simply because it is technically possible.
New product behavior should have an identifiable product requirement, design decision, or explicit user request.

---

# 8. Source of Truth

Cogmit's repository and product documentation are the source of truth for Cogmit implementation.
YVS Guidelines provides the organization-wide standards foundation.

YVS-Illu does not own Cogmit product information.
Other YVS products do not own Cogmit product information.