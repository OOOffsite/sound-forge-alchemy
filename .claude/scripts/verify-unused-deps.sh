#!/bin/bash

# Sound Forge Alchemy - Dependency Verification Script
# Verifies which heavy dependencies can be safely removed

set -e

PROJECT_ROOT="/Users/jeremiah/Developer/sound-forge-alchemy"
cd "$PROJECT_ROOT"

echo "=========================================="
echo "Dependency Verification Report"
echo "=========================================="
echo ""

# Function to check if a package is imported
check_package() {
  local package=$1
  local count=$(grep -r "from ['\"]$package['\"]" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)
  echo "$package: $count imports"
  return $count
}

echo "Checking potentially removable dependencies..."
echo ""

echo "1. recharts:"
check_package "recharts"
echo ""

echo "2. react-day-picker:"
check_package "react-day-picker"
echo ""

echo "3. date-fns:"
check_package "date-fns"
echo ""

echo "4. cmdk:"
check_package "cmdk"
echo ""

echo "5. embla-carousel-react:"
check_package "embla-carousel-react"
echo ""

echo "6. vaul:"
check_package "vaul"
echo ""

echo "7. input-otp:"
check_package "input-otp"
echo ""

echo "8. react-hook-form:"
check_package "react-hook-form"
echo ""

echo "9. @hookform/resolvers:"
check_package "@hookform/resolvers"
echo ""

echo "=========================================="
echo "Verification Complete"
echo "=========================================="
echo ""
echo "Dependencies with 0 imports can be safely removed."
