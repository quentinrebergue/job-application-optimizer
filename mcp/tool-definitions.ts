/**
 * tool-definitions.ts
 *
 * Static list of all MCP tool schemas — pure data, no runtime logic.
 * Imported by server.ts to register tools with the MCP protocol.
 */

export const TOOL_DEFINITIONS = [
  {
    name: 'create_job',
    description:
      'Create a new job application entry. When given job offer text, extract the title, ' +
      'company name, and description from it, then call this tool.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Job title / position (e.g. "Software Engineer")' },
        company: { type: 'string', description: 'Company name' },
        description: { type: 'string', description: 'Full job description text (paste or summarise the offer)' },
        location: { type: 'string', description: 'Job location (e.g. "Paris, France" or "Remote")' },
        url: { type: 'string', description: 'URL of the job listing (optional)' },
        status: {
          type: 'string',
          enum: ['saved', 'applied', 'interview', 'offer', 'rejected'],
          description: 'Application status — defaults to "saved"',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Taxonomy tag aliases for this job (e.g. ["C++", "Linux", "FPGA"])',
        },
      },
      required: ['title', 'company'],
    },
  },
  {
    name: 'tag_job',
    description: 'Set or replace the taxonomy tags on a job offer.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Job ID' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Full list of taxonomy tag aliases' },
      },
      required: ['id', 'tags'],
    },
  },
  {
    name: 'list_jobs',
    description: 'List all tracked job applications with their current status and ID.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'update_job_status',
    description: 'Update the pipeline status of a tracked job. Use list_jobs first to find the ID.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Job ID — e.g. "job-abc12345" (from list_jobs)' },
        status: {
          type: 'string',
          enum: ['saved', 'applied', 'interview', 'offer', 'rejected'],
          description: 'New status',
        },
      },
      required: ['id', 'status'],
    },
  },
  {
    name: 'set_job_profile',
    description: "Set the profile/summary section text (LaTeX) for a specific job's resume. Leave empty to revert to the default profile.",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Job ID — e.g. "job-abc12345" (from list_jobs)' },
        profile_text: { type: 'string', description: 'LaTeX profile text. Use empty string to reset to default.' },
      },
      required: ['id', 'profile_text'],
    },
  },
  {
    name: 'rank_job_offer',
    description: 'Use AI to analyze a job offer and rank your qualifications against it. Generates ATS tags and relevance scores for your experiences, projects, skills, and education.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Job ID — e.g. "job-abc12345" (from list_jobs)' },
        provider: {
          type: 'string',
          enum: ['gemini', 'claude'],
          description: 'Which AI provider to use. Defaults to "gemini" if omitted.',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'analyze_job_for_resume',
    description:
      'Run a full AI analysis of a job offer and get structured resume recommendations: ' +
      'scored entities, ATS tags, recommended experiences, projects & skills, ATS-optimised title and profile, ' +
      'and actionable resume tips. ' +
      'Optionally provide candidate context to improve accuracy. Use this instead of rank_job_offer ' +
      'when you need the full structured result to help the candidate.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Job ID — e.g. "job-abc12345" (from list_jobs)' },
        context: {
          type: 'string',
          description:
            'Optional free-text context about the candidate to send to the AI ' +
            '(e.g. target role level, strongest areas, known gaps). Not stored permanently.',
        },
        provider: {
          type: 'string',
          enum: ['gemini', 'claude'],
          description: 'Which AI provider to use. Defaults to "gemini" if omitted.',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_experience',
    description: "Add a work experience entry to the resume.",
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Job title (e.g. "Software Engineer Intern")' },
        company: { type: 'string', description: 'Company name' },
        period: { type: 'string', description: 'Date range (e.g. "June 2024 – August 2024")' },
        description: { type: 'string', description: 'What you did — bullet points or prose' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tech/skill tags' },
        latex_snippet: { type: 'string', description: 'Optional LaTeX \\item for this entry' },
      },
      required: ['title', 'company', 'period', 'description'],
    },
  },
  {
    name: 'create_project',
    description: 'Add a project to the resume.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Project name' },
        tech: { type: 'array', items: { type: 'string' }, description: 'Technologies used' },
        description: { type: 'string', description: 'What the project does and your contribution' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Keyword tags' },
        latex_snippet: { type: 'string', description: 'Optional LaTeX \\item for this entry' },
      },
      required: ['title', 'tech', 'description'],
    },
  },
  {
    name: 'create_skill',
    description: 'Add a technical skill or area of expertise to the resume.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Skill name (e.g. "C++", "Kubernetes")' },
        category: { type: 'string', description: 'Category (e.g. "Languages", "DevOps", "Frameworks")' },
        level: {
          type: 'string',
          enum: ['beginner', 'intermediate', 'advanced', 'expert'],
          description: 'Proficiency level',
        },
        tags: { type: 'array', items: { type: 'string' }, description: 'Related tags' },
        latex_snippet: { type: 'string', description: 'Optional LaTeX \\item for this entry' },
      },
      required: ['name', 'category', 'level'],
    },
  },
  {
    name: 'create_education',
    description: 'Add an education entry (degree, institution, period) to the resume.',
    inputSchema: {
      type: 'object',
      properties: {
        degree: { type: 'string', description: 'Degree or program name (e.g. "MSc Computer Engineering")' },
        institution: { type: 'string', description: 'School or university name' },
        period: { type: 'string', description: 'Years attended (e.g. "2020 – 2026")' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Optional keyword tags' },
        latex_snippet: { type: 'string', description: 'Optional LaTeX for this entry' },
      },
      required: ['degree', 'institution', 'period'],
    },
  },
  {
    name: 'list_entities',
    description: 'List all resume entities of a given type (experiences, projects, skills, education).',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['experiences', 'projects', 'skills', 'education'],
          description: 'Entity type to list',
        },
      },
      required: ['type'],
    },
  },
  {
    name: 'get_taxonomy',
    description: 'Return the full tag taxonomy tree.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'create_taxonomy_node',
    description: 'Create a new taxonomy node.',
    inputSchema: {
      type: 'object',
      properties: {
        label: { type: 'string', description: 'Display label for the node' },
        parent: { type: 'string', description: 'Parent node id (omit for root)' },
        aliases: { type: 'array', items: { type: 'string' }, description: 'List of tag aliases' },
        description: { type: 'string', description: 'Optional description' },
      },
      required: ['label'],
    },
  },
  {
    name: 'update_taxonomy_node',
    description: 'Update label, parent, or description of a node.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Node id' },
        label: { type: 'string' },
        parent: { type: 'string', description: 'New parent id (or null for root)' },
        description: { type: 'string' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_taxonomy_node',
    description: 'Delete a node (and optionally its descendants).',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        cascade: { type: 'boolean', description: 'Delete descendants too (default false)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'add_node_alias',
    description: 'Add a tag alias to a taxonomy node.',
    inputSchema: {
      type: 'object',
      properties: {
        nodeId: { type: 'string' },
        alias: { type: 'string' },
      },
      required: ['nodeId', 'alias'],
    },
  },
  {
    name: 'remove_node_alias',
    description: 'Remove a tag alias from a taxonomy node.',
    inputSchema: {
      type: 'object',
      properties: {
        nodeId: { type: 'string' },
        alias: { type: 'string' },
      },
      required: ['nodeId', 'alias'],
    },
  },
  {
    name: 'reconcile_tags',
    description:
      'Check a list of tag strings against the taxonomy tree. Returns: "matched" (exact alias hit), ' +
      '"aliasable" (AI thinks it should be an alias of an existing node), ' +
      '"novel" (genuinely new concept). Call this BEFORE storing tags on any entity or job.',
    inputSchema: {
      type: 'object',
      properties: {
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tag strings to reconcile against the taxonomy',
        },
      },
      required: ['tags'],
    },
  },
  {
    name: 'add_general_question',
    description:
      'Add a general Q&A flashcard to the Q&A trainer. ' +
      'Use this to bulk-import interview prep questions with topic tags. ' +
      'Tags should be short lowercase strings like "cpp", "linux", "gpu", "profiling", "networking", "os", "algorithms".',
    inputSchema: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'The question text' },
        answer: { type: 'string', description: 'The answer text — markdown and code blocks are supported' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Topic tags (e.g. ["cpp", "linux", "profiling"])',
        },
      },
      required: ['question', 'answer'],
    },
  },
  {
    name: 'list_raw_projects',
    description: 'List project names in the data/projects/ staging area.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'analyze_project',
    description:
      'Analyze a project with AI to generate a README, resume description, tags, and interview Q&A. ' +
      'Pass either a staging project name (from list_raw_projects) or an absolute path to a code directory. ' +
      'Does NOT create the entity — use import_project for that.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Staging project name (folder under data/projects/)' },
        projectPath: { type: 'string', description: 'Absolute path to the actual code directory' },
      },
    },
  },
  {
    name: 'import_project',
    description:
      'Analyze a project with AI and immediately create the entity (meta.json + questions.json). ' +
      'Optionally writes a README.md to the project directory.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Staging project name (folder under data/projects/)' },
        projectPath: { type: 'string', description: 'Absolute path to the actual code directory' },
        writeReadme: { type: 'boolean', description: 'Write generated README.md to the project directory' },
      },
    },
  },
] as const
