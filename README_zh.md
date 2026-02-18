<div align="center">

# ⚡ Auto-agent-skills

**为你的 AI Agent 自动构建可复用的个人技能库。**

[English](./README.md) | 中文版

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-8A2BE2)](https://modelcontextprotocol.io/)

*一个 MCP 服务器，用于回顾已完成的任务并帮助 AI Agent 将解决方案打包为可移植、可复用的技能。*

</div>

```
Task completed
      │
      ▼
Used skill(s)? ──No──► Reusable solution? ──Yes──► Suggest creating a new skill
      │                              │
     Yes                             No
      │                              │
      ▼                              ▼
Worked well? ──Yes──► Do nothing    Do nothing
      │
     No
      │
      ▼
Suggest improving the skill
```

---

## ✨ 功能特性

| 特性 | 描述 |
|:---|:---|
| **自动回顾** | 评估已完成任务中值得封装为技能的模式 |
| **智能建议** | 仅在新技能或改进真正有用时才会提示 |
| **个人技能库** | 维护一个用户创建、可更新的专用技能文件夹 |
| **多 Agent 支持** | 支持 Windsurf、Cursor、Claude Code 及任何 MCP 兼容的 Agent |
| **快捷命令** | `/autoskill` — 跳过 Agent 判断，直接创建或改进技能 |

---

## 🚀 快速开始

### 1. 安装

```bash
git clone https://github.com/YOUR_USERNAME/Autoskills.git
cd Autoskills
npm install
npm run build
```

### 2. 配置你的 Agent

将 Autoskills MCP 服务器添加到你的 Agent 配置中：

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

`AUTOSKILLS_DIR` 用于指定这个 MCP 创建的个人技能存储目录。

### 3. 开始使用

完成任务后，你的 Agent 会自动调用 Autoskills 来回顾解决方案。

使用 `/autoskill` 命令跳过回顾，直接创建或改进技能：

| 命令 | 描述 | 示例 |
|:---|:---|:---|
| `/autoskill [描述]` | 从描述创建技能 | `/autoskill 创建一个 Python 网页爬虫` |
| `/autoskill` | 改进使用的技能，或从上下文创建 | 直接输入 `/autoskill` |

---

## 📚 个人技能库

技能以 Markdown 文件形式存储在 `~/.autoskills/personal-skills/`：

```bash
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

每个 `SKILL.md` 包含：

```markdown
---
name: skill-name
description: 用于匹配和触发的简短描述
---

# 技能标题

## 何时使用
触发条件和适用场景。

## 指令
Agent 遵循的逐步工作流程。
```

---

## 🛠️ CLI（可选）

一个用于无需 Agent 即可管理技能的小型 CLI：

```bash
npx autoskill init <skill-name>    # 创建技能模板
npx autoskill add <path> -y        # 添加技能并创建软链接
npx autoskill list                 # 列出所有技能
```

---

## 📄 许可证

[MIT](./LICENSE)
