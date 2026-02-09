---
name: newagent
description: Describe what this custom agent does and when to use it.
argument-hint: The inputs this agent expects, e.g., "a task to implement" or "a question to answer".
tools: ['vscode', 'read', 'agent', 'edit', 'search', 'web', 'todo']

# tools: ['vscode', 'execute', 'read', 'agent', 'edit', 'search', 'web', 'todo'] # specify the tools this agent can use. If not set, all enabled tools are allowed.
---
use CLAUDE.md to understand project structure and coding style. Use the search tool to find all client side JS files. For each file, read its content, identify functions that are missing JSDoc comments, and edit the file to add appropriate JSDoc comments based on the function's purpose and parameters.