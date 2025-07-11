/**
 * GitHub Actions Workflow Manager - React Component
 * 
 * A comprehensive React component for managing GitHub Actions workflows
 * using the Mediumroast API. This component provides a full web interface
 * for workflow management operations.
 * 
 * Features:
 * - Real-time workflow listing and monitoring
 * - Workflow execution triggering
 * - Workflow run history visualization
 * - Installation status checking
 * - Responsive design with loading states
 * - Error handling with user-friendly messages
 * - Workflow deletion with confirmation
 * 
 * Props:
 *   - token: GitHub personal access token
 *   - org: GitHub organization name
 *   - repoName: Repository name
 * 
 * Usage:
 *   <WorkflowManager token="your-token" org="your-org" repoName="your-repo" />
 * 
 * Prerequisites:
 *   - Complete the setup in github-getting-started.md
 *   - Install React and required dependencies
 *   - Include the accompanying CSS file
 */

import React, { useState, useEffect } from 'react';
import GitHubFunctions from 'mediumroast_api/src/api/github.js';
import { formatResult } from 'mediumroast_api/src/api/gitHubServer/utils/formatting.js';

const WorkflowManager = ({ token, org, repoName }) => {
    const [github, setGitHub] = useState(null);
    const [workflows, setWorkflows] = useState([]);
    const [workflowRuns, setWorkflowRuns] = useState([]);
    const [selectedWorkflow, setSelectedWorkflow] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [installationStatus, setInstallationStatus] = useState(null);

    // Initialize GitHub client
    useEffect(() => {
        if (token && org) {
            const githubClient = new GitHubFunctions(token, org, 'workflow-manager-ui');
            setGitHub(githubClient);
        }
    }, [token, org]);

    // Check installation status
    useEffect(() => {
        if (github) {
            checkInstallationStatus();
        }
    }, [github]);

    // Load workflows
    useEffect(() => {
        if (github && installationStatus?.canProceed) {
            loadWorkflows();
        }
    }, [github, installationStatus]);

    const checkInstallationStatus = async () => {
        try {
            setLoading(true);
            const result = await github.actions.getInstallationStatus();
            
            if (result[0]) {
                setInstallationStatus({
                    canProceed: true,
                    status: result[2]
                });
            } else {
                setInstallationStatus({
                    canProceed: false,
                    error: result[1],
                    status: result[2]
                });
            }
        } catch (err) {
            setError('Failed to check installation status');
            setInstallationStatus({
                canProceed: false,
                error: err.message
            });
        } finally {
            setLoading(false);
        }
    };

    const loadWorkflows = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const result = await github.actions.getWorkflows();
            
            if (result[0]) {
                setWorkflows(result[2].workflows || []);
            } else {
                setError(`Failed to load workflows: ${result[1]}`);
            }
        } catch (err) {
            setError(`Error loading workflows: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const loadWorkflowRuns = async (workflowId) => {
        try {
            setLoading(true);
            setError(null);
            
            const result = await github.actions.getWorkflowRuns(workflowId);
            
            if (result[0]) {
                setWorkflowRuns(result[2].workflow_runs || []);
            } else {
                setError(`Failed to load workflow runs: ${result[1]}`);
            }
        } catch (err) {
            setError(`Error loading workflow runs: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const triggerWorkflow = async (workflowId, ref = 'main', inputs = {}) => {
        try {
            setLoading(true);
            setError(null);
            
            const result = await github.actions.triggerWorkflow(workflowId, ref, inputs);
            
            if (result[0]) {
                alert('Workflow triggered successfully!');
                // Refresh workflow runs
                await loadWorkflowRuns(workflowId);
            } else {
                setError(`Failed to trigger workflow: ${result[1]}`);
            }
        } catch (err) {
            setError(`Error triggering workflow: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const deleteWorkflow = async (workflowPath) => {
        if (!window.confirm(`Are you sure you want to delete the workflow at ${workflowPath}?`)) {
            return;
        }

        try {
            setLoading(true);
            setError(null);
            
            const result = await github.actions.deleteWorkflow(workflowPath);
            
            if (result[0]) {
                alert('Workflow deleted successfully!');
                await loadWorkflows(); // Refresh the list
            } else {
                setError(`Failed to delete workflow: ${result[1]}`);
            }
        } catch (err) {
            setError(`Error deleting workflow: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    const getStatusBadge = (status, conclusion) => {
        if (status === 'completed') {
            switch (conclusion) {
                case 'success':
                    return <span className="badge badge-success">✅ Success</span>;
                case 'failure':
                    return <span className="badge badge-danger">❌ Failed</span>;
                case 'cancelled':
                    return <span className="badge badge-secondary">⏹️ Cancelled</span>;
                default:
                    return <span className="badge badge-secondary">{conclusion}</span>;
            }
        } else if (status === 'in_progress') {
            return <span className="badge badge-info">🔄 Running</span>;
        } else if (status === 'queued') {
            return <span className="badge badge-warning">⏳ Queued</span>;
        }
        return <span className="badge badge-secondary">{status}</span>;
    };

    // Installation status check
    if (!installationStatus) {
        return (
            <div className="workflow-manager">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Checking GitHub App installation...</p>
                </div>
            </div>
        );
    }

    if (!installationStatus.canProceed) {
        return (
            <div className="workflow-manager">
                <div className="error-panel">
                    <h3>❌ GitHub App Installation Required</h3>
                    <p>{installationStatus.error}</p>
                    <div className="installation-help">
                        <p>To use this workflow manager, you need to:</p>
                        <ol>
                            <li>Install the Mediumroast for GitHub App</li>
                            <li>Grant it access to your repositories</li>
                            <li>Ensure Actions permissions are enabled</li>
                        </ol>
                        <a 
                            href="https://github.com/apps/mediumroast-for-github" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn btn-primary"
                        >
                            Install GitHub App
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="workflow-manager">
            <div className="header">
                <h2>🔧 GitHub Actions Workflow Manager</h2>
                <p>Organization: <strong>{org}</strong> | Repository: <strong>{repoName}</strong></p>
                <button 
                    onClick={loadWorkflows} 
                    disabled={loading}
                    className="btn btn-secondary"
                >
                    🔄 Refresh Workflows
                </button>
            </div>

            {error && (
                <div className="error-alert">
                    <span className="error-icon">❌</span>
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="btn-close">×</button>
                </div>
            )}

            {loading && (
                <div className="loading-bar">
                    <div className="loading-progress"></div>
                </div>
            )}

            <div className="workflow-content">
                <div className="workflows-panel">
                    <h3>📋 Workflows ({workflows.length})</h3>
                    
                    {workflows.length === 0 ? (
                        <div className="empty-state">
                            <p>No workflows found in this repository.</p>
                            <p>Create your first workflow to get started!</p>
                        </div>
                    ) : (
                        <div className="workflows-list">
                            {workflows.map((workflow) => (
                                <div 
                                    key={workflow.id} 
                                    className={`workflow-item ${selectedWorkflow?.id === workflow.id ? 'active' : ''}`}
                                    onClick={() => {
                                        setSelectedWorkflow(workflow);
                                        loadWorkflowRuns(workflow.id);
                                    }}
                                >
                                    <div className="workflow-header">
                                        <h4>{workflow.name}</h4>
                                        <span className={`state-badge state-${workflow.state}`}>
                                            {workflow.state}
                                        </span>
                                    </div>
                                    <div className="workflow-details">
                                        <p><strong>Path:</strong> {workflow.path}</p>
                                        <p><strong>Created:</strong> {formatDate(workflow.created_at)}</p>
                                        <p><strong>Updated:</strong> {formatDate(workflow.updated_at)}</p>
                                    </div>
                                    <div className="workflow-actions">
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                triggerWorkflow(workflow.id);
                                            }}
                                            className="btn btn-primary btn-sm"
                                            disabled={loading}
                                        >
                                            🚀 Trigger
                                        </button>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteWorkflow(workflow.path);
                                            }}
                                            className="btn btn-danger btn-sm"
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

                {selectedWorkflow && (
                    <div className="workflow-runs-panel">
                        <h3>🏃 Workflow Runs - {selectedWorkflow.name}</h3>
                        
                        <div className="runs-actions">
                            <button 
                                onClick={() => loadWorkflowRuns(selectedWorkflow.id)}
                                disabled={loading}
                                className="btn btn-secondary btn-sm"
                            >
                                🔄 Refresh Runs
                            </button>
                            <button 
                                onClick={() => triggerWorkflow(selectedWorkflow.id)}
                                disabled={loading}
                                className="btn btn-primary btn-sm"
                            >
                                🚀 Trigger New Run
                            </button>
                        </div>

                        {workflowRuns.length === 0 ? (
                            <div className="empty-state">
                                <p>No workflow runs found.</p>
                                <p>Trigger a run to see execution history.</p>
                            </div>
                        ) : (
                            <div className="workflow-runs-list">
                                {workflowRuns.slice(0, 10).map((run) => (
                                    <div key={run.id} className="workflow-run-item">
                                        <div className="run-header">
                                            <span className="run-number">#{run.run_number}</span>
                                            <span className="run-name">{run.name || 'Unnamed Run'}</span>
                                            {getStatusBadge(run.status, run.conclusion)}
                                        </div>
                                        <div className="run-details">
                                            <p><strong>Branch:</strong> {run.head_branch}</p>
                                            <p><strong>Commit:</strong> {run.head_sha.substring(0, 7)}</p>
                                            <p><strong>Started:</strong> {formatDate(run.created_at)}</p>
                                            <p><strong>Updated:</strong> {formatDate(run.updated_at)}</p>
                                        </div>
                                        <div className="run-actions">
                                            <a 
                                                href={run.html_url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="btn btn-outline btn-sm"
                                            >
                                                🔗 View on GitHub
                                            </a>
                                        </div>
                                    </div>
                                ))}
                                
                                {workflowRuns.length > 10 && (
                                    <div className="more-runs">
                                        <p>... and {workflowRuns.length - 10} more runs</p>
                                        <a 
                                            href={`https://github.com/${org}/${repoName}/actions/workflows/${selectedWorkflow.id}`}
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="btn btn-outline btn-sm"
                                        >
                                            View All Runs on GitHub
                                        </a>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default WorkflowManager;
