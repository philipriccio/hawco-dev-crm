#!/bin/bash
# Script to import coverage data via API

API_URL="${API_URL:-https://hawco-dev-crm.vercel.app}"

echo "Importing coverage to $API_URL..."

# Parse and import each coverage file
for file in /tmp/openclaw/downloads/*_Coverage.txt; do
  echo "Processing: $(basename "$file")"
  
  # Read the file
  content=$(cat "$file")
  
  # Extract fields using grep/awk (simplified parsing)
  title=$(echo "$content" | grep -A1 "^Title$" | tail -1 | tr -d '\n')
  writer=$(echo "$content" | grep -A1 "^Writer$" | tail -1 | tr -d '\n')
  format=$(echo "$content" | grep -A1 "^Format$" | tail -1 | tr -d '\n')
  source=$(echo "$content" | grep -A1 "^Source$" | tail -1 | tr -d '\n')
  draft_date=$(echo "$content" | grep -A1 "^Draft Date$" | tail -1 | tr -d '\n')
  
  # Extract logline (everything between LOGLINE: and THE SCORECARD)
  logline=$(echo "$content" | sed -n '/^LOGLINE:/,/THE SCORECARD/p' | sed '1d;$d' | tr -d '\n' | sed 's/^[[:space:]]*//')
  
  # Extract scores
  concept=$(echo "$content" | grep -A1 "^Concept$" | tail -1 | tr -d '\n')
  characters=$(echo "$content" | grep -A1 "^Characters$" | tail -1 | tr -d '\n')
  structure=$(echo "$content" | grep -A1 "^Structure$" | tail -1 | tr -d '\n')
  dialogue=$(echo "$content" | grep -A1 "^Dialogue$" | tail -1 | tr -d '\n')
  market_fit=$(echo "$content" | grep -A1 "^Market Fit$" | tail -1 | tr -d '\n')
  
  # Extract verdict
  verdict=$(echo "$content" | grep -A1 "VERDICT" | tail -1 | tr -d '\n' | awk '{print $1}')
  
  # Create JSON payload
  json=$(cat <<EOF
{
  "title": "$title",
  "writer": "$writer",
  "format": "$format",
  "source": "$source",
  "draftDate": "$draft_date",
  "logline": "$logline",
  "dateRead": "$(date -I)",
  "reader": "Phil",
  "scoreConcept": ${concept:-null},
  "scoreCharacters": ${characters:-null},
  "scoreStructure": ${structure:-null},
  "scoreDialogue": ${dialogue:-null},
  "scoreMarketFit": ${market_fit:-null},
  "verdict": "${verdict:-PASS}"
}
EOF
)
  
  echo "  Title: $title"
  echo "  Writer: $writer"
  echo "  Verdict: $verdict"
  
  # Send to API
  response=$(curl -s -X POST "$API_URL/api/coverage" \
    -H "Content-Type: application/json" \
    -d "$json" 2>&1)
  
  if echo "$response" | grep -q '"id"'; then
    echo "  ✓ Imported successfully"
  else
    echo "  ✗ Failed: $response"
  fi
  
  echo ""
done

echo "Import complete!"
