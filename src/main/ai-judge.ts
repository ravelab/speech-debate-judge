import Anthropic from '@anthropic-ai/sdk';
import type { ProviderConfig } from '../renderer/lib/types';

const EVENT_INFO: Record<string, string> = {
  'Extemp': 'Extemporaneous Speaking: A limited-preparation event where speakers draw a question on current events and have 30 minutes to prepare a 7-minute speech. Judged on analysis, evidence, organization, and delivery.',
  'Original Oratory': 'Original Oratory: A 10-minute persuasive speech written and memorized by the student on a topic of their choosing. Judged on writing quality, argument structure, emotional appeal, and delivery.',
  'Informative': 'Informative Speaking: A 10-minute memorized speech designed to educate the audience on a specific topic. Judged on research depth, clarity, organization, and engaging delivery.',
  'Lincoln-Douglas': 'Lincoln-Douglas Debate: A one-on-one values debate format with a resolution. Constructive speeches are 6 minutes, rebuttals are shorter. Judged on philosophical framework, evidence, refutation, and speaking quality.',
  'Policy': 'Policy Debate: A two-on-two evidence-intensive debate format. Judged on plan analysis, disadvantages, counterplans, evidence quality, and argumentation.',
  'Public Forum': 'Public Forum Debate: A two-on-two debate format accessible to lay audiences. Speeches are 4 minutes with crossfire periods. Judged on persuasion, evidence, clash, and clarity.',
  'Congress': 'Congressional Debate: Students simulate legislative proceedings, giving 3-minute speeches for or against bills. Judged on argumentation, delivery, and parliamentary procedure.',
  'Dramatic Interpretation': 'Dramatic Interpretation (DI): A 10-minute memorized performance of a published dramatic work. No props or costumes. Judged on character development, emotional depth, cutting choices, and performance quality.',
  'Humorous Interpretation': 'Humorous Interpretation (HI): A 10-minute memorized performance of a published humorous work. No props or costumes. Judged on comedic timing, character work, cutting choices, and entertainment value.',
  'Duo Interpretation': 'Duo Interpretation: A 10-minute memorized performance by two people of a published work. No physical contact or props. Judged on chemistry, character work, and performance cohesion.',
  'Program Oral Interpretation': 'Program Oral Interpretation (POI): A 10-minute program combining at least two of three genres (prose, poetry, drama) with a unifying theme. Judged on material selection, transitions, and performance.',
  'Impromptu': 'Impromptu Speaking: Speakers receive a prompt (quote, object, or abstract word) and have 7 minutes total for preparation and a 5-minute speech. Judged on quick thinking, structure, and delivery.',
  'Declamation': 'Declamation: A 10-minute memorized re-delivery of a previously published speech. Judged on understanding of the original message, delivery quality, and emotional connection.',
};

function getSystemPrompt(eventName: string, durationSeconds: number, idealTimeSeconds: number, existingScores: Array<{name: string, score: number}> = []): string {
  const mins = Math.floor(durationSeconds / 60);
  const secs = durationSeconds % 60;
  const durationStr = mins > 0
    ? `${mins} minute${mins !== 1 ? 's' : ''} and ${secs} second${secs !== 1 ? 's' : ''}`
    : `${secs} second${secs !== 1 ? 's' : ''}`;

  const eventDesc = EVENT_INFO[eventName] || `${eventName}: A speech and debate event.`;

  let timeGuidance = '';
  if (idealTimeSeconds > 0) {
    const idealMins = Math.floor(idealTimeSeconds / 60);
    const idealSecs = idealTimeSeconds % 60;
    const idealStr = idealSecs > 0 ? `${idealMins} minute${idealMins !== 1 ? 's' : ''} and ${idealSecs} second${idealSecs !== 1 ? 's' : ''}` : `${idealMins} minute${idealMins !== 1 ? 's' : ''}`;
    const ratio = durationSeconds / idealTimeSeconds;
    let penalty = '';
    if (ratio < 0.5) {
      penalty = 'The speech was FAR too short (under half the expected time). This should result in a significant score penalty of 3-5 points. The speaker likely failed to develop their arguments adequately.';
    } else if (ratio < 0.7) {
      penalty = 'The speech was short (under 70% of expected time). This should result in a score penalty of 2 points.';
    } else if (ratio < 0.8) {
      penalty = 'The speech was slightly short (under 80% of expected time). This should result in a score penalty of 1 point.';
    } else if (ratio > 1.0) {
      penalty = 'The speech went over the time limit. This should result in a score penalty of 1-2 points. Time management is an important competitive skill. IMPORTANT: A speaker who exceeds the ideal time CANNOT receive the highest score in the event — they must be scored below any contestant who stayed within the time limit and performed comparably.';
    }
    timeGuidance = `\nThe ideal/maximum time for this event is ${idealStr}. ${penalty}`;
  }

  return `You are an experienced NSDA (National Speech and Debate Association) judge evaluating a ${eventName} performance.

EVENT INFORMATION:
${eventDesc}

JUDGING CRITERIA — Your feedback MUST evaluate the performance based on what this specific event requires. Use the event information above to identify the key judging criteria. For example:
- For interpretation events (DI, HI, Duo, POI): focus on character development, vocal variety, physicality, emotional range, cutting choices, pacing, and transitions between characters.
- For platform speaking (OO, Informative, Declamation): focus on speech structure, thesis clarity, evidence quality, persuasive technique, memorization, eye contact, and vocal delivery.
- For limited-prep events (Extemp, Impromptu): focus on argument structure, use of current events/examples, analysis depth, logical flow, and composure under pressure.
- For debate events (LD, Policy, PF, Congress): focus on argument quality, evidence use, refutation, framework, clash, persuasion, and speaking clarity.
Your feedback should specifically address how well the speaker met the expectations of THIS event, not generic public speaking advice.

The speech lasted ${durationStr}.${timeGuidance}

Score the performance on a scale of 20-30 (integers only):
- 30: Exceptional — best performance you could imagine, flawless delivery and content
- 27-29: Excellent — strong delivery, well-organized, compelling arguments/performance
- 24-26: Good — solid performance with minor areas for improvement
- 22-23: Developing — shows potential but needs work in multiple areas
- 20-21: Needs improvement — major issues with delivery, content, or technique

The normal scoring range is 22-28. Reserve 29+ for truly exceptional performances.
IMPORTANT: Scores must be whole numbers (integers). No decimals.
${existingScores.length > 0 ? `
EXISTING SCORES IN THIS EVENT (score this contestant relative to them):
${existingScores.map(s => `- ${s.name}: ${s.score}`).join('\n')}

If this contestant is clearly worse than everyone above, you may give them a 20. The system will automatically adjust other scores upward to maintain proper separation. Do NOT inflate scores just to avoid giving a 20 — score honestly relative to the others.
` : ''}
You must provide:
1. A score (integer 20-30)
2. Bullet points of constructive feedback suitable for Tabroom ballot comments. Each point MUST be specific to the ${eventName} event — evaluate what this event demands (see judging criteria above) rather than giving generic speaking tips. STRICT REQUIREMENT: At least 2/3 of the feedback points (not counting the score line) MUST be positive. For example, if you give 6 points of feedback, at least 4 must be positive. Lead with positives first, then areas for improvement. Each point should be concise, specific, and actionable. Reference specific moments or techniques from the speech. Include a point about time management if the duration deviates significantly from the ideal time. The LAST bullet point must state the score, e.g. "Score: 25/30".

Respond ONLY with valid JSON in this exact format:
{"score": <number>, "feedback": "<string>"}

For the feedback field, use unnumbered bullet points with "• " prefix like:
"• Strong opening hook that grabbed attention immediately.\\n• Excellent use of evidence and source variety throughout.\\n• Transitions between arguments were smooth and well-paced.\\n• The conclusion could be stronger — consider ending with a more memorable call to action.\\n• Score: 25/30"
Use \\n to separate each bullet point within the JSON string.`;
}

function parseResult(text: string): { score: number; feedback: string } {
  const result = JSON.parse(text);
  const raw = parseFloat(result.score);
  const score = Math.min(30, Math.max(20, Math.round(raw)));
  return { score, feedback: result.feedback };
}

async function judgeWithAnthropic(
  apiKey: string,
  model: string,
  eventName: string,
  transcript: string,
  durationSeconds: number,
  idealTimeSeconds: number,
  existingScores: Array<{name: string, score: number}>
): Promise<{ score: number; feedback: string }> {
  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: model || 'claude-sonnet-4-5-20250929',
    max_tokens: 512,
    system: getSystemPrompt(eventName, durationSeconds, idealTimeSeconds, existingScores),
    messages: [
      {
        role: 'user',
        content: `Here is the transcript of the ${eventName} performance to judge:\n\n${transcript}`,
      },
    ],
  });
  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  return parseResult(text);
}

async function judgeWithGemini(
  apiKey: string,
  model: string,
  eventName: string,
  transcript: string,
  durationSeconds: number,
  idealTimeSeconds: number,
  existingScores: Array<{name: string, score: number}>
): Promise<{ score: number; feedback: string }> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);
  const genModel = genAI.getGenerativeModel({
    model: model || 'gemini-3-flash-preview',
    systemInstruction: getSystemPrompt(eventName, durationSeconds, idealTimeSeconds, existingScores),
  });
  const result = await genModel.generateContent(
    `Here is the transcript of the ${eventName} performance to judge:\n\n${transcript}`
  );
  const text = result.response.text();
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return parseResult(cleaned);
}

async function judgeWithOpenRouter(
  apiKey: string,
  model: string,
  eventName: string,
  transcript: string,
  durationSeconds: number,
  idealTimeSeconds: number,
  existingScores: Array<{name: string, score: number}>
): Promise<{ score: number; feedback: string }> {
  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
  });
  const completion = await client.chat.completions.create({
    model: model || 'arcee-ai/trinity-large-preview:free',
    max_tokens: 512,
    messages: [
      { role: 'system', content: getSystemPrompt(eventName, durationSeconds, idealTimeSeconds, existingScores) },
      {
        role: 'user',
        content: `Here is the transcript of the ${eventName} performance to judge:\n\n${transcript}`,
      },
    ],
  });
  const text = completion.choices[0]?.message?.content || '';
  return parseResult(text);
}

export async function judgeTranscript(
  config: ProviderConfig,
  eventName: string,
  transcript: string,
  durationSeconds: number,
  idealTimeSeconds: number,
  existingScores: Array<{name: string, score: number}> = []
): Promise<{ score: number; feedback: string }> {
  if (!config.apiKey) {
    throw new Error('API key not configured. Please set your API key in Settings.');
  }

  try {
    switch (config.provider) {
      case 'anthropic':
        return await judgeWithAnthropic(config.apiKey, config.model, eventName, transcript, durationSeconds, idealTimeSeconds, existingScores);
      case 'gemini':
        return await judgeWithGemini(config.apiKey, config.model, eventName, transcript, durationSeconds, idealTimeSeconds, existingScores);
      case 'openrouter':
        return await judgeWithOpenRouter(config.apiKey, config.model, eventName, transcript, durationSeconds, idealTimeSeconds, existingScores);
      default:
        throw new Error(`Unknown AI provider: ${config.provider}`);
    }
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error('Failed to parse AI response as JSON');
    }
    throw err;
  }
}
