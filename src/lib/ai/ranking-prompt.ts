import type { EntityMeta, ExperienceMeta, ProjectMeta, SkillMeta, EducationMeta } from '@/types'
import type { AIAnalysisResult } from '@/types/job'

/** The prompt and the output contract of the job-ranking AI call. */

export const RANKING_SYSTEM_PROMPT = 'You answer with a single valid JSON object and nothing else.'

export function buildRankingPrompt(
  jobTitle: string,
  jobCompany: string,
  jobDescription: string,
  entities: {
    experiences: EntityMeta[]
    projects: EntityMeta[]
    skills: EntityMeta[]
    education: EntityMeta[]
  },
  aiContext?: string,
): string {
  const formattedEntities = {
    experiences: entities.experiences
      .map((e) => {
        const exp = e as ExperienceMeta
        return `- [ID: ${exp.id}] ${exp.title} at ${exp.company} (${exp.period})\n  Description: ${exp.description}`
      })
      .join('\n'),
    projects: entities.projects
      .map((p) => {
        const proj = p as ProjectMeta
        return `- [ID: ${proj.id}] ${proj.title} [${proj.tech?.join(', ')}]\n  Description: ${proj.description}`
      })
      .join('\n'),
    skills: entities.skills
      .map((s) => {
        const skill = s as SkillMeta
        return `- [ID: ${skill.id}] ${skill.name} — ${skill.level} (${skill.tags?.join(', ')})`
      })
      .join('\n'),
    education: entities.education
      .map((ed) => {
        const edu = ed as EducationMeta
        return `- [ID: ${edu.id}] ${edu.degree} from ${edu.institution} (${edu.period})`
      })
      .join('\n'),
  }

  const contextSection = aiContext?.trim()
    ? `\nCANDIDATE CONTEXT (provided by the candidate — use this to better calibrate scores):\n${aiContext.trim()}\n`
    : ''

  return `You are a senior technical recruiter and ATS specialist with high standards. You evaluate candidates critically and do not inflate scores — a score of 80+ means an exceptional, near-perfect match for that specific requirement.

═══════════════════════════════════════════
JOB OFFER
═══════════════════════════════════════════
Title: ${jobTitle}
Company: ${jobCompany}

Description:
${jobDescription}
${contextSection}
═══════════════════════════════════════════
CANDIDATE QUALIFICATIONS
═══════════════════════════════════════════

EXPERIENCES:
${formattedEntities.experiences || '(none)'}

PROJECTS:
${formattedEntities.projects || '(none)'}

SKILLS:
${formattedEntities.skills || '(none)'}

EDUCATION:
${formattedEntities.education || '(none)'}

═══════════════════════════════════════════
INSTRUCTIONS
═══════════════════════════════════════════

Respond with a single valid JSON object. No markdown, no extra text, no code blocks.

The JSON must follow this exact structure:
{
  "ats_tags": ["tag1", "tag2"],
  "confidence_score": 0.72,
  "summary": "2-3 sentence honest assessment of the fit. Be direct and critical.",
  "recommended_title": "Software Engineer — Embedded Linux",
  "recommended_profile": "One neutral sentence (max 30 words) on what the candidate brings for this job, based only on the qualifications above.",
  "resume_tips": [
    "Add keyword X (required by this job, missing from resume)",
    "Quantify impact in experience Y",
    "Highlight Z more prominently"
  ],
  "recommended_experience_ids": ["id-from-list", "id-from-list"],
  "recommended_project_ids": ["id-from-list", "id-from-list"],
  "recommended_skill_ids": ["id-from-list", "id-from-list"],
  "recommended_skill_tags": {
    "id-from-list": ["tag1", "tag2"]
  },
  "suggested_new_skills": [
    {"name": "Rust", "category": "Languages", "level": "intermediate", "tags": ["memory safety", "systems"], "reason": "Required by job"}
  ],
  "suggested_new_skill_tags": [
    {"skill_id": "id-from-list", "tag": "new-tag", "reason": "Used in this job but missing from skill"}
  ],
  "recommended_entity_descriptions": {
    "id-from-list": "Rewritten description for this entity, tailored for this job. Factual, concise, ATS keywords included."
  },
  "entities_by_type": {
    "experiences": [
      {"id": "id-from-list", "name": "Experience Name", "score": 74, "reason": "One sentence: what matches and what does not."}
    ],
    "projects": [
      {"id": "id-from-list", "name": "Project Name", "score": 68, "reason": "One sentence: what matches and what does not."}
    ],
    "skills": [
      {"id": "id-from-list", "name": "Skill Name", "score": 90, "reason": "One sentence: what matches and what does not."}
    ],
    "education": [
      {"id": "id-from-list", "name": "Degree Name", "score": 65, "reason": "One sentence: what matches and what does not."}
    ]
  }
}

SCORING RULES (apply strictly):
- Score 0–100. 50 = mediocre match, 70 = good match, 85+ = excellent match.
- Be harsh. If a skill/experience is only tangentially related, score it 30–50.
- Only include entities with score >= 60. Exclude everything below — do not mention them.
- Penalise seniority mismatch (e.g. student project vs. production system requirement).
- Penalise technology mismatch (e.g. Python experience for a C++ job = max 40).

ATS TAGS (5–10 tags):
- Extract the actual keywords the ATS would search for (tools, languages, domain, level, work mode).
- Examples: "C++", "RTOS", "on-site", "internship", "embedded", "Linux-kernel", "senior-level".

SUMMARY (2–3 sentences max):
- State the overall fit percentage honestly.
- Mention the strongest match and the biggest gap.
- Do NOT repeat lists of entities — refer to them by category.

RESUME TIPS (3–6 actionable items):
- Each tip is a specific, actionable improvement targeting THIS job.
- Focus on: missing keywords the ATS would flag, quantification of impact, reordering priorities, rephrasing to match the job's vocabulary.
- Do NOT give generic advice like "improve your resume".

TITLE & PROFILE (ATS-optimised):
- recommended_title: one headline, ≤8 words, mirrors the job title keywords exactly. Keep it neutral and factual (e.g. "Embedded Software Engineer — Linux & C").
- recommended_profile: one neutral sentence, 30 words max, based ONLY on the qualifications above. Do not invent facts, degrees, scores or hobbies.

RECOMMENDATIONS:
- recommended_experience_ids: 2–4 experiences with the highest scores.
- recommended_project_ids: 3–5 projects with the highest scores.
- recommended_skill_ids: 2–4 skill sections most relevant to this job. Use ONLY existing IDs.
- recommended_skill_tags: for each recommended skill, list ONLY the tags that are relevant to this job (subset of the skill's existing tags). Omit tags that don't match.
- suggested_new_skills: 0–3 entirely new skill entries the candidate should add to their library. Include only skills explicitly required or strongly preferred by the job that are absent from the candidate's list.
- suggested_new_skill_tags: 0–5 new tag items to add to EXISTING skills. Use only [ID: ...] from the skills list above. Suggest tags that the job mentions and that logically belong in that skill category.
- Use ONLY the exact IDs shown as [ID: ...] above. Do NOT invent IDs.

ENTITY DESCRIPTIONS (only for recommended entities):
- recommended_entity_descriptions: for each recommended experience and project (not skills/education), rewrite its description to maximise relevance for this specific job.
- Keep it factual — only use information present in the original description.
- Weave in 1–3 keywords from the job posting naturally.
- For experiences: 2–4 bullet-style sentences, plain text.
- For projects: 1–3 sentences, plain text.
- Omit entities with score < 70 or those not in recommended_experience_ids / recommended_project_ids.`
}

/** Turns the JSON document the model returned into the shared analysis shape (minus job_id/analyzed_at, set by the caller). */
export function normalizeRanking(
  data: unknown,
): Omit<AIAnalysisResult, 'job_id' | 'analyzed_at'> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new Error('The AI answer is not a JSON object.')
  }
  const analysisData = data as Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

  const entitiesByType = analysisData.entities_by_type ?? {}

  const enrichedEntities = {
    experiences: (entitiesByType.experiences || []).map((e: Record<string, unknown>) => ({
      ...e,
      type: 'experience' as const,
    })),
    projects: (entitiesByType.projects || []).map((p: Record<string, unknown>) => ({
      ...p,
      type: 'project' as const,
    })),
    skills: (entitiesByType.skills || []).map((s: Record<string, unknown>) => ({
      ...s,
      type: 'skill' as const,
    })),
    education: (entitiesByType.education || []).map((ed: Record<string, unknown>) => ({
      ...ed,
      type: 'education' as const,
    })),
  }

  return {
    ats_tags: analysisData.ats_tags,
    entities_by_type: enrichedEntities,
    confidence_score:
      analysisData.confidence_score > 1
        ? analysisData.confidence_score / 100
        : analysisData.confidence_score,
    summary: analysisData.summary,
    resume_tips: analysisData.resume_tips || [],
    recommended_title: analysisData.recommended_title || '',
    recommended_profile: analysisData.recommended_profile || '',
    recommended_experience_ids: analysisData.recommended_experience_ids || [],
    recommended_project_ids: analysisData.recommended_project_ids || [],
    recommended_skill_ids: analysisData.recommended_skill_ids || [],
    recommended_skill_tags: analysisData.recommended_skill_tags || {},
    suggested_new_skills: analysisData.suggested_new_skills || [],
    suggested_new_skill_tags: analysisData.suggested_new_skill_tags || [],
    recommended_entity_descriptions: analysisData.recommended_entity_descriptions || {},
  }
}
