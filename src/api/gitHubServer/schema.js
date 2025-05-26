/**
 * @fileoverview Schema validation for entities
 * @file schema.js
 * @license Apache-2.0
 * @version 3.0.0
 * 
 * @author Michael Hay <michael.hay@mediumroast.io>
 * @copyright 2025 Mediumroast, Inc. All rights reserved.
 */

// Add this import at the top of the file
import { isEmpty, isArray } from '../../utils/helpers.js';

export class SchemaValidator {
  constructor(schemas = {}) {
    this.schemas = schemas;
  }
    
  /**
   * Add or update schema
   * @param {string} entityType - Entity type
   * @param {Object} schema - Schema definition
   */
  setSchema(entityType, schema) {
    this.schemas[entityType] = schema;
  }
    
  /**
   * Validate object against schema
   * @param {string} entityType - Entity type
   * @param {Object} obj - Object to validate
   * @returns {Object} Validation result {valid, errors}
   */
  validate(entityType, obj) {
    const schema = this.schemas[entityType];
    if (!schema) {
      return { valid: true, errors: [] }; // No schema defined
    }
        
    const errors = [];
        
    // Check required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (isEmpty(obj[field])) {
          errors.push(`Required field [${field}] is missing`);
        }
      }
    }
        
    // Check field types
    if (schema.properties) {
      for (const [field, def] of Object.entries(schema.properties)) {
        if (obj[field] !== undefined) {
          if (def.type === 'string' && typeof obj[field] !== 'string') {
            errors.push(`Field [${field}] must be a string`);
          }
          else if (def.type === 'number' && typeof obj[field] !== 'number') {
            errors.push(`Field [${field}] must be a number`);
          }
          else if (def.type === 'boolean' && typeof obj[field] !== 'boolean') {
            errors.push(`Field [${field}] must be a boolean`);
          }
          else if (def.type === 'array' && !isArray(obj[field])) {
            errors.push(`Field [${field}] must be an array`);
          }
          else if (def.type === 'object' && (typeof obj[field] !== 'object' || obj[field] === null)) {
            errors.push(`Field [${field}] must be an object`);
          }
                    
          // Check enum values
          if (def.enum && !def.enum.includes(obj[field])) {
            errors.push(`Field [${field}] must be one of: ${def.enum.join(', ')}`);
          }
                    
          // Check pattern
          if (def.pattern && typeof obj[field] === 'string') {
            const regex = new RegExp(def.pattern);
            if (!regex.test(obj[field])) {
              errors.push(`Field [${field}] does not match required pattern`);
            }
          }
        }
      }
    }
        
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Define schemas
const schemas = {
  Companies: {
    required: ['name'],
    properties: {
      name: { type: 'string' },
      company_type: { 
        type: 'string',
        enum: ['Public', 'Private', 'Non-profit', 'Government', 'Educational']
      },
      status: {
        type: 'string',
        enum: ['Active', 'Inactive', 'Acquired', 'Merged', 'Bankrupt']
      },
      url: {
        type: 'string',
        pattern: '^https?://.+'
      }
      // Other fields...
    }
  },
  Interactions: {
    required: ['name'],
    properties: {
      name: { type: 'string' },
      content_type: { 
        type: 'string',
        enum: ['PDF', 'DOC', 'DOCX', 'TXT', 'HTML', 'PPT', 'PPTX', 'XLS', 'XLSX', 'CSV']
      },
      status: {
        type: 'string',
        enum: ['Draft', 'Published', 'Archived']
      },
      public: { type: 'boolean' }
      // Other fields...
    }
  },
  Studies: {
    required: ['name'],
    properties: {
      name: { type: 'string' },
      status: {
        type: 'string',
        enum: ['Active', 'Completed', 'Cancelled']
      },
      public: { type: 'boolean' }
      // Other fields...
    }
  }
};

// Create and export validator instance
export const validator = new SchemaValidator(schemas);