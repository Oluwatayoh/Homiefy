'use server';
/**
 * @fileOverview A Genkit flow for analyzing the financial impact of a potential purchase.
 *
 * - purchaseImpactAnalysis - A function that analyzes the financial impact of a purchase.
 * - PurchaseImpactAnalysisInput - The input type for the purchaseImpactAnalysis function.
 * - PurchaseImpactAnalysisOutput - The return type for the purchaseImpactAnalysis function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PurchaseImpactAnalysisInputSchema = z.object({
  purchaseName: z.string().describe('The name of the item or service being considered for purchase.'),
  purchaseAmount: z.number().positive().describe('The cost of the item or service.'),
  currentBudget: z.number().min(0).describe('The total remaining budget for the current period.'),
  currentSavings: z.number().min(0).describe('The family\'s current total savings.'),
  safeToSpendDaily: z.number().min(0).describe('The family\'s calculated daily \'safe to spend\' amount.'),
  familyGoals: z.array(
    z.object({
      name: z.string().describe('The name of the financial goal.'),
      targetAmount: z.number().min(0).describe('The target amount for this goal.'),
      currentAmount: z.number().min(0).describe('The current amount saved towards this goal.'),
      deadline: z.string().optional().describe('An optional deadline for the goal (e.g., "6 months", "next year").'),
    })
  ).describe('A list of the family\'s active financial goals.'),
  impulsePurchaseLikelihood: z.number().min(0).max(1).optional().describe('An optional score (0 to 1) indicating the likelihood of this being an impulse purchase, if known.'),
});
export type PurchaseImpactAnalysisInput = z.infer<typeof PurchaseImpactAnalysisInputSchema>;

const PurchaseImpactAnalysisOutputSchema = z.object({
  impactSummary: z.string().describe('A concise summary of the purchase\'s immediate financial impact.'),
  budgetImpact: z.string().describe('Detailed explanation of how the purchase affects the current budget and \'safe to spend\' amount.'),
  goalImpacts: z.array(
    z.object({
      goalName: z.string().describe('The name of the affected financial goal.'),
      impactDescription: z.string().describe('Description of the impact on this specific goal.'),
      delayEstimateInDays: z.number().int().min(0).optional().describe('Estimated delay (in days) to achieve the goal due to this purchase, if applicable.'),
    })
  ).describe('A list of impacts on individual family financial goals.'),
  opportunityCost: z.string().describe('What other financial objectives or savings could be achieved with this amount instead.'),
  regretScore: z.number().int().min(0).max(10).describe('A score from 0 (no regret) to 10 (high regret) indicating the potential for future regret.'),
  alternativeRecommendations: z.array(z.string()).describe('Suggestions for alternative ways to satisfy the underlying need or mitigate the purchase\'s impact.'),
  decisionGuidance: z.string().describe('A clear, behavioral-economic-informed recommendation or guidance on whether to proceed with the purchase.'),
});
export type PurchaseImpactAnalysisOutput = z.infer<typeof PurchaseImpactAnalysisOutputSchema>;

export async function purchaseImpactAnalysis(input: PurchaseImpactAnalysisInput): Promise<PurchaseImpactAnalysisOutput> {
  return purchaseImpactAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'purchaseImpactAnalysisPrompt',
  input: {schema: PurchaseImpactAnalysisInputSchema},
  output: {schema: PurchaseImpactAnalysisOutputSchema},
  prompt: `You are KINETY, a senior product architect, fintech strategist, behavioral economist, and family finance specialist. Your role is to guide families in making responsible financial decisions.

Analyze the following potential purchase for a family and provide a real-time, clear, and empathetic analysis of its immediate financial impact on their active goals and overall budget. Help them make a responsible decision by highlighting the financial trade-offs.

### Family Financial Snapshot:
- Current Total Budget Available: {{{currentBudget}}}
- Current Total Savings: {{{currentSavings}}}
- Daily 'Safe to Spend' Amount: {{{safeToSpendDaily}}}

### Potential Purchase Details:
- Item/Service: {{{purchaseName}}}
- Cost: {{{purchaseAmount}}}

{{#if familyGoals}}
### Active Family Financial Goals:
{{#each familyGoals}}
- Goal: {{{name}}}
  - Target: {{{targetAmount}}}
  - Current Progress: {{{currentAmount}}}
  {{#if deadline}}
  - Deadline: {{{deadline}}}
  {{/if}}
{{/each}}
{{else}}
No specific family financial goals are currently active.
{{/if}}

{{#if impulsePurchaseLikelihood}}
### Behavioral Insights:
- Estimated Impulse Purchase Likelihood (0-1): {{{impulsePurchaseLikelihood}}}
{{/if}}

Consider the family's financial well-being and long-term discipline. Provide guidance that aligns with their shared financial goals.

Generate the output in the specified JSON format, making sure to provide detailed explanations for each field.`,
});

const purchaseImpactAnalysisFlow = ai.defineFlow(
  {
    name: 'purchaseImpactAnalysisFlow',
    inputSchema: PurchaseImpactAnalysisInputSchema,
    outputSchema: PurchaseImpactAnalysisOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
