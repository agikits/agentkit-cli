export type SourceEditFields = { title?: string; questions?: string[]; answer?: string; content?: string };

/** The stored source type determines which fields the API accepts. A title works for both. */
export function sourceEditError({ title, questions, answer, content }: SourceEditFields): string | undefined {
  if (content !== undefined && (questions !== undefined || answer !== undefined)) {
    return "Use questions and answer for Q&A, or content for a text, web or file source.";
  }
  if ([title, questions, answer, content].every(value => value === undefined)) {
    return "Provide at least one field to update.";
  }
}
