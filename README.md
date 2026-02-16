# Autoskills MCP

An MCP (Model Context Protocol) server that automatically reviews completed tasks and helps AI agents build a reusable **personal skills library**.

## How It Works

```
Agent completes a task
        │
        ▼
  Autoskills MCP reviews the solution
        │
        ├─ No skill was used ──► Was the solution reusable?
        │                              │
        │                         Yes ─► Suggest creating a new skill
        │                         No  ─► Do nothing
        │
        └─ Skill(s) were used ──► Did the skill work well?
                                       │
                                  Yes ─► Do nothing
                                  No  ─► Suggest improving the skill
```

When a task is completed, the agent calls Autoskills to evaluate whether the solution is worth packaging into a reusable skill. Skills are stored as Markdown files in a **personal skills folder**, making them easy to version, share, and reuse across projects.

## Features

- **Auto-review** — Automatically evaluates completed tasks for skill-worthy patterns
- **Smart suggestion** — Only prompts the user when a new skill or improvement is genuinely useful
- **Personal skills library** — Maintains a dedicated folder of user-created, updatable skills
- **Multi-agent support** — Works with Windsurf, Cursor, Claude Code, Kilo Code, and any MCP-compatible agent
- **Portable** — Skills are plain Markdown files, easy to sync, share, or open-source

## Quick Start

### 1. Install

```bash
git clone https://github.com/YOUR_USERNAME/Autoskills.git
cd Autoskills
npm install
npm run build
```

### 2. Configure your agent

Add the Autoskills MCP server to your agent's MCP configuration.

<details>
<summary><b>Windsurf</b></summary>

Edit `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "autoskills": {
      "command": "node",
      "args": ["<path-to-autoskills>/dist/index.js"],
      "env": {
        "AUTOSKILLS_DIR": "<path-to-your-personal-skills-folder>"
      }
    }
  }
}
```
</details>

<details>
<summary><b>Cursor</b></summary>

Edit `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "autoskills": {
      "command": "node",
      "args": ["<path-to-autoskills>/dist/index.js"],
      "env": {
        "AUTOSKILLS_DIR": "<path-to-your-personal-skills-folder>"
      }
    }
  }
}
```
</details>

<details>
<summary><b>Claude Code</b></summary>

Edit `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "autoskills": {
      "command": "node",
      "args": ["<path-to-autoskills>/dist/index.js"],
      "env": {
        "AUTOSKILLS_DIR": "<path-to-your-personal-skills-folder>"
      }
    }
  }
}
```
</details>

<details>
<summary><b>Kilo Code</b></summary>

Add via Kilo Code's MCP settings UI, or edit its MCP config file:

```json
{
  "mcpServers": {
    "autoskills": {
      "command": "node",
      "args": ["<path-to-autoskills>/dist/index.js"],
      "env": {
        "AUTOSKILLS_DIR": "<path-to-your-personal-skills-folder>"
      }
    }
  }
}
```
</details>

> **`AUTOSKILLS_DIR`** defaults to `~/.autoskills/personal-skills` if not set.

### 3. Use it

After completing a task, the agent can call the Autoskills MCP tools:

| Tool | Description |
|------|-------------|
| `review_task` | Review a completed task and decide whether to suggest creating or improving a skill |
| `create_skill` | Create a new personal skill from a solution |
| `update_skill` | Update an existing personal skill |
| `list_skills` | List all personal skills |
| `get_skill` | Read a specific skill's content |
| `delete_skill` | Delete a personal skill |

## Personal Skills Library

Skills are stored as Markdown files following a simple template:

```
personal-skills/
├── web-scraping-with-playwright/
│   └── SKILL.md
├── docker-compose-setup/
│   └── SKILL.md
└── ...
```

Each `SKILL.md` contains:

```markdown
---
name: skill-name
description: Short description for matching and triggering
version: 1.0.0
tags: [tag1, tag2]
created: 2025-01-01
updated: 2025-01-01
---

# Skill Title

## When to Use
Trigger conditions and applicable scenarios.

## Instructions
Step-by-step workflow for the agent to follow.
```

## Philosophy

- **Frozen vs Personal** — System/built-in skills remain frozen; only personal skills are created and updated by Autoskills
- **User in control** — The agent always asks before creating or modifying a skill
- **Minimal noise** — If a skill worked well, no prompt is triggered; suggestions only appear when they add value

## License

[MIT](./LICENSE)
