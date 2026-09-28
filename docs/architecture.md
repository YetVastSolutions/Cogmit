# Cogmit Architecture

## Status

This document defines the current Cogmit application architecture based on established repository evidence. It is a product-level architecture document and must remain consistent with YVS Guidelines v1.2.2.

---

# 1. Product

Cogmit is a personal publishing/social content platform.

Its architecture supports publishing personal content while remaining simple enough to evolve toward richer media and social capabilities.

---

# 2. Architecture Principles

Cogmit follows these principles:

- simple architecture
- managed services where appropriate
- minimal operational overhead
- incremental evolution
- clear ownership of data
- local implementation of YVS standards
- minimal dependencies
- no speculative infrastructure
- no premature distributed architecture

Architecture grows in response to real product requirements.

---

# 3. Application Framework

**Status: CURRENT**

Cogmit is implemented as a web application using **Next.js 16.3.6** with the **App Router** (`src/app/`) and **React 19.2.8**.

The existing `AGENTS.md` contains Next.js-specific instructions and must always be followed when working with Next.js.

---

# 4. Styling Architecture

**Status: CURRENT**

Cogmit follows the YVS Visual Language and implements it locally via:

- **Tailwind CSS v4** (`@tailwindcss/postcss`)
- **shadcn/ui**
- **tw-animate-css**

## Design Tokens

Semantic design tokens are implemented as native CSS variables within `src/app/globals.css`, supporting both Light and Dark modes. The canonical YVS Brand Colors (`--color-yvs-yellow` and `--color-yvs-indigo`) are integrated natively into the token layer.

Do not introduce a second competing design system.

## Global Page Width Standard

1. The application has one canonical global header content shell.
2. All primary application pages use one canonical page content shell.
3. Desktop page content width is 90% of the header content width.
4. Therefore desktop page content is intentionally 10% narrower than the header.
5. Desktop page content remains horizontally centered.
6. Mobile page content width equals the header content width.
7. Page-specific arbitrary desktop max-width values are prohibited for the primary page shell.
8. Internal components may use narrower content measures where their semantics require it.
9. Page width and component content width must not be conflated.
10. New pages must reuse the existing global page-shell standard rather than defining a new page-level width system.

The purpose is to maintain a consistent visual horizontal structure across the application and prevent individual pages from appearing artificially constrained toward the center of the desktop viewport.

## My Cogs / Cog Collection Grid Standard

Desktop:
maximum 2 Cog tiles per row.

Mobile:
maximum 1 Cog tile per row.

My Cogs Tile Metadata Standard:
- displays Cog title as the primary content
- displays publication status, Project name, Modified timestamp, and Created timestamp in the second metadata row
- does not display Cog ID
- uses Published = yellow background / black text
- uses Not published = green background / black text
- displays timestamps without seconds
- keeps the metadata row single-line and horizontally scrollable when its content exceeds available tile width

---

# 5. Authentication

**Status: CURRENT**

Authentication is handled by **NextAuth.js (v5 beta)** (`next-auth@^5.0.0-beta.32`).
It is currently configured with the **GitHub OAuth Provider**.

The application requests the following GitHub scopes: `read:user user:email repo` to allow Cogmit to interact with the authenticated user's repositories.

Any authentication architecture change is a high-impact decision.

---

# 6. Data & Storage

**Status: CURRENT**

Product data belongs to Cogmit and the user.

Cogmit utilizes **GitHub as its primary data store**.

- **Octokit** (`@octokit/rest`) is used server-side (via `src/lib/github.ts`) to interact with the user's connected GitHub repository using their OAuth access token.
- Content is stored directly in a designated repository.
- The repository structure expects a `cogsIndex.json` file, along with `projects/` and `NPPCogs/` directories.

Do not introduce a database migration or replacement without a documented reason and explicit architectural decision.

---

# 7. Content Publishing

**Status: PLANNED / UNDECIDED**

While the internal data structure utilizes GitHub for storage (`cogsIndex.json`), the full public publishing architecture, CDN, and stable presentation layer implementations are currently undefined and left for future development.

---

# 8. External Integrations

**Status: CURRENT**

External integrations must have explicit boundaries.
Currently established integrations:
- **GitHub**: Used for Authentication and Content Storage.

Do not allow integration-specific code to spread arbitrarily throughout the application.

---

# 9. Architecture Boundaries

Any major architecture change must be documented before or together with implementation. Examples include:

- changing database technology
- replacing authentication
- changing hosting
- introducing a major framework
- introducing a major external service
- changing the content storage model
- introducing distributed infrastructure

Do not silently make these decisions.