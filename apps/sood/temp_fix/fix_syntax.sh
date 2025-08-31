#!/bin/bash

# Path to the file with syntax errors
input_file="/Users/aekbhisit/Project/AI Project/sood/src/app/member/dashboard/page.tsx"
output_file="/Users/aekbhisit/Project/AI Project/sood/src/app/member/dashboard/page.fixed.tsx"

# Make a backup of the original file
cp "$input_file" "${input_file}.original"

# Extract lines from 800-900 to see the problematic Recent Activity section
sed -n '800,900p' "$input_file" > "${input_file}.section"

# Create a fixed version by removing duplicate closing tags
cat "$input_file" | awk '
BEGIN { in_recent_activity = 0; skip_lines = 0; line_count = 0; }
{
  line_count++;
  # Check if we are in the Recent Activity section
  if (line_count >= 800 && line_count <= 900) {
    # This is the problematic section with duplicate closing tags
    if ($0 ~ /Recent Activity/) {
      in_recent_activity = 1;
      print $0;
    } else if (in_recent_activity && $0 ~ /<\/div>/ && line_count > 870) {
      # We are in the section with duplicate closing tags
      if (skip_lines == 0) {
        print $0;
        skip_lines = 1;
      } else {
        # Skip these lines to fix the syntax
        if (skip_lines > 6) {
          # Start printing again after skipping 7 duplicate closing tags
          skip_lines = 0;
          print "              </div>";
          print "            )}";
        } else {
          skip_lines++;
        }
      }
    } else {
      print $0;
    }
  } else {
    print $0;
  }
}' > "$output_file"

# Check if the fixed file exists
if [ -f "$output_file" ]; then
  echo "Fixed file created at: $output_file"
  echo "You can replace the original with: mv \"$output_file\" \"$input_file\""
else
  echo "Failed to create fixed file."
fi