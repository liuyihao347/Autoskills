<<<<<<< C:/Users/ASUS/Desktop/Autoskills/mcp-smoke-test.mjs
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const skillsDir = process.env.AUTOSKILLS_DIR || "";

const client = new Client({ name: "mcp-test-client", version: "0.0.1" });
const transport = new StdioClientTransport({
  command: "node",
  args: ["dist/index.js"],
  cwd: process.cwd(),
  env: { AUTOSKILLS_DIR: skillsDir },
});

function parseToolTextResult(result) {
  const text = result?.content?.[0]?.text;
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function main() {
  await client.connect(transport);

  const tools = await client.listTools();
  console.log("TOOLS:", tools.tools.map((t) => t.name).join(", "));

  const review = await client.callTool({
    name: "review_task",
    arguments: {
      task_description: "MCP smoke test",
      solution_summary: "Validated end-to-end tool calling via stdio",
    },
  });
  console.log("REVIEW_TASK:", JSON.stringify(parseToolTextResult(review)));

  const create = await client.callTool({
    name: "create_skill",
    arguments: {
      name: "mcp-smoke-test-skill",
      description: "Skill created during MCP smoke test",
      title: "MCP Smoke Test Skill",
      when_to_use: "When testing MCP create/get/list/update/delete flow",
      instructions: "1. Run MCP smoke test\n2. Validate response",
      tags: ["test", "mcp"],
    },
  });
  console.log("CREATE_SKILL:", JSON.stringify(parseToolTextResult(create)));

  const list = await client.callTool({
    name: "list_skills",
    arguments: {},
  });
  console.log("LIST_SKILLS:", JSON.stringify(parseToolTextResult(list)));

  const get = await client.callTool({
    name: "get_skill",
    arguments: { name: "mcp-smoke-test-skill" },
  });
  console.log("GET_SKILL:", JSON.stringify(parseToolTextResult(get)));

  const update = await client.callTool({
    name: "update_skill",
    arguments: {
      name: "mcp-smoke-test-skill",
      description: "Updated by MCP smoke test",
    },
  });
  console.log("UPDATE_SKILL:", JSON.stringify(parseToolTextResult(update)));

  const del = await client.callTool({
    name: "delete_skill",
    arguments: { name: "mcp-smoke-test-skill" },
  });
  console.log("DELETE_SKILL:", JSON.stringify(parseToolTextResult(del)));

  await client.close();
}

main().catch(async (err) => {
  console.error("MCP_SMOKE_TEST_ERROR:", err);
  try {
    await client.close();
  } catch {
    // ignore
  }
  process.exit(1);
});
=======
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import fs from "node:fs";
import path from "node:path";

const skillsDir = process.env.AUTOSKILLS_DIR || "";
const skillName = process.env.MCP_TEST_SKILL_NAME || "mcp-e2e-reuse-skill";
const cleanupAfterTest = process.env.MCP_TEST_CLEANUP === "1";

const client = new Client({ name: "mcp-test-client", version: "0.0.1" });
const transport = new StdioClientTransport({
  command: "node",
  args: ["dist/index.js"],
  cwd: process.cwd(),
  env: { AUTOSKILLS_DIR: skillsDir },
});

function parseToolTextResult(result) {
  const text = result?.content?.[0]?.text;
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function main() {
  await client.connect(transport);

  const tools = await client.listTools();
  console.log("TOOLS:", tools.tools.map((t) => t.name).join(", "));

  const review = await client.callTool({
    name: "review_task",
    arguments: {
      task_description: "MCP smoke test",
      solution_summary: "Validated end-to-end tool calling via stdio",
    },
  });
  console.log("REVIEW_TASK:", JSON.stringify(parseToolTextResult(review)));

  const create = await client.callTool({
    name: "create_skill",
    arguments: {
      name: skillName,
      description: "Skill created during MCP end-to-end test",
      title: "MCP End-to-End Reuse Skill",
      when_to_use: "When validating MCP create/list/get/review reuse flow",
      instructions: "1. Create skill via MCP\n2. Read skill via MCP\n3. Reuse it in review_task",
      tags: ["test", "mcp"],
    },
  });
  const createResult = parseToolTextResult(create);
  console.log("CREATE_SKILL:", JSON.stringify(createResult));

  const expectedSkillPath = path.join(skillsDir, skillName, "SKILL.md");
  const pathOk = Boolean(createResult?.path) && path.resolve(createResult.path) === path.resolve(expectedSkillPath);
  const fileExists = fs.existsSync(expectedSkillPath);
  console.log(
    "SKILL_FILE_CHECK:",
    JSON.stringify({
      expectedPath: expectedSkillPath,
      returnedPath: createResult?.path || "",
      pathOk,
      fileExists,
    })
  );

  const list = await client.callTool({
    name: "list_skills",
    arguments: {},
  });
  console.log("LIST_SKILLS:", JSON.stringify(parseToolTextResult(list)));

  const get = await client.callTool({
    name: "get_skill",
    arguments: { name: skillName },
  });
  console.log("GET_SKILL:", JSON.stringify(parseToolTextResult(get)));

  const reuse = await client.callTool({
    name: "review_task",
    arguments: {
      task_description: "Reuse created personal skill in a follow-up task",
      solution_summary: "Used the newly created skill as the standard workflow",
      skills_used: [skillName],
      skill_execution_smooth: true,
    },
  });
  console.log("REUSE_REVIEW_TASK:", JSON.stringify(parseToolTextResult(reuse)));

  const update = await client.callTool({
    name: "update_skill",
    arguments: {
      name: skillName,
      description: "Updated by MCP smoke test",
    },
  });
  console.log("UPDATE_SKILL:", JSON.stringify(parseToolTextResult(update)));

  if (cleanupAfterTest) {
    const del = await client.callTool({
      name: "delete_skill",
      arguments: { name: skillName },
    });
    console.log("DELETE_SKILL:", JSON.stringify(parseToolTextResult(del)));
  } else {
    console.log("DELETE_SKILL:", JSON.stringify({ skipped: true, reason: "MCP_TEST_CLEANUP is not set to 1" }));
  }

  await client.close();
}

main().catch(async (err) => {
  console.error("MCP_SMOKE_TEST_ERROR:", err);
  try {
    await client.close();
  } catch {
    // ignore
  }
  process.exit(1);
});
>>>>>>> C:/Users/ASUS/.windsurf/worktrees/Autoskills/Autoskills-6bf0253b/mcp-smoke-test.mjs
