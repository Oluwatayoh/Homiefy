'use server';
/**
 * @fileOverview This file implements a Genkit flow for generating personalized financial coaching nudges.
 *
 * - personalizedCoachingNudges - A function that generates a personalized coaching nudge.
 * - PersonalizedCoachingNudgesInput - The input type for the personalizedCoachingNudges function.
 * - PersonalizedCoachingNudgesOutput - The return type for the personalizedCoachingNudges function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const PersonalizedCoachingNudgesInputSchema = z.object({
  userName: z.string().describe('The name of the family member to personalize the nudge for.'),
  pastSpendingBehavior: z
    .string()
    .describe('A summary of the user\'s recent past spending behavior.'),
  familyFinancialGoals: z
    .string()
    .describe('A summary of the family\'s current financial goals.'),
});
export type PersonalizedCoachingNudgesInput = z.infer<
  typeof PersonalizedCoachingNudgesInputSchema
>;

const PersonalizedCoachingNudgesOutputSchema = z.object({
  nudgeMessage: z.string().describe('A personalized financial coaching nudge message.'),
});
export type PersonalizedCoachingNudgesOutput = z.infer<
  typeof PersonalizedCoachingNudgesOutputSchema
>;

export async function personalizedCoachingNudges(
  input: PersonalizedCoachingNudgesInput
): Promise<PersonalizedCoachingNudgesOutput> {
  return personalizedCoachingNudgesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'personalizedCoachingNudgesPrompt',
  input: { schema: PersonalizedCoachingNudgesInputSchema },
  output: { schema: PersonalizedCoachingNudgesOutputSchema },
  prompt:
    `You are Homiefy, a helpful financial coach for families. Your goal is to provide concise, encouraging, and actionable financial coaching nudges based on a user's past spending behavior and their family's financial goals.

Craft a personalized coaching nudge for {{{userName}}} based on the following information:

User's Past Spending Behavior: {{{pastSpendingBehavior}}}
Family's Financial Goals: {{{familyFinancialGoals}}}

Make sure the nudge is supportive, highlights the connection between their behavior and family goals, and offers a gentle reminder or suggestion. Keep it brief and to the point.

Example:
"Hi Alex, remember our goal to save for a down payment? Recent dining out might slow us down a bit. Let's try cooking at home more often this week!"

Now, generate the nudge for {{{userName}}}:`,
});

const personalizedCoachingNudgesFlow = ai.defineFlow(
  {
    name: 'personalizedCoachingNudgesFlow',
    inputSchema: PersonalizedCoachingNudgesInputSchema,
    outputSchema: PersonalizedCoachingNudgesOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);