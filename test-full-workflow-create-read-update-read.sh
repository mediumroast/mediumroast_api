#!/bin/bash

# test-full-workflow-create-read-update-read.sh
# Comprehensive test workflow performing Create -> Read/Verify -> Update -> Read/Verify (CRUR)
# for companies, interactions, and studies in the mediumroast.io API
#
# @author Michael Hay <michael.hay@mediumroast.io>
# @license Apache-2.0
# @version 3.0.0
# @copyright 2025 Mediumroast, Inc. All rights reserved.
#
# This script performs a complete CRUR workflow:
# 1. Repository setup (create repository, install actions)
# 2. Companies CRUR workflow
# 3. Interactions CRUR workflow 
# 4. Studies CRUR workflow
#
# Prerequisites:
# - config.ini file with GitHub token and organization
# - All sample data files in examples/sample_data/
# - Node.js environment properly configured
#
# Usage:
#   ./test-full-workflow-create-read-update-read.sh
#
# The script will:
# - Set up the repository infrastructure
# - Install GitHub Actions workflows
# - Create, read, update, and re-read entities for companies, interactions, and studies
# - Provide detailed progress reporting and error handling
# - Log all operations for debugging and verification
# - Allow user interaction for confirmations (does NOT automate prompts)

set -e  # Exit on any error
set -u  # Exit on undefined variables

# Colors for output formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Unicode symbols for better visual output
SUCCESS="✅"
ERROR="❌"
WARNING="⚠️"
INFO="ℹ️"
ROCKET="🚀"
GEAR="⚙️"
BOOK="📚"
BUILDING="🏢"
HANDSHAKE="🤝"
MICROSCOPE="🔬"

# Script metadata
SCRIPT_NAME="CRUR Workflow Test"
SCRIPT_VERSION="3.0.0"
START_TIME=$(date)
START_TIMESTAMP=$(date +%s)

# Logging functions
log_header() {
    echo -e "${PURPLE}================================================================================================${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}================================================================================================${NC}"
}

log_section() {
    echo -e "\n${CYAN}----------------------------------------${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}----------------------------------------${NC}"
}

log_info() {
    echo -e "${BLUE}${INFO} $1${NC}"
}

log_success() {
    echo -e "${GREEN}${SUCCESS} $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}${WARNING} $1${NC}"
}

log_error() {
    echo -e "${RED}${ERROR} $1${NC}"
}

log_operation() {
    echo -e "${PURPLE}${GEAR} $1${NC}"
}

# Error handling function
handle_error() {
    local exit_code=$?
    local line_number=$1
    log_error "Script failed at line $line_number with exit code $exit_code"
    log_error "Command: $BASH_COMMAND"
    log_error "Timestamp: $(date)"
    exit $exit_code
}

# Set up error handling
trap 'handle_error $LINENO' ERR

# Verification functions
verify_config() {
    log_section "Configuration Verification"
    
    if [[ ! -f "examples/config.ini" ]]; then
        log_error "Configuration file examples/config.ini not found"
        log_info "Please create examples/config.ini with your GitHub token and organization"
        log_info "Example format:"
        log_info "[GitHub]"
        log_info "token = YOUR_GITHUB_TOKEN"
        log_info "org = YOUR_ORGANIZATION_NAME"
        exit 1
    fi
    
    log_success "Configuration file found"
    
    # Verify sample data files exist
    local sample_files=("companies.json" "interactions.json" "studies.json")
    for file in "${sample_files[@]}"; do
        if [[ ! -f "examples/sample_data/$file" ]]; then
            log_error "Sample data file examples/sample_data/$file not found"
            exit 1
        fi
        log_success "Sample data file $file found"
    done
}

verify_node_environment() {
    log_section "Node.js Environment Verification"
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed or not in PATH"
        exit 1
    fi
    
    local node_version=$(node --version)
    log_success "Node.js version: $node_version"
    
    if [[ ! -f "package.json" ]]; then
        log_error "package.json not found in current directory"
        exit 1
    fi
    
    if [[ ! -d "node_modules" ]]; then
        log_warning "node_modules directory not found, installing dependencies..."
        npm install
    fi
    
    log_success "Node.js environment verified"
}

# Main workflow functions
run_repository_setup() {
    log_header "${ROCKET} REPOSITORY SETUP AND ACTIONS INSTALLATION"
    
    log_section "Creating Repository Infrastructure"
    log_operation "Running repository setup (repository + containers)..."
    node examples/github-repository.js repository containers
    
    if [[ $? -eq 0 ]]; then
        log_success "Repository infrastructure created successfully"
    else
        log_error "Repository setup failed"
        exit 1
    fi
    
    log_section "Installing GitHub Actions Workflows"
    log_operation "Installing GitHub Actions workflows..."
    node examples/github-actions.js create
    
    if [[ $? -eq 0 ]]; then
        log_success "GitHub Actions workflows installed successfully"
    else
        log_error "GitHub Actions installation failed"
        exit 1
    fi
}

run_companies_crur() {
    log_header "${BUILDING} COMPANIES CRUR WORKFLOW"
    
    log_section "Companies CREATE Operation"
    log_operation "Creating companies from sample data..."
    node examples/github-companies.js create
    
    if [[ $? -eq 0 ]]; then
        log_success "Companies created successfully"
    else
        log_error "Companies creation failed"
        exit 1
    fi
    
    log_section "Companies READ Operation (Verification)"
    log_operation "Reading and verifying created companies..."
    node examples/github-companies.js read
    
    if [[ $? -eq 0 ]]; then
        log_success "Companies read/verification completed successfully"
    else
        log_error "Companies read operation failed"
        exit 1
    fi
    
    log_section "Companies UPDATE Operation"
    log_operation "Updating companies with new information..."
    node examples/github-companies.js update
    
    if [[ $? -eq 0 ]]; then
        log_success "Companies updated successfully"
    else
        log_error "Companies update failed"
        exit 1
    fi
    
    log_section "Companies READ Operation (Post-Update Verification)"
    log_operation "Reading and verifying updated companies..."
    node examples/github-companies.js read
    
    if [[ $? -eq 0 ]]; then
        log_success "Companies post-update verification completed successfully"
    else
        log_error "Companies post-update read operation failed"
        exit 1
    fi
    
    log_success "Companies CRUR workflow completed successfully"
}

run_interactions_crur() {
    log_header "${HANDSHAKE} INTERACTIONS CRUR WORKFLOW"
    
    log_section "Interactions CREATE Operation"
    log_operation "Creating interactions from sample data..."
    node examples/github-interactions.js create
    
    if [[ $? -eq 0 ]]; then
        log_success "Interactions created successfully"
    else
        log_error "Interactions creation failed"
        exit 1
    fi
    
    log_section "Interactions READ Operation (Verification)"
    log_operation "Reading and verifying created interactions..."
    node examples/github-interactions.js basic
    
    if [[ $? -eq 0 ]]; then
        log_success "Interactions read/verification completed successfully"
    else
        log_error "Interactions read operation failed"
        exit 1
    fi
    
    log_section "Interactions UPDATE Operation"
    log_operation "Updating interactions with new information..."
    node examples/github-interactions.js update
    
    if [[ $? -eq 0 ]]; then
        log_success "Interactions updated successfully"
    else
        log_error "Interactions update failed"
        exit 1
    fi
    
    log_section "Interactions READ Operation (Post-Update Verification)"
    log_operation "Reading and verifying updated interactions..."
    node examples/github-interactions.js basic
    
    if [[ $? -eq 0 ]]; then
        log_success "Interactions post-update verification completed successfully"
    else
        log_error "Interactions post-update read operation failed"
        exit 1
    fi
    
    log_success "Interactions CRUR workflow completed successfully"
}

run_studies_crur() {
    log_header "${MICROSCOPE} STUDIES CRUR WORKFLOW"
    
    # Check if github-studies.js has content
    if [[ ! -s "examples/github-studies.js" ]]; then
        log_warning "github-studies.js is empty or doesn't exist"
        log_warning "Skipping Studies CRUR workflow"
        return 0
    fi
    
    log_section "Studies CREATE Operation"
    log_operation "Creating studies from sample data..."
    node examples/github-studies.js create
    
    if [[ $? -eq 0 ]]; then
        log_success "Studies created successfully"
    else
        log_error "Studies creation failed"
        exit 1
    fi
    
    log_section "Studies READ Operation (Verification)"
    log_operation "Reading and verifying created studies..."
    node examples/github-studies.js read
    
    if [[ $? -eq 0 ]]; then
        log_success "Studies read/verification completed successfully"
    else
        log_error "Studies read operation failed"
        exit 1
    fi
    
    log_section "Studies UPDATE Operation"
    log_operation "Updating studies with new information..."
    node examples/github-studies.js update
    
    if [[ $? -eq 0 ]]; then
        log_success "Studies updated successfully"
    else
        log_error "Studies update failed"
        exit 1
    fi
    
    log_section "Studies READ Operation (Post-Update Verification)"
    log_operation "Reading and verifying updated studies..."
    node examples/github-studies.js read
    
    if [[ $? -eq 0 ]]; then
        log_success "Studies post-update verification completed successfully"
    else
        log_error "Studies post-update read operation failed"
        exit 1
    fi
    
    log_success "Studies CRUR workflow completed successfully"
}

# Summary reporting function
generate_summary_report() {
    log_header "${BOOK} WORKFLOW COMPLETION SUMMARY"
    
    local end_time=$(date)
    local end_timestamp=$(date +%s)
    local duration=$((end_timestamp - START_TIMESTAMP))
    local duration_formatted="N/A"
    
    if [[ $duration -ge 0 ]]; then
        if [[ $duration -ge 60 ]]; then
            local minutes=$((duration / 60))
            local seconds=$((duration % 60))
            duration_formatted="${minutes}m ${seconds}s"
        else
            duration_formatted="${duration}s"
        fi
    fi
    
    log_success "CRUR Workflow Test completed successfully!"
    echo ""
    log_info "Script: $SCRIPT_NAME v$SCRIPT_VERSION"
    log_info "Start time: $START_TIME"
    log_info "End time: $end_time"
    log_info "Duration: $duration_formatted"
    echo ""
    log_success "Completed workflows:"
    log_success "  ${ROCKET} Repository setup and Actions installation"
    log_success "  ${BUILDING} Companies CRUR (Create → Read → Update → Read)"
    log_success "  ${HANDSHAKE} Interactions CRUR (Create → Read → Update → Read)"
    
    if [[ -s "examples/github-studies.js" ]]; then
        log_success "  ${MICROSCOPE} Studies CRUR (Create → Read → Update → Read)"
    else
        log_warning "  ${MICROSCOPE} Studies CRUR (Skipped - github-studies.js is empty)"
    fi
    
    echo ""
    log_info "All entities have been successfully created, verified, updated, and re-verified."
    log_info "The mediumroast.io API CRUR workflow test is complete."
    echo ""
    log_info "You can now:"
    log_info "  • View the created entities in your GitHub repository"
    log_info "  • Check the GitHub Actions workflows"
    log_info "  • Run individual example scripts for specific operations"
    log_info "  • Use the fuzzy search and analysis features"
    echo ""
}

# Main execution function
main() {
    log_header "${ROCKET} MEDIUMROAST API - CRUR WORKFLOW TEST"
    log_info "Starting comprehensive Create → Read → Update → Read workflow test"
    log_info "Script version: $SCRIPT_VERSION"
    log_info "Timestamp: $START_TIME"
    echo ""
    
    # Pre-flight checks
    verify_config
    verify_node_environment
    
    # Main workflow execution
    run_repository_setup
    run_companies_crur
    run_interactions_crur
    run_studies_crur
    
    # Generate summary
    generate_summary_report
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
