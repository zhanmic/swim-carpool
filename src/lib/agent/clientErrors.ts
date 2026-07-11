/** User-facing agent errors for the chat UI. */
export function formatAgentClientError(message: string): string {
  if (/rate limit|429|quota|resource exhausted/i.test(message)) {
    return "The agent is briefly busy (Gemini rate limit). Wait a minute and try again.";
  }
  if (/not configured|missing GEMINI_API_KEY/i.test(message)) {
    return "Schedule agent isn't set up yet. Add GEMINI_API_KEY in Vercel.";
  }
  if (/invalid GEMINI_API_KEY|API key not valid/i.test(message)) {
    return "Invalid Gemini API key. Check GEMINI_API_KEY in Vercel matches Google AI Studio.";
  }
  if (/model not available/i.test(message)) {
    return "Agent model unavailable right now. Try again in a few minutes.";
  }
  if (/confirmation expired|invalid.*confirm/i.test(message)) {
    return "That confirmation expired. Ask again to make the change.";
  }
  return message;
}
