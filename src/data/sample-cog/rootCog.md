# What is a Cog?

A Cog is the fundamental unit of storage in Cogmit. It is designed to capture, structure, and connect information seamlessly.

## What is a RootCog?

A RootCog is the top-level container in a Cog hierarchy. It acts as the anchor point for a specific topic, project, or domain. A RootCog holds its own content and metadata, while also organizing any number of child Cogs underneath it.

## What is a ChildCog?

A ChildCog is a Cog nested within a RootCog (or another ChildCog). It represents a specific sub-topic, detailed note, or distinct piece of information related to its parent. Together, Cogs form a hierarchical, interconnected web of knowledge.

## How are Cogs structured?

In the repository, a Cog is stored as a simple, human-readable directory structure:
- A `rootCog.md` file containing the Markdown content.
- A `rootCogInfo.json` file for metadata (like ID, title, and timestamp).
- A `children.json` file representing the collection of any nested ChildCogs.

## What information can a Cog contain?

The content of a Cog is standard Markdown, meaning it can contain text, lists, links, code snippets, and anything else you can express in Markdown. Its metadata handles everything else: when it was created, who owns it, and how it relates to other Cogs.

## How does a user interact with a Cog?

Users can view Cogs, navigate between parent and child Cogs, and edit them using standard text operations. Since Cogs are stored as text and JSON files, they can also be interacted with through standard Git workflows and text editors.

## Content vs. Metadata

The distinction is clear and physical:
- **Content** is what you read and write (the Markdown file).
- **Metadata** is how the system organizes and identifies the Cog (the JSON file).

This separation ensures your content remains pure and easily transportable without being cluttered by system-specific properties.
