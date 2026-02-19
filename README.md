<div align="center">

# ⚡ Auto-agent-skills

**Automatically build a reusable personal skills library for your AI agents.**

[中文版](./README_zh.md) | English

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-8A2BE2)](https://modelcontextprotocol.io/)

*An MCP server that helps AI agents discover, create, and continuously improve reusable skills — automatically.*

</div>

![flowchart](flowchart.png)
---

## ✨ Features

| Feature | Description |
|:---|:---|
| **Auto-search** | Before a task starts, automatically searches the public skill ecosystem and installs the best matching skill |
| **Auto-review** | After a task completes, evaluates whether the solution is worth packaging as a reusable skill |
| **Smart suggestion** | Only prompts when a new skill or improvement is genuinely useful — no noise |
| **Continuous improvement** | If a used skill underperformed, suggests targeted improvements based on the actual issues |
| **Personal skills library** | Maintains a dedicated, version-controlled folder of your own skills at `~/.autoskills/personal-skills/` |
| **Multi-agent support** | Works with Windsurf, Cursor, Claude Code, and any MCP-compatible agent |

---

## 🚀 Quick Start

### 1. Install

```bash
git clone https://github.com/YOUR_USERNAME/Autoskills.git
cd Autoskills
npm install
npm run build
```

### 2. Configure your agent

Add the Autoskills MCP server to your agent's config:

```json
{
  "mcpServers": {
    "auto-agent-skills": {
      "command": "node",
      "args": ["<path-to-autoskills>/dist/index.js"],
      "env": {
        "AUTOSKILLS_DIR": "<path-to-your-home>/.autoskills/personal-skills"
      }
    }
  }
}
```

`AUTOSKILLS_DIR` specifies where personal skills created by this MCP are stored.

### 3. Start Using It

The agent handles everything automatically:

1. **Before a task** — if the task looks like it has a relevant public skill, the agent calls `search_skill` to find and install it
2. **During the task** — the agent uses the installed skill as a guide
3. **After the task** — the agent calls `review_task` to decide whether to create a new skill or improve an existing one

---

## 🔧 MCP Tools

| Tool | When it's called | What it does |
|:---|:---|:---|
| `search_skill` | Before task execution | Searches the public skill ecosystem, installs the top result, creates a symlink |
| `review_task` | After task completion | Evaluates the solution and suggests creating or improving a skill |
| `create_skill` | When creating a new skill | Writes a new `SKILL.md` to the personal library and links it |
| `update_skill` | When improving a skill | Updates an existing skill's instructions, description, or metadata |
| `list_skills` | On demand | Lists all skills in the personal library |
| `get_skill` | On demand | Reads the full content of a specific skill |

---

## 📚 Personal Skills Library

Skills are stored as Markdown files in `~/.autoskills/personal-skills/`:

```
~/.autoskills/personal-skills/
├── web-scraping/
│   └── SKILL.md
├── docker-setup/
│   └── SKILL.md
└── react-component/
    ├── SKILL.md
    ├── scripts/
    └── references/
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

Skills are also symlinked to `~/.agents/skills/` so they are globally available to any agent.

---

## 🛠️ CLI (Optional)

A small CLI for managing skills without an agent:

```bash
npx autoskill init <skill-name>      # Create a new skill template
npx autoskill add <path> [-y]        # Add a skill and create symlink
npx autoskill remove <skill-name>    # Remove a skill and its symlink
npx autoskill list                   # List all personal skills
```

---

## 💡 Usage Scenarios

| Scenario | How it works |
|:---|:---|
| **Recurring task** | Agent finds a matching public skill before starting, uses it, then reviews quality after |
| **Novel solution** | Agent completes the task, then suggests packaging the solution as a new personal skill |
| **Skill underperforms** | Agent detects issues after using a skill, suggests targeted improvements |
| **Manual skill creation** | Use `npx autoskill init` to scaffold a skill template and fill it in yourself |
| **Sharing skills** | Skills are plain Markdown — copy or symlink them across machines or repos |

---

## 📄 License

[MIT](./LICENSE)
