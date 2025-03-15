import { BaseObjects } from '../baseObjects.js';
import { Interactions } from './interactions.js';

export class Companies extends BaseObjects {
  constructor(token, org, processName) {
    super(token, org, processName, 'Companies');
  }

  // Existing methods...

  /**
     * Generates company profile with analytics
     * @param {string} name - Company name
     * @returns {Promise<Array>} Company profile
     */
  async generateCompanyProfile(name) {
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
  }
}