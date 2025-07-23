'use server';

/**
 * @fileOverview An AI agent that improves a poem based on user feedback.
 *
 * - improvePoem - A function that takes an initial poem and user feedback, and returns an improved poem.
 * - ImprovePoemInput - The input type for the improvePoem function.
 * - ImprovePoemOutput - The return type for the improvePoem function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ImprovePoemInputSchema = z.object({
  initialPoem: z.string().describe('The initial poem to improve.'),
  feedback: z.string().describe('User feedback on the initial poem.'),
});
export type ImprovePoemInput = z.infer<typeof ImprovePoemInputSchema>;

const ImprovePoemOutputSchema = z.object({
  improvedPoem: z.string().describe('The improved poem based on user feedback.'),
});
export type ImprovePoemOutput = z.infer<typeof ImprovePoemOutputSchema>;

export async function improvePoem(input: ImprovePoemInput): Promise<ImprovePoemOutput> {
  return improvePoemFlow(input);
}

const prompt = ai.definePrompt({
  name: 'improvePoemPrompt',
  input: {schema: ImprovePoemInputSchema},
  output: {schema: ImprovePoemOutputSchema},
  prompt: `You are a world-class poet, skilled at refining existing poems based on feedback.

  Here is the initial poem:
  {{initialPoem}}

  Here is the feedback from the user:
  {{feedback}}

  Please improve the poem based on the feedback, maintaining the original style and tone as much as possible.
  Return only the improved poem.
  `,
});

const improvePoemFlow = ai.defineFlow(
  {
    name: 'improvePoemFlow',
    inputSchema: ImprovePoemInputSchema,
    outputSchema: ImprovePoemOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
