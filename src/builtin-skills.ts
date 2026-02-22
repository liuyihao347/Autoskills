import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface BuiltinSkill {
  name: string;
  description: string;
  content: string;
}

function loadBuiltinSkill(skillName: string): BuiltinSkill | null {
  const skillPath = path.join(__dirname, "builtin-skills", skillName, "SKILL.md");
  
  if (!fs.existsSync(skillPath)) {
    return null;
  }

  const raw = fs.readFileSync(skillPath, "utf-8");
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  
  if (!match) {
    return null;
  }

  const metaBlock = match[1];
  const body = match[2];
  
  let name = "";
  let description = "";
  
  for (const line of metaBlock.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    
    if (key === "name") name = value;
    if (key === "description") description = value;
  }

  return { name, description, content: body };
}

export function getSkillCreatorGuide(): BuiltinSkill | null {
  return loadBuiltinSkill("skill-creator");
}

export function getSkillUpdaterGuide(): BuiltinSkill | null {
  return loadBuiltinSkill("skill-updater");
}

export function listBuiltinSkills(): BuiltinSkill[] {
  const skills: BuiltinSkill[] = [];
  
  const creator = getSkillCreatorGuide();
  if (creator) skills.push(creator);
  
  const updater = getSkillUpdaterGuide();
  if (updater) skills.push(updater);
  
  return skills;
}
