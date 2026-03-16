#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  listSkills,
  createSkill,
  updateSkill,
  getSkillsDir,
  searchPublicSkills,
  installPublicSkill,
  createSymlinkForSkill,
  searchLocalSkills,
  listGlobalSkills,
  getAgentsSkillsDir,
} from "./skills-manager.js";
import {
  getSkillCreatorGuide,
  getSkillUpdaterGuide,
  getReviewTaskGuide,
  getSearchSkillGuide,
} from "./builtin-skills.js";

const server = new McpServer({
  name: "autoskills",
  version: "1.0.0",
});

function normalizeSearchQuery(raw: string): string {
  return raw.trim();
}

interface SkillFocusDecision {
  searchQuery: string;
  suggest: string[];
}

function inferSkillFocus(taskContext: string, candidateSkill?: string): SkillFocusDecision {
  const text = `${candidateSkill || ""} ${taskContext}`.toLowerCase();

  if (candidateSkill && candidateSkill.trim()) {
    const focus = candidateSkill.trim();
    return {
      searchQuery: normalizeSearchQuery(focus),
      suggest: [
        "需求拆解阶段：参考 skill 的任务边界与输入输出定义",
        "实现阶段：参考核心步骤并按当前项目约束做改写",
        "验证阶段：参考 skill 的检查清单补齐测试/验收项",
      ],
    };
  }

  if (/(migration|migrate|server|deploy|rollback|cutover|infra|docker|k8s|kubernetes)/.test(text)) {
    return {
      searchQuery: "server migration deployment rollback checklist",
      suggest: [
        "迁移方案设计：参考分阶段迁移、回滚与风险控制策略",
        "环境准备与数据同步：参考前置检查与脚本化步骤",
        "切换与验收：参考 cutover、回滚条件和观测项",
      ],
    };
  }

  if (/(tkinter|gui|ui|ux|redesign|desktop)/.test(text) && /(python|quiz|app)/.test(text)) {
    return {
      searchQuery: "python tkinter gui app architecture",
      suggest: [
        "界面结构重构：参考布局组织与组件职责划分",
        "交互实现：参考提交、反馈、解释展示等流程编排",
        "收尾优化：参考可维护性与可扩展性实践（而非逐字照搬）",
      ],
    };
  }

  if (/(pdf|notes|note|study|quiz|question|explanation|feedback)/.test(text)) {
    return {
      searchQuery: "quiz workflow content generation feedback explanation",
      suggest: [
        "内容生成阶段：参考题目与讲解组织方式",
        "交互闭环阶段：参考即时反馈与解释输出时机",
        "导出与归档阶段：参考 PDF/笔记产物的结构化输出",
      ],
    };
  }

  return {
    searchQuery: normalizeSearchQuery(taskContext),
    suggest: [
      "方案制定阶段：参考任务拆解方法",
      "执行阶段：参考关键步骤并结合实际环境调整",
      "验收阶段：参考质量检查项",
    ],
  };
}

// ── Tool: review_task ──────────────────────────────────────────────────────────
server.tool(
  "review_task",
  "After completing any task, call this to capture reusable knowledge. If no skills were used, it will suggest creating a new skill. If skills had issues, it will suggest improvements. This builds your personal skills library automatically.",
  {
    task_description: z.string().describe("What task was completed"),
    solution_summary: z.string().describe("How the task was solved"),
    skills_used: z.array(z.string()).optional().describe("Skills used in this task, if any"),
    skill_issues: z.string().optional().describe("Any issues encountered with the skills"),
  },
  async ({ task_description, solution_summary, skills_used, skill_issues }) => {
    const reviewGuide = getReviewTaskGuide();

    if (!reviewGuide) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              error: "review-task builtin skill not found",
            }),
          },
        ],
      };
    }

    const usedSkills = skills_used ?? [];
    const hasUsedSkills = usedSkills.length > 0;
    const hasIssues = !!skill_issues;

    return {
      content: [
        {
          type: "resource" as const,
          resource: {
            uri: `builtin://review-task/SKILL.md`,
            mimeType: "text/markdown",
            text: `${reviewGuide.content}\n\n---\n\n**Current Task Context:**\n- Task: ${task_description}\n- Solution: ${solution_summary}\n- Skills used: ${hasUsedSkills ? usedSkills.join(", ") : "none"}\n- Issues: ${hasIssues ? skill_issues : "none"}`,
          },
        },
      ],
    };
  }
);

// ── Tool: search_skill ────────────────────────────────────────────────────────
server.tool(
  "search_skill",
  "When starting a new task, call this to get the standard workflow for analyzing requirements and searching for relevant skills.",
  {
    task_context: z.string().optional().describe("Task summary from the user request."),
    candidate_skill: z.string().optional().describe("One candidate skill focus decided by the agent before search."),
    query: z.string().optional().describe("Legacy fallback query (for compatibility)."),
  },
  async ({ task_context, candidate_skill, query }) => {
    const searcherGuide = getSearchSkillGuide();

    if (!searcherGuide) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              error: "search-skill builtin skill not found",
            }),
          },
        ],
      };
    }

    const sourceContext = task_context || query || "";
    
    return {
      content: [
        {
          type: "resource" as const,
          resource: {
            uri: `builtin://search-skill/SKILL.md`,
            mimeType: "text/markdown",
            text: `${searcherGuide.content}\n\n---\n\n**Current Task Context:**\n- Context: ${sourceContext || "Not provided"}\n- Candidate Focus: ${candidate_skill || "Not provided"}`,
          },
        },
      ],
    };
  }
);


server.tool(
  "create_skill",
  "Immediately call this when you solve a problem that could be reused, or when review_task suggests creating a skill. Converts your solution into a reusable skill—no confirmation needed unless the user explicitly declines.",
  {
    name: z
      .string()
      .regex(/^[a-z0-9-]+$/)
      .describe("Unique skill identifier (lowercase, hyphens only)"),
    description: z.string().describe("Short description for matching and triggering"),
    title: z.string().describe("Display title for the skill"),
    when_to_use: z.string().describe("When this skill should be triggered"),
    instructions: z.string().describe("Step-by-step instructions for the agent to follow"),
    tags: z.array(z.string()).optional().describe("Tags for categorization"),
  },
  async ({ name, description, title, when_to_use, instructions, tags }) => {
    const creatorGuide = getSkillCreatorGuide();
    
    if (!creatorGuide) {
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            error: "skill-creator builtin skill not found",
          }),
        }],
      };
    }

    return {
      content: [{
        type: "resource" as const,
        resource: {
          uri: `builtin://skill-creator/SKILL.md`,
          mimeType: "text/markdown",
          text: `${creatorGuide.content}\n\n---\n\n**Skill to Create:**\n- Name: ${name}\n- Description: ${description}\n- Title: ${title}\n- When to use: ${when_to_use}\n- Instructions: ${instructions}\n- Tags: ${tags?.join(", ") || "none"}`,
        },
      }],
    };
  }
);

// ── Tool: update_skill ─────────────────────────────────────────────────────────
server.tool(
  "update_skill",
  "Immediately call this when a skill produces suboptimal results or when review_task suggests improving a skill. Apply fixes while the context is fresh—no need to defer or ask permission.",
  {
    name: z.string().describe("Name of the skill to update"),
    description: z.string().optional().describe("Updated description"),
    title: z.string().optional().describe("Updated title"),
    when_to_use: z.string().optional().describe("Updated trigger conditions"),
    instructions: z.string().optional().describe("Updated instructions"),
    tags: z.array(z.string()).optional().describe("Updated tags"),
  },
  async ({ name, description, title, when_to_use, instructions, tags }) => {
    const updaterGuide = getSkillUpdaterGuide();
    
    if (!updaterGuide) {
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            error: "skill-updater builtin skill not found",
          }),
        }],
      };
    }

    const updates = [];
    if (description) updates.push(`Description: ${description}`);
    if (title) updates.push(`Title: ${title}`);
    if (when_to_use) updates.push(`When to use: ${when_to_use}`);
    if (instructions) updates.push(`Instructions: ${instructions}`);
    if (tags) updates.push(`Tags: ${tags.join(", ")}`);

    return {
      content: [{
        type: "resource" as const,
        resource: {
          uri: `builtin://skill-updater/SKILL.md`,
          mimeType: "text/markdown",
          text: `${updaterGuide.content}\n\n---\n\n**Skill to Update:**\n- Name: ${name}\n${updates.length > 0 ? `- Updates:\n  - ${updates.join("\n  - ")}` : "- No specific updates provided"}`,
        },
      }],
    };
  }
);

// ── Tool: list_skills ──────────────────────────────────────────────────────────
server.tool(
  "list_skills",
  "Check what skills are available before starting a task, or to see your personal skills library contents.",
  {},
  async () => {
    const personalSkills = listSkills();
    const globalSkills = listGlobalSkills();
    
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            global_skills: {
              directory: getAgentsSkillsDir(),
              count: globalSkills.length,
            },
            personal_skills: {
              directory: getSkillsDir(),
              count: personalSkills.length,
              names: personalSkills.map(s => s.name),
            }
          }),
        },
      ],
    };
  }
);

// ── Start server ───────────────────────────────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Autoskills MCP server error:", err);
  process.exit(1);
});
