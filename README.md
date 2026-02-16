<div align="center">

# ⚡ Auto-agent-skills

**Automatically build a reusable personal skills library for your AI agents.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-8A2BE2)](https://modelcontextprotocol.io/)

*An MCP server that reviews completed tasks and helps AI agents package solutions into portable, reusable skills.*

</div>

---

## How It Works

```
Agent completes a task
        │
        ▼
  Autoskills MCP reviews the solution
        │
        ├── No skill used ──► Reusable? ──► Yes ──► Suggest creating a new skill
        │                                   No  ──► Do nothing
        │
        └── Skill(s) used ──► Worked well? ──► Yes ──► Do nothing
                                               No  ──► Suggest improving the skill
```

When a task is completed, the agent calls Autoskills to evaluate whether the solution is worth packaging into a reusable skill. Skills are stored as Markdown files in a **personal skills folder** — easy to version, share, and reuse across projects.

## ✨ Features

| | Feature | Description |
|---|---|---|
| 🔍 | **Auto-review** | Evaluates completed tasks for skill-worthy patterns |
| 💡 | **Smart suggestion** | Only prompts when a new skill or improvement is genuinely useful |
| 📚 | **Personal skills library** | Maintains a dedicated folder of user-created, updatable skills |
| 🤖 | **Multi-agent support** | Works with Windsurf, Cursor, Claude Code, Kilo Code, and any MCP-compatible agent |
| 📦 | **Portable** | Skills are plain Markdown — sync, share, or open-source them |
| 🛠️ | **Built-in guides** | Includes skill-creator and skill-updater guides to help agents craft high-quality skills |

## 🚀 Quick Start

### 1. Install

```bash
git clone https://github.com/YOUR_USERNAME/Autoskills.git
cd Autoskills
npm install
npm run build
```

### CLI Commands

Autoskills provides CLI commands for managing skills:

```bash
# Create a new skill template
npx skills init <skill-name>
npx skills init my-skill --path ./skills

# Add a skill to all agent applications
npx skills add <path> -y

# List all personal skills
npx skills list
```

### 2. Configure your agent

Add the Autoskills MCP server to your agent's config:

<details>
<summary><b>Windsurf</b></summary>

Edit `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "autoskills": {
      "command": "node",
      "args": ["<path-to-autoskills>/dist/index.js"]
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
      "args": ["<path-to-autoskills>/dist/index.js"]
    }
  }
}
```
</details>

<details>
<summary><b>Claude Desktop</b></summary>

Edit `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "autoskills": {
      "command": "node",
      "args": ["<path-to-autoskills>/dist/index.js"]
    }
  }
}
```
</details>

<details>
<summary><b>Kilo Code</b></summary>

Add via Kilo Code's MCP settings UI, or edit its config:

```json
{
  "mcpServers": {
    "autoskills": {
      "command": "node",
      "args": ["<path-to-autoskills>/dist/index.js"]
    }
  }
}
```
</details>

> 💡 **`AUTOSKILLS_DIR`** env var overrides the default skills location (`~/.autoskills/personal-skills`).

### 3. Start Using It

After completing a task, the agent calls Autoskills MCP tools:

| Tool | Description |
|:-----|:------------|
| `review_task` | Review a completed task — suggest creating or improving a skill |
| `create_skill` | Create a new personal skill from a solution |
| `update_skill` | Improve an existing personal skill |
| `list_skills` | List all personal skills |
| `get_skill` | Read a specific skill's full content |
| `delete_skill` | Remove a personal skill |

## 🛠️ CLI Commands

### Built-in Skill Guides

When `review_task` suggests creating or improving a skill, it automatically includes guidance:

- **skill-creator**: Guide for creating effective, reusable skills
- **skill-updater**: Guide for improving skills based on execution feedback

## Personal Skills Library

```bash
npx skills init <skill-name>              # Create a new skill template
npx skills init my-skill --path ./skills  # Create in a specific directory
npx skills add <path> -y                  # Install skill to all agents
npx skills list                           # List all personal skills
```

## 📚 Personal Skills Library

Skills follow a simple, portable structure:

```
~/.autoskills/personal-skills/
├── web-scraping-with-playwright/
│   └── SKILL.md
├── docker-compose-setup/
│   └── SKILL.md
└── react-ts-setup/
    ├── SKILL.md
    ├── scripts/
    ├── references/
    └── assets/
```

Each `SKILL.md` contains:

```markdown
---
name: skill-name
description: Short description for matching and triggering
---

# Skill Title

## When to Use
Trigger conditions and applicable scenarios.

## Instructions
Step-by-step workflow for the agent to follow.
```

### Built-in Skill Guides

When `review_task` suggests creating or improving a skill, Autoskills automatically provides guidance via built-in skills:

| Guide | Purpose |
|:------|:--------|
| **skill-creator** | Walks the agent through creating a well-structured, effective skill |
| **skill-updater** | Guides the agent in diagnosing issues and applying targeted improvements |

## 🧭 Philosophy

- **Frozen vs Personal** — Built-in skills stay frozen; only personal skills are created and updated
- **User in control** — The agent always asks before creating or modifying a skill
- **Minimal noise** — If a skill worked well, no prompt is triggered; suggestions only appear when they add value

## 📄 License

[MIT](./LICENSE)
