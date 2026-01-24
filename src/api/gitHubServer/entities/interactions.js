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

  // Utility method to create standardized error responses for transaction steps
  _createError(message, details = null) {
    return [false, message, details];
  }

  /**
   * Override deleteObj to handle file deletion and company unlinking
   * @param {string} objName - Name of the interaction to delete
   * @param {Object} options - Options for deletion
   * @param {Object} options.useExistingContainer - If provided, use existing container metadata instead of catching
   * @returns {Promise<Array>} Operation result
   */
  async deleteObj(objName, options = {}) {
    // Track this operation
    const tracking = logger.trackOperation ? 
      logger.trackOperation(this.objType, 'deleteObj') : 
      { end: () => {} };
    
    try {
      // Validate parameters
      const validationError = this._validateParams(
        { objName },
        { objName: 'string' }
      );
          
      if (validationError) return validationError;
      
      // Check if we should use existing container metadata (for cross-entity operations)
      const useExistingContainer = options.useExistingContainer;
      
      // Use transaction pattern for safer operations
      let interactionContainerData = null;
      let companiesContainerData = null;
      let interactionToDelete = null;
      let repoMetadata = null;
      let shouldReleaseContainer = !useExistingContainer;
      
      return this._executeTransaction([
        // Step 1: Catch containers or use existing
        async () => {
          if (useExistingContainer) {
            logger.debug('Using existing container metadata for interaction deletion', {
              interactionName: objName
            });
            
            // Use provided container metadata
            repoMetadata = useExistingContainer;
            interactionContainerData = repoMetadata.containers.Interactions;
            companiesContainerData = repoMetadata.containers.Companies;
          } else {
            logger.debug('Catching containers for interaction deletion', {
              interactionName: objName,
              options
            });
            
            repoMetadata = {
              containers: {
                Interactions: {},
                Companies: {}
              }, 
              branch: {}
            };
            
            const containerResult = await this.serverCtl.catchContainer(repoMetadata);
            if (!containerResult[0]) {
              return containerResult;
            }
            
            // Extract container data
            repoMetadata = containerResult[2];
            interactionContainerData = repoMetadata.containers.Interactions;
            companiesContainerData = repoMetadata.containers.Companies;
          }
          
          // Find the interaction to delete
          const existingInteractions = interactionContainerData.objects || [];
          interactionToDelete = existingInteractions.find(i => i.name === objName);
          
          if (!interactionToDelete) {
            return this._createError(`Interaction not found: ${objName}`, null, 404);
          }
          
          return this._createSuccess('Container ready and interaction found');
        },
        
        // Step 2: Delete associated file with proper path handling
        async () => {
          if (interactionToDelete.url && interactionToDelete.url.startsWith('Interactions/')) {
            logger.debug('Deleting interaction file', {
              fileName: interactionToDelete.url,
              interactionName: objName
            });
            
            // Extract just the filename from the URL
            const fileName = interactionToDelete.url.replace('Interactions/', '');
            
            try {
              // Get file SHA using the correct path
              const fileResult = await this.serverCtl.getSha('Interactions', fileName, repoMetadata.branch.name);
              if (fileResult[0]) {
                const deleteResult = await this.serverCtl.deleteBlob(
                  'Interactions',
                  fileName,
                  repoMetadata.branch.name,
                  fileResult[2]
                );
                
                if (!deleteResult[0]) {
                  logger.error('Failed to delete interaction file', {
                    fileName,
                    error: deleteResult[1]
                  });
                  return deleteResult;
                }
                
                logger.debug('Successfully deleted interaction file', {
                  fileName,
                  interactionName: objName
                });
              } else {
                logger.warn('Could not get SHA for interaction file - may not exist', {
                  fileName,
                  branchName: repoMetadata.branch.name,
                  error: fileResult[1]
                });
                // Continue even if file doesn't exist - metadata deletion is still valid
              }
            } catch (error) {
              logger.error('Error during file deletion', {
                fileName,
                error: error.message
              });
              // Continue even if file deletion fails - metadata deletion is still important
            }
          } else {
            logger.debug('No file to delete for interaction', {
              interactionName: objName,
              url: interactionToDelete.url
            });
          }
          
          return this._createSuccess('File deletion completed');
        },
        
        // Step 3: Remove interaction from container
        async () => {
          logger.debug('Removing interaction from container', {
            interactionName: objName
          });
          
          const existingInteractions = interactionContainerData.objects || [];
          const filteredInteractions = existingInteractions.filter(i => i.name !== objName);
          
          const writeResult = await this.serverCtl.writeObject(
            'Interactions',
            filteredInteractions,
            repoMetadata.branch.name,
            interactionContainerData.objectSha
          );
          
          return writeResult;
        },
        
        // Step 4: Remove links from companies
        async (deleteResult) => {
          logger.debug('Removing interaction links from companies', {
            interactionName: objName
          });
          
          const existingCompanies = companiesContainerData.objects || [];
          let companiesModified = false;
          
          // Remove interaction links from all companies
          for (const company of existingCompanies) {
            if (company.linked_interactions && company.linked_interactions[objName]) {
              delete company.linked_interactions[objName];
              companiesModified = true;
            }
          }
          
          if (companiesModified) {
            const companiesWriteResult = await this.serverCtl.writeObject(
              'Companies',
              existingCompanies,
              repoMetadata.branch.name,
              companiesContainerData.objectSha
            );
            
            // Ensure proper response format validation
            if (!companiesWriteResult || !Array.isArray(companiesWriteResult)) {
              logger.error('Unexpected response format from writeObject for companies', {
                response: companiesWriteResult
              });
              
              // Check if this is a direct GitHub API response that indicates success
              if (companiesWriteResult && companiesWriteResult.content && companiesWriteResult.commit) {
                logger.debug('Detected successful GitHub API response format, converting to standard format');
                logger.debug('Successfully updated companies to remove interaction links', {
                  interactionName: objName
                });
                return deleteResult; // Continue with transaction
              }
              
              return this._createError('Invalid response format from companies write operation', companiesWriteResult);
            }
            
            if (companiesWriteResult.length < 3) {
              logger.error('Invalid response array length from writeObject for companies', {
                response: companiesWriteResult
              });
              return this._createError('Invalid response format from companies write operation', companiesWriteResult);
            }
            
            if (!companiesWriteResult[0]) {
              logger.error('Failed to write companies container during interaction deletion', {
                error: companiesWriteResult[1]
              });
              return companiesWriteResult;
            }
            
            logger.debug('Successfully updated companies to remove interaction links', {
              interactionName: objName
            });
          }
          
          return deleteResult;
        },
        
        // Step 5: Release containers (only if we caught them ourselves)
        async () => {
          if (shouldReleaseContainer) {
            logger.debug('Releasing containers after interaction deletion');
            
            const releaseResult = await this.serverCtl.releaseContainer(repoMetadata);
            if (!releaseResult[0]) {
              return releaseResult;
            }
            
            return this._createSuccess(
              `Successfully deleted interaction: ${objName}`,
              {
                deletedInteraction: interactionToDelete,
                containers: releaseResult[2]
              }
            );
          } else {
            logger.debug('Skipping container release - using external container management');
            
            return this._createSuccess(
              `Successfully deleted interaction: ${objName} (container managed externally)`,
              {
                deletedInteraction: interactionToDelete
              }
            );
          }
        }
      ], `delete-interaction-${objName}`);
      
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

  /**
   * Override createObj to handle file uploads and company linking
   * @param {Array} objs - Array of interaction objects to create
   * @param {Object} options - Options for creation including file handling
   * @returns {Promise<Array>} Operation result
   */
  async createObj(objs, options = {}) {
    // Track this operation
    const tracking = logger.trackOperation ? 
      logger.trackOperation(this.objType, 'createObj') : 
      { end: () => {} };
    
    try {
      // Validate parameters
      const validationError = this._validateParams(
        { objs },
        { objs: 'array' }
      );
          
      if (validationError) return validationError;
      
      logger.debug('Starting interaction creation', {
        interactionCount: objs.length,
        options
      });
      
      // Use transaction pattern for safer operations with both containers
      let interactionContainerData = null;
      let companiesContainerData = null;
      let branchInfo = null;
      let repoMetadata = null;
      
      return this._executeTransaction([
        // Step 1: Catch both containers (Interactions and Companies)
        async () => {
          logger.debug('Catching containers for interaction creation', {
            interactionCount: objs.length,
            hasFiles: objs.some(obj => obj.filePath)
          });
          
          repoMetadata = {
            containers: {
              Interactions: {},
              Companies: {}
            }, 
            branch: {}
          };
          
          const containerResult = await this.serverCtl.catchContainer(repoMetadata);
          if (!containerResult[0]) {
            return containerResult;
          }
          
          // Extract container data
          repoMetadata = containerResult[2];
          interactionContainerData = repoMetadata.containers.Interactions;
          companiesContainerData = repoMetadata.containers.Companies;
          branchInfo = repoMetadata.branch;
          
          return this._createSuccess(
            'Containers caught successfully',
            {
              interactions: interactionContainerData,
              companies: companiesContainerData,
              branch: branchInfo
            }
          );
        },
        
        // Step 2: Upload files if they exist
        // eslint-disable-next-line no-unused-vars
        async (_containerData) => {
          logger.debug('Uploading files for interactions', {
            interactionCount: objs.length
          });
          
          const fileUploadResults = [];
          
          for (const obj of objs) {
            if (obj.filePath && obj.fileName) {
              // Read file content
              const fs = await import('fs');
              const fileContent = fs.readFileSync(obj.filePath);
              const base64Content = fileContent.toString('base64');
              
              // Upload to Interactions directory
              const uploadResult = await this.serverCtl.writeBlob(
                'Interactions',
                obj.fileName,
                base64Content,
                branchInfo.name,
                null // No SHA for new files
              );
              
              if (!uploadResult[0]) {
                return uploadResult;
              }
              
              fileUploadResults.push({
                fileName: obj.fileName,
                result: uploadResult
              });
              
              // Set the URL in the interaction object
              obj.url = `Interactions/${obj.fileName}`;
            }
          }
          
          return this._createSuccess(
            `Files uploaded successfully: ${fileUploadResults.length}`,
            fileUploadResults
          );
        },
        
        // Step 3: Create interactions
        async (uploadResults) => {
          logger.debug('Creating interaction objects', {
            interactionCount: objs.length
          });
          
          // Get current interactions
          const existingInteractions = interactionContainerData.objects || [];
          
          // Add new interactions
          const updatedInteractions = [...existingInteractions, ...objs];
          
          // Write updated interactions
          const writeResult = await this.serverCtl.writeObject(
            'Interactions',
            updatedInteractions,
            branchInfo.name,
            interactionContainerData.objectSha
          );
          
          if (!writeResult[0]) {
            return writeResult;
          }
          
          return this._createSuccess(
            `Created ${objs.length} interactions successfully`,
            {
              interactions: writeResult[2],
              uploadResults: uploadResults[2]
            }
          );
        },
        
        // Step 4: Update company links
        async (creationResults) => {
          logger.debug('Updating company links', {
            interactionCount: objs.length
          });
          
          const companiesUpdateResults = [];
          
          // Get current companies
          const existingCompanies = companiesContainerData.objects || [];
          
          // Update companies with new interaction links
          for (const obj of objs) {
            if (obj.linked_companies && Object.keys(obj.linked_companies).length > 0) {
              for (const companyName of Object.keys(obj.linked_companies)) {
                const companyIndex = existingCompanies.findIndex(c => c.name === companyName);
                if (companyIndex !== -1) {
                  if (!existingCompanies[companyIndex].linked_interactions) {
                    existingCompanies[companyIndex].linked_interactions = {};
                  }
                  existingCompanies[companyIndex].linked_interactions[obj.name] = obj.linked_companies[companyName];
                  companiesUpdateResults.push({
                    company: companyName,
                    interaction: obj.name,
                    action: 'linked'
                  });
                }
              }
            }
          }
          
          // Write updated companies if any were modified
          if (companiesUpdateResults.length > 0) {
            const companiesWriteResult = await this.serverCtl.writeObject(
              'Companies',
              existingCompanies,
              branchInfo.name,
              companiesContainerData.objectSha
            );
            
            if (!companiesWriteResult[0]) {
              return companiesWriteResult;
            }
          }
          
          return this._createSuccess(
            `Updated company links: ${companiesUpdateResults.length}`,
            {
              interactions: creationResults[2],
              companyLinks: companiesUpdateResults
            }
          );
        },
        
        // Step 5: Release containers
        async (linkResults) => {
          logger.debug('Releasing containers after interaction creation');
          
          // Release containers using the complete repoMetadata
          const releaseResult = await this.serverCtl.releaseContainer(repoMetadata);
          if (!releaseResult[0]) {
            return releaseResult;
          }
          
          return this._createSuccess(
            `Successfully created ${objs.length} interactions with file uploads and company linking`,
            {
              interactions: linkResults[2],
              containers: releaseResult[2]
            }
          );
        }
      ], `create-interactions-${objs.length}`);
      
    } finally {
      tracking.end();
    }
  }

  /**
   * Override updateObj to handle file updates and company linking
   * @param {Object} objToUpdate - Interaction object to update
   * @param {Object} options - Options for update including file handling
   * @returns {Promise<Array>} Operation result
   */
  async updateObj(objToUpdate, options = {}) {
    // Track this operation
    const tracking = logger.trackOperation ? 
      logger.trackOperation(this.objType, 'updateObj') : 
      { end: () => {} };
    
    try {
      // Validate parameters
      const validationError = this._validateParams(
        { objToUpdate },
        { objToUpdate: 'object' }
      );
          
      if (validationError) return validationError;
      
      logger.debug('Starting interaction update', {
        interactionName: objToUpdate.name,
        options
      });
      
      // Use transaction pattern for safer operations
      let interactionContainerData = null;
      let companiesContainerData = null;
      let repoMetadata = null;
      
      return this._executeTransaction([
        // Step 1: Catch both containers
        async () => {
          logger.debug('Catching containers for interaction update', {
            interactionName: objToUpdate.name
          });
          
          repoMetadata = {
            containers: {
              Interactions: {},
              Companies: {}
            }, 
            branch: {}
          };
          
          const containerResult = await this.serverCtl.catchContainer(repoMetadata);
          if (!containerResult[0]) {
            return containerResult;
          }
          
          // Extract container data
          repoMetadata = containerResult[2];
          interactionContainerData = repoMetadata.containers.Interactions;
          companiesContainerData = repoMetadata.containers.Companies;
          
          return this._createSuccess('Containers caught successfully');
        },
        
        // Step 2: Update file if needed
        async () => {
          if (objToUpdate.filePath && objToUpdate.fileName) {
            logger.debug('Updating file for interaction', {
              fileName: objToUpdate.fileName
            });
            
            const fs = await import('fs');
            const fileContent = fs.readFileSync(objToUpdate.filePath);
            const base64Content = fileContent.toString('base64');
            
            // Get existing file SHA if it exists
            const existingFile = await this.serverCtl.getSha('Interactions', objToUpdate.fileName, repoMetadata.branch.name);
            const fileSha = existingFile[0] ? existingFile[2] : null;
            
            const uploadResult = await this.serverCtl.writeBlob(
              'Interactions',
              objToUpdate.fileName,
              base64Content,
              repoMetadata.branch.name,
              fileSha
            );
            
            if (!uploadResult[0]) {
              return uploadResult;
            }
            
            // Update URL in object
            objToUpdate.url = `Interactions/${objToUpdate.fileName}`;
          }
          
          return this._createSuccess('File updated successfully');
        },
        
        // Step 3: Update interaction
        async () => {
          logger.debug('Updating interaction object', {
            interactionName: objToUpdate.name
          });
          
          const existingInteractions = interactionContainerData.objects || [];
          const interactionIndex = existingInteractions.findIndex(i => i.name === objToUpdate.name);
          
          if (interactionIndex === -1) {
            return this._createError(`Interaction not found: ${objToUpdate.name}`, null, 404);
          }
          
          // Update the interaction
          existingInteractions[interactionIndex] = { ...existingInteractions[interactionIndex], ...objToUpdate };
          
          const writeResult = await this.serverCtl.writeObject(
            'Interactions',
            existingInteractions,
            repoMetadata.branch.name,
            interactionContainerData.objectSha
          );
          
          return writeResult;
        },
        
        // Step 4: Update company links if needed
        async (updateResult) => {
          if (objToUpdate.linked_companies) {
            logger.debug('Updating company links', {
              interactionName: objToUpdate.name
            });
            
            const existingCompanies = companiesContainerData.objects || [];
            let companiesModified = false;
            
            // Update company links
            for (const companyName of Object.keys(objToUpdate.linked_companies)) {
              const companyIndex = existingCompanies.findIndex(c => c.name === companyName);
              if (companyIndex !== -1) {
                if (!existingCompanies[companyIndex].linked_interactions) {
                  existingCompanies[companyIndex].linked_interactions = {};
                }
                existingCompanies[companyIndex].linked_interactions[objToUpdate.name] = objToUpdate.linked_companies[companyName];
                companiesModified = true;
              }
            }
            
            if (companiesModified) {
              const companiesWriteResult = await this.serverCtl.writeObject(
                'Companies',
                existingCompanies,
                repoMetadata.branch.name,
                companiesContainerData.objectSha
              );
              
              if (!companiesWriteResult[0]) {
                return companiesWriteResult;
              }
            }
          }
          
          return this._createSuccess('Company links updated successfully', updateResult);
        },
        
        // Step 5: Release containers
        async (result) => {
          logger.debug('Releasing containers after interaction update');
          
          const releaseResult = await this.serverCtl.releaseContainer(repoMetadata);
          if (!releaseResult[0]) {
            return releaseResult;
          }
          
          return this._createSuccess(
            `Successfully updated interaction: ${objToUpdate.name}`,
            {
              interaction: result[2],
              containers: releaseResult[2]
            }
          );
        }
      ], `update-interaction-${objToUpdate.name}`);
      
    } finally {
      tracking.end();
    }
  }

  /**
   * Bulk create interactions with file uploads
   * @param {Array} interactions - Array of interaction objects with file paths
   * @param {Object} options - Options for bulk creation
   * @returns {Promise<Array>} Operation result
   */
  async bulkCreateWithFiles(interactions, options = {}) {
    // Track this operation
    const tracking = logger.trackOperation ? 
      logger.trackOperation(this.objType, 'bulkCreateWithFiles') : 
      { end: () => {} };
    
    try {
      // Validate parameters
      const validationError = this._validateParams(
        { interactions },
        { interactions: 'array' }
      );
          
      if (validationError) return validationError;
      
      logger.info('Starting bulk create with files', {
        interactionCount: interactions.length,
        hasFiles: interactions.filter(i => i.filePath).length
      });
      
      // Use createObj which handles the full workflow
      return await this.createObj(interactions, options);
      
    } finally {
      tracking.end();
    }
  }
}