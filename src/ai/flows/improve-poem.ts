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
  initialPoem: z.string().describe('O poema inicial a ser melhorado.'),
  feedback: z.string().describe('Feedback do usuário sobre o poema inicial.'),
});
export type ImprovePoemInput = z.infer<typeof ImprovePoemInputSchema>;

const ImprovePoemOutputSchema = z.object({
  improvedPoem: z.string().describe('O poema melhorado com base no feedback do usuário, em Português do Brasil.'),
});
export type ImprovePoemOutput = z.infer<typeof ImprovePoemOutputSchema>;

export async function improvePoem(input: ImprovePoemInput): Promise<ImprovePoemOutput> {
  return improvePoemFlow(input);
}

const prompt = ai.definePrompt({
  name: 'improvePoemPrompt',
  input: {schema: ImprovePoemInputSchema},
  output: {schema: ImprovePoemOutputSchema},
  prompt: `Você é um poeta de classe mundial, especialista em refinar poemas existentes com base em feedback.

  O poema a ser melhorado DEVE ser em Português do Brasil.

  Aqui está o poema inicial:
  {{initialPoem}}

  Aqui está o feedback do usuário:
  {{feedback}}

  Por favor, melhore o poema com base no feedback, mantendo o estilo e o tom originais o máximo possível.
  Retorne apenas o poema melhorado.
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
