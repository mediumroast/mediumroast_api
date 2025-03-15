/**
 * @fileoverview Studies entity for GitHubServer
 * @license Apache-2.0
 * @version 3.0.0
 * 
 * @author Michael Hay <michael.hay@mediumroast.io>
 * @copyright 2024 Mediumroast, Inc. All rights reserved.
 */

import { BaseObjects } from '../baseObjects.js';

export class Studies extends BaseObjects {
  /**
     * @constructor
     * @param {string} token - GitHub API token
     * @param {string} org - GitHub organization name
     * @param {string} processName - Process name for locking
     */
  constructor(token, org, processName) {
    super(token, org, processName, 'Studies');
  }

  /**
     * Delete a study
     * @param {string} objName - Study name to delete
     * @returns {Promise<Array>} Operation result
     */
  async deleteObj(objName) {
    const source = {
      from: 'Studies',
      to: ['Companies', 'Interactions']
    };
    return await this._executeTransaction([
      // Step 1: Catch containers
      async () => {
        let repoMetadata = {
          containers: {
            Studies: {},
            Companies: {},
            Interactions: {}
          }, 
          branch: {}
        };
        return this.serverCtl.catchContainer(repoMetadata);
      },
            
      // Step 2: Get study info
      async (data) => {
        const studyObj = await this.findByX('name', objName, data.containers.Studies.objects);
        if (!studyObj[0]) {
          return studyObj; // Will abort transaction
        }
                
        // Store linked objects for later steps
        this._tempStudy = studyObj[2][0];
        return this._createSuccess('Found study');
      },
            
      // Step 3: Delete study
      async (data) => {
        const deleteResult = await this.serverCtl.deleteObject(
          objName, 
          source, 
          data, 
          false
        );
                
        if (!deleteResult[0]) {
          return deleteResult; // Will abort transaction
        }
                
        return this._createSuccess('Deleted study object');
      },
            
      // Step 4: Release containers
      async (data) => {
        const result = await this.serverCtl.releaseContainer(data);
        if (result[0]) {
          this._invalidateCache();
        }
        return result;
      }
    ], `delete-study-${objName}`);
  }

  /**
     * Find studies by status
     * @param {string} status - Status to search for
     * @returns {Promise<Array>} Search results
     */
  async findByStatus(status) {
    return await this.findByX('status', status);
  }
    
  /**
     * Find studies by access type (public or private)
     * @param {boolean} isPublic - Whether to find public studies
     * @returns {Promise<Array>} Search results
     */
  async findByAccess(isPublic) {
    return await this.findByX('public', isPublic);
  }
    
  /**
     * Find studies by group
     * @param {string} group - Group name to search for
     * @returns {Promise<Array>} Search results
     */
  async findByGroup(group) {
    // Get all studies
    const allStudiesResp = await this.getAll();
    if (!allStudiesResp[0]) {
      return allStudiesResp;
    }
        
    const allStudies = allStudiesResp[2].mrJson;
        
    // Filter studies by group membership
    const results = allStudies.filter(study => 
      study.groups && study.groups.includes(group)
    );
        
    if (results.length === 0) {
      return this._createError(
        `No studies found in group [${group}]`,
        null,
        404
      );
    }
        
    return this._createSuccess(
      `Found ${results.length} studies in group [${group}]`,
      results
    );
  }
    
  /**
     * Adds an entity to a study
     * @param {string} studyName - Study name
     * @param {string} entityType - Entity type ('Interactions' or 'Companies')
     * @param {string} entityName - Entity name to add
     * @returns {Promise<Array>} Operation result
     */
  async addToStudy(studyName, entityType, entityName) {
    // Validate parameters
    if (!['Interactions', 'Companies'].includes(entityType)) {
      return this._createError(
        `Invalid entity type: [${entityType}]. Must be 'Interactions' or 'Companies'`,
        null,
        400
      );
    }
        
    return await this._executeTransaction([
      // Step 1: Catch containers
      async () => {
        let repoMetadata = {
          containers: {
            Studies: {},
            [entityType]: {}
          }, 
          branch: {}
        };
        return this.serverCtl.catchContainer(repoMetadata);
      },
            
      // Step 2: Find study and entity
      async (data) => {
        // Find study
        const studyResp = await this.findByX('name', studyName, data.containers.Studies.objects);
        if (!studyResp[0]) {
          return studyResp;
        }
                
        // Find entity
        const entityClass = new BaseObjects(
          this.serverCtl.token,
          this.serverCtl.orgName,
          'study-manager',
          entityType
        );
                
        const entityResp = await entityClass.findByX(
          'name', 
          entityName, 
          data.containers[entityType].objects
        );
                
        if (!entityResp[0]) {
          return this._createError(
            `${entityType} with name [${entityName}] not found`,
            null,
            404
          );
        }
                
        // Store for next step
        this._tempStudy = studyResp[2][0];
        this._tempEntity = entityResp[2][0];
        return this._createSuccess('Found study and entity');
      },
            
      // Step 3: Update study
      async (data) => {
        // Initialize linked entities field if needed
        const fieldName = `linked_${entityType.toLowerCase()}`;
        if (!this._tempStudy[fieldName]) {
          this._tempStudy[fieldName] = {};
        }
                
        // Add entity to study
        this._tempStudy[fieldName][entityName] = {
          linked_date: new Date().toISOString()
        };
                
        // Update study modification date
        this._tempStudy.modification_date = new Date().toISOString();
                
        // Update the study object in the container
        for (let i = 0; i < data.containers.Studies.objects.length; i++) {
          if (data.containers.Studies.objects[i].name === studyName) {
            data.containers.Studies.objects[i] = this._tempStudy;
            break;
          }
        }
                
        return this._createSuccess('Updated study with link to entity');
      },
            
      // Step 4: Update entity to reference study
      async (data) => {
        // Add study reference to entity
        const fieldName = 'linked_studies';
        if (!this._tempEntity[fieldName]) {
          this._tempEntity[fieldName] = {};
        }
                
        // Add study to entity
        this._tempEntity[fieldName][studyName] = {
          linked_date: new Date().toISOString()
        };
                
        // Update entity modification date
        this._tempEntity.modification_date = new Date().toISOString();
                
        // Update the entity object in the container
        for (let i = 0; i < data.containers[entityType].objects.length; i++) {
          if (data.containers[entityType].objects[i].name === entityName) {
            data.containers[entityType].objects[i] = this._tempEntity;
            break;
          }
        }
                
        return this._createSuccess('Updated entity with link to study');
      },
            
      // Step 5: Write study container
      async (data) => {
        const studySha = await this.serverCtl.getSha(
          'Studies', 
          this.objectFiles.Studies, 
          data.branch.name
        );
                
        if (!studySha[0]) {
          return studySha;
        }
                
        return await this.serverCtl.writeObject(
          'Studies',
          data.containers.Studies.objects,
          data.branch.name,
          studySha[2]
        );
      },
            
      // Step 6: Write entity container
      async (data) => {
        const entitySha = await this.serverCtl.getSha(
          entityType, 
          this.objectFiles[entityType], 
          data.branch.name
        );
                
        if (!entitySha[0]) {
          return entitySha;
        }
                
        return await this.serverCtl.writeObject(
          entityType,
          data.containers[entityType].objects,
          data.branch.name,
          entitySha[2]
        );
      },
            
      // Step 7: Release containers
      async (data) => {
        const result = await this.serverCtl.releaseContainer(data);
        if (result[0]) {
          this._invalidateCache();
                    
          // Also invalidate the other entity's cache
          this.cache.invalidate(`container_${entityType}`);
          if (this.serverCtl.invalidateCache) {
            this.serverCtl.invalidateCache(`container_${entityType}`);
          }
        }
        return result;
      }
    ], `add-to-study-${studyName}-${entityName}`);
  }
    
  /**
     * Gets a study summary with statistics
     * @param {string} studyName - Study name 
     * @returns {Promise<Array>} Study summary
     */
  async getStudySummary(studyName) {
    const studyResp = await this.findByName(studyName);
    if (!studyResp[0]) {
      return studyResp;
    }
        
    const study = studyResp[2][0];
        
    // Prepare summary statistics
    const summary = {
      name: study.name,
      description: study.description,
      status: study.status,
      creation_date: study.creation_date,
      modification_date: study.modification_date,
      statistics: {
        companies: {
          count: study.linked_companies ? Object.keys(study.linked_companies).length : 0,
          items: []
        },
        interactions: {
          count: study.linked_interactions ? Object.keys(study.linked_interactions).length : 0,
          byType: {},
          items: []
        },
        recentActivity: null
      }
    };
        
    // Track most recent activity
    if (study.modification_date) {
      summary.statistics.recentActivity = study.modification_date;
    }
        
    // If there are linked companies, get their details
    if (study.linked_companies && Object.keys(study.linked_companies).length > 0) {
      const companiesClass = new BaseObjects(
        this.serverCtl.token,
        this.serverCtl.orgName,
        'study-summarizer',
        'Companies'
      );
            
      const allCompaniesResp = await companiesClass.getAll();
      if (allCompaniesResp[0]) {
        const allCompanies = allCompaniesResp[2].mrJson;
                
        // Find companies linked to this study
        Object.keys(study.linked_companies).forEach(companyName => {
          const company = allCompanies.find(c => c.name === companyName);
          if (company) {
            summary.statistics.companies.items.push({
              name: company.name,
              description: company.description,
              company_type: company.company_type,
              linkedDate: study.linked_companies[companyName].linked_date
            });
                        
            // Update recent activity if company was modified more recently
            if (company.modification_date && 
                            (!summary.statistics.recentActivity || 
                             new Date(company.modification_date) > new Date(summary.statistics.recentActivity))) {
              summary.statistics.recentActivity = company.modification_date;
            }
          }
        });
      }
    }
        
    // If there are linked interactions, get their details
    if (study.linked_interactions && Object.keys(study.linked_interactions).length > 0) {
      const interactionsClass = new BaseObjects(
        this.serverCtl.token,
        this.serverCtl.orgName,
        'study-summarizer',
        'Interactions'
      );
            
      const allInteractionsResp = await interactionsClass.getAll();
      if (allInteractionsResp[0]) {
        const allInteractions = allInteractionsResp[2].mrJson;
                
        // Find interactions linked to this study
        Object.keys(study.linked_interactions).forEach(interactionName => {
          const interaction = allInteractions.find(i => i.name === interactionName);
          if (interaction) {
            // Track by content type
            if (interaction.content_type) {
              summary.statistics.interactions.byType[interaction.content_type] = 
                                (summary.statistics.interactions.byType[interaction.content_type] || 0) + 1;
            }
                        
            summary.statistics.interactions.items.push({
              name: interaction.name,
              description: interaction.description,
              content_type: interaction.content_type,
              file_size: interaction.file_size,
              linkedDate: study.linked_interactions[interactionName].linked_date
            });
                        
            // Update recent activity if interaction was modified more recently
            if (interaction.modification_date && 
                            (!summary.statistics.recentActivity || 
                             new Date(interaction.modification_date) > new Date(summary.statistics.recentActivity))) {
              summary.statistics.recentActivity = interaction.modification_date;
            }
          }
        });
      }
    }
        
    return this._createSuccess(
      `Generated summary for study [${studyName}]`,
      summary
    );
  }
}