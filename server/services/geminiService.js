import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI;

const getGenAI = () => {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
};

// Models to try in order — gemini-2.5-flash confirmed working with this key
const MODEL_CANDIDATES = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
];

const generateQuestions = async (topic, difficulty = 'medium') => {
  const ai = getGenAI();

  let difficultyDesc = 'moderate / medium-difficulty questions (no easy, basic, or trivial questions)';
  if (difficulty === 'hard') {
    difficultyDesc = 'advanced, difficult, and highly challenging questions (absolutely no easy, simple, or basic questions)';
  }

  const prompt = `You are a quiz question generator. Return ONLY a valid JSON array with no markdown, no backticks, no explanation. Each element must have exactly these fields: { "questionText": string, "options": [string, string, string, string], "correctOptionIndex": number (0-3), "points": 100 }. Generate exactly 10 ${difficultyDesc} about: ${topic}`;

  let lastError;

  for (const modelName of MODEL_CANDIDATES) {
    try {
      const model = ai.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      });

      console.log(`Trying Gemini model: ${modelName}`);
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();

      // Strip markdown code blocks if present (fallback safety)
      text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

      // Extract JSON array
      const firstBracket = text.indexOf('[');
      const lastBracket = text.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket !== -1) {
        text = text.slice(firstBracket, lastBracket + 1);
      }

      let questions;
      try {
        questions = JSON.parse(text);
      } catch (parseError) {
        throw new Error(`Failed to parse response as JSON: ${parseError.message}. Raw: ${text.slice(0, 200)}`);
      }

      if (!Array.isArray(questions)) {
        throw new Error('Response is not a JSON array');
      }

      if (questions.length !== 10) {
        throw new Error(`Expected 10 questions but got ${questions.length}`);
      }

      // Validate and normalise each question
      questions.forEach((q, index) => {
        if (!q.questionText || typeof q.questionText !== 'string') {
          throw new Error(`Question ${index + 1} is missing questionText`);
        }
        if (!Array.isArray(q.options) || q.options.length !== 4) {
          throw new Error(`Question ${index + 1} must have exactly 4 options`);
        }
        if (q.options.some((opt) => typeof opt !== 'string')) {
          throw new Error(`Question ${index + 1} has non-string options`);
        }
        if (
          typeof q.correctOptionIndex !== 'number' ||
          q.correctOptionIndex < 0 ||
          q.correctOptionIndex > 3
        ) {
          throw new Error(`Question ${index + 1} has invalid correctOptionIndex (must be 0–3)`);
        }
        if (typeof q.points !== 'number') {
          q.points = 100;
        }
      });

      console.log(`✅ Questions generated successfully with model: ${modelName}`);
      return questions;
    } catch (err) {
      const isModelNotFound =
        err.message.includes('not found') ||
        err.message.includes('404') ||
        err.message.includes('not supported');

      const isQuotaExceeded =
        err.message.includes('429') ||
        err.message.includes('Too Many Requests') ||
        err.message.includes('quota') ||
        err.message.includes('RESOURCE_EXHAUSTED');

      console.warn(`Model ${modelName} failed (${isQuotaExceeded ? 'quota' : isModelNotFound ? '404' : 'error'}): ${err.message.slice(0, 120)}`);
      lastError = err;

      if (!isModelNotFound && !isQuotaExceeded) {
        // Hard error (e.g. invalid API key, bad JSON) — don't try other models
        break;
      }
      // 404 or 429 → try next model in list
    }
  }

  if (lastError?.message.includes('GEMINI_API_KEY')) {
    throw lastError;
  }
  throw new Error(`Gemini question generation failed: ${lastError?.message}`);
};

export { generateQuestions };
