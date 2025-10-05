#!/bin/bash

# Design System Compliance Check Script
echo "🔍 Checking design system compliance..."

# Check for raw hex colors
echo "Checking for raw hex colors..."
HEX_VIOLATIONS=$(grep -r --include="*.tsx" --include="*.ts" -E "#[0-9a-fA-F]{3,6}" src/app/travel/ 2>/dev/null || true)

if [ ! -z "$HEX_VIOLATIONS" ]; then
    echo "❌ Raw hex colors found:"
    echo "$HEX_VIOLATIONS"
    exit 1
fi

echo "✅ No design system violations found!"
