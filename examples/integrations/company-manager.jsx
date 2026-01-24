/**
 * GitHub Companies Manager - React Component
 * 
 * A comprehensive React component for managing GitHub Companies data
 * using the Mediumroast API. This component provides a full web interface
 * for company management operations.
 * 
 * Features:
 * - Real-time company listing and monitoring
 * - Interactive forms for company creation and editing
 * - Company profile generation with analytics visualization
 * - Role-based filtering and grouping
 * - Safe deletion with confirmation dialogs
 * - Interaction linking capabilities
 * - Comprehensive error handling with user-friendly messages
 * - Responsive design with loading states
 * 
 * Props:
 *   - token: GitHub personal access token
 *   - org: GitHub organization name
 * 
 * Usage:
 *   <CompanyManager token="your-token" org="your-org" />
 * 
 * Prerequisites:
 *   - Complete the setup in github-getting-started.md
 *   - Install React and required dependencies
 *   - Include the accompanying CSS file
 *   - Set up repository with Companies container
 */

/* eslint-disable react/prop-types */
import React, { useState, useEffect } from 'react';
import { Companies } from 'mediumroast_api/src/api/gitHubServer.js';
import GitHubFunctions from 'mediumroast_api/src/api/github.js';

const CompanyManager = ({ token, org }) => {
    const [companies, setCompanies] = useState(null);
    const [github, setGitHub] = useState(null);
    const [companyList, setCompanyList] = useState([]);
    const [filteredCompanies, setFilteredCompanies] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [installationStatus, setInstallationStatus] = useState(null);
    const [filters, setFilters] = useState({
        role: 'all',
        region: 'all',
        search: ''
    });
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showUpdateForm, setShowUpdateForm] = useState(false);
    const [companyProfile, setCompanyProfile] = useState(null);

    // Initialize clients
    useEffect(() => {
        if (token && org) {
            const companiesClient = new Companies(token, org, 'company-manager-react');
            const githubClient = new GitHubFunctions(token, org, 'company-manager-react');
            setCompanies(companiesClient);
            setGitHub(githubClient);
        }
    }, [token, org]);

    // Check prerequisites
    useEffect(() => {
        if (github) {
            checkPrerequisites();
        }
    }, [github]);

    // Load companies
    useEffect(() => {
        if (companies && installationStatus?.canProceed) {
            loadCompanies();
        }
    }, [companies, installationStatus]);

    // Apply filters
    useEffect(() => {
        applyFilters();
    }, [companyList, filters]);

    const checkPrerequisites = async () => {
        setLoading(true);
        setError(null);
        
        try {
            // Check repository exists
            const repoResult = await github.getRepoSize();
            if (!repoResult[0]) {
                setInstallationStatus({
                    canProceed: false,
                    error: 'Repository does not exist or is not accessible',
                    suggestion: 'Please run the repository setup example first'
                });
                return;
            }

            // Check Companies container exists
            const containerResult = await github.getContent('Companies');
            if (!containerResult[0]) {
                setInstallationStatus({
                    canProceed: false,
                    error: 'Companies container does not exist',
                    suggestion: 'Please run the repository setup to create containers'
                });
                return;
            }

            setInstallationStatus({
                canProceed: true,
                repository: { exists: true },
                container: { exists: true }
            });
        } catch (error) {
            setInstallationStatus({
                canProceed: false,
                error: error.message,
                suggestion: 'Check your GitHub credentials and permissions'
            });
        } finally {
            setLoading(false);
        }
    };

    const loadCompanies = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const result = await companies.getAll();
            if (result[0] && result[2] && result[2].mrJson) {
                setCompanyList(result[2].mrJson);
            } else {
                setError('Failed to load companies: ' + (result[1]?.status_msg || result[1]));
            }
        } catch (error) {
            setError('Error loading companies: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...companyList];

        // Filter by role
        if (filters.role !== 'all') {
            filtered = filtered.filter(company => 
                (company.role || 'No role') === filters.role
            );
        }

        // Filter by region
        if (filters.region !== 'all') {
            filtered = filtered.filter(company => 
                (company.region || 'No region') === filters.region
            );
        }

        // Filter by search
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(company =>
                company.name.toLowerCase().includes(searchLower) ||
                (company.description && company.description.toLowerCase().includes(searchLower)) ||
                (company.role && company.role.toLowerCase().includes(searchLower))
            );
        }

        setFilteredCompanies(filtered);
    };

    const generateProfile = async (companyName) => {
        setLoading(true);
        setError(null);
        
        try {
            const result = await companies.generateCompanyProfile(companyName);
            if (result[0] && result[2]) {
                setCompanyProfile(result[2]);
            } else {
                setError('Failed to generate profile: ' + (result[1]?.status_msg || result[1]));
            }
        } catch (error) {
            setError('Error generating profile: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const createCompany = async (companyData) => {
        setLoading(true);
        setError(null);
        
        try {
            const result = await companies.createObj([companyData]);
            if (result[0]) {
                await loadCompanies(); // Refresh the list
                setShowCreateForm(false);
                return { success: true };
            } else {
                setError('Failed to create company: ' + (result[1]?.status_msg || result[1]));
                return { success: false, error: result[1] };
            }
        } catch (error) {
            const errorMsg = 'Error creating company: ' + error.message;
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setLoading(false);
        }
    };

    const updateCompany = async (companyName, field, value) => {
        setLoading(true);
        setError(null);
        
        try {
            const result = await companies.updateObj({
                name: companyName,
                key: field,
                value: value
            });
            
            if (result[0]) {
                await loadCompanies(); // Refresh the list
                setShowUpdateForm(false);
                return { success: true };
            } else {
                setError('Failed to update company: ' + (result[1]?.status_msg || result[1]));
                return { success: false, error: result[1] };
            }
        } catch (error) {
            const errorMsg = 'Error updating company: ' + error.message;
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setLoading(false);
        }
    };

    const deleteCompany = async (companyName) => {
        if (!window.confirm(`Are you absolutely sure you want to delete "${companyName}"? This action cannot be undone.`)) {
            return { success: false, cancelled: true };
        }

        setLoading(true);
        setError(null);
        
        try {
            const result = await companies.deleteObj(companyName);
            if (result[0]) {
                await loadCompanies(); // Refresh the list
                setSelectedCompany(null);
                return { success: true };
            } else {
                setError('Failed to delete company: ' + (result[1]?.status_msg || result[1]));
                return { success: false, error: result[1] };
            }
        } catch (error) {
            const errorMsg = 'Error deleting company: ' + error.message;
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setLoading(false);
        }
    };

    const linkInteractions = async (companyName, interactions) => {
        setLoading(true);
        setError(null);
        
        try {
            const result = await companies.linkInteractions(companyName, interactions);
            if (result[0]) {
                await loadCompanies(); // Refresh the list
                return { success: true };
            } else {
                setError('Failed to link interactions: ' + (result[1]?.status_msg || result[1]));
                return { success: false, error: result[1] };
            }
        } catch (error) {
            const errorMsg = 'Error linking interactions: ' + error.message;
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setLoading(false);
        }
    };

    const getRoleOptions = () => {
        const roles = [...new Set(companyList.map(c => c.role || 'No role'))];
        return ['all', ...roles.sort()];
    };

    const getRegionOptions = () => {
        const regions = [...new Set(companyList.map(c => c.region || 'No region'))];
        return ['all', ...regions.sort()];
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString();
    };

    const getStatusBadge = (role) => {
        const badgeClasses = {
            'Competitor': 'badge-danger',
            'Partner': 'badge-success',
            'Customer': 'badge-info',
            'Owner': 'badge-warning',
            'No role': 'badge-secondary'
        };
        
        return badgeClasses[role] || 'badge-secondary';
    };

    // Installation status check
    if (!installationStatus) {
        return (
            <div className="company-manager">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Checking prerequisites...</p>
                </div>
            </div>
        );
    }

    if (!installationStatus.canProceed) {
        return (
            <div className="company-manager">
                <div className="error-panel">
                    <h3>⚠️ Setup Required</h3>
                    <p><strong>Error:</strong> {installationStatus.error}</p>
                    <p><strong>Solution:</strong> {installationStatus.suggestion}</p>
                    
                    <div className="installation-help">
                        <h4>Setup Steps:</h4>
                        <ol>
                            <li>Run the repository setup: <code>node examples/github-repository.js</code></li>
                            <li>Ensure Companies container exists</li>
                            <li>Verify GitHub credentials and permissions</li>
                            <li>Refresh this page</li>
                        </ol>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="company-manager">
            <div className="header">
                <div>
                    <h2>🏢 Companies Manager</h2>
                    <p>Manage company data for organization: <strong>{org}</strong></p>
                </div>
                <div className="header-actions">
                    <button 
                        className="btn btn-primary" 
                        onClick={() => setShowCreateForm(true)}
                        disabled={loading}
                    >
                        ➕ Add Company
                    </button>
                    <button 
                        className="btn btn-secondary" 
                        onClick={() => loadCompanies()}
                        disabled={loading}
                    >
                        🔄 Refresh
                    </button>
                </div>
            </div>

            {error && (
                <div className="error-alert">
                    <span className="error-icon">⚠️</span>
                    <span>{error}</span>
                    <button className="btn-close" onClick={() => setError(null)}>×</button>
                </div>
            )}

            {loading && (
                <div className="loading-bar">
                    <div className="loading-progress"></div>
                </div>
            )}

            <div className="filters-section">
                <h3>🔍 Filters</h3>
                <div className="filters-grid">
                    <div className="filter-group">
                        <label>Role:</label>
                        <select 
                            value={filters.role} 
                            onChange={(e) => setFilters({...filters, role: e.target.value})}
                        >
                            {getRoleOptions().map(role => (
                                <option key={role} value={role}>
                                    {role === 'all' ? 'All Roles' : role}
                                </option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="filter-group">
                        <label>Region:</label>
                        <select 
                            value={filters.region} 
                            onChange={(e) => setFilters({...filters, region: e.target.value})}
                        >
                            {getRegionOptions().map(region => (
                                <option key={region} value={region}>
                                    {region === 'all' ? 'All Regions' : region}
                                </option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="filter-group">
                        <label>Search:</label>
                        <input 
                            type="text" 
                            placeholder="Search companies..."
                            value={filters.search}
                            onChange={(e) => setFilters({...filters, search: e.target.value})}
                        />
                    </div>
                </div>
            </div>

            <div className="company-content">
                <div className="companies-panel">
                    <h3>📋 Companies ({filteredCompanies.length})</h3>
                    
                    {filteredCompanies.length === 0 ? (
                        <div className="empty-state">
                            <p>No companies found matching the current filters.</p>
                            <button className="btn btn-primary" onClick={() => setShowCreateForm(true)}>
                                Create First Company
                            </button>
                        </div>
                    ) : (
                        <div className="companies-list">
                            {filteredCompanies.map((company) => (
                                <div 
                                    key={company.name} 
                                    className={`company-item ${selectedCompany?.name === company.name ? 'active' : ''}`}
                                    onClick={() => setSelectedCompany(company)}
                                >
                                    <div className="company-header">
                                        <h4>{company.name}</h4>
                                        <span className={`badge ${getStatusBadge(company.role || 'No role')}`}>
                                            {company.role || 'No role'}
                                        </span>
                                    </div>
                                    
                                    <div className="company-details">
                                        <p><strong>Region:</strong> {company.region || 'No region'}</p>
                                        <p><strong>Industry:</strong> {company.industry || 'No industry'}</p>
                                        <p><strong>Description:</strong> {
                                            company.description 
                                                ? company.description.substring(0, 100) + '...'
                                                : 'No description'
                                        }</p>
                                        {company.linked_interactions && (
                                            <p><strong>Linked Interactions:</strong> {Object.keys(company.linked_interactions).length}</p>
                                        )}
                                    </div>
                                    
                                    <div className="company-actions">
                                        <button 
                                            className="btn btn-sm btn-outline" 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                generateProfile(company.name);
                                            }}
                                            disabled={loading}
                                        >
                                            📊 Profile
                                        </button>
                                        <button 
                                            className="btn btn-sm btn-secondary" 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedCompany(company);
                                                setShowUpdateForm(true);
                                            }}
                                            disabled={loading}
                                        >
                                            ✏️ Edit
                                        </button>
                                        <button 
                                            className="btn btn-sm btn-danger" 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteCompany(company.name);
                                            }}
                                            disabled={loading}
                                        >
                                            🗑️ Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {selectedCompany && (
                    <div className="company-details-panel">
                        <h3>📋 Company Details</h3>
                        
                        <div className="company-info">
                            <h4>{selectedCompany.name}</h4>
                            <div className="info-grid">
                                <div className="info-item">
                                    <label>Role:</label>
                                    <span className={`badge ${getStatusBadge(selectedCompany.role || 'No role')}`}>
                                        {selectedCompany.role || 'No role'}
                                    </span>
                                </div>
                                <div className="info-item">
                                    <label>Region:</label>
                                    <span>{selectedCompany.region || 'No region'}</span>
                                </div>
                                <div className="info-item">
                                    <label>Industry:</label>
                                    <span>{selectedCompany.industry || 'No industry'}</span>
                                </div>
                                <div className="info-item">
                                    <label>Country:</label>
                                    <span>{selectedCompany.country || 'No country'}</span>
                                </div>
                                <div className="info-item">
                                    <label>City:</label>
                                    <span>{selectedCompany.city || 'No city'}</span>
                                </div>
                                <div className="info-item">
                                    <label>URL:</label>
                                    <span>
                                        {selectedCompany.url ? (
                                            <a href={selectedCompany.url} target="_blank" rel="noopener noreferrer">
                                                {selectedCompany.url}
                                            </a>
                                        ) : 'No URL'}
                                    </span>
                                </div>
                            </div>
                            
                            {selectedCompany.description && (
                                <div className="description">
                                    <label>Description:</label>
                                    <p>{selectedCompany.description}</p>
                                </div>
                            )}
                            
                            {selectedCompany.linked_interactions && Object.keys(selectedCompany.linked_interactions).length > 0 && (
                                <div className="linked-interactions">
                                    <label>Linked Interactions ({Object.keys(selectedCompany.linked_interactions).length}):</label>
                                    <ul>
                                        {Object.entries(selectedCompany.linked_interactions).map(([key, interaction]) => (
                                            <li key={key}>
                                                <strong>{interaction.name || key}</strong>
                                                {interaction.content_type && ` (${interaction.content_type})`}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                        
                        <div className="actions">
                            <button 
                                className="btn btn-primary" 
                                onClick={() => generateProfile(selectedCompany.name)}
                                disabled={loading}
                            >
                                📊 Generate Profile
                            </button>
                            <button 
                                className="btn btn-secondary" 
                                onClick={() => setShowUpdateForm(true)}
                                disabled={loading}
                            >
                                ✏️ Edit Company
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {companyProfile && (
                <div className="profile-panel">
                    <h3>📊 Company Profile: {companyProfile.name}</h3>
                    
                    {companyProfile.analytics && (
                        <div className="analytics">
                            <h4>Analytics</h4>
                            <div className="analytics-grid">
                                <div className="metric">
                                    <label>Linked Interactions:</label>
                                    <span>{companyProfile.analytics.interactionCount || 0}</span>
                                </div>
                                <div className="metric">
                                    <label>Total File Size:</label>
                                    <span>{companyProfile.analytics.totalFileSize || 0} bytes</span>
                                </div>
                                <div className="metric">
                                    <label>Total Word Count:</label>
                                    <span>{companyProfile.analytics.totalWordCount || 0}</span>
                                </div>
                                <div className="metric">
                                    <label>Avg Reading Time:</label>
                                    <span>{companyProfile.analytics.avgReadingTime || 0} minutes</span>
                                </div>
                            </div>
                            
                            {companyProfile.analytics.contentTypes && (
                                <div className="content-types">
                                    <h5>Content Types</h5>
                                    {Object.entries(companyProfile.analytics.contentTypes).map(([type, count]) => (
                                        <div key={type} className="content-type">
                                            <span>{type}:</span>
                                            <span>{count} interactions</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    
                    {companyProfile.interactionSummary && companyProfile.interactionSummary.length > 0 && (
                        <div className="interaction-summary">
                            <h4>Interaction Summary</h4>
                            <ul>
                                {companyProfile.interactionSummary.map((interaction, index) => (
                                    <li key={index}>
                                        <strong>{interaction.name}</strong> ({interaction.content_type})
                                        {interaction.description && (
                                            <p>{interaction.description.substring(0, 200)}...</p>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    
                    <button className="btn btn-secondary" onClick={() => setCompanyProfile(null)}>
                        Close Profile
                    </button>
                </div>
            )}

            {/* Create Form Modal */}
            {showCreateForm && (
                <CompanyCreateForm 
                    onSubmit={createCompany}
                    onCancel={() => setShowCreateForm(false)}
                    loading={loading}
                />
            )}

            {/* Update Form Modal */}
            {showUpdateForm && selectedCompany && (
                <CompanyUpdateForm 
                    company={selectedCompany}
                    onSubmit={updateCompany}
                    onCancel={() => setShowUpdateForm(false)}
                    loading={loading}
                />
            )}
        </div>
    );
};

// Company Create Form Component
const CompanyCreateForm = ({ onSubmit, onCancel, loading }) => {
    const [formData, setFormData] = useState({
        name: '',
        role: 'Competitor',
        description: '',
        region: 'AMER',
        industry: '',
        url: '',
        country: '',
        city: '',
        state_province: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        const result = await onSubmit(formData);
        if (result.success) {
            onCancel(); // Close form on success
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal">
                <h3>➕ Create New Company</h3>
                <form onSubmit={handleSubmit}>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Name *</label>
                            <input 
                                type="text" 
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                            />
                        </div>
                        
                        <div className="form-group">
                            <label>Role *</label>
                            <select 
                                value={formData.role}
                                onChange={(e) => setFormData({...formData, role: e.target.value})}
                            >
                                <option value="Competitor">Competitor</option>
                                <option value="Partner">Partner</option>
                                <option value="Customer">Customer</option>
                                <option value="Owner">Owner</option>
                            </select>
                        </div>
                        
                        <div className="form-group">
                            <label>Region</label>
                            <select 
                                value={formData.region}
                                onChange={(e) => setFormData({...formData, region: e.target.value})}
                            >
                                <option value="AMER">AMER</option>
                                <option value="EMEA">EMEA</option>
                                <option value="APAC">APAC</option>
                            </select>
                        </div>
                        
                        <div className="form-group">
                            <label>Industry</label>
                            <input 
                                type="text" 
                                value={formData.industry}
                                onChange={(e) => setFormData({...formData, industry: e.target.value})}
                            />
                        </div>
                        
                        <div className="form-group">
                            <label>URL</label>
                            <input 
                                type="url" 
                                value={formData.url}
                                onChange={(e) => setFormData({...formData, url: e.target.value})}
                            />
                        </div>
                        
                        <div className="form-group">
                            <label>Country</label>
                            <input 
                                type="text" 
                                value={formData.country}
                                onChange={(e) => setFormData({...formData, country: e.target.value})}
                            />
                        </div>
                        
                        <div className="form-group">
                            <label>City</label>
                            <input 
                                type="text" 
                                value={formData.city}
                                onChange={(e) => setFormData({...formData, city: e.target.value})}
                            />
                        </div>
                        
                        <div className="form-group">
                            <label>State/Province</label>
                            <input 
                                type="text" 
                                value={formData.state_province}
                                onChange={(e) => setFormData({...formData, state_province: e.target.value})}
                            />
                        </div>
                    </div>
                    
                    <div className="form-group full-width">
                        <label>Description</label>
                        <textarea 
                            rows="3"
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                        />
                    </div>
                    
                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={onCancel}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Company'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Company Update Form Component
const CompanyUpdateForm = ({ company, onSubmit, onCancel, loading }) => {
    const [field, setField] = useState('description');
    const [value, setValue] = useState('');

    const updateFields = [
        { value: 'description', label: 'Description' },
        { value: 'role', label: 'Role' },
        { value: 'status', label: 'Status' },
        { value: 'region', label: 'Region' },
        { value: 'industry', label: 'Industry' },
        { value: 'url', label: 'URL' },
        { value: 'city', label: 'City' },
        { value: 'state_province', label: 'State/Province' },
        { value: 'country', label: 'Country' }
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        const result = await onSubmit(company.name, field, value);
        if (result.success) {
            onCancel(); // Close form on success
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal">
                <h3>✏️ Update Company: {company.name}</h3>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Field to Update</label>
                        <select 
                            value={field}
                            onChange={(e) => setField(e.target.value)}
                        >
                            {updateFields.map(f => (
                                <option key={f.value} value={f.value}>{f.label}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="form-group">
                        <label>Current Value</label>
                        <input 
                            type="text" 
                            readOnly
                            value={company[field] || 'No value'}
                            className="readonly"
                        />
                    </div>
                    
                    <div className="form-group">
                        <label>New Value *</label>
                        {field === 'description' ? (
                            <textarea 
                                rows="3"
                                required
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                            />
                        ) : (
                            <input 
                                type="text" 
                                required
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                            />
                        )}
                    </div>
                    
                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={onCancel}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Updating...' : 'Update Company'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CompanyManager;
