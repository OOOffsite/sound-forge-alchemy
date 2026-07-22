#!/bin/bash

###############################################################################
# Docker Infrastructure Test Runner
# TDD Test Execution Script
#
# @author Claude Code (TDD Agent)
# @version 1.0.0
# @license MIT
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results directory
RESULTS_DIR=".claude/checkpoints/tdd"
mkdir -p "$RESULTS_DIR"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Docker Infrastructure Tests - TDD Execution              ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Check Docker availability
echo -e "${YELLOW}Checking Docker availability...${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker is running${NC}"
echo ""

# Function to run a test suite
run_test_suite() {
    local suite_name=$1
    local test_file=$2
    local checkpoint_file=$3

    echo -e "${BLUE}Running ${suite_name}...${NC}"
    echo -e "${YELLOW}────────────────────────────────────────────────────────${NC}"

    local start_time=$(date +%s)

    # Run the test
    if npx vitest run "$test_file" --config vitest.infrastructure.config.ts --reporter=verbose; then
        local status="passed"
        local success=true
        echo -e "${GREEN}✅ ${suite_name} PASSED${NC}"
    else
        local status="failed"
        local success=false
        echo -e "${RED}❌ ${suite_name} FAILED${NC}"
    fi

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    # Create checkpoint
    cat > "$RESULTS_DIR/$checkpoint_file" <<EOF
{
  "test_suite": "$suite_name",
  "phase": "RED",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "status": "$status",
  "duration_seconds": $duration,
  "test_file": "$test_file"
}
EOF

    echo ""
    return $([ "$success" = true ] && echo 0 || echo 1)
}

# Track overall results
total_suites=0
passed_suites=0
failed_suites=0

# Run Frontend Tests
total_suites=$((total_suites + 1))
if run_test_suite "Frontend Docker Tests" \
    "tests/infrastructure/docker/frontend.test.ts" \
    "docker-tdd-frontend.json"; then
    passed_suites=$((passed_suites + 1))
else
    failed_suites=$((failed_suites + 1))
fi

# Run Backend Tests
total_suites=$((total_suites + 1))
if run_test_suite "Backend Docker Tests" \
    "tests/infrastructure/docker/backend.test.ts" \
    "docker-tdd-backend.json"; then
    passed_suites=$((passed_suites + 1))
else
    failed_suites=$((failed_suites + 1))
fi

# Run Compose Tests
total_suites=$((total_suites + 1))
if run_test_suite "Docker Compose Tests" \
    "tests/infrastructure/docker/compose.test.ts" \
    "docker-tdd-compose.json"; then
    passed_suites=$((passed_suites + 1))
else
    failed_suites=$((failed_suites + 1))
fi

# Run Performance Tests (optional, can be slow)
if [ "$RUN_PERFORMANCE_TESTS" = "true" ]; then
    total_suites=$((total_suites + 1))
    if run_test_suite "Docker Performance Tests" \
        "tests/infrastructure/docker/performance.test.ts" \
        "docker-tdd-performance.json"; then
        passed_suites=$((passed_suites + 1))
    else
        failed_suites=$((failed_suites + 1))
    fi
fi

# Summary
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Test Execution Summary                                   ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Total Test Suites:  ${total_suites}"
echo -e "${GREEN}Passed:             ${passed_suites}${NC}"
echo -e "${RED}Failed:             ${failed_suites}${NC}"
echo ""

if [ $failed_suites -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed! Ready for REFACTOR phase.${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some tests failed. This is expected in RED phase.${NC}"
    echo -e "${YELLOW}Next step: Fix Docker configurations (GREEN phase).${NC}"
    exit 1
fi
