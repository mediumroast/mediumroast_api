/**
 * Actions entity class for GitHub workflow operations
 * @file companies.js
 * @license Apache-2.0
 * @version 3.0.0
 * 
 * @author Michael Hay <michael.hay@mediumroast.io>
 * @copyright 2025 Mediumroast, Inc. All rights reserved.
 */


import { BaseObjects } from '../baseObjects.js';
import { Interactions } from './interactions.js';
import { logger } from '../logger.js';

export class Companies extends BaseObjects {
  constructor(token, org, processName) {
    super(token, org, processName, 'Companies');
    
    // Add profile-specific cache settings
    this._cacheKeys.profile = `${this.objType}_profile`;
    this.cacheTimeouts.profile = 600000; // 10 minutes for profiles
  }

  // Utility method to create standardized error responses for transaction steps
  _createError(message, details = null) {
    return [false, message, details];
  }

  /**
   * Generates company profile with analytics
   * @param {string} name - Company name
   * @returns {Promise<Array>} Company profile
   */
  async generateCompanyProfile(name) {
    // Track this operation
    const tracking = logger.trackOperation ? 
      logger.trackOperation(this.objType, 'generateCompanyProfile') : 
      { end: () => {} };
    
    // Validate parameter
    const validationError = this._validateParams(
      { name },
      { name: 'string' }
    );
        
    if (validationError) return validationError;
    
    try {
      // Use cache with dependency on both company and interactions data
      const profileCacheKey = `${this._cacheKeys.profile}_${name}`;
      
      return await this.cache.getOrFetch(
        profileCacheKey,
        async () => {
          // Find the company
          const companyResp = await this.findByName(name);
          if (!companyResp[0]) {
            return companyResp;
          }
          
          const company = companyResp[2][0];
          
          // Get linked interactions
          let linkedInteractionDetails = [];
          if (company.linked_interactions && Object.keys(company.linked_interactions).length > 0) {
            // Instantiate Interactions class to get details
            const interactionsClass = new Interactions(
              this.serverCtl.token,
              this.serverCtl.orgName,
              'profile-generator'
            );
                
            // Get details for each interaction
            for (const interactionName of Object.keys(company.linked_interactions)) {
              const interactionResp = await interactionsClass.findByName(interactionName);
              if (interactionResp[0]) {
                linkedInteractionDetails.push(interactionResp[2][0]);
              }
            }
          }
          
          // Analyze the interactions
          const analytics = {
            interactionCount: linkedInteractionDetails.length,
            contentTypes: {},
            totalFileSize: 0,
            avgReadingTime: 0,
            totalWordCount: 0,
            avgPageCount: 0,
            lastModified: null,
            oldestInteraction: null
          };
          
          // Process each interaction
          linkedInteractionDetails.forEach(interaction => {
            // Track content types
            analytics.contentTypes[interaction.content_type] = 
              (analytics.contentTypes[interaction.content_type] || 0) + 1;
                    
            // Track file sizes
            if (interaction.file_size) {
              analytics.totalFileSize += interaction.file_size;
            }
                
            // Track reading time
            if (interaction.reading_time) {
              analytics.avgReadingTime += interaction.reading_time;
            }
                
            // Track word count
            if (interaction.word_count) {
              analytics.totalWordCount += interaction.word_count;
            }
                
            // Track page count
            if (interaction.page_count) {
              analytics.avgPageCount += interaction.page_count;
            }
                
            // Track modification dates
            const modDate = new Date(interaction.modification_date);
            if (!analytics.lastModified || modDate > new Date(analytics.lastModified)) {
              analytics.lastModified = interaction.modification_date;
            }
                
            if (!analytics.oldestInteraction || modDate < new Date(analytics.oldestInteraction)) {
              analytics.oldestInteraction = interaction.modification_date;
            }
          });
          
          // Calculate averages
          if (linkedInteractionDetails.length > 0) {
            analytics.avgReadingTime /= linkedInteractionDetails.length;
            analytics.avgPageCount /= linkedInteractionDetails.length;
          }
          
          // Create company profile
          const profile = {
            ...company,
            analytics,
            interactionSummary: linkedInteractionDetails.map(i => ({
              name: i.name,
              content_type: i.content_type,
              file_size: i.file_size,
              modification_date: i.modification_date,
              description: i.description
            }))
          };
          
          return this._createSuccess(
            `Generated profile for company [${name}]`,
            profile
          );
        },
        this.cacheTimeouts.profile,
        [
          this._cacheKeys.container,                // Depends on company data
          'container_Interactions'                 // Depends on interaction data
        ]
      );
    } catch (error) {
      return this._createError(
        `Error generating company profile: ${error.message}`,
        error,
        500
      );
    } finally {
      tracking.end();
    }
  }
  
  /**
   * Link interactions to a company
   * @param {string} companyName - Name of the company
   * @param {Array<Object>} interactions - Interactions to link
   * @returns {Promise<Array>} Result of the operation
   */
  async linkInteractions(companyName, interactions) {
    // Track this operation
    const tracking = logger.trackOperation ? 
      logger.trackOperation(this.objType, 'linkInteractions') : 
      { end: () => {} };
    
    try {
      // Validate parameters
      const validationError = this._validateParams(
        { companyName, interactions },
        { companyName: 'string', interactions: 'array' }
      );
          
      if (validationError) return validationError;
      
      // Create linked objects hash
      const linkedInteractions = this.linkObj(interactions);
      
      // Update the company with linked interactions
      return await this.updateObj({
        name: companyName,
        key: 'linked_interactions',
        value: linkedInteractions
      });
      
    } catch (error) {
      return this._createError(
        `Error linking interactions to company: ${error.message}`,
        error,
        500
      );
    } finally {
      tracking.end();
    }
  }
  
  /**
   * Override deleteObj to handle cross-entity references and linked interactions
   * @param {string} objName - Name of the company to delete
   * @param {Object} options - Options for deletion
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
      
      // Use transaction pattern for safer operations with SINGLE container lock
      let companyContainerData = null;
      let interactionsContainerData = null;
      let companyToDelete = null;
      let linkedInteractionsToDelete = [];
      let repoMetadata = null;
      
      return this._executeTransaction([
        // Step 1: Catch BOTH containers at once - prevents double locking
        async () => {
          logger.debug('Catching containers for company deletion', {
            companyName: objName,
            options
          });
          
          repoMetadata = {
            containers: {
              Companies: {},
              Interactions: {}
            }, 
            branch: {}
          };
          
          const containerResult = await this.serverCtl.catchContainer(repoMetadata);
          if (!containerResult[0]) {
            return containerResult;
          }
          
          // Extract container data
          repoMetadata = containerResult[2];
          companyContainerData = repoMetadata.containers.Companies;
          interactionsContainerData = repoMetadata.containers.Interactions;
          
          // Find the company to delete
          const existingCompanies = companyContainerData.objects || [];
          companyToDelete = existingCompanies.find(c => c.name === objName);
          
          if (!companyToDelete) {
            return this._createError(`Company not found: ${objName}`, null, 404);
          }
          
          // Find linked interactions that should be deleted with company
          if (companyToDelete.linked_interactions && Object.keys(companyToDelete.linked_interactions).length > 0) {
            const existingInteractions = interactionsContainerData.objects || [];
            linkedInteractionsToDelete = existingInteractions.filter(i => 
              companyToDelete.linked_interactions[i.name]
            );
            
            logger.debug('Found linked interactions to delete with company', {
              companyName: objName,
              linkedInteractions: linkedInteractionsToDelete.map(i => i.name)
            });
          }
          
          return this._createSuccess('Containers caught and company found');
        },
        
        // Step 2: Delete linked interaction files
        async () => {
          let filesDeleted = 0;
          
          for (const interaction of linkedInteractionsToDelete) {
            if (interaction.url && interaction.url.startsWith('Interactions/')) {
              logger.debug('Deleting interaction file for company deletion', {
                fileName: interaction.url,
                interactionName: interaction.name
              });
              
              const fileName = interaction.url.replace('Interactions/', '');
              
              // Get file SHA
              const fileResult = await this.serverCtl.getSha('Interactions', fileName, repoMetadata.branch.name);
              if (fileResult[0]) {
                const deleteResult = await this.serverCtl.deleteBlob(
                  'Interactions',
                  fileName,
                  repoMetadata.branch.name,
                  fileResult[2]
                );
                
                if (deleteResult[0]) {
                  filesDeleted++;
                } else {
                  logger.warn('Failed to delete interaction file during company deletion', {
                    fileName,
                    error: deleteResult[1]
                  });
                }
              }
            }
          }
          
          return this._createSuccess(`Deleted ${filesDeleted} interaction files`);
        },
        
        // Step 3: Remove company from companies container
        async () => {
          logger.debug('Removing company from container', {
            companyName: objName
          });
          
          const existingCompanies = companyContainerData.objects || [];
          const filteredCompanies = existingCompanies.filter(c => c.name !== objName);
          
          const writeResult = await this.serverCtl.writeObject(
            'Companies',
            filteredCompanies,
            repoMetadata.branch.name,
            companyContainerData.objectSha
          );
          
          // Ensure proper response format
          if (!writeResult || !Array.isArray(writeResult) || writeResult.length < 3) {
            logger.error('Invalid response format from writeObject for companies', {
              response: writeResult
            });
            return this._createError('Invalid response format from companies write operation', writeResult);
          }
          
          if (!writeResult[0]) {
            logger.error('Failed to write companies container', {
              error: writeResult[1]
            });
            return writeResult;
          }
          
          return writeResult;
        },
        
        // Step 4: Remove linked interactions from interactions container
        async (deleteResult) => {
          if (linkedInteractionsToDelete.length > 0) {
            logger.debug('Removing linked interactions from container', {
              companyName: objName,
              interactionsToDelete: linkedInteractionsToDelete.map(i => i.name)
            });
            
            const existingInteractions = interactionsContainerData.objects || [];
            const interactionNamesToDelete = new Set(linkedInteractionsToDelete.map(i => i.name));
            const filteredInteractions = existingInteractions.filter(i => !interactionNamesToDelete.has(i.name));
            
            const interactionsWriteResult = await this.serverCtl.writeObject(
              'Interactions',
              filteredInteractions,
              repoMetadata.branch.name,
              interactionsContainerData.objectSha
            );
            
            // Ensure proper response format
            if (!interactionsWriteResult || !Array.isArray(interactionsWriteResult)) {
              logger.error('Unexpected response format from writeObject for interactions', {
                response: interactionsWriteResult
              });
              
              // Check if this is a direct GitHub API response that indicates success
              if (interactionsWriteResult && interactionsWriteResult.content && interactionsWriteResult.commit) {
                logger.debug('Detected successful GitHub API response format, converting to standard format');
                return deleteResult; // Continue with transaction
              }
              
              return this._createError('Invalid response format from interactions write operation', interactionsWriteResult);
            }
            
            if (interactionsWriteResult.length < 3) {
              logger.error('Invalid response array length from writeObject for interactions', {
                response: interactionsWriteResult
              });
              return this._createError('Invalid response format from interactions write operation', interactionsWriteResult);
            }
            
            if (!interactionsWriteResult[0]) {
              logger.error('Failed to write interactions container', {
                error: interactionsWriteResult[1]
              });
              return interactionsWriteResult;
            }
            
            logger.debug('Successfully removed linked interactions', {
              companyName: objName,
              removedCount: linkedInteractionsToDelete.length
            });
          }
          
          return deleteResult;
        },
        
        // Step 5: Release containers (single release for both)
        async () => {
          logger.debug('Releasing containers after company deletion');
          
          const releaseResult = await this.serverCtl.releaseContainer(repoMetadata);
          if (!releaseResult[0]) {
            return releaseResult;
          }
          
          return this._createSuccess(
            `Successfully deleted company: ${objName} and ${linkedInteractionsToDelete.length} linked interactions`,
            {
              deletedCompany: companyToDelete,
              deletedInteractions: linkedInteractionsToDelete,
              containers: releaseResult[2]
            }
          );
        }
      ], `delete-company-${objName}`);
      
    } finally {
      tracking.end();
    }
  }
}