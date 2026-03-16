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
- Install the chosen skill(s) using `npx skills add <skill-name>`.
- Explicitly state in your plan **in which subsequent step** you will refer to or use this installed skill.
- Do not copy blindly; adapt the skill's instructions to the specific constraints of the current task.

## 6. Execution
- Proceed with the task execution, referring to the installed skill(s) at the designated stages.
