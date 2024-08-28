#!/bin/sh

# This script runs inside the container, do not run manually.

k6 run --config "${OPTIONS_FILE}" --summary-export /reports/eas-test-output.json characteristicsTests.js --insecure-skip-tls-verify --quiet
while true ; do sleep 600s ; done > /dev/null