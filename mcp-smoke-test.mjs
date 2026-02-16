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
