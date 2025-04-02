#!/bin/bash
# This script syncs the local resources/ Consent History API OpenAPI spec file
# with the latest from the API models package.

# URL of the OpenAPI spec file
openApiSpecUrl="https://raw.githubusercontent.com/Consent-Management-Platform/consent-history-api-models/refs/heads/main/openapi/ConsentHistoryApi.openapi.json"

# Output file path
outputFilePath="$(dirname "$0")/../resources/ConsentHistoryApi.openapi.json"

# Download the OpenAPI spec file
curl -o "$outputFilePath" "$openApiSpecUrl"

# Check if the download was successful
if [ $? -eq 0 ]; then
  echo "Successfully synced Consent History API OpenAPI spec file."
else
  echo "Error downloading Consent History API OpenAPI spec file."
  exit 1
fi
