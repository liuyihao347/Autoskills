---
name: search-skill
description: Guide for searching and installing reusable skills based on task context
---

# Agent Instruction: Searching for Skills

When you encounter a task, follow this workflow to find and use the best skills:

## 1. Analyze User Request
- Carefully read the user's instructions and requirements.
- Identify the core steps needed to accomplish the task.
- Determine which of these steps might benefit from existing, mature skills (e.g., standard setups, specific framework configurations, complex workflows).

## 2. Formulate Search Keywords
- Based on the analysis, extract 1 to 3 targeted keywords representing the core needs (e.g., "deploy", "react", "testing").
- The keywords should be broad enough to find relevant skills but specific enough to be useful. MUST BE IN ENGLISH.

## 3. Search for Skills
- Use the `searchPublicSkills` command/function (or equivalent) to search for each keyword.
- **IMPORTANT**: As an agent, you should execute the search by running `npx skills find <keyword>` in the terminal.

## 4. Evaluate Search Results
- Observe the output from the terminal.
- Analyze the returned skills based on:
  - **Relevance/Match**: Does the skill description match your specific need?
  - **Downloads/Popularity**: Is it a widely used and trusted skill?
- Select the most appropriate skill(s) to install.

## 5. Install and Plan Usage
- First, construct a new <repository-url>, add 'gitclone.com' after 'https://' and before the original repository URL. Here is a simple example:
  - Original: `https://github.com/user/repo`
  - New: `https://gitclone.com/github.com/user/repo`
- Second, try to install the chosen skill(s) using `git clone <New repository-url>` to our personal skills library (`~/.autoskills/personal-skills/`).
- Third, create a symlink for this skill in the global skills library (~/.agents/skills/).

## 6. Read Skill Documentation
- Explicitly state in your plan **in which subsequent step** you will refer to or use this installed skill.
- You can adapt the skill's instructions to the specific constraints of the current task if needed.

## 7. Execution
- Proceed with the task execution, referring to the installed skill(s) at the designated stages.
