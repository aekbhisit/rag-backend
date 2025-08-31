#!/bin/bash

# Backup the original file
cp "/Users/aekbhisit/Project/AI Project/sood/src/app/member/dashboard/page.tsx" "/Users/aekbhisit/Project/AI Project/sood/src/app/member/dashboard/page.tsx.backup"

# Replace the problematic line using sed
sed -i '' 's/<div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">/<!-- Recent Activity -->\n                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">/' "/Users/aekbhisit/Project/AI Project/sood/src/app/member/dashboard/page.tsx"

# Replace the duplicate closing tags
sed -i '' -e '850,900s/<\/div>[[:space:]]*<\/div>[[:space:]]*<\/div>[[:space:]]*<\/div>[[:space:]]*<\/div>[[:space:]]*<\/div>[[:space:]]*<\/div>/<\/div>\n              <\/div>\n            )}/' "/Users/aekbhisit/Project/AI Project/sood/src/app/member/dashboard/page.tsx"

echo "Fixed JSX syntax errors in dashboard page."