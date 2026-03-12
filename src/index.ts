#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  listSkills,
  getSkill,
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
    skills_used: z
      .array(z.string())
      .optional()
      .describe("Skills used in this task, if any"),
    skill_issues: z
      .string()
      .optional()
      .describe("Any issues encountered with the skills"),
  },
  async ({ task_description, solution_summary, skills_used, skill_issues }) => {
    const existingSkills = listSkills();
    const usedSkills = skills_used ?? [];
    const hasUsedSkills = usedSkills.length > 0;
    const hasIssues = skill_issues && skill_issues.trim().length > 0;

    if (hasUsedSkills && hasIssues) {
      const skillDetails = usedSkills
        .map((name) => {
          const skill = getSkill(name);
          return skill
            ? `- **${skill.meta.name}**: ${skill.meta.description}`
            : `- **${name}**: (skill not found)`;
        })
        .join("\n");

      const updaterGuide = getSkillUpdaterGuide();
      return {
        content: [
          {
            type: "text" as const,
            text: `Skills used had issues:\n\n${skillDetails}\n\nIssues: ${skill_issues}\n\n**Action**: Improve these skills using update_skill`,
          },
        ],
      };
    }

    if (hasUsedSkills && !hasIssues) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Skills used worked well: ${usedSkills.join(", ")}. No changes needed.`,
          },
        ],
      };
    }

    const existingNames = existingSkills.map((s) => s.name).join(", ") || "none";
    const creatorGuide = getSkillCreatorGuide();

    return {
      content: [
        {
          type: "text" as const,
          text: `Task completed without using skills.\n\n**Task**: ${task_description}\n**Solution**: ${solution_summary}\n\n**Existing skills**: ${existingNames}\n\n**Action**: Consider creating a new skill with create_skill to make this solution reusable`,
        },
      ],
    };
  }
);

// ── Tool: search_skill ────────────────────────────────────────────────────────
server.tool(
  "search_skill",
  "When starting a new task, first decide which skill domain would help most, then call this to find and install relevant skills. The tool searches the public skill ecosystem, installs the best match, and tells you which execution stages should reference it (adapt to your context, don't copy blindly).",
  {
    task_context: z.string().optional().describe("Task summary from the user request"),
    candidate_skill: z.string().optional().describe("One candidate skill focus decided by the agent before search"),
    query: z.string().optional().describe("Legacy fallback query (for compatibility)"),
  },
  async ({ task_context, candidate_skill, query }) => {
    try {
      const sourceContext = task_context || query || "";
      if (!sourceContext.trim() && !candidate_skill?.trim()) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({
            found: false,
            message: "search_skill requires task_context (or legacy query), and should include one candidate_skill focus when possible.",
          }) }],
        };
      }

      const decision = inferSkillFocus(sourceContext, candidate_skill);
      const results = await searchPublicSkills(decision.searchQuery);

      if (results.length === 0) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({
            found: false,
            task_context: sourceContext,
            candidate_skill: candidate_skill || null,
            search_query: decision.searchQuery,
            suggest: decision.suggest,
            usage_note: "Use skills as reference and adapt to current constraints; do not copy verbatim.",
            message: `No public skills found for query "${decision.searchQuery}". Proceed with general capabilities.`,
          }) }],
        };
      }

      const top = results[0];
      let installed = false;
      let installError = "";

      try {
        await installPublicSkill(top.package);
        const skillName = top.package.split("@")[1];
        createSymlinkForSkill(skillName);
        installed = true;
      } catch (err) {
        installError = (err as Error).message;
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify({
          found: true,
          task_context: sourceContext,
          candidate_skill: candidate_skill || null,
          search_query: decision.searchQuery,
          top_result: top,
          all_results: results,
          installed,
          install_error: installError || undefined,
          suggest: decision.suggest,
          usage_note: "Reference the skill in relevant stages, but adapt to your project context instead of copying directly.",
          message: installed
            ? `Skill "${top.package}" installed for query "${decision.searchQuery}". Reference it in later execution stages (not verbatim), then call review_task after task completion.`
            : `Found skill "${top.package}" but installation failed: ${installError}. You can install manually with: npx skills add ${top.package}`,
        }) }],
      };
    } catch (err) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({
          found: false,
          message: `Search failed: ${(err as Error).message}`,
        }) }],
      };
    }
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
    try {
      const filePath = createSkill(name, description, title, when_to_use, instructions, tags ?? []);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              success: true,
              message: `Skill "${name}" created successfully.`,
              path: filePath,
              skills_dir: getSkillsDir(),
            }),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              success: false,
              error: (err as Error).message,
            }),
          },
        ],
      };
    }
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
    try {
      const filePath = updateSkill(name, {
        description: description ?? undefined,
        title: title ?? undefined,
        whenToUse: when_to_use ?? undefined,
        instructions: instructions ?? undefined,
        tags: tags ?? undefined,
      });
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              success: true,
              message: `Skill "${name}" updated successfully.`,
              path: filePath,
            }),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              success: false,
              error: (err as Error).message,
            }),
          },
        ],
      };
    }
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

// ── Tool: get_skill ────────────────────────────────────────────────────────────
server.tool(
  "get_skill",
  "Read a specific skill's full instructions before using it, or to check what a skill contains.",
  {
    name: z.string().describe("Name of the skill to read"),
  },
  async ({ name }) => {
    const skill = getSkill(name);
    if (!skill) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              success: false,
              error: `Skill "${name}" not found.`,
            }),
          },
        ],
      };
    }
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            success: true,
            skill: {
              ...skill.meta,
              content: skill.content,
              path: skill.filePath,
            },
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
