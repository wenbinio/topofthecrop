// What step 6 ("Check and share") lists, kept apart from the screen so "read aloud" can say the same things.
// Written with AI assistance (Claude, Anthropic).

/**
 * Who can look at the plan with the farmer, the easiest to reach first. No names, phone numbers or addresses:
 * we could not keep them right, and the basin spans two regions.
 */
export const WHO = ["dealer", "caa", "service", "neighbour", "agronomist"] as const;

/** The check that only says "ask someone": step 6's list of people replaces it. */
const ASK_SOMEONE = "check.adviser";

/** What the farmer can check alone for an option: its local checks without the "ask someone" one. */
export function ownChecks(checkLocally: string[]): string[] {
  return checkLocally.filter((key) => key !== ASK_SOMEONE);
}
