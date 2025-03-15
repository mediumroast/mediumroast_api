import GitHubFunctions from '../github.js';
import { CacheManager } from './cache.js';

// Create a singleton cache manager
const cacheManager = new CacheManager();

export class BaseObjects {
  constructor(token, org, processName, objType) {
    this.serverCtl = new GitHubFunctions(token, org, processName);
    this.objType = objType;
    this.objectFiles = {
      Studies: 'Studies.json',
      Companies: 'Companies.json',
      Interactions: 'Interactions.json',
      Users: null
    };
        
    // Define cache timeout configurations based on entity type
    this.cacheTimeouts = {
      Studies: 300000,     // 5 minutes for relatively static data
      Companies: 300000,   // 5 minutes
      Interactions: 180000, // 3 minutes as these may change more frequently
      Users: 600000,       // 10 minutes as user data rarely changes
      Actions: 60000,      // 1 minute as actions data changes frequently
      Storage: 180000      // 3 minutes
    };
        
    // Define field whitelists centrally
    this.whitelists = {
      Companies: [
        'description', 'company_type', 'url', 'role', 'wikipedia_url', 'status', 'logo_url',
        'region', 'country', 'city', 'state_province', 'zip_postal', 'street_address', 'latitude', 'longitude', 'phone',
        'google_maps_url', 'google_news_url', 'google_finance_url', 'google_patents_url',
        'cik', 'stock_symbol', 'stock_exchange', 'recent_10k_url', 'recent_10q_url', 'firmographic_url', 'filings_url', 'owner_tranasactions',
        'industry', 'industry_code', 'industry_group_code', 'industry_group_description', 'major_group_code', 'major_group_description'
      ],
      Interactions: [
        'status', 'content_type', 'file_size', 'reading_time', 'word_count', 'page_count', 'description', 'abstract',
        'region', 'country', 'city', 'state_province', 'zip_postal', 'street_address', 'latitude', 'longitude',
        'public', 'groups'
      ],
      Studies: [
        'description', 'status', 'public', 'groups'
      ]
    };
        
    // For transaction tracking
    this._transactionDepth = 0;
        
    // Use the shared cache manager
    this.cache = cacheManager;
  }

  /**
     * Invalidate cache entries when data is modified
     * @private
     */
  _invalidateCache() {
    // Invalidate container data
    this.cache.invalidate(`container_${this.objType}`);
        
    // Also invalidate GitHub.js cache if available
    if (this.serverCtl.invalidateCache) {
      this.serverCtl.invalidateCache(`container_${this.objType}`);
    }
  }
    
  // Rest of the base class implementation...
    
  /**
     * Get all objects with improved caching
     */
  async getAll() {
    return this.cache.getOrFetch(
      `container_${this.objType}`,
      async () => this.serverCtl.readObjects(this.objType),
      this.cacheTimeouts[this.objType] || 60000
    );
  }
}