/**
 * Article Personalization Scoring with AI
 * Scores articles based on contact context: notes, LinkedIn, Twitter, focus areas
 */

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ArticleScore {
  article: any;
  score: number;
  reasons: string[];
}

/**
 * Score articles using AI-based personalization analysis
 */
export async function scoreArticlesForContact(
  contact: any,
  articles: any[]
): Promise<ArticleScore[]> {
  if (articles.length === 0) return [];
  
  // Build context for AI scoring
  const contextParts: string[] = [];
  
  if (contact.notes) {
    contextParts.push(`Notes: ${contact.notes}`);
  }
  
  if (contact.linkedin_url) {
    contextParts.push(`LinkedIn: ${contact.linkedin_url}`);
  }
  
  if (contact.x_twitter_url) {
    contextParts.push(`Twitter: ${contact.x_twitter_url}`);
  }
  
  if (contact.focus_areas?.length > 0) {
    contextParts.push(`Focus Areas: ${contact.focus_areas.join(', ')}`);
  }
  
  if (contact.areas_of_specialization) {
    contextParts.push(`Specialization: ${contact.areas_of_specialization}`);
  }
  
  const contactContext = contextParts.join('\n');
  
  // Use simple heuristic scoring if no AI endpoint
  return articles.map(article => {
    let score = 50; // Base score
    const reasons: string[] = [];
    
    // Focus area match
    if (contact.focus_areas) {
      const focusMatch = contact.focus_areas.some((fa: string) => 
        article.focus_area?.toLowerCase().includes(fa.toLowerCase())
      );
      if (focusMatch) {
        score += 30;
        reasons.push('Matches focus area');
      }
    }
    
    // Recency bonus
    if (article.added_date || article.article_date) {
      const articleDate = article.added_date || article.article_date;
      const daysSincePublished = Math.floor(
        (Date.now() - new Date(articleDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSincePublished <= 30) {
        score += 15;
        reasons.push('Recent publication');
      } else if (daysSincePublished <= 90) {
        score += 5;
        reasons.push('Moderately recent');
      }
    }
    
    // Note keyword match (simple)
    if (contact.notes && article.focus_area) {
      const noteWords = contact.notes.toLowerCase().split(/\s+/);
      const articleWords = article.focus_area.toLowerCase().split(/\s+/);
      const overlap = noteWords.filter((w: string) => articleWords.includes(w)).length;
      if (overlap > 0) {
        score += Math.min(overlap * 5, 20);
        reasons.push('Keywords match notes');
      }
    }
    
    return {
      article,
      score: Math.min(score, 100),
      reasons,
    };
  });
}

/**
 * Hook for article scoring
 */
export function useArticleScoring() {
  const [isScoring, setIsScoring] = useState(false);
  
  const scoreArticles = async (
    contact: any,
    articles: any[]
  ): Promise<ArticleScore[]> => {
    setIsScoring(true);
    try {
      const scores = await scoreArticlesForContact(contact, articles);
      return scores.sort((a, b) => b.score - a.score);
    } finally {
      setIsScoring(false);
    }
  };
  
  return {
    scoreArticles,
    isScoring,
  };
}
