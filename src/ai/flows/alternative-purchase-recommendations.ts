'use server';
/**
 * @fileOverview This file implements a Genkit flow for generating alternative purchase recommendations.
 *
 * - alternativePurchaseRecommendations - A function that suggests financially aligned alternatives or strategies for a potential purchase.
 * - AlternativePurchaseRecommendationsInput - The input type for the alternativePurchaseRecommendations function.
 * - AlternativePurchaseRecommendationsOutput - The return type for the alternativePurchaseRecommendations function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AlternativePurchaseRecommendationsInputSchema = z.object({
  purchaseDescription: z
    .string()
    .describe('A detailed description of the potential purchase the family member is considering.'),
  purchaseCost: z.number().describe('The monetary cost of the potential purchase.'),
  impactAnalysis: z
    .string()
    .describe(
      "An analysis of how the potential purchase impacts the family's financial situation, budget, and shared goals."
    ),
  familyGoals: z
    .array(z.string())
    .describe("A list of the family's current financial goals, such as 'saving for a down payment' or 'reducing debt'."),
});
export type AlternativePurchaseRecommendationsInput = z.infer<
  typeof AlternativePurchaseRecommendationsInputSchema
>;

const AlternativePurchaseRecommendationsOutputSchema = z.object({
  recommendations: z
    .array(z.string())
    .describe(
      'A list of concrete, financially aligned alternative strategies or purchases to consider, like "wait until next month," "consider a cheaper brand," or "reallocate funds to goal X."
    ),
  summary: z
    .string()
    .describe(
      "A concise summary explaining why the provided recommendations are financially aligned with the family's goals and current situation."
    ),
});
export type AlternativePurchaseRecommendationsOutput = z.infer<
  typeof AlternativePurchaseRecommendationsOutputSchema
>;

export async function alternativePurchaseRecommendations(
  input: AlternativePurchaseRecommendationsInput
): Promise<AlternativePurchaseRecommendationsOutput> {
  return alternativePurchaseRecommendationsFlow(input);
}

const alternativePurchaseRecommendationsPrompt = ai.definePrompt({
  name: 'alternativePurchaseRecommendationsPrompt',
  input: { schema: AlternativePurchaseRecommendationsInputSchema },
  output: { schema: AlternativePurchaseRecommendationsOutputSchema },
  prompt: `You are KINETY, a financial behavior coach for families, specializing in pre-spending decision guidance and behavioral coaching.
Your goal is to help families make financially aligned decisions by suggesting concrete alternative strategies or purchases before they spend.

Given a potential purchase and its analyzed impact on the family's financial goals, provide actionable alternative recommendations.
These alternatives should aim to either save money, reallocate funds towards higher-priority goals, or promote better financial discipline, directly addressing the impact identified.

Potential Purchase: {{{purchaseDescription}}}
Cost: ${{purchaseCost}}
Impact Analysis: {{{impactAnalysis}}}

Family's Current Financial Goals:
{{#each familyGoals}}- {{{this}}}
{{/each}}

Based on the above, provide at least 3 distinct, actionable recommendations that are more financially aligned, along with a brief summary of why these are good alternatives.`,
});

const alternativePurchaseRecommendationsFlow = ai.defineFlow(
  {
    name: 'alternativePurchaseRecommendationsFlow',
    inputSchema: AlternativePurchaseRecommendationsInputSchema,
    outputSchema: AlternativePurchaseRecommendationsOutputSchema,
  },
  async (input) => {
    const { output } = await alternativePurchaseRecommendationsPrompt(input);
    return output!;
  }
);
