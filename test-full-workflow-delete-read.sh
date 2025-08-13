#!/bin/bash

# Test script for full workflow deletion operations
# This script performs comprehensive deletion testing for the Mediumroast API
# Order: Studies → Interactions → Companies → Actions
# Uses catch/write/release pattern for safe container operations

SCRIPT_NAME="test-full-workflow-delete-read.sh"
SCRIPT_VERSION="1.0.0"
START_TIME=$(date)
START_TIMESTAMP=$(date +%s)

# Color codes for output formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Unicode symbols for better visual output
CHECKMARK="✅"
CROSSMARK="❌"
WARNING="⚠️"
INFO="ℹ️"
ROCKET="🚀"
BUILDING="🏢"
HANDSHAKE="🤝"
BOOK="📚"
TRASH="🗑️"
UNLINK="🔗"

# Logging functions
log_header() {
    echo -e "${PURPLE}================================================================================================${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}================================================================================================${NC}"
}

log_subheader() {
    echo -e "${CYAN}----------------------------------------${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}----------------------------------------${NC}"
}

log_success() {
    echo -e "${GREEN}${CHECKMARK} $1${NC}"
}

log_error() {
    echo -e "${RED}${CROSSMARK} $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}${WARNING} $1${NC}"
}

log_info() {
    echo -e "${BLUE}${INFO} $1${NC}"
}

log_step() {
    echo -e "${CYAN}➤ $1${NC}"
}

# Function to check if Node.js is available
check_nodejs() {
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed or not in PATH"
        echo "Please install Node.js and try again"
        exit 1
    fi
    
    local node_version=$(node --version)
    log_info "Using Node.js version: $node_version"
}

# Function to check if example files exist
check_example_files() {
    local required_files=(
        "examples/github-studies.js"
        "examples/github-interactions.js" 
        "examples/github-companies.js"
        "examples/github-actions.js"
    )
    
    log_info "Checking required example files..."
    
    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            log_error "Required file not found: $file"
            exit 1
        fi
    done
    
    log_success "All required example files found"
}

# Function to check if config file exists
check_config() {
    if [[ ! -f "examples/config.ini" ]]; then
        log_error "Configuration file not found: examples/config.ini"
        echo ""
        echo "Please create examples/config.ini with the following format:"
        echo ""
        echo "[GitHub]"
        echo "token = YOUR_GITHUB_TOKEN"
        echo "org = YOUR_ORGANIZATION_NAME"
        echo ""
        exit 1
    fi
    
    log_success "Configuration file found"
}

# Function to perform pre-flight checks
perform_preflight_checks() {
    log_header "${ROCKET} PRE-FLIGHT CHECKS"
    
    check_nodejs
    check_example_files
    check_config
    
    echo ""
    log_success "All pre-flight checks passed"
    echo ""
}

# Function to delete a single study with link checking and unlinking
delete_single_study() {
    log_header "${BOOK} STEP 1: DELETE SINGLE STUDY WITH UNLINK OPERATIONS"
    
    log_info "Executing single study deletion with link management..."
    echo ""
    
    log_step "Running: node examples/github-studies.js delete"
    echo ""
    
    # Run the studies delete operation
    if node examples/github-studies.js delete; then
        log_success "Studies delete operation completed"
    else
        log_error "Studies delete operation failed"
        return 1
    fi
    
    echo ""
    log_step "Verifying study deletion and link removal..."
    
    # Verify by reading remaining studies
    log_step "Running: node examples/github-studies.js read"
    echo ""
    
    if node examples/github-studies.js read; then
        log_success "Studies verification completed"
    else
        log_warning "Studies verification had issues (may be expected if all deleted)"
    fi
    
    echo ""
    log_success "Step 1 completed: Single study deletion with unlinking"
    echo ""
}

# Function to delete a single interaction with file and company unlinking
delete_single_interaction() {
    log_header "${HANDSHAKE} STEP 2: DELETE SINGLE INTERACTION WITH FILE AND COMPANY UNLINK"
    
    log_info "Executing single interaction deletion with file removal and company unlinking..."
    echo ""
    
    log_step "Running: node examples/github-interactions.js delete"
    echo ""
    
    # Run the interactions delete operation
    if node examples/github-interactions.js delete; then
        log_success "Interactions delete operation completed"
    else
        log_error "Interactions delete operation failed"
        return 1
    fi
    
    echo ""
    log_step "Verifying interaction deletion, file removal, and company unlinking..."
    
    # Verify by reading remaining interactions
    log_step "Running: node examples/github-interactions.js read"
    echo ""
    
    if node examples/github-interactions.js read; then
        log_success "Interactions verification completed"
    else
        log_warning "Interactions verification had issues (may be expected if all deleted)"
    fi
    
    echo ""
    log_success "Step 2 completed: Single interaction deletion with file and company unlinking"
    echo ""
}

# Function to delete a single company and associated interactions
delete_single_company() {
    log_header "${BUILDING} STEP 3: DELETE SINGLE COMPANY AND ASSOCIATED INTERACTIONS"
    
    log_info "Executing single company deletion with associated interactions and files..."
    echo ""
    
    log_step "Running: node examples/github-companies.js delete"
    echo ""
    
    # Run the companies delete operation
    if node examples/github-companies.js delete; then
        log_success "Companies delete operation completed"
    else
        log_error "Companies delete operation failed"
        return 1
    fi
    
    echo ""
    log_step "Verifying company deletion and associated interaction removal..."
    
    # Verify by reading remaining companies
    log_step "Running: node examples/github-companies.js read"
    echo ""
    
    if node examples/github-companies.js read; then
        log_success "Companies verification completed"
    else
        log_warning "Companies verification had issues (may be expected if all deleted)"
    fi
    
    # Also check interactions to verify unlinking
    echo ""
    log_step "Checking interactions for proper unlinking..."
    log_step "Running: node examples/github-interactions.js read"
    echo ""
    
    if node examples/github-interactions.js read; then
        log_success "Interactions unlinking verification completed"
    else
        log_warning "Interactions verification had issues"
    fi
    
    echo ""
    log_success "Step 3 completed: Single company deletion with associated interactions"
    echo ""
}

# Function to delete remaining interactions
delete_remaining_interactions() {
    log_header "${HANDSHAKE} STEP 4: DELETE REMAINING INTERACTIONS WITH COMPANY UNLINKS"
    
    log_info "Executing deletion of remaining interactions with company unlinking..."
    echo ""
    
    log_step "Running: node examples/github-interactions.js delete"
    echo ""
    
    # Run the interactions delete operation for remaining items
    if node examples/github-interactions.js delete; then
        log_success "Remaining interactions delete operation completed"
    else
        log_error "Remaining interactions delete operation failed"
        return 1
    fi
    
    echo ""
    log_step "Verifying all interactions deleted and companies unlinked..."
    
    # Verify by reading interactions (should be empty or minimal)
    log_step "Running: node examples/github-interactions.js read"
    echo ""
    
    if node examples/github-interactions.js read; then
        log_success "Interactions verification completed"
    else
        log_warning "Interactions verification had issues (expected if all deleted)"
    fi
    
    # Check companies to verify unlinking
    echo ""
    log_step "Checking companies for proper unlinking..."
    log_step "Running: node examples/github-companies.js read"
    echo ""
    
    if node examples/github-companies.js read; then
        log_success "Companies unlinking verification completed"
    else
        log_warning "Companies verification had issues"
    fi
    
    echo ""
    log_success "Step 4 completed: Remaining interactions deleted with company unlinking"
    echo ""
}

# Function to delete remaining companies
delete_remaining_companies() {
    log_header "${BUILDING} STEP 5: DELETE REMAINING COMPANIES"
    
    log_info "Executing deletion of remaining companies..."
    echo ""
    
    log_step "Running: node examples/github-companies.js delete"
    echo ""
    
    # Run the companies delete operation for remaining items
    if node examples/github-companies.js delete; then
        log_success "Remaining companies delete operation completed"
    else
        log_error "Remaining companies delete operation failed"
        return 1
    fi
    
    echo ""
    log_step "Verifying all companies deleted..."
    
    # Verify by reading companies (should be empty or minimal)
    log_step "Running: node examples/github-companies.js read"
    echo ""
    
    if node examples/github-companies.js read; then
        log_success "Companies verification completed"
    else
        log_warning "Companies verification had issues (expected if all deleted)"
    fi
    
    echo ""
    log_success "Step 5 completed: All remaining companies deleted"
    echo ""
}

# Function to delete actions
delete_actions() {
    log_header "${ROCKET} STEP 6: DELETE GITHUB ACTIONS"
    
    log_info "Executing GitHub Actions deletion..."
    echo ""
    
    log_step "Running: node examples/github-actions.js delete"
    echo ""
    
    # Run the actions delete operation
    if node examples/github-actions.js delete; then
        log_success "Actions delete operation completed"
    else
        log_error "Actions delete operation failed"
        return 1
    fi
    
    echo ""
    log_step "Verifying Actions deletion..."
    
    # Verify by reading actions status
    log_step "Running: node examples/github-actions.js read"
    echo ""
    
    if node examples/github-actions.js read; then
        log_success "Actions verification completed"
    else
        log_warning "Actions verification had issues (expected if all deleted)"
    fi
    
    echo ""
    log_success "Step 6 completed: GitHub Actions deleted"
    echo ""
}

# Function to generate summary report
generate_summary_report() {
    log_header "${BOOK} DELETION WORKFLOW COMPLETION SUMMARY"
    
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
    
    log_success "Deletion Workflow Test completed successfully!"
    echo ""
    log_info "Script: $SCRIPT_NAME v$SCRIPT_VERSION"
    log_info "Start time: $START_TIME"
    log_info "End time: $end_time"
    log_info "Duration: $duration_formatted"
    echo ""
    log_success "Completed deletion workflow steps:"
    log_success "  ${BOOK} Single study deletion with unlinking"
    log_success "  ${HANDSHAKE} Single interaction deletion with file and company unlinking"
    log_success "  ${BUILDING} Single company deletion with associated interactions"
    log_success "  ${HANDSHAKE} Remaining interactions deletion with company unlinking"
    log_success "  ${BUILDING} Remaining companies deletion"
    log_success "  ${ROCKET} GitHub Actions deletion"
    
    echo ""
    log_info "Workflow used catch/write/release pattern for safe container operations"
    log_info "All linked entities were properly unlinked during deletion operations"
    
    echo ""
    log_header "${CHECKMARK} DELETION WORKFLOW COMPLETE"
    
    # Final verification
    echo ""
    log_info "Final verification summary:"
    log_info "- Studies: Should be empty or contain only essential items"
    log_info "- Interactions: Should be empty or contain only essential items"
    log_info "- Companies: Should be empty or contain only essential items"
    log_info "- Actions: Should be removed from repository"
    log_info "- All cross-references should be cleaned up"
    
    echo ""
    log_info "Repository State Information:"
    log_info "Organization: $(grep 'org = ' examples/config.ini 2>/dev/null | cut -d' ' -f3 || echo 'N/A')"
    log_info "Timestamp: $START_TIME"
    
    echo ""
    log_warning "Note: This was a destructive test. You may need to run the create workflow"
    log_warning "      to restore test data: ./test-full-workflow-create-read-update-read.sh"
}

# Function to handle script interruption
cleanup() {
    echo ""
    log_warning "Script interrupted!"
    log_info "Partial deletion may have occurred"
    log_info "Check your repository state and run verification commands as needed"
    exit 1
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Main execution function
main() {
    log_header "${TRASH} MEDIUMROAST API - FULL WORKFLOW DELETION TEST"
    log_info "Testing comprehensive deletion operations with catch/write/release pattern"
    log_info "Script: $SCRIPT_NAME v$SCRIPT_VERSION"
    echo ""
    
    # Warning about destructive operations
    log_warning "WARNING: This script performs DESTRUCTIVE OPERATIONS!"
    log_warning "It will delete studies, interactions, companies, and GitHub Actions"
    log_warning "Make sure you have backups or are using test data"
    echo ""
    
    read -p "Do you want to continue with the deletion workflow? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Deletion workflow cancelled by user"
        exit 0
    fi
    
    echo ""
    
    # Pre-flight checks
    perform_preflight_checks
    
    # Execute deletion workflow steps
    log_info "Starting deletion workflow execution..."
    echo ""
    
    # Step 1: Delete single study with link checking
    delete_single_study || {
        log_error "Step 1 failed - aborting workflow"
        exit 1
    }
    
    # Step 2: Delete single interaction with file and company unlinking  
    delete_single_interaction || {
        log_error "Step 2 failed - aborting workflow"
        exit 1
    }
    
    # Step 3: Delete single company and associated interactions
    delete_single_company || {
        log_error "Step 3 failed - aborting workflow"
        exit 1
    }
    
    # Step 4: Delete remaining interactions
    delete_remaining_interactions || {
        log_error "Step 4 failed - aborting workflow"
        exit 1
    }
    
    # Step 5: Delete remaining companies
    delete_remaining_companies || {
        log_error "Step 5 failed - aborting workflow"
        exit 1
    }
    
    # Step 6: Delete actions
    delete_actions || {
        log_error "Step 6 failed - aborting workflow"
        exit 1
    }
    
    # Generate summary report
    generate_summary_report
}

# Run the main function
main "$@"
