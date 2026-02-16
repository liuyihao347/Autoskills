#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  listSkills,
  getSkill,
  createSkill,
  updateSkill,
  deleteSkill,
  getSkillsDir,
} from "./skills-manager.js";

const server = new McpServer({
  name: "autoskills",
  version: "1.0.0",
});

// ── Tool: review_task ──────────────────────────────────────────────────────────
server.tool(
  "review_task",
  "Review a completed task and decide whether to suggest creating a new skill or improving an existing one. Call this after finishing a task.",
  {
    task_description: z.string().describe("Brief description of the task that was completed"),
    solution_summary: z.string().describe("Summary of how the task was solved"),
    skills_used: z
      .array(z.string())
      .optional()
      .describe("Names of personal skills that were used during this task, if any"),
    skill_execution_smooth: z
      .boolean()
      .optional()
      .describe("Whether the skills used executed smoothly and successfully. Only relevant if skills_used is non-empty"),
    skill_issues: z
      .string()
      .optional()
      .describe("Description of issues encountered with the skills used, if any"),
  },
  async ({ task_description, solution_summary, skills_used, skill_execution_smooth, skill_issues }) => {
    const existingSkills = listSkills();
    const usedSkills = skills_used ?? [];
    const hasUsedSkills = usedSkills.length > 0;

    if (hasUsedSkills) {
      if (skill_execution_smooth === true) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                action: "none",
                reason:
                  "The skill(s) used performed well during this task. No changes needed.",
                skills_reviewed: usedSkills,
              }),
            },
          ],
        };
      }

      const skillDetails = usedSkills
        .map((name) => {
          const skill = getSkill(name);
          return skill
            ? `- **${skill.meta.name}**: ${skill.meta.description}`
            : `- **${name}**: (not found in personal skills)`;
        })
        .join("\n");

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              action: "suggest_improve",
              message: `The following skill(s) were used but did not execute smoothly:\n\n${skillDetails}\n\nIssues encountered: ${skill_issues || "unspecified"}\n\nWould you like me to improve this skill to better handle this type of task?`,
              skills_to_improve: usedSkills,
              issues: skill_issues || "",
              task_description,
              solution_summary,
            }),
          },
        ],
      };
    }

    const existingNames = existingSkills.map((s) => s.name).join(", ") || "(none)";

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            action: "suggest_create",
            message: `This task was completed without using any personal skills. The solution may be worth packaging as a reusable skill.\n\n**Task**: ${task_description}\n**Solution**: ${solution_summary}\n\nExisting personal skills: ${existingNames}\n\nWould you like me to create a new personal skill from this solution so it can be reused in similar tasks?`,
            task_description,
            solution_summary,
            existing_skills: existingSkills.map((s) => s.name),
          }),
        },
      ],
    };
  }
);

// ── Tool: create_skill ─────────────────────────────────────────────────────────
server.tool(
  "create_skill",
  "Create a new personal skill from a completed task solution",
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
  "Update an existing personal skill with improvements",
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

// ── Tool: delete_skill ─────────────────────────────────────────────────────────
server.tool(
  "delete_skill",
  "Delete a personal skill from the library",
  {
    name: z.string().describe("Name of the skill to delete"),
  },
  async ({ name }) => {
    const deleted = deleteSkill(name);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            success: deleted,
            message: deleted
              ? `Skill "${name}" deleted.`
              : `Skill "${name}" not found.`,
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
