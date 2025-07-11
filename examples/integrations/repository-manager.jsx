/**
 * GitHub Repository Manager - React Component
 * 
 * A comprehensive React component for managing GitHub repositories and containers
 * using the Mediumroast API. This component provides a full web interface
 * for repository management operations.
 * 
 * Features:
 * - Repository creation with pre-flight checks
 * - Container setup and management
 * - Installation status checking
 * - Real-time operation status tracking
 * - Error handling with user-friendly messages
 * - Repository and container listing
 * 
 * Props:
 *   - token: GitHub personal access token
 *   - org: GitHub organization name
 * 
 * Usage:
 *   <RepositoryManager token="your-token" org="your-org" />
 * 
 * Prerequisites:
 *   - Complete the setup in github-getting-started.md
 *   - Install React and required dependencies
 *   - Include the accompanying CSS file
 */

import React, { useState, useEffect } from 'react';
import GitHubFunctions from 'mediumroast_api/src/api/github.js';

const RepositoryManager = ({ token, org }) => {
    const [github, setGithub] = useState(null);
    const [status, setStatus] = useState('idle');
    const [repositories, setRepositories] = useState([]);
    const [containers, setContainers] = useState([]);
    const [error, setError] = useState(null);
    const [installationStatus, setInstallationStatus] = useState(null);

    useEffect(() => {
        if (token && org) {
            const githubInstance = new GitHubFunctions(token, org, 'repository-manager-ui');
            setGithub(githubInstance);
        }
    }, [token, org]);

    // Check installation status on initialization
    useEffect(() => {
        if (github) {
            checkInstallationStatus();
        }
    }, [github]);

    const checkInstallationStatus = async () => {
        try {
            setStatus('checking-installation');
            const appCheck = await github.checkGitHubAppInstallation();
            
            if (appCheck[0]) {
                setInstallationStatus({
                    isInstalled: true,
                    details: appCheck[2]
                });
                
                // Also check for existing repositories and containers
                await checkExistingResources();
            } else {
                setInstallationStatus({
                    isInstalled: false,
                    error: appCheck[2]?.error || appCheck[1]
                });
            }
        } catch (err) {
            setError(`Installation check failed: ${err.message}`);
            setInstallationStatus({
                isInstalled: false,
                error: err.message
            });
        } finally {
            setStatus('idle');
        }
    };

    const checkExistingResources = async () => {
        try {
            // Check repository
            const repoResult = await github.getRepoSize();
            if (repoResult[0]) {
                setRepositories([{
                    id: `${org}_discovery`,
                    name: `${org}_discovery`,
                    description: 'Discovery repository',
                    html_url: `https://github.com/${org}/${org}_discovery`,
                    size: repoResult[2]
                }]);
            }
            
            // Check containers
            const containerTypes = ['Studies', 'Companies', 'Interactions'];
            const existingContainers = [];
            
            for (const containerType of containerTypes) {
                try {
                    const contentResult = await github.getContent(containerType);
                    if (contentResult[0]) {
                        existingContainers.push({
                            container: containerType,
                            success: true,
                            message: 'Container exists',
                            details: contentResult[2]
                        });
                    }
                } catch (err) {
                    // Container doesn't exist, which is normal
                }
            }
            
            setContainers(existingContainers);
        } catch (err) {
            // Silently handle - existing resources check is informational
        }
    };

    const handleCreateRepository = async () => {
        if (!github) return;
        
        setStatus('creating-repository');
        setError(null);
        
        try {
            // Pre-flight check
            const appCheck = await github.checkGitHubAppInstallation();
            if (!appCheck[0]) {
                throw new Error('GitHub App not properly installed');
            }
            
            // Create repository
            const result = await github.createRepository();
            if (result[0]) {
                const newRepo = {
                    id: result[2].id,
                    name: result[2].name,
                    description: result[2].description,
                    html_url: result[2].html_url,
                    private: result[2].private
                };
                setRepositories(prev => [...prev, newRepo]);
                setStatus('success');
            } else {
                throw new Error(result[1]);
            }
        } catch (err) {
            setError(err.message);
            setStatus('error');
        }
    };

    const handleCreateContainers = async () => {
        if (!github) return;
        
        setStatus('creating-containers');
        setError(null);
        
        try {
            const result = await github.containerOps.createContainers();
            if (result[0]) {
                setContainers(result[2]);
                setStatus('success');
            } else {
                throw new Error(result[1]);
            }
        } catch (err) {
            setError(err.message);
            setStatus('error');
        }
    };

    const handleCheckStatus = async () => {
        if (!github) return;
        
        setStatus('checking');
        setError(null);
        
        try {
            await checkExistingResources();
            setStatus('checked');
        } catch (err) {
            setError(err.message);
            setStatus('error');
        }
    };

    const handleRefresh = async () => {
        setError(null);
        setRepositories([]);
        setContainers([]);
        await checkInstallationStatus();
    };

    // Installation check UI
    if (!installationStatus) {
        return (
            <div className="repository-manager">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Checking GitHub App installation...</p>
                </div>
            </div>
        );
    }

    if (!installationStatus.isInstalled) {
        return (
            <div className="repository-manager">
                <div className="error-panel">
                    <h3>❌ GitHub App Installation Required</h3>
                    <p>{installationStatus.error}</p>
                    <div className="installation-help">
                        <p>To use this repository manager, you need to:</p>
                        <ol>
                            <li>Install the Mediumroast for GitHub App</li>
                            <li>Grant it access to your organization</li>
                            <li>Ensure repository permissions are enabled</li>
                        </ol>
                        <a 
                            href="https://github.com/apps/mediumroast-for-github" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn btn-primary"
                        >
                            Install GitHub App
                        </a>
                        <button onClick={checkInstallationStatus} className="btn btn-secondary">
                            🔄 Recheck Installation
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="repository-manager">
            <div className="header">
                <h2>📁 GitHub Repository Manager</h2>
                <p>Organization: <strong>{org}</strong></p>
                <button 
                    onClick={handleRefresh} 
                    disabled={status === 'checking-installation'}
                    className="btn btn-secondary"
                >
                    🔄 Refresh Status
                </button>
            </div>

            {error && (
                <div className="alert alert-danger">
                    <span className="error-icon">❌</span>
                    <span><strong>Error:</strong> {error}</span>
                    <button onClick={() => setError(null)} className="btn-close">×</button>
                </div>
            )}

            {status && status !== 'idle' && status !== 'success' && status !== 'error' && (
                <div className="loading-bar">
                    <div className="loading-progress"></div>
                    <p>Status: {status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                </div>
            )}

            <div className="actions-panel">
                <h3>🚀 Quick Actions</h3>
                <div className="actions">
                    <button 
                        onClick={handleCheckStatus}
                        disabled={status === 'checking'}
                        className="btn btn-secondary"
                    >
                        {status === 'checking' ? '🔍 Checking...' : '🔍 Check Status'}
                    </button>
                    
                    <button 
                        onClick={handleCreateRepository}
                        disabled={status === 'creating-repository'}
                        className="btn btn-primary"
                    >
                        {status === 'creating-repository' ? '🏗️ Creating...' : '🏗️ Create Repository'}
                    </button>
                    
                    <button 
                        onClick={handleCreateContainers}
                        disabled={status === 'creating-containers'}
                        className="btn btn-success"
                    >
                        {status === 'creating-containers' ? '📂 Creating...' : '📂 Setup Containers'}
                    </button>
                </div>
            </div>

            <div className="content-panels">
                <div className="repositories-panel">
                    <h3>📁 Repositories ({repositories.length})</h3>
                    
                    {repositories.length === 0 ? (
                        <div className="empty-state">
                            <p>No repositories found.</p>
                            <p>Create your first repository to get started!</p>
                        </div>
                    ) : (
                        <div className="repositories">
                            {repositories.map(repo => (
                                <div key={repo.id} className="repository-card">
                                    <div className="card-header">
                                        <h4>{repo.name}</h4>
                                        {repo.private !== undefined && (
                                            <span className={`privacy-badge ${repo.private ? 'private' : 'public'}`}>
                                                {repo.private ? '🔒 Private' : '🌍 Public'}
                                            </span>
                                        )}
                                    </div>
                                    <p>{repo.description}</p>
                                    {repo.size && (
                                        <p><strong>Size:</strong> {repo.size.size_mb} MB</p>
                                    )}
                                    <div className="card-actions">
                                        <a 
                                            href={repo.html_url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="btn btn-outline btn-sm"
                                        >
                                            🔗 View on GitHub
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="containers-panel">
                    <h3>📂 Containers ({containers.length})</h3>
                    
                    {containers.length === 0 ? (
                        <div className="empty-state">
                            <p>No containers found.</p>
                            <p>Set up containers to organize your data!</p>
                        </div>
                    ) : (
                        <div className="containers">
                            {containers.map(container => (
                                <div key={container.container} className="container-card">
                                    <div className="card-header">
                                        <h4>{container.container}</h4>
                                        <span className={`status-badge ${container.success ? 'success' : 'error'}`}>
                                            {container.success ? '✅' : '❌'}
                                        </span>
                                    </div>
                                    <p>{container.message}</p>
                                    {container.details && (
                                        <div className="container-details">
                                            <p><strong>Type:</strong> {container.details.type}</p>
                                            <p><strong>Size:</strong> {container.details.size} bytes</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {status === 'success' && (
                <div className="success-panel">
                    <h3>🎉 Operation Completed Successfully!</h3>
                    <p>Your repository and containers are ready for use.</p>
                </div>
            )}
        </div>
    );
};

export default RepositoryManager;
