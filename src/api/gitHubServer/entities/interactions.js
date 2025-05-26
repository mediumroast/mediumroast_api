/**
 * Actions entity class for GitHub workflow operations
 * @file interaction.js
 * @license Apache-2.0
 * @version 3.0.0
 * 
 * @author Michael Hay <michael.hay@mediumroast.io>
 * @copyright 2025 Mediumroast, Inc. All rights reserved.
 */
import { BaseObjects } from '../baseObjects.js';
import { logger } from '../logger.js';

export class Interactions extends BaseObjects {
  constructor(token, org, processName) {
    super(token, org, processName, 'Interactions');
    
    // Add interaction-specific cache settings
    this._cacheKeys.byHash = `${this.objType}_byHash`;
    this._cacheKeys.byText = `${this.objType}_byText`;
    this._cacheKeys.analysis = `${this.objType}_analysis`;
    this._cacheKeys.topics = `${this.objType}_topics`;
    this._cacheKeys.similar = `${this.objType}_similar`;
    
    // Set cache timeouts
    this.cacheTimeouts.analysis = 600000;  // 10 minutes for content analysis
    this.cacheTimeouts.topics = 600000;    // 10 minutes for topics
    this.cacheTimeouts.similar = 600000;   // 10 minutes for similarity results
  }

  /**
   * Override deleteObj to handle cross-entity references
   * @param {string} objName - Name of the interaction to delete
   * @returns {Promise<Array>} Operation result
   */
  async deleteObj(objName) {
    // Track this operation
    const tracking = logger.trackOperation ? 
      logger.trackOperation(this.objType, 'deleteObj') : 
      { end: () => {} };
    
    try {
      const source = {
        from: 'Interactions',
        to: ['Companies']
      };
      return await super.deleteObj(objName, source);
    } finally {
      tracking.end();
    }
  }

  /**
   * Find interaction by file hash
   * @param {string} hash - File hash to search for
   * @returns {Promise<Array>} Found interaction or error
   */
  async findByHash(hash) {
    // Track this operation
    const tracking = logger.trackOperation ? 
      logger.trackOperation(this.objType, 'findByHash') : 
      { end: () => {} };
    
    try {
      // Validate parameters
      const validationError = this._validateParams(
        { hash },
        { hash: 'string' }
      );
          
      if (validationError) return validationError;
      
      // Use cache with dependencies to container data
      const hashCacheKey = `${this._cacheKeys.byHash}_${hash}`;
      
      return await this.cache.getOrFetch(
        hashCacheKey,
        () => this.findByX('file_hash', hash),
        this.cacheTimeouts[this.objType] || 180000,
        [this._cacheKeys.container] // Depends on all interactions
      );
    } finally {
      tracking.end();
    }
  }
    
  /**
   * Finds interactions containing specific text in content or metadata
   * @param {string} text - The text to search for
   * @returns {Promise<Array>} Search results
   */
  async findByText(text) {
    // Track this operation
    const tracking = logger.trackOperation ? 
      logger.trackOperation(this.objType, 'findByText') : 
      { end: () => {} };
    
    try {
      // Validate parameters
      const validationError = this._validateParams(
        { text },
        { text: 'string' }
      );
          
      if (validationError) return validationError;
      
      // Use cache with text search key
      const textCacheKey = `${this._cacheKeys.byText}_${text.toLowerCase()}`;
      
      return await this.cache.getOrFetch(
        textCacheKey,
        async () => {
          const allObjectsResp = await this.getAll();
          if (!allObjectsResp[0]) {
            return allObjectsResp;
          }
          
          const allObjects = allObjectsResp[2].mrJson;
          const searchText = text.toLowerCase();
          
          // Search through text fields
          const results = allObjects.filter(interaction => {
            if (interaction.name?.toLowerCase().includes(searchText)) return true;
            if (interaction.abstract?.toLowerCase().includes(searchText)) return true;
            if (interaction.description?.toLowerCase().includes(searchText)) return true;
            if (interaction.summary?.toLowerCase().includes(searchText)) return true;
            return false;
          });
          
          if (results.length === 0) {
            return this._createError(
              `No interactions found containing text: "${text}"`,
              null,
              404
            );
          }
          
          return this._createSuccess(
            `Found ${results.length} interactions containing text: "${text}"`,
            results
          );
        },
        this.cacheTimeouts[this.objType] || 180000,
        [this._cacheKeys.container] // Depends on all interactions
      );
    } catch (error) {
      return this._createError(
        `Error searching interactions: ${error.message}`,
        error,
        500
      );
    } finally {
      tracking.end();
    }
  }
    
  /**
   * Gets detailed content analysis for an interaction
   * @param {string} name - Interaction name
   * @returns {Promise<Array>} Analysis results
   */
  async getInteractionAnalysis(name) {
    // Track this operation
    const tracking = logger.trackOperation ? 
      logger.trackOperation(this.objType, 'getInteractionAnalysis') : 
      { end: () => {} };
    
    try {
      // Validate parameter
      const validationError = this._validateParams(
        { name },
        { name: 'string' }
      );
          
      if (validationError) return validationError;
      
      // Use cache for analysis results
      const analysisCacheKey = `${this._cacheKeys.analysis}_${name}`;
      
      return await this.cache.getOrFetch(
        analysisCacheKey,
        async () => {
          // Find the interaction
          const interactionResp = await this.findByName(name);
          if (!interactionResp[0]) {
            return interactionResp;
          }
          
          const interaction = interactionResp[2][0];
          
          // Check if this interaction has content to analyze
          if (!interaction.url) {
            return this._createError(
              `Interaction [${name}] does not have content to analyze`,
              null,
              400
            );
          }
          
          // Use transaction pattern for better error handling
          return this._executeTransaction([
            // Step 1: Read the content
            async () => {
              try {
                const contentResp = await this.serverCtl.readBlob(interaction.url);
                if (!contentResp[0]) {
                  return contentResp;
                }
                            
                // Store for next steps
                this._tempContent = contentResp[2].decodedContent;
                return this._createSuccess('Retrieved interaction content');
              } catch (err) {
                return this._createError(
                  `Failed to read interaction content: ${err.message}`,
                  err,
                  500
                );
              }
            },
                  
            // Step 2: Analyze the content
            async () => {
              // Get word frequencies
              const words = this._tempContent
                .toLowerCase()
                .replace(/[^\w\s]/g, ' ')
                .split(/\s+/)
                .filter(word => word.length > 3);
                      
              const wordFreq = {};
              words.forEach(word => {
                wordFreq[word] = (wordFreq[word] || 0) + 1;
              });
                      
              // Sort by frequency
              const sortedWords = Object.entries(wordFreq)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 50)
                .reduce((obj, [k, v]) => ({ ...obj, [k]: v }), {});
                      
              // Basic sentiment analysis
              const positiveWords = ['good', 'great', 'excellent', 'positive', 'advantage', 'benefit'];
              const negativeWords = ['bad', 'poor', 'negative', 'disadvantage', 'problem', 'issue'];
                      
              let sentimentScore = 0;
              words.forEach(word => {
                if (positiveWords.includes(word)) sentimentScore++;
                if (negativeWords.includes(word)) sentimentScore--;
              });
                      
              // Create analysis object
              const analysis = {
                topWords: sortedWords,
                totalWords: words.length,
                uniqueWords: Object.keys(wordFreq).length,
                avgWordLength: words.reduce((sum, word) => sum + word.length, 0) / words.length,
                sentiment: {
                  score: sentimentScore,
                  normalized: words.length > 0 ? sentimentScore / words.length : 0,
                  interpretation: sentimentScore > 0 ? 'Positive' : 
                    sentimentScore < 0 ? 'Negative' : 'Neutral'
                },
                metadata: {
                  contentType: interaction.content_type,
                  fileSize: interaction.file_size,
                  readingTime: interaction.reading_time,
                  wordCount: interaction.word_count,
                  pageCount: interaction.page_count
                }
              };
                      
              return this._createSuccess(
                `Analysis completed for interaction [${name}]`,
                analysis
              );
            }
          ], `analyze-interaction-${name}`);
        },
        this.cacheTimeouts.analysis || 600000,
        [
          this._cacheKeys.container,                // Depends on interaction data
          `${this._cacheKeys.byName}_${name}`       // Depends on this specific interaction
        ]
      );
    } catch (error) {
      return this._createError(
        `Error analyzing interaction: ${error.message}`,
        error,
        500
      );
    } finally {
      tracking.end();
    }
  }
    
  /**
   * Extracts topics from an interaction's content
   * @param {string} name - Interaction name
   * @returns {Promise<Array>} Extracted topics
   */
  async extractTopics(name) {
    // Track this operation
    const tracking = logger.trackOperation ? 
      logger.trackOperation(this.objType, 'extractTopics') : 
      { end: () => {} };
    
    try {
      // Validate parameter
      const validationError = this._validateParams(
        { name },
        { name: 'string' }
      );
          
      if (validationError) return validationError;
      
      // Use cache for topics with dependency on analysis
      const topicsCacheKey = `${this._cacheKeys.topics}_${name}`;
      
      return await this.cache.getOrFetch(
        topicsCacheKey,
        async () => {
          // First get the content analysis which contains word frequencies
          const analysisResp = await this.getInteractionAnalysis(name);
          if (!analysisResp[0]) {
            return analysisResp;
          }
          
          const topWords = analysisResp[2].topWords;
          
          // Filter common stop words
          const stopWords = ['this', 'that', 'then', 'than', 'they', 'them', 'their', 'there', 'here', 'where'];
          const topics = Object.entries(topWords)
            .filter(([word]) => !stopWords.includes(word))
            .slice(0, 10)
            .map(([word, count]) => ({ topic: word, count }));
          
          return this._createSuccess(
            `Extracted topics for interaction [${name}]`,
            topics
          );
        },
        this.cacheTimeouts.topics || 600000,
        [
          `${this._cacheKeys.analysis}_${name}`     // Depends on content analysis
        ]
      );
    } catch (error) {
      return this._createError(
        `Error extracting topics: ${error.message}`,
        error,
        500
      );
    } finally {
      tracking.end();
    }
  }
    
  /**
   * Finds similar interactions based on content analysis
   * @param {string} name - Name of the base interaction
   * @returns {Promise<Array>} Similar interactions
   */
  async findSimilar(name) {
    // Track this operation
    const tracking = logger.trackOperation ? 
      logger.trackOperation(this.objType, 'findSimilar') : 
      { end: () => {} };
    
    try {
      // Validate parameter
      const validationError = this._validateParams(
        { name },
        { name: 'string' }
      );
          
      if (validationError) return validationError;
      
      // Use cache for similarity results
      const similarCacheKey = `${this._cacheKeys.similar}_${name}`;
      
      return await this.cache.getOrFetch(
        similarCacheKey,
        async () => {
          // Get the interaction
          const interactionResp = await this.findByName(name);
          if (!interactionResp[0]) {
            return interactionResp;
          }
          
          const interaction = interactionResp[2][0];
          
          // Get all interactions
          const allObjectsResp = await this.getAll();
          if (!allObjectsResp[0]) {
            return allObjectsResp;
          }
          
          // Filter out the current interaction
          const otherInteractions = allObjectsResp[2].mrJson.filter(i => i.name !== name);
          
          // Compare by metadata similarity
          const similarities = otherInteractions.map(other => {
            let score = 0;
                  
            // Content type match
            if (other.content_type === interaction.content_type) score += 1;
                  
            // Similar length
            const sizeDiff = Math.abs(
              (other.file_size || 0) - (interaction.file_size || 0)
            ) / Math.max(other.file_size || 1, interaction.file_size || 1);
            score += (1 - sizeDiff);
                  
            // Similar reading time
            if (other.reading_time && interaction.reading_time) {
              const timeDiff = Math.abs(other.reading_time - interaction.reading_time) / 
                          Math.max(other.reading_time, interaction.reading_time);
              score += (1 - timeDiff);
            }
                  
            // Same company
            if (other.linked_companies && interaction.linked_companies) {
              const otherCompanies = Object.keys(other.linked_companies);
              const thisCompanies = Object.keys(interaction.linked_companies);
                      
              for (const company of thisCompanies) {
                if (otherCompanies.includes(company)) {
                  score += 2;
                  break;
                }
              }
            }
                  
            return {
              name: other.name,
              score,
              metadata: {
                content_type: other.content_type,
                file_size: other.file_size,
                reading_time: other.reading_time
              }
            };
          });
          
          // Sort by score and take top 5
          const topSimilar = similarities
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);
                  
          return this._createSuccess(
            `Found similar interactions for [${name}]`,
            topSimilar
          );
        },
        this.cacheTimeouts.similar || 600000,
        [
          this._cacheKeys.container,                // Depends on all interactions
          `${this._cacheKeys.byName}_${name}`       // Depends on this specific interaction
        ]
      );
    } catch (error) {
      return this._createError(
        `Error finding similar interactions: ${error.message}`,
        error,
        500
      );
    } finally {
      tracking.end();
    }
  }
  
  /**
   * Group interactions by common attributes
   * @param {string} attribute - Attribute to group by (e.g., 'content_type')
   * @returns {Promise<Array>} Grouped interactions
   */
  async groupBy(attribute) {
    // Track this operation
    const tracking = logger.trackOperation ? 
      logger.trackOperation(this.objType, 'groupBy') : 
      { end: () => {} };
    
    try {
      // Validate parameter
      const validationError = this._validateParams(
        { attribute },
        { attribute: 'string' }
      );
          
      if (validationError) return validationError;
      
      // Get all interactions
      const allResp = await this.getAll();
      if (!allResp[0]) {
        return allResp;
      }
      
      const interactions = allResp[2].mrJson;
      
      // Group by the specified attribute
      const groups = {};
      interactions.forEach(interaction => {
        const value = interaction[attribute] || 'unknown';
        if (!groups[value]) {
          groups[value] = [];
        }
        groups[value].push({
          name: interaction.name,
          content_type: interaction.content_type,
          file_size: interaction.file_size
        });
      });
      
      // Convert to array of groups
      const result = Object.entries(groups).map(([key, items]) => ({
        group: key,
        count: items.length,
        items
      }));
      
      return this._createSuccess(
        `Interactions grouped by ${attribute}`,
        result
      );
    } catch (error) {
      return this._createError(
        `Error grouping interactions: ${error.message}`,
        error,
        500
      );
    } finally {
      tracking.end();
    }
  }
}