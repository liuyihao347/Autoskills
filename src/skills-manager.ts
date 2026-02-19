import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";

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

function runNpxSkillsAdd(skillDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("npx", ["autoskill", "add", skillDir, "-y"], {
      stdio: "pipe",
      shell: true,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`npx skills add failed (code ${code}): ${stderr || stdout}`));
      }
    });

    proc.on("error", (err) => {
      reject(new Error(`Failed to run npx skills add: ${err.message}`));
    });
  });
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
  const fullDescription = whenToUse
    ? `${description} Use when: ${whenToUse}`
    : description;
  const meta: SkillMeta = {
    name,
    description: fullDescription,
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

  const baseDescription = updates.description || (meta.description as string) || "";
  const newDescription = updates.whenToUse
    ? `${baseDescription} Use when: ${updates.whenToUse}`
    : baseDescription;

  const newMeta: SkillMeta = {
    name: (meta.name as string) || name,
    description: newDescription,
    version: versionParts.join("."),
    tags: updates.tags || (meta.tags as string[]) || [],
    created: (meta.created as string) || now,
    updated: now,
  };

  let newBody = body;

  if (updates.title || updates.instructions) {
    const titleMatch = body.match(/^# .+$/m);
    const currentTitle = titleMatch ? titleMatch[0].slice(2) : name;

    const instrMatch = body.match(/## Instructions\r?\n([\s\S]*?)$/) ||
      body.match(/^(?!#)([\s\S]+)$/m);
    const currentInstr = instrMatch ? instrMatch[1].trim() : body.trim();

    newBody = [
      "",
      `# ${updates.title || currentTitle}`,
      "",
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

export interface PublicSkillResult {
  package: string;
  url: string;
}

export function searchPublicSkills(query: string): Promise<PublicSkillResult[]> {
  return new Promise((resolve) => {
    const proc = spawn("npx", ["skills", "find", query], {
      stdio: "pipe",
      shell: true,
    });

    let stdout = "";
    proc.stdout?.on("data", (data) => { stdout += data.toString(); });
    proc.stderr?.on("data", (data) => { stdout += data.toString(); });

    proc.on("close", () => {
      const results: PublicSkillResult[] = [];
      // Strip ANSI escape codes, normalize line endings
      const clean = stdout.replace(/\x1B\[[0-9;]*[mGKHFJA-Za-z]/g, "").replace(/\r/g, "");
      const lines = clean.split("\n").filter(l => l.trim() !== "");
      for (let i = 0; i < lines.length; i++) {
        // Match: owner/repo@skill-name [N installs]
        const pkgMatch = lines[i].match(/^([\w.-]+\/[\w.-]+@[\w./ -]+?)(?:\s+\d+\s+installs?)?$/);
        if (pkgMatch) {
          const pkg = pkgMatch[1].trim();
          // Next non-empty line may be └ https://...
          const nextLine = lines[i + 1] ? lines[i + 1].trim().replace(/^[└\\]\s*/, "") : "";
          const url = nextLine.startsWith("https://") ? nextLine : `https://skills.sh/${pkg.replace("@", "/")}`;
          results.push({ package: pkg, url });
        }
      }
      resolve(results);
    });

    proc.on("error", () => resolve([]));
  });
}

export function installPublicSkill(pkg: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("npx", ["skills", "add", pkg, "-g", "-y"], {
      stdio: "pipe",
      shell: true,
    });

    let stdout = "";
    let stderr = "";
    proc.stdout?.on("data", (data) => { stdout += data.toString(); });
    proc.stderr?.on("data", (data) => { stderr += data.toString(); });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`npx skills add failed (code ${code}): ${stderr || stdout}`));
      }
    });

    proc.on("error", (err) => reject(new Error(`Failed to run npx skills add: ${err.message}`)));
  });
}

export function getAgentsSkillsDir(): string {
  return process.env.AGENTS_SKILLS_DIR || path.join(os.homedir(), ".agents", "skills");
}

export function createSymlinkForSkill(skillName: string): void {
  const skillsDir = getSkillsDir();
  const agentsDir = getAgentsSkillsDir();
  const target = path.join(skillsDir, skillName);
  const linkPath = path.join(agentsDir, skillName);

  if (!fs.existsSync(target)) return;
  if (!fs.existsSync(agentsDir)) fs.mkdirSync(agentsDir, { recursive: true });
  if (fs.existsSync(linkPath)) return;

  try {
    fs.symlinkSync(target, linkPath, "junction");
  } catch {
    try { fs.symlinkSync(target, linkPath, "dir"); } catch { /* ignore */ }
  }
}
