import { useState, useEffect, useCallback } from 'react';
import { useStorage } from './useStorage';

interface UsagePattern {
  word: string;
  count: number;
  lastUsed: number;
  pairs: Array<{word: string, count: number}>;
}

export const usePrediction = () => {
  const [context, setContext] = useState<string[]>([]);
  const [predictions, setPredictions] = useState<string[]>([]);
  const { getUsagePatterns } = useStorage();
  
  // Get paired suggestions based on usage patterns
  const getPairedSuggestions = useCallback(async (word: string) => {
    const patterns = await getUsagePatterns();
    const currentPattern = patterns.find(p => p.word === word);
    if (currentPattern) {
      return currentPattern.pairs
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .map(p => p.word);
    }
    return [];
  }, [getUsagePatterns]);

  // Update context and get new predictions
  const updateContext = useCallback(async (newWord: string) => {
    // Keep last 5 words for context
    const newContext = [...context.slice(-4), newWord];
    setContext(newContext);

    // Get paired suggestions for the new word
    const paired = await getPairedSuggestions(newWord);

    // Combine paired suggestions with general predictions
    const patterns = await getUsagePatterns();
    
    // Score words based on:
    // 1. Usage count (weighted)
    // 2. Recency (weighted)
    // 3. Pairing strength with current word
    // 4. Time of day patterns
    const now = new Date();
    const hour = now.getHours();

    const scored = patterns.map(pattern => {
      let score = 0;
      
      // Base score from usage count (logarithmic scaling)
      score += Math.log10(pattern.count + 1) * 2;
      
      // Recency bonus (decay over time)
      const hoursSinceUsed = (Date.now() - pattern.lastUsed) / (1000 * 60 * 60);
      score += Math.max(0, 24 - hoursSinceUsed) / 6;
      
      // Pairing bonus
      if (paired.includes(pattern.word)) {
        score += 5;
      }
      
      // Time of day patterns (if we have enough data)
      if (pattern.timePatterns?.[hour]) {
        score += pattern.timePatterns[hour] / 10;
      }
      
      return { word: pattern.word, score };
    });

    // Sort by score and take top 5
    const topPredictions = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(p => p.word);

    setPredictions(topPredictions);
  }, [context, getPairedSuggestions, getUsagePatterns]);

  return {
    predictions,
    updateContext,
    currentContext: context
  };
};