import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const DEFAULT_SKILLS_DIR = path.join(os.homedir(), ".autoskills", "personal-skills");

export function getSkillsDir(): string {
  return process.env.AUTOSKILLS_DIR || DEFAULT_SKILLS_DIR;
}

export interface SkillMeta {
  name: string;
  description: string;
  version: string;
  tags: string[];
  created: string;
  updated: string;
}

export interface Skill {
  meta: SkillMeta;
  content: string;
  filePath: string;
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function parseFrontmatter(raw: string): { meta: Record<string, unknown>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };

  const metaBlock = match[1];
  const body = match[2];
  const meta: Record<string, unknown> = {};

  for (const line of metaBlock.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value: unknown = line.slice(idx + 1).trim();

    if (typeof value === "string" && value.startsWith("[") && value.endsWith("]")) {
      value = value
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim());
    }
    meta[key] = value;
  }

  return { meta, body };
}

function buildFrontmatter(meta: SkillMeta): string {
  const tags = `[${meta.tags.join(", ")}]`;
  return [
    "---",
    `name: ${meta.name}`,
    `description: ${meta.description}`,
    `version: ${meta.version}`,
    `tags: ${tags}`,
    `created: ${meta.created}`,
    `updated: ${meta.updated}`,
    "---",
  ].join("\n");
}

export function listSkills(): { name: string; description: string; path: string }[] {
  const dir = getSkillsDir();
  ensureDir(dir);

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const skills: { name: string; description: string; path: string }[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillFile = path.join(dir, entry.name, "SKILL.md");
    if (!fs.existsSync(skillFile)) continue;

    const raw = fs.readFileSync(skillFile, "utf-8");
    const { meta } = parseFrontmatter(raw);
    skills.push({
      name: (meta.name as string) || entry.name,
      description: (meta.description as string) || "",
      path: skillFile,
    });
  }

  return skills;
}

export function getSkill(name: string): Skill | null {
  const dir = getSkillsDir();
  const skillFile = path.join(dir, name, "SKILL.md");
  if (!fs.existsSync(skillFile)) return null;

  const raw = fs.readFileSync(skillFile, "utf-8");
  const { meta, body } = parseFrontmatter(raw);

  return {
    meta: {
      name: (meta.name as string) || name,
      description: (meta.description as string) || "",
      version: (meta.version as string) || "1.0.0",
      tags: (meta.tags as string[]) || [],
      created: (meta.created as string) || "",
      updated: (meta.updated as string) || "",
    },
    content: body,
    filePath: skillFile,
  };
}

export function createSkill(
  name: string,
  description: string,
  title: string,
  whenToUse: string,
  instructions: string,
  tags: string[] = []
): string {
  const dir = getSkillsDir();
  const skillDir = path.join(dir, name);

  if (fs.existsSync(skillDir)) {
    throw new Error(`Skill "${name}" already exists. Use update_skill to modify it.`);
  }

  ensureDir(skillDir);

  const now = new Date().toISOString().slice(0, 10);
  const meta: SkillMeta = {
    name,
    description,
    version: "1.0.0",
    tags,
    created: now,
    updated: now,
  };

  const content = [
    buildFrontmatter(meta),
    "",
    `# ${title}`,
    "",
    "## When to Use",
    whenToUse,
    "",
    "## Instructions",
    instructions,
    "",
  ].join("\n");

  const skillFile = path.join(skillDir, "SKILL.md");
  fs.writeFileSync(skillFile, content, "utf-8");
  return skillFile;
}

export function updateSkill(
  name: string,
  updates: {
    description?: string;
    title?: string;
    whenToUse?: string;
    instructions?: string;
    tags?: string[];
  }
): string {
  const dir = getSkillsDir();
  const skillFile = path.join(dir, name, "SKILL.md");

  if (!fs.existsSync(skillFile)) {
    throw new Error(`Skill "${name}" not found.`);
  }

  const raw = fs.readFileSync(skillFile, "utf-8");
  const { meta, body } = parseFrontmatter(raw);

  const now = new Date().toISOString().slice(0, 10);
  const currentVersion = (meta.version as string) || "1.0.0";
  const versionParts = currentVersion.split(".").map(Number);
  versionParts[2] = (versionParts[2] || 0) + 1;

  const newMeta: SkillMeta = {
    name: (meta.name as string) || name,
    description: updates.description || (meta.description as string) || "",
    version: versionParts.join("."),
    tags: updates.tags || (meta.tags as string[]) || [],
    created: (meta.created as string) || now,
    updated: now,
  };

  let newBody = body;

  if (updates.title || updates.whenToUse || updates.instructions) {
    const titleMatch = body.match(/^# .+$/m);
    const currentTitle = titleMatch ? titleMatch[0].slice(2) : name;

    const whenMatch = body.match(/## When to Use\r?\n([\s\S]*?)(?=\r?\n## |\r?\n*$)/);
    const currentWhen = whenMatch ? whenMatch[1].trim() : "";

    const instrMatch = body.match(/## Instructions\r?\n([\s\S]*?)$/);
    const currentInstr = instrMatch ? instrMatch[1].trim() : "";

    newBody = [
      "",
      `# ${updates.title || currentTitle}`,
      "",
      "## When to Use",
      updates.whenToUse || currentWhen,
      "",
      "## Instructions",
      updates.instructions || currentInstr,
      "",
    ].join("\n");
  }

  const content = buildFrontmatter(newMeta) + "\n" + newBody;
  fs.writeFileSync(skillFile, content, "utf-8");
  return skillFile;
}

export function deleteSkill(name: string): boolean {
  const dir = getSkillsDir();
  const skillDir = path.join(dir, name);

  if (!fs.existsSync(skillDir)) return false;

  fs.rmSync(skillDir, { recursive: true, force: true });
  return true;
}
