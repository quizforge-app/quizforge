#!/bin/sh
# Secret scanner — blocks commits containing known credential patterns.
# Installed at .git/hooks/pre-commit; canonical copy lives at
# scripts/pre-commit-secret-scan.sh (re-install with:
#   cp scripts/pre-commit-secret-scan.sh .git/hooks/pre-commit)

PATTERNS='sk-fish-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AQ\.Ab8[A-Za-z0-9_-]{10,}|BEGIN (RSA |EC )?PRIVATE KEY|RELEASE_(STORE|KEY)_PASSWORD=[A-Za-z0-9]'

FILES=$(git diff --cached --name-only --diff-filter=ACM)
if [ -z "$FILES" ]; then
  exit 0
fi

FAIL=0
for f in $FILES; do
  # never commit these files at all
  case "$f" in
    *keystore*|*.jks|apikey.txt|*.pem|keystore.properties|.env)
      echo "✗ BLOCKED: '$f' is a credential/secret file (see .gitignore)"
      FAIL=1
      continue
      ;;
  esac
  if git diff --cached -- "$f" | grep -Eq "$PATTERNS"; then
    echo "✗ BLOCKED: '$f' contains a credential pattern (Fish key, GitHub token, Gemini key, keystore password, or private key)"
    FAIL=1
  fi
done

if [ "$FAIL" = "1" ]; then
  echo ""
  echo "Commit rejected by the secret scanner."
  echo "If this is a false positive, bypass once with: git commit --no-verify"
  exit 1
fi
exit 0
