/** Trim quotes/backslashes accidentally pasted into Supabase secrets. */
export function cleanSecret(value: string): string {
  return value
    .trim()
    .replace(/^\\+["']+|\\+["']+$/g, '')
    .replace(/^["']+|["']+$/g, '')
    .replace(/\\"/g, '')
    .trim();
}
