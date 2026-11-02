# Cogmit Architecture Update: RootCog Title Maximum (197 Characters)

**Date**: 2026-11-02  
**Status**: APPROVED & IMPLEMENTED  
**Supersedes**: 147-Character Limit Invariant  

---

## 1. Context & Rationale

RootCogs in Cogmit represent the fundamental unit of cognition and persistent context. As cognitive structures and domain topics have expanded, RootCog titles require increased expressive bandwidth to describe complex multi-agent architectures, reasoning pathways, and systemic designs without premature abbreviation.

The maximum allowed length of a RootCog title is officially updated:
- **Previous Limit**: 147 characters
- **New Authoritative Limit**: **197 characters**

This change is an intentional supersession of the previous 147-character invariant.

---

## 2. Invariants & Guarantees

1. **Single Authoritative Constant**:
   `MAX_ROOTCOG_TITLE_LENGTH = 197` in `src/lib/card-renderer.ts`, re-exported via `src/lib/utils.ts` and `CARD_TITLE_MAX`.
2. **Uniform Validation**:
   All validation layers (client forms, Server Actions, publishing workflows, and SVG card generators) enforce the exact same 197-character constraint.
3. **Boundary Semantics**:
   - Exactly 197 characters: **Accepted**.
   - 198+ characters: **Rejected** with validation error `Title must be 197 characters or fewer`.
   - Titles <= 147 characters (including 146 and 147): **Preserved and fully valid**.
   - Existing titles longer than 147 characters (e.g. 148, 175): **Accepted**.
4. **No Silent Truncation**:
   Validation strictly rejects titles exceeding 197 characters at write/create time rather than truncating user cognition without consent.
5. **Storage & Structure Preservation**:
   - `cogsIndex.json`, `rootCogInfo.json`, and `rootCog.md` maintain standard schemas.
   - Deleted Cogs in `deletedCogs/` retain their original titles and timestamps.
   - RootCog IDs, branch paths, and Git lifecycle history remain completely unaltered.
6. **Card & SVG Typography**:
   - The card renderer's `wrapTextByWidth` and `wrapText` accommodate up to 197 characters naturally in both Landscape (1200x800, 3:2) and Portrait (1200x1600, 2:3) canvases without border collisions or visual overflow.

