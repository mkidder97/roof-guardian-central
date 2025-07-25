import { supabase } from '@/integrations/supabase/client';

export interface PropertyMatch {
  id: string;
  property_name: string;
  address: string;
  city: string;
  state: string;
  confidence: number;
  matchType: 'exact' | 'fuzzy' | 'address' | 'partial';
}

export class PropertyMatcher {
  /**
   * Find the best matching property in the database
   */
  static async findBestMatch(
    extractedPropertyName: string,
    extractedAddress: string = ''
  ): Promise<PropertyMatch | null> {
    try {
      console.log('Searching for property match:', extractedPropertyName);
      
      // Get all properties from database
      const { data: properties, error } = await supabase
        .from('roofs')
        .select('id, property_name, address, city, state')
        .eq('is_deleted', false);
      
      if (error) {
        console.error('Error fetching properties:', error);
        return null;
      }
      
      if (!properties || properties.length === 0) {
        console.log('No properties found in database');
        return null;
      }
      
      console.log(`Searching through ${properties.length} properties`);
      
      // Try different matching strategies in order of confidence
      let bestMatch: PropertyMatch | null = null;
      
      // 1. Exact name match (highest confidence)
      bestMatch = this.findExactMatch(extractedPropertyName, properties);
      if (bestMatch) {
        console.log('Found exact match:', bestMatch.property_name);
        return bestMatch;
      }
      
      // 2. Address match (if address provided)
      if (extractedAddress) {
        bestMatch = this.findAddressMatch(extractedAddress, properties);
        if (bestMatch) {
          console.log('Found address match:', bestMatch.property_name);
          return bestMatch;
        }
      }
      
      // 3. Fuzzy name match (medium confidence)
      bestMatch = this.findFuzzyMatch(extractedPropertyName, properties);
      if (bestMatch) {
        console.log('Found fuzzy match:', bestMatch.property_name, 'confidence:', bestMatch.confidence);
        return bestMatch;
      }
      
      // 4. Partial name match (lower confidence)
      bestMatch = this.findPartialMatch(extractedPropertyName, properties);
      if (bestMatch) {
        console.log('Found partial match:', bestMatch.property_name, 'confidence:', bestMatch.confidence);
        return bestMatch;
      }
      
      console.log('No matches found for property:', extractedPropertyName);
      return null;
      
    } catch (error) {
      console.error('Error in property matching:', error);
      return null;
    }
  }
  
  /**
   * Find exact property name match
   */
  private static findExactMatch(
    extractedName: string, 
    properties: any[]
  ): PropertyMatch | null {
    const normalizedExtracted = this.normalizeString(extractedName);
    
    for (const property of properties) {
      const normalizedProperty = this.normalizeString(property.property_name);
      
      if (normalizedExtracted === normalizedProperty) {
        return {
          id: property.id,
          property_name: property.property_name,
          address: property.address,
          city: property.city,
          state: property.state,
          confidence: 1.0,
          matchType: 'exact'
        };
      }
    }
    
    return null;
  }
  
  /**
   * Find address-based match
   */
  private static findAddressMatch(
    extractedAddress: string,
    properties: any[]
  ): PropertyMatch | null {
    const normalizedExtracted = this.normalizeString(extractedAddress);
    
    for (const property of properties) {
      const normalizedAddress = this.normalizeString(property.address);
      
      // Check if addresses match or if property address is contained in extracted address
      if (normalizedExtracted.includes(normalizedAddress) || 
          normalizedAddress.includes(normalizedExtracted)) {
        return {
          id: property.id,
          property_name: property.property_name,
          address: property.address,
          city: property.city,
          state: property.state,
          confidence: 0.9,
          matchType: 'address'
        };
      }
    }
    
    return null;
  }
  
  /**
   * Find fuzzy property name match using similarity scoring
   */
  private static findFuzzyMatch(
    extractedName: string,
    properties: any[],
    minConfidence: number = 0.7
  ): PropertyMatch | null {
    const normalizedExtracted = this.normalizeString(extractedName);
    let bestMatch: PropertyMatch | null = null;
    let bestScore = 0;
    
    for (const property of properties) {
      const normalizedProperty = this.normalizeString(property.property_name);
      const similarity = this.calculateSimilarity(normalizedExtracted, normalizedProperty);
      
      if (similarity > bestScore && similarity >= minConfidence) {
        bestScore = similarity;
        bestMatch = {
          id: property.id,
          property_name: property.property_name,
          address: property.address,
          city: property.city,
          state: property.state,
          confidence: similarity,
          matchType: 'fuzzy'
        };
      }
    }
    
    return bestMatch;
  }
  
  /**
   * Find partial match (property name contains extracted name or vice versa)
   */
  private static findPartialMatch(
    extractedName: string,
    properties: any[],
    minConfidence: number = 0.6
  ): PropertyMatch | null {
    const normalizedExtracted = this.normalizeString(extractedName);
    const extractedWords = normalizedExtracted.split(' ').filter(word => word.length > 2);
    
    let bestMatch: PropertyMatch | null = null;
    let bestScore = 0;
    
    for (const property of properties) {
      const normalizedProperty = this.normalizeString(property.property_name);
      const propertyWords = normalizedProperty.split(' ').filter(word => word.length > 2);
      
      // Count matching words
      let matchingWords = 0;
      for (const extractedWord of extractedWords) {
        for (const propertyWord of propertyWords) {
          if (extractedWord === propertyWord || 
              extractedWord.includes(propertyWord) || 
              propertyWord.includes(extractedWord)) {
            matchingWords++;
            break;
          }
        }
      }
      
      // Calculate confidence based on word overlap
      const confidence = matchingWords / Math.max(extractedWords.length, propertyWords.length);
      
      if (confidence > bestScore && confidence >= minConfidence) {
        bestScore = confidence;
        bestMatch = {
          id: property.id,
          property_name: property.property_name,
          address: property.address,
          city: property.city,
          state: property.state,
          confidence,
          matchType: 'partial'
        };
      }
    }
    
    return bestMatch;
  }
  
  /**
   * Calculate string similarity using Levenshtein distance
   */
  private static calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }
  
  /**
   * Calculate Levenshtein distance between two strings
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null)
      .map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // insertion
          matrix[j - 1][i] + 1,     // deletion
          matrix[j - 1][i - 1] + cost  // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }
  
  /**
   * Normalize string for comparison
   */
  private static normalizeString(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ')    // Normalize spaces
      .trim();
  }
  
  /**
   * Get multiple potential matches for manual selection
   */
  static async getPotentialMatches(
    extractedPropertyName: string,
    extractedAddress: string = '',
    limit: number = 5
  ): Promise<PropertyMatch[]> {
    try {
      const { data: properties, error } = await supabase
        .from('roofs')
        .select('id, property_name, address, city, state')
        .eq('is_deleted', false);
      
      if (error || !properties) return [];
      
      const matches: PropertyMatch[] = [];
      const normalizedExtracted = this.normalizeString(extractedPropertyName);
      
      // Score all properties
      for (const property of properties) {
        const normalizedProperty = this.normalizeString(property.property_name);
        const similarity = this.calculateSimilarity(normalizedExtracted, normalizedProperty);
        
        if (similarity > 0.3) { // Lower threshold for potential matches
          matches.push({
            id: property.id,
            property_name: property.property_name,
            address: property.address,
            city: property.city,
            state: property.state,
            confidence: similarity,
            matchType: similarity > 0.8 ? 'fuzzy' : 'partial'
          });
        }
      }
      
      // Sort by confidence and return top matches
      return matches
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, limit);
        
    } catch (error) {
      console.error('Error getting potential matches:', error);
      return [];
    }
  }
}