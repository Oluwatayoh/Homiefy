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
  category: z.string().describe('The budget category/envelope this purchase belongs to.'),
  priority: z.enum(['Need', 'Want', 'Luxury']).optional().describe('The priority level assigned by the user.'),
  currentBudget: z.number().min(0).describe('The total remaining budget for the current period.'),
  envelopeBalance: z.number().describe('The current remaining balance in the specific envelope for this category.'),
  envelopeTotal: z.number().describe('The total monthly allocation for this specific envelope.'),
  currentSavings: z.number().min(0).describe('The family\'s current total savings.'),
  safeToSpendDaily: z.number().min(0).describe('The family\'s calculated daily \'safe to spend\' amount.'),
  familyGoals: z.array(
    z.object({
      name: z.string().describe('The name of the financial goal.'),
      targetAmount: z.number().min(0).describe('The target amount for this goal.'),
      currentAmount: z.number().min(0).describe('The current amount saved towards this goal.'),
      deadline: z.string().optional().describe('An optional deadline for the goal.'),
    })
  ).describe('A list of the family\'s active financial goals.'),
});
export type PurchaseImpactAnalysisInput = z.infer<typeof PurchaseImpactAnalysisInputSchema>;

const PurchaseImpactAnalysisOutputSchema = z.object({
  impactSummary: z.string().describe('A concise summary of the purchase\'s immediate financial impact.'),
  budgetImpactDetails: z.object({
    remainingEnvelopeBalance: z.number().describe('The balance in the envelope if this purchase proceeds.'),
    percentOfEnvelopeConsumed: z.number().describe('What percentage of the monthly allocation this purchase consumes.'),
    newSafeToSpendDaily: z.number().describe('The adjusted safe-to-spend amount if this purchase proceeds.'),
  }),
  goalImpacts: z.array(
    z.object({
      goalName: z.string().describe('The name of the affected financial goal.'),
      impactDescription: z.string().describe('Description of the impact on this specific goal.'),
      delayEstimateInDays: z.number().int().min(0).optional().describe('Estimated delay (in days) to achieve the goal due to this purchase.'),
    })
  ).describe('A list of impacts on individual family financial goals.'),
  opportunityCost: z.string().describe('What other financial objectives or savings could be achieved with this amount instead.'),
  regretScore: z.number().int().min(0).max(100).describe('A score from 0 (low) to 100 (high) predicting potential future regret based on category, amount, and current time.'),
  alternativeRecommendations: z.array(z.string()).describe('Suggestions for alternative ways to satisfy the underlying need or mitigate the purchase\'s impact.'),
  recommendationType: z.enum(['Proceed Confidently', 'Consider Carefully', 'Reconsider', 'Seek Approval']).describe('The clear, color-coded recommendation type based on FRD conditions.'),
  decisionGuidance: z.string().describe('A 1-2 sentence supportive explanation of the recommendation.'),
});
export type PurchaseImpactAnalysisOutput = z.infer<typeof PurchaseImpactAnalysisOutputSchema>;

export async function purchaseImpactAnalysis(input: PurchaseImpactAnalysisInput): Promise<PurchaseImpactAnalysisOutput> {
  return purchaseImpactAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'purchaseImpactAnalysisPrompt',
  input: {schema: PurchaseImpactAnalysisInputSchema},
  output: {schema: PurchaseImpactAnalysisOutputSchema},
  prompt: `You are Homiefy, a senior financial behavior coach. Your goal is to guide families in making responsible financial decisions through empathetic, non-judgmental analysis.

Analyze the following potential purchase and provide a clear, supportive analysis of its impact on their budget and goals.

### Potential Purchase:
- Item: {{{purchaseName}}}
- Cost: \${{{purchaseAmount}}}
- Category: {{{category}}}
- Priority: {{{priority}}}

### Family Financial Snapshot:
- Envelope Allocation: \${{{envelopeTotal}}}
- Current Envelope Balance: \${{{envelopeBalance}}}
- Total Family Savings: \${{{currentSavings}}}
- Daily 'Safe to Spend': \${{{safeToSpendDaily}}}

{{#if familyGoals}}
### Active Family Financial Goals:
{{#each familyGoals}}
- Goal: {{{name}}} (Target: \${{{targetAmount}}}, Progress: \${{{currentAmount}}})
{{/each}}
{{/if}}

### Logic Guidelines:
1. **Regret Score (0-100)**: Higher for 'Luxury' items, high amounts relative to envelope, and discretionary categories (Dining, Entertainment).
2. **Recommendation Type**:
   - "Proceed Confidently": Within budget, low regret, safe-to-spend stays positive.
   - "Consider Carefully": Within budget but uses >20% of envelope, or discretionary category.
   - "Reconsider": Uses >50% of envelope, delays goals by >7 days, high regret score.
   - "Seek Approval": Exceeds budget envelope or puts family over total budget.

Generate the output in the specified JSON format.`,
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