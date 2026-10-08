/**
 * Prompt Sanitizer and Injection Detector
 * Protects Zynora against prompt injection attacks that attempt to bypass RAG restrictions.
 */

const INJECTION_PATTERNS = [
  /ignore\s+(your\s+|all\s+)?(previous\s+instructions|knowledge\s*base|instructions|rules|system|context|guardrails)/i,
  /use\s+your\s+own\s+knowledge/i,
  /search\s+(the\s+)?(internet|web|google|bing)/i,
  /browse\s+(the\s+)?(internet|web|external\s+websites)/i,
  /forget\s+(your\s+|all\s+)?(instructions|rules|system|knowledge)/i,
  /answer\s+from\s+your\s+own\s+(knowledge|mind|memory)/i,
  /override\s+(rag|rules|knowledge|instructions)/i,
  /bypass\s+(the\s+)?(knowledge|rag|guardrails|rules|restriction)/i,
  /disregard\s+(your\s+|all\s+)?(knowledge|instructions|rules)/i,
  /reveal\s+(your\s+)?(system\s+prompt|prompt|instructions)/i,
  /show\s+(hidden|internal|confidential)\s+(documents|docs|files|data)/i,
  /(give|show|dump|leak|extract)\s+(me\s+)?(another|other|all)\s+user('s|\s+)?(conversation|data|messages)/i,
  /pretend\s+you\s+are/i,
  /act\s+as\s+a\s+general/i,
  /jailbreak/i,
  /call\s+(openai|gemini|claude|chatgpt)/i
];

function detectPromptInjection(inputString) {
  if (!inputString || typeof inputString !== 'string') {
    return { isInjection: false, cleanText: '' };
  }

  const cleanText = inputString.trim();
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(cleanText)) {
      return {
        isInjection: true,
        patternMatched: pattern.toString(),
        cleanText
      };
    }
  }

  return {
    isInjection: false,
    cleanText
  };
}

module.exports = {
  detectPromptInjection,
  INJECTION_PATTERNS
};
