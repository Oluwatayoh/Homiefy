'use server';
/**
 * @fileOverview This file implements a Genkit flow for detecting impulse spending.
 *
 * - impulseSpendingDetection - A function that detects potential impulse purchases and provides insights.
 * - ImpulseSpendingDetectionInput - The input type for the impulseSpendingDetection function.
 * - ImpulseSpendingDetectionOutput - The return type for the impulseSpendingDetection function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ImpulseSpendingDetectionInputSchema = z.object({
  transactionDetails: z
    .string()
    .describe('A brief description of the transaction (e.g., "coffee at cafe", "online gadget purchase").'),
  amount: z.number().describe('The monetary amount of the transaction.'),
  category: z.string().describe('The category of the transaction (e.g., dining, shopping, entertainment, groceries).'),
  timestamp: z.string().datetime().describe('The ISO 8601 timestamp of when the transaction occurred.'),
  previousSpendingPatterns: z
    .string()
    .describe('A summary of the user\'s recent and historical spending patterns and common impulse triggers, if known. Provide this as a concise textual summary.'),
  familyGoals: z
    .array(z.string())
    .describe('A list of the family\'s current financial goals (e.g., "saving for a down payment", "vacation fund", "emergency savings").'),
});
export type ImpulseSpendingDetectionInput = z.infer<typeof ImpulseSpendingDetectionInputSchema>;

const ImpulseSpendingDetectionOutputSchema = z.object({
  isImpulsePurchase: z.boolean().describe('True if the transaction is likely an impulse purchase, false otherwise.'),
  explanation: z
    .string()
    .describe('A brief explanation of why the transaction is (or is not) considered an impulse purchase, referencing input data.'),
  insight: z
    .string()
    .describe('A personalized behavioral coaching insight or tip based on the detected pattern to help build better habits.'),
  spendingTrigger: z
    .string()
    .describe('The likely spending trigger identified for this type of purchase (e.g., "stress", "boredom", "social influence", "promotional offer"). Can be "N/A" if no specific trigger is evident.'),
  patternDetected: z
    .string()
    .describe('A description of any spending pattern detected related to this transaction (e.g., "frequent small purchases in the same category", "late-night online shopping"). Can be "N/A" if no specific pattern is evident.'),
});
export type ImpulseSpendingDetectionOutput = z.infer<typeof ImpulseSpendingDetectionOutputSchema>;

const impulseSpendingDetectionPrompt = ai.definePrompt({
  name: 'impulseSpendingDetectionPrompt',
  input: {schema: ImpulseSpendingDetectionInputSchema},
  output: {schema: ImpulseSpendingDetectionOutputSchema},
  prompt: `You are a KINETY financial behavior coach, specialized in family finance and behavioral economics. Your goal is to help families identify impulse spending and develop better habits.

Analyze the following transaction in the context of the user's spending patterns and family financial goals. Determine if it is likely an impulse purchase and provide a brief explanation, an insight for behavioral coaching, and identify potential triggers and patterns.

--- Transaction Details ---
Description: {{{transactionDetails}}}
Amount: {{{amount}}}
Category: {{{category}}}
Timestamp: {{{timestamp}}}

--- User's Historical Spending Patterns ---
{{{previousSpendingPatterns}}}

--- Family Financial Goals ---
{{#each familyGoals}}- {{{this}}}
{{/each}}

Based on the above information, assess the transaction and provide a structured response.`,
});

const impulseSpendingDetectionFlow = ai.defineFlow(
  {
    name: 'impulseSpendingDetectionFlow',
    inputSchema: ImpulseSpendingDetectionInputSchema,
    outputSchema: ImpulseSpendingDetectionOutputSchema,
  },
  async input => {
    const {output} = await impulseSpendingDetectionPrompt(input);
    return output!;
  }
);

export async function impulseSpendingDetection(input: ImpulseSpendingDetectionInput): Promise<ImpulseSpendingDetectionOutput> {
  return impulseSpendingDetectionFlow(input);
}
