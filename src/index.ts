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
} from "./skills-manager.js";
import {
  getSkillCreatorGuide,
  getSkillUpdaterGuide,
} from "./builtin-skills.js";

const server = new McpServer({
  name: "autoskills",
  version: "1.0.0",
});

// ── Tool: review_task ──────────────────────────────────────────────────────────
server.tool(
  "review_task",
  "After completing a task, call this tool to check if the solution is worth saving as a reusable skill. This helps build your personal skills library over time.",
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
  "ALWAYS call this tool BEFORE starting any non-trivial task. Search the public skill ecosystem for a reusable skill that matches the task. This must be the FIRST tool called at the start of tasks involving coding, deployment, testing, frameworks, or any domain-specific work (e.g. react, docker, python, git, CI/CD, databases). Automatically picks the top result by download count, installs it, and creates a symlink so it is immediately available.",
  {
    query: z.string().describe("Search keywords describing the skill needed, e.g. 'react performance' or 'deploy docker'"),
  },
  async ({ query }) => {
    try {
      const results = await searchPublicSkills(query);

      if (results.length === 0) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({
            found: false,
            message: `No public skills found for "${query}". Proceed with the task using general capabilities.`,
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
          top_result: top,
          all_results: results,
          installed,
          install_error: installError || undefined,
          message: installed
            ? `Skill "${top.package}" installed and ready. Use it for this task. After completing the task, call review_task to evaluate if this solution should be saved.`
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
  "Call this tool whenever review_task suggests action 'suggest_create', or whenever the user asks to save, remember, or reuse a solution. Packages the current task solution into a reusable personal skill stored in the personal skills library. Must be called immediately when the suggestion is made — do not defer or ask for confirmation unless the user explicitly declines.",
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
  "Call this tool whenever review_task suggests action 'suggest_improve', or when a skill was used but produced suboptimal results. Immediately apply targeted improvements to the skill's instructions based on what went wrong. Do not defer — update the skill right after the task while the context is fresh.",
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
  "List all personal skills in the skills library",
  {},
  async () => {
    const skills = listSkills();
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            skills_dir: getSkillsDir(),
            count: skills.length,
            skills,
          }),
        },
      ],
    };
  }
);

// ── Tool: get_skill ────────────────────────────────────────────────────────────
server.tool(
  "get_skill",
  "Read the full content of a specific personal skill",
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
