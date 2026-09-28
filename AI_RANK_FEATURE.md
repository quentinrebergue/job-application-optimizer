# AI Rank Feature

## Overview

The **AI Rank** feature uses Google's Gemini API to analyze job offers and automatically rank your qualifications (experiences, projects, skills, education) against the job requirements. It also generates ATS (Applicant Tracking System) tags to help you understand what the job is looking for.

## Setup

### 1. Get a Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Get API Key"
3. Create a new API key or use an existing one
4. Copy the API key

### 2. Set Environment Variable

Add the API key to your `.env.local` file:

```env
GEMINI_API_KEY=your-gemini-api-key-here
```

**Note**: You need to restart the dev server after adding the environment variable.

```bash
npm run dev
```

## How to Use

### Via Web UI

1. Go to a job detail page (e.g., `/jobs/job-abc123`)
2. Look for the "AI Rank" button in the "Resume for this Job" section
3. Click the button to analyze the job offer
4. Wait for the analysis to complete (10-30 seconds depending on Gemini API responsiveness)
5. View the results:
   - **ATS Tags**: Keywords identified from the job description (e.g., "remote", "embedded-systems", "startup")
   - **Confidence Score**: How well the analysis matches (0-100%)
   - **Entity Rankings**: Your experiences, projects, skills, and education ranked by relevance (0-100 score each)
   - **Reasons**: Explanations for each ranking

### Via MCP (Model Context Protocol)

If you have an MCP client connected, you can use the `rank_job_offer` tool:

```
rank_job_offer(id="job-abc12345")
```

This will trigger the same AI analysis and return the results.

## Data Storage

AI analysis results are automatically saved to the job offer JSON file:

```json
{
  "id": "job-abc12345",
  "company": "Example Corp",
  "title": "Software Engineer",
  "ats_tags": ["remote", "embedded-systems", "c++"],
  "ai_analysis": {
    "job_id": "job-abc12345",
    "analyzed_at": "2026-05-31T12:34:56.789Z",
    "ats_tags": ["remote", "embedded-systems", "c++"],
    "entities_by_type": {
      "experiences": [
        {
          "id": "exp-123",
          "name": "Software Engineer at XYZ",
          "score": 85,
          "reason": "Strong match with embedded systems experience"
        }
      ],
      "projects": [...],
      "skills": [...],
      "education": [...]
    },
    "confidence_score": 0.87,
    "summary": "Your profile shows a strong match with good embedded systems background..."
  }
}
```

## How It Works

1. **Analysis**: Gemini reads your job description and all your qualifications
2. **Scoring**: Each entity (experience, project, skill, education) is scored 0-100 based on relevance
3. **ATS Tags**: The AI identifies key requirements from the job (e.g., tech stack, seniority, work arrangement)
4. **Summary**: A brief text summary of how well you match the role
5. **Storage**: Results are saved to your job data so you can see them anytime

## Free Tier Limits

Google Gemini API free tier includes:
- 60 requests per minute
- 15,000 requests per day
- No credit card required

For personal use tracking 1-2 jobs per day, this is more than sufficient.

## Troubleshooting

### "GEMINI_API_KEY environment variable not set"

Make sure you've:
1. Created the API key at [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Added it to `.env.local`
3. Restarted your dev server

### "Gemini API error: 401"

Your API key is invalid or expired. Get a new one from Google AI Studio.

### "Gemini API error: 429"

You've hit the rate limit (60 per minute). Wait a minute and try again.

### Analysis seems inaccurate

The AI analysis depends on:
- Quality of your job descriptions (include specific technologies, responsibilities)
- Quality of your entity descriptions (be detailed about what you did and technologies used)
- Clarity of the job description

For better results:
- Add more context to your experiences and projects
- Include specific technical skills and technologies
- Be detailed about your accomplishments

## Architecture

### Files Involved

- **Frontend Components**:
  - `src/components/jobs/AIRankButton.tsx` - Button to trigger ranking
  - `src/components/jobs/AIRankResults.tsx` - Display ranking results
  
- **Backend**:
  - `src/app/api/jobs/[jobId]/rank/route.ts` - API endpoint for ranking
  - `src/lib/ai/gemini.ts` - Gemini API integration
  
- **MCP**:
  - `mcp/tool-definitions.ts` - MCP tool schema for `rank_job_offer`
  - `mcp/call-handlers.ts` - MCP tool implementation
  
- **Data Types**:
  - `src/types/job.ts` - Type definitions for AI analysis results
  - `src/schemas/job.ts` - Zod schemas for validation

## Future Enhancements

Possible improvements to the AI Rank feature:

1. **Auto-select entities**: Automatically add top-ranked entities to the resume
2. **Competitive analysis**: Compare your ranking with typical candidate profiles
3. **Interview prep**: Generate questions likely to be asked based on the job
4. **Salary prediction**: Estimate salary range based on job description and your profile
5. **Job matching**: Find jobs from your saved offers that best match your profile
6. **Batch analysis**: Analyze multiple jobs at once
