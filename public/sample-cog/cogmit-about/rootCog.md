# What is Cogmit?

Cogmit is a system for organizing information into Cogs and relationships between Cogs. It allows you to build a structured, interconnected web of knowledge.

## What is a Cog?

A Cog is the fundamental unit of content in Cogmit. It represents a single piece of cognition or information.

## What is a RootCog?

A RootCog is the top-level Cog and container in a hierarchy. It serves as the main anchor for a topic, and it can contain any number of ChildCogs.

## What is a ChildCog?

A ChildCog is a Cog nested beneath a RootCog or another ChildCog. It represents a specific sub-topic or detailed note related to its parent Cog.

## How is a Cog structured?

In the repository, a RootCog is represented by a directory containing exactly three files:
- `rootCog.md`
- `rootCogInfo.json`
- `children.json`

## Content versus metadata

The file `rootCog.md` contains the human-readable Markdown content. 
The file `rootCogInfo.json` contains the necessary metadata to identify and organize the Cog within the system.

## ChildCogs

The file `children.json` contains the RootCog's ChildCog collection, allowing Cogs to form a structured hierarchy.

## GitHub-backed model

The current Cogmit implementation uses a GitHub repository as the persistence and product boundary. It uses Git history for version control, ensuring all changes are tracked. (Note: This specific sample Cog is an application-owned static demonstration, not a user's persisted GitHub Cog.)

## Public viewing

This sample can be viewed publicly through `/aboutCogmit`. It serves as an informational demonstration of the Cogmit UI and data structure. No social features, likes, comments, feeds, or analytics are present.
