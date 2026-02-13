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

function getSystemPrompt(eventName: string, durationSeconds: number, idealTimeSeconds: number): string {
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
      penalty = 'The speech was notably short (under 70% of expected time). This should result in a score penalty of 1-3 points. Important content was likely missing or underdeveloped.';
    } else if (ratio > 1.15) {
      penalty = 'The speech went significantly over time. This should result in a score penalty of 1-2 points. Time management is an important competitive skill.';
    }
    timeGuidance = `\nThe ideal/maximum time for this event is ${idealStr}. ${penalty}`;
  }

  return `You are an experienced NSDA (National Speech and Debate Association) judge evaluating a ${eventName} performance.

EVENT INFORMATION:
${eventDesc}

The speech lasted ${durationStr}.${timeGuidance}

Score the performance on a scale of 20.0-30.0 (decimals allowed, e.g. 24.5):
- 30.0: Exceptional — best performance you could imagine, flawless delivery and content
- 27.0-29.9: Excellent — strong delivery, well-organized, compelling arguments/performance
- 24.0-26.9: Good — solid performance with minor areas for improvement
- 22.0-23.9: Developing — shows potential but needs work in multiple areas
- 20.0-21.9: Needs improvement — major issues with delivery, content, or technique

The normal scoring range is 22-28. Reserve 29+ for truly exceptional performances.
IMPORTANT: Use decimal scores (e.g. 25.3, 24.7) to differentiate between contestants. No two contestants in the same event should receive the exact same score if their performances differ at all.

You must provide:
1. A score (number 20.0-30.0, decimals OK)
2. Numbered bullet points of constructive feedback suitable for Tabroom ballot comments. At least 2/3 of the points should be POSITIVE — highlight what the speaker did well before noting areas for improvement. Each point should be concise, specific, and actionable. Reference specific moments or techniques from the speech. Include a point about time management if the duration deviates significantly from the ideal time.

Respond ONLY with valid JSON in this exact format:
{"score": <number>, "feedback": "<string>"}

For the feedback field, use numbered points like:
"1. Strong opening hook that grabbed attention immediately.\\n2. Excellent use of evidence and source variety throughout.\\n3. Transitions between arguments were smooth and well-paced.\\n4. The conclusion could be stronger — consider ending with a more memorable call to action."
Use \\n to separate each numbered point within the JSON string.`;
}

function parseResult(text: string): { score: number; feedback: string } {
  const result = JSON.parse(text);
  // Allow one decimal place, clamp to 20-30
  const raw = parseFloat(result.score);
  const score = Math.min(30, Math.max(20, Math.round(raw * 10) / 10));
  return { score, feedback: result.feedback };
}

async function judgeWithAnthropic(
  apiKey: string,
  model: string,
  eventName: string,
  transcript: string,
  durationSeconds: number,
  idealTimeSeconds: number
): Promise<{ score: number; feedback: string }> {
  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: model || 'claude-sonnet-4-5-20250929',
    max_tokens: 512,
    system: getSystemPrompt(eventName, durationSeconds, idealTimeSeconds),
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
  idealTimeSeconds: number
): Promise<{ score: number; feedback: string }> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);
  const genModel = genAI.getGenerativeModel({
    model: model || 'gemini-3-flash-preview',
    systemInstruction: getSystemPrompt(eventName, durationSeconds, idealTimeSeconds),
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
  idealTimeSeconds: number
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
      { role: 'system', content: getSystemPrompt(eventName, durationSeconds, idealTimeSeconds) },
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
  idealTimeSeconds: number
): Promise<{ score: number; feedback: string }> {
  if (!config.apiKey) {
    throw new Error('API key not configured. Please set your API key in Settings.');
  }

  try {
    switch (config.provider) {
      case 'anthropic':
        return await judgeWithAnthropic(config.apiKey, config.model, eventName, transcript, durationSeconds, idealTimeSeconds);
      case 'gemini':
        return await judgeWithGemini(config.apiKey, config.model, eventName, transcript, durationSeconds, idealTimeSeconds);
      case 'openrouter':
        return await judgeWithOpenRouter(config.apiKey, config.model, eventName, transcript, durationSeconds, idealTimeSeconds);
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
