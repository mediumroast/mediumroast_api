/* eslint-disable no-console */
/**
 * GitHub Companies Manager - Complete CLI Implementation
 * 
 * This is a comprehensive CLI application for managing GitHub Companies data
 * using the Mediumroast API. It provides a full interactive interface for
 * creating, reading, updating, and deleting company information.
 * 
 * Features:
 * - Interactive menu-driven interface
 * - Two-step creation process (test companies first, then remaining)
 * - Comprehensive CRUD operations with transaction safety
 * - Company profile generation with analytics
 * - Safe deletion with verification and confirmation prompts
 * - Advanced update testing with whitelist validation
 * - Interaction linking capabilities
 * - Detailed error handling and user feedback
 * 
 * Usage:
 *   node companies-manager-cli.js
 * 
 * Prerequisites:
 *   - Complete the setup in github-getting-started.md
 *   - Configure your config.ini file
 *   - Set up repository with Companies container
 *   - Install dependencies: npm install inquirer configparser
 */

import { Companies } from 'mediumroast_api/src/api/gitHubServer.js';
import GitHubFunctions from 'mediumroast_api/src/api/github.js';
import ConfigParser from 'configparser';
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import { formatResult } from 'mediumroast_api/src/api/gitHubServer/utils/formatting.js';

class GitHubCompaniesManager {
  constructor(configPath = './config.ini') {
    this.config = new ConfigParser();
    this.config.read(configPath);
        
    this.token = this.config.get('GitHub', 'token');
    this.org = this.config.get('GitHub', 'org');
    this.sampleDataPath = this.config.get('GitHub', 'sampleDataPath') || 'sample_data/companies.json';
        
    this.companies = new Companies(this.token, this.org, 'companies-manager');
    this.github = new GitHubFunctions(this.token, this.org, 'companies-manager');
  }

  async initialize() {
    console.log('🏢 GitHub Companies Manager Starting...');
        
    // Perform pre-flight checks
    const prerequisites = await this.checkPrerequisites();
    if (!prerequisites) {
      console.error('❌ Prerequisites check failed. Please fix the issues above and try again.');
      return false;
    }
        
    // Load sample data
    this.sampleCompanies = await this.loadSampleData();
    if (!this.sampleCompanies) {
      console.warn('⚠️ No sample data available. Some operations may be limited.');
      this.sampleCompanies = [];
    }
        
    console.log('✅ Initialization complete');
    return true;
  }

  async checkPrerequisites() {
    console.log('🔍 Checking prerequisites...');
        
    try {
      // Check repository exists
      const repoResult = await this.github.getRepoSize();
      if (!repoResult[0]) {
        console.error('❌ Repository does not exist or is not accessible');
        console.error('   Please run the repository setup example first: node examples/github-repository.js');
        return false;
      }
      console.log('✅ Repository check: Available');
            
      // Check Companies container exists
      const containerResult = await this.github.getContent('Companies');
      if (!containerResult[0]) {
        console.error('❌ Companies container does not exist');
        console.error('   Please run the repository setup to create containers: node examples/github-repository.js');
        return false;
      }
      console.log('✅ Companies container check: Available');
            
      return true;
    } catch (error) {
      console.error('❌ Prerequisites check failed:', error.message);
      return false;
    }
  }

  async loadSampleData() {
    console.log('📄 Loading sample company data...');
        
    try {
      const fullPath = path.resolve(this.sampleDataPath);
      if (!fs.existsSync(fullPath)) {
        console.warn(`⚠️ Sample data file not found at: ${fullPath}`);
        return null;
      }
            
      const sampleData = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      console.log(`✅ Loaded ${sampleData.length} sample companies from ${this.sampleDataPath}`);
      return sampleData;
    } catch (error) {
      console.error('❌ Failed to load sample data:', error.message);
      return null;
    }
  }

  async showMainMenu() {
    const choices = [
      { name: '📋 List all companies', value: 'list' },
      { name: '🔍 Find company by name', value: 'find' },
      { name: '📊 Generate company profile', value: 'profile' },
      { name: '➕ Create companies (two-step process)', value: 'create' },
      { name: '✏️  Update company information', value: 'update' },
      { name: '🔗 Link interactions to company', value: 'link' },
      { name: '🗑️  Delete company', value: 'delete' },
      { name: '🧪 Run comprehensive tests', value: 'test' },
      { name: '📈 Company analytics', value: 'analytics' },
      { name: '🚪 Exit', value: 'exit' }
    ];

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: choices
      }
    ]);

    return action;
  }

  async executeAction(action) {
    switch (action) {
    case 'list':
      await this.listCompanies();
      break;
    case 'find':
      await this.findCompany();
      break;
    case 'profile':
      await this.generateProfile();
      break;
    case 'create':
      await this.createCompanies();
      break;
    case 'update':
      await this.updateCompany();
      break;
    case 'link':
      await this.linkInteractions();
      break;
    case 'delete':
      await this.deleteCompany();
      break;
    case 'test':
      await this.runComprehensiveTests();
      break;
    case 'analytics':
      await this.showAnalytics();
      break;
    case 'exit':
      console.log('👋 Goodbye!');
      return false;
    default:
      console.log('❓ Unknown action');
    }
    return true;
  }

  async listCompanies() {
    console.log('\n📋 Listing all companies...');
        
    const result = await this.companies.getAll();
    console.log(formatResult(result, 'Companies retrieved successfully'));
        
    if (result[0] && result[2] && result[2].mrJson) {
      const companies = result[2].mrJson;
      console.log(`\n📊 Found ${companies.length} companies:`);
            
      // Group by role
      const roleGroups = {};
      companies.forEach(company => {
        const role = company.role || 'No role';
        if (!roleGroups[role]) roleGroups[role] = [];
        roleGroups[role].push(company);
      });
            
      Object.entries(roleGroups).forEach(([role, companyList]) => {
        console.log(`\n🏷️  ${role} (${companyList.length}):`);
        companyList.forEach((company, index) => {
          const description = company.description ? 
            `${company.description.substring(0, 80)}...` : 
            'No description';
          console.log(`  ${index + 1}. ${company.name}`);
          console.log(`     Description: ${description}`);
          if (company.linked_interactions) {
            const linkedCount = Object.keys(company.linked_interactions).length;
            console.log(`     Linked interactions: ${linkedCount}`);
          }
        });
      });
    } else {
      console.log('❌ No companies found or error retrieving data');
    }
  }

  async findCompany() {
    console.log('\n🔍 Find company by name...');
        
    const { companyName } = await inquirer.prompt([
      {
        type: 'input',
        name: 'companyName',
        message: 'Enter company name to search for:',
        validate: input => input.trim().length > 0 || 'Company name is required'
      }
    ]);
        
    const result = await this.companies.findByName(companyName.trim());
    console.log(formatResult(result, 'Company search completed'));
        
    if (result[0] && result[2] && result[2].length > 0) {
      const company = result[2][0];
      console.log('\n✅ Company found:');
      console.log(`  Name: ${company.name}`);
      console.log(`  Role: ${company.role || 'No role'}`);
      console.log(`  Description: ${company.description || 'No description'}`);
      console.log(`  Region: ${company.region || 'No region'}`);
      console.log(`  Industry: ${company.industry || 'No industry'}`);
      console.log(`  URL: ${company.url || 'No URL'}`);
      console.log(`  Location: ${[company.city, company.state_province, company.country].filter(Boolean).join(', ') || 'No location'}`);
            
      if (company.linked_interactions && Object.keys(company.linked_interactions).length > 0) {
        const linkedCount = Object.keys(company.linked_interactions).length;
        console.log(`  Linked interactions: ${linkedCount}`);
      }
    } else {
      console.log('❌ Company not found');
    }
  }

  async generateProfile() {
    console.log('\n📊 Generate company profile...');
        
    // First get list of companies
    const allResult = await this.companies.getAll();
    if (!allResult[0] || !allResult[2]?.mrJson?.length) {
      console.log('❌ No companies available for profile generation');
      return;
    }
        
    const companies = allResult[2].mrJson;
    const choices = companies.map(company => ({
      name: `${company.name} (${company.role || 'No role'})`,
      value: company.name
    }));
        
    const { selectedCompany } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedCompany',
        message: 'Select a company to generate profile for:',
        choices: choices
      }
    ]);
        
    const result = await this.companies.generateCompanyProfile(selectedCompany);
    console.log(formatResult(result, 'Company profile generated successfully'));
        
    if (result[0] && result[2]) {
      const profile = result[2];
      console.log(`\n📋 Profile for: ${profile.name}`);
      console.log(`Description: ${profile.description || 'No description'}`);
            
      if (profile.analytics) {
        console.log('\n📈 Analytics:');
        console.log(`  Linked interactions: ${profile.analytics.interactionCount || 0}`);
        console.log(`  Total file size: ${profile.analytics.totalFileSize || 0} bytes`);
        console.log(`  Total word count: ${profile.analytics.totalWordCount || 0}`);
        console.log(`  Average reading time: ${profile.analytics.avgReadingTime || 0} minutes`);
                
        if (profile.analytics.contentTypes) {
          console.log('\n📊 Content types:');
          Object.entries(profile.analytics.contentTypes).forEach(([type, count]) => {
            console.log(`    ${type}: ${count} interactions`);
          });
        }
      }
            
      if (profile.interactionSummary && profile.interactionSummary.length > 0) {
        console.log('\n🔗 Linked interactions summary:');
        profile.interactionSummary.forEach((interaction, index) => {
          console.log(`  ${index + 1}. ${interaction.name} (${interaction.content_type})`);
          if (interaction.description) {
            console.log(`     ${interaction.description.substring(0, 100)}...`);
          }
        });
      }
    }
  }

  async createCompanies() {
    console.log('\n➕ Create companies (two-step process)...');
        
    if (!this.sampleCompanies || this.sampleCompanies.length === 0) {
      console.error('❌ No sample companies available. Please ensure sample data is loaded.');
      return;
    }
        
    console.log(`📄 Available sample companies: ${this.sampleCompanies.length}`);
        
    // Step 1: Create first 2 test companies
    const testCompanies = this.sampleCompanies.slice(0, 2);
    if (testCompanies.length > 0) {
      console.log(`\n🧪 Step 1: Create ${testCompanies.length} test companies`);
      testCompanies.forEach((company, index) => {
        console.log(`  ${index + 1}. ${company.name} (${company.role})`);
      });
            
      const { createTest } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'createTest',
          message: `Create ${testCompanies.length} test companies?`,
          default: true
        }
      ]);
            
      if (createTest) {
        await this.createCompaniesWithContainer(testCompanies, 'test companies');
      }
    }
        
    // Step 2: Create remaining companies
    const remainingCompanies = this.sampleCompanies.slice(2);
    if (remainingCompanies.length > 0) {
      console.log(`\n📦 Step 2: Create ${remainingCompanies.length} remaining companies`);
      remainingCompanies.slice(0, 5).forEach((company, index) => {
        console.log(`  ${index + 1}. ${company.name} (${company.role})`);
      });
      if (remainingCompanies.length > 5) {
        console.log(`  ... and ${remainingCompanies.length - 5} more`);
      }
            
      const { createRemaining } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'createRemaining',
          message: `Create ${remainingCompanies.length} remaining companies?`,
          default: false
        }
      ]);
            
      if (createRemaining) {
        await this.createCompaniesWithContainer(remainingCompanies, 'remaining companies');
      }
    }
  }

  async createCompaniesWithContainer(companiesToCreate, operationDescription) {
    console.log(`\n🚀 Starting ${operationDescription} creation using catch/write/release pattern...`);
    console.log('📝 Pattern: Catch containers → Add companies → Write containers → Release');
        
    const createResult = await this.companies.createObj(companiesToCreate);
        
    if (createResult[0]) {
      console.log(`✅ ${operationDescription} creation completed successfully!`);
      console.log(`✅ Created ${companiesToCreate.length} companies`);
            
      // Show summary of created companies
      console.log('\n📋 Created companies:');
      companiesToCreate.forEach((company, index) => {
        console.log(`  ${index + 1}. ${company.name} (${company.role})`);
      });
    } else {
      console.error(`❌ ${operationDescription} creation failed`);
      console.error(`Error: ${createResult[1]?.status_msg || createResult[1]}`);
    }
  }

  async updateCompany() {
    console.log('\n✏️  Update company information...');
        
    // Get list of companies to choose from
    const allResult = await this.companies.getAll();
    if (!allResult[0] || !allResult[2]?.mrJson?.length) {
      console.log('❌ No companies available for update');
      return;
    }
        
    const companies = allResult[2].mrJson;
    const choices = companies.map(company => ({
      name: `${company.name} (${company.role || 'No role'})`,
      value: company.name
    }));
        
    const { selectedCompany } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedCompany',
        message: 'Select a company to update:',
        choices: choices
      }
    ]);
        
    // Select field to update
    const updateFields = [
      { name: 'Description', value: 'description' },
      { name: 'Role', value: 'role' },
      { name: 'Status', value: 'status' },
      { name: 'Region', value: 'region' },
      { name: 'Industry', value: 'industry' },
      { name: 'URL', value: 'url' },
      { name: 'City', value: 'city' },
      { name: 'State/Province', value: 'state_province' },
      { name: 'Country', value: 'country' }
    ];
        
    const { fieldToUpdate } = await inquirer.prompt([
      {
        type: 'list',
        name: 'fieldToUpdate',
        message: 'Select field to update:',
        choices: updateFields
      }
    ]);
        
    const { newValue } = await inquirer.prompt([
      {
        type: 'input',
        name: 'newValue',
        message: `Enter new value for ${fieldToUpdate}:`,
        validate: input => input.trim().length > 0 || 'Value is required'
      }
    ]);
        
    console.log(`\n🔄 Updating ${selectedCompany}: ${fieldToUpdate} = "${newValue}"`);
    console.log('📝 Using catch/write/release pattern for safe update...');
        
    const updateResult = await this.companies.updateObj({
      name: selectedCompany,
      key: fieldToUpdate,
      value: newValue.trim()
    });
        
    console.log(formatResult(updateResult, 'Company update completed'));
        
    if (updateResult[0]) {
      console.log('✅ Update successful');
            
      // Verify the update
      const verifyResult = await this.companies.findByName(selectedCompany);
      if (verifyResult[0] && verifyResult[2] && verifyResult[2].length > 0) {
        const updatedCompany = verifyResult[2][0];
        const actualValue = updatedCompany[fieldToUpdate];
        const updateVerified = actualValue === newValue.trim();
                
        console.log(`✅ Verification: ${updateVerified ? 'Update confirmed' : 'Update verification failed'}`);
        if (updateVerified) {
          console.log(`   ${fieldToUpdate}: "${actualValue}"`);
        } else {
          console.log(`   Expected: "${newValue.trim()}"`);
          console.log(`   Actual: "${actualValue}"`);
        }
      }
    }
  }

  async linkInteractions() {
    console.log('\n🔗 Link interactions to company...');
        
    // Get list of companies
    const allResult = await this.companies.getAll();
    if (!allResult[0] || !allResult[2]?.mrJson?.length) {
      console.log('❌ No companies available');
      return;
    }
        
    const companies = allResult[2].mrJson;
    const choices = companies.map(company => ({
      name: `${company.name} (${company.role || 'No role'})`,
      value: company.name
    }));
        
    const { selectedCompany } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedCompany',
        message: 'Select company to link interactions to:',
        choices: choices
      }
    ]);
        
    // Create mock interactions for demonstration
    const mockInteractions = [
      {
        name: `Demo Meeting with ${selectedCompany}`,
        content_type: 'meeting',
        description: `Demonstration meeting interaction for ${selectedCompany} created via CLI`
      },
      {
        name: `Demo Document for ${selectedCompany}`,
        content_type: 'document', 
        description: `Demonstration document interaction for ${selectedCompany} created via CLI`
      }
    ];
        
    console.log('\n📋 Mock interactions to link:');
    mockInteractions.forEach((interaction, index) => {
      console.log(`  ${index + 1}. ${interaction.name} (${interaction.content_type})`);
    });
        
    const { confirmLink } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmLink',
        message: `Link ${mockInteractions.length} mock interactions to ${selectedCompany}?`,
        default: true
      }
    ]);
        
    if (confirmLink) {
      const linkResult = await this.companies.linkInteractions(selectedCompany, mockInteractions);
      console.log(formatResult(linkResult, 'Interaction linking completed'));
            
      if (linkResult[0]) {
        console.log(`✅ Successfully linked ${mockInteractions.length} interactions to ${selectedCompany}`);
                
        // Verify the linking
        const verifyResult = await this.companies.findByName(selectedCompany);
        if (verifyResult[0] && verifyResult[2] && verifyResult[2][0].linked_interactions) {
          const linkedCount = Object.keys(verifyResult[2][0].linked_interactions).length;
          console.log(`✅ Verification: Company now has ${linkedCount} linked interactions`);
        }
      }
    }
  }

  async deleteCompany() {
    console.log('\n🗑️  Delete company...');
        
    // Get list of companies
    const allResult = await this.companies.getAll();
    if (!allResult[0] || !allResult[2]?.mrJson?.length) {
      console.log('❌ No companies available for deletion');
      return;
    }
        
    const companies = allResult[2].mrJson;
    const initialCount = companies.length;
        
    console.log('⚠️  WARNING: DELETE operations are destructive and will permanently remove company data.');
    console.log(`📊 Current companies (${companies.length} total):`);
    companies.forEach((company, index) => {
      console.log(`  ${index + 1}. ${company.name} (${company.role || 'No role'})`);
    });
        
    const choices = companies.map(company => ({
      name: `${company.name} (${company.role || 'No role'})`,
      value: company.name
    }));
    choices.push({ name: '❌ Cancel deletion', value: 'cancel' });
        
    const { selectedCompany } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedCompany',
        message: 'Select company to delete:',
        choices: choices
      }
    ]);
        
    if (selectedCompany === 'cancel') {
      console.log('Deletion cancelled.');
      return;
    }
        
    // Show company details
    const targetCompany = companies.find(c => c.name === selectedCompany);
    console.log('\n📋 Company details:');
    console.log(`  Name: ${targetCompany.name}`);
    console.log(`  Role: ${targetCompany.role || 'No role'}`);
    console.log(`  Description: ${targetCompany.description ? targetCompany.description.substring(0, 100) + '...' : 'No description'}`);
        
    if (targetCompany.linked_interactions && Object.keys(targetCompany.linked_interactions).length > 0) {
      const linkedCount = Object.keys(targetCompany.linked_interactions).length;
      console.log(`  Linked interactions: ${linkedCount}`);
      console.log(`  ⚠️  Note: This deletion will only remove the company. ${linkedCount} linked interactions will remain.`);
    } else {
      console.log('  Linked interactions: 0');
    }
        
    // Double confirmation
    console.log(`\n⚠️  This will permanently delete: "${selectedCompany}"`);
    console.log('⚠️  This action cannot be undone!');
        
    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: `Are you absolutely sure you want to delete "${selectedCompany}"?`,
        default: false
      }
    ]);
        
    if (!confirmed) {
      console.log('Deletion cancelled by user.');
      return;
    }
        
    console.log(`\n🗑️ Deleting company: "${selectedCompany}"`);
    console.log('📝 Using catch/write/release pattern for safe deletion...');
    console.log('📝 Pattern: Catch containers → Delete object → Update references → Write containers → Release');
        
    const deleteResult = await this.companies.deleteObj(selectedCompany);
    console.log(formatResult(deleteResult, 'Company deletion completed'));
        
    if (deleteResult[0]) {
      console.log(`✅ Company "${selectedCompany}" has been deleted successfully.`);
            
      // Verify the deletion
      console.log('\n🔍 Verifying deletion by fetching updated company list...');
      const updatedResult = await this.companies.getAll();
            
      if (updatedResult[0] && updatedResult[2] && updatedResult[2].mrJson) {
        const updatedCompanies = updatedResult[2].mrJson;
        const finalCount = updatedCompanies.length;
        const stillExists = updatedCompanies.some(company => company.name === selectedCompany);
                
        console.log('\n✅ Deletion verification results:');
        console.log(`  Initial company count: ${initialCount}`);
        console.log(`  Final company count: ${finalCount}`);
        console.log(`  Companies removed: ${initialCount - finalCount}`);
        console.log(`  Target company "${selectedCompany}" still exists: ${stillExists ? '❌ YES (ERROR!)' : '✅ NO (SUCCESS)'}`);
                
        if (finalCount === initialCount - 1 && !stillExists) {
          console.log('\n✅ Deletion verified successfully!');
        } else {
          console.log('\n❌ Deletion verification failed!');
        }
      }
            
      // Try to find the deleted company (should fail)
      console.log(`\n🔍 Attempting to find deleted company "${selectedCompany}"...`);
      const findDeletedResult = await this.companies.findByName(selectedCompany);
      if (!findDeletedResult[0] || (findDeletedResult[2] && findDeletedResult[2].length === 0)) {
        console.log('✅ Confirmed: Deleted company cannot be found (expected behavior)');
      } else {
        console.log('❌ Unexpected: Deleted company was still found!');
      }
    }
  }

  async runComprehensiveTests() {
    console.log('\n🧪 Running comprehensive company operations tests...');
        
    const { runTests } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'runTests',
        message: 'This will run all CRUD operations tests. Continue?',
        default: true
      }
    ]);
        
    if (!runTests) {
      console.log('Tests cancelled.');
      return;
    }
        
    console.log('\n📋 Running test sequence:');
    console.log('  1. ✅ Read operations (safe)');
    console.log('  2. 🧪 Update operations with whitelist testing');
    console.log('  3. 🔗 Interaction linking test');
    console.log('  4. 📊 Profile generation test');
        
    // Test 1: Read operations
    console.log('\n1️⃣ Testing read operations...');
    const allResult = await this.companies.getAll();
    if (allResult[0] && allResult[2]?.mrJson?.length) {
      console.log(`✅ Read test passed: Found ${allResult[2].mrJson.length} companies`);
    } else {
      console.log('❌ Read test failed: No companies found');
      return;
    }
        
    // Test 2: Update operations with whitelist testing
    const companies = allResult[2].mrJson;
    const testCompany = companies[Math.floor(Math.random() * companies.length)];
        
    console.log(`\n2️⃣ Testing update operations on: "${testCompany.name}"`);
        
    // Test valid update (description is whitelisted)
    const timestamp = new Date().toISOString();
    const testDescription = `TEST UPDATE ${timestamp} - This description was updated during testing`;
        
    const validUpdate = await this.companies.updateObj({
      name: testCompany.name,
      key: 'description',
      value: testDescription
    });
        
    if (validUpdate[0]) {
      console.log('✅ Valid update test passed: Description update successful');
    } else {
      console.log('❌ Valid update test failed:', validUpdate[1]);
    }
        
    // Test invalid update (name is not whitelisted)
    const invalidUpdate = await this.companies.updateObj({
      name: testCompany.name,
      key: 'name',
      value: `${testCompany.name}_MODIFIED`
    });
        
    if (!invalidUpdate[0]) {
      console.log('✅ Invalid update test passed: Non-whitelisted field correctly rejected');
    } else {
      console.log('❌ Invalid update test failed: Non-whitelisted field was allowed');
    }
        
    // Test 3: Interaction linking
    console.log('\n3️⃣ Testing interaction linking...');
    const mockInteractions = [
      {
        name: `Test Interaction for ${testCompany.name}`,
        content_type: 'test',
        description: 'Test interaction created during comprehensive testing'
      }
    ];
        
    const linkResult = await this.companies.linkInteractions(testCompany.name, mockInteractions);
    if (linkResult[0]) {
      console.log('✅ Interaction linking test passed');
    } else {
      console.log('❌ Interaction linking test failed:', linkResult[1]);
    }
        
    // Test 4: Profile generation
    console.log('\n4️⃣ Testing profile generation...');
    const profileResult = await this.companies.generateCompanyProfile(testCompany.name);
    if (profileResult[0]) {
      console.log('✅ Profile generation test passed');
      if (profileResult[2]?.analytics) {
        console.log(`   Analytics included: ${JSON.stringify(profileResult[2].analytics, null, 2)}`);
      }
    } else {
      console.log('❌ Profile generation test failed:', profileResult[1]);
    }
        
    console.log('\n🎉 Comprehensive tests completed!');
  }

  async showAnalytics() {
    console.log('\n📈 Company analytics...');
        
    const allResult = await this.companies.getAll();
    if (!allResult[0] || !allResult[2]?.mrJson?.length) {
      console.log('❌ No companies available for analytics');
      return;
    }
        
    const companies = allResult[2].mrJson;
        
    // Basic statistics
    console.log('📊 Basic Statistics:');
    console.log(`  Total companies: ${companies.length}`);
        
    // Role distribution
    const roleGroups = {};
    companies.forEach(company => {
      const role = company.role || 'No role';
      roleGroups[role] = (roleGroups[role] || 0) + 1;
    });
        
    console.log('\n🏷️  Role distribution:');
    Object.entries(roleGroups).forEach(([role, count]) => {
      const percentage = ((count / companies.length) * 100).toFixed(1);
      console.log(`  ${role}: ${count} (${percentage}%)`);
    });
        
    // Region distribution
    const regionGroups = {};
    companies.forEach(company => {
      const region = company.region || 'No region';
      regionGroups[region] = (regionGroups[region] || 0) + 1;
    });
        
    console.log('\n🌍 Region distribution:');
    Object.entries(regionGroups).forEach(([region, count]) => {
      const percentage = ((count / companies.length) * 100).toFixed(1);
      console.log(`  ${region}: ${count} (${percentage}%)`);
    });
        
    // Interaction linking statistics
    let totalLinkedInteractions = 0;
    let companiesWithInteractions = 0;
        
    companies.forEach(company => {
      if (company.linked_interactions && Object.keys(company.linked_interactions).length > 0) {
        companiesWithInteractions++;
        totalLinkedInteractions += Object.keys(company.linked_interactions).length;
      }
    });
        
    console.log('\n🔗 Interaction linking statistics:');
    console.log(`  Companies with linked interactions: ${companiesWithInteractions} (${((companiesWithInteractions / companies.length) * 100).toFixed(1)}%)`);
    console.log(`  Total linked interactions: ${totalLinkedInteractions}`);
    console.log(`  Average interactions per company: ${(totalLinkedInteractions / companies.length).toFixed(1)}`);
    if (companiesWithInteractions > 0) {
      console.log(`  Average interactions per linked company: ${(totalLinkedInteractions / companiesWithInteractions).toFixed(1)}`);
    }
  }

  async run() {
    const initialized = await this.initialize();
    if (!initialized) {
      return;
    }
        
    let continueRunning = true;
    while (continueRunning) {
      try {
        console.log('\n' + '='.repeat(60));
        const action = await this.showMainMenu();
        continueRunning = await this.executeAction(action);
      } catch (error) {
        console.error('❌ An error occurred:', error.message);
        console.log('Continuing with menu...');
      }
    }
  }
}

// Usage
async function main() {
  const manager = new GitHubCompaniesManager();
  await manager.run();
}

// Run the application
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default GitHubCompaniesManager;
