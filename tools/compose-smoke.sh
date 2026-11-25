#!/usr/bin/env bash
set -euo pipefail
# Only run against an isolated disposable test database; this creates a test user.
base="http://127.0.0.1:${HOST_PORT:-3000}"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
username="ci_$(date +%s)_${RANDOM}"
password="Test-only-${RANDOM}-${RANDOM}"

expect_response() {
    local label=$1 expected_status=$2 redirect=$3 status
    shift 3
    if ! status=$(curl --noproxy '*' --silent --show-error --max-time 15 \
        -o /dev/null -D "$tmp/headers" -w '%{http_code}' "$@"); then
        printf 'FAIL %s: HTTP request failed\n' "$label" >&2
        return 1
    fi
    if [[ "$status" != "$expected_status" ]]; then
        printf 'FAIL %s: expected HTTP %s, got %s\n' "$label" "$expected_status" "$status" >&2
        return 1
    fi
    if [[ -n "$redirect" ]] && ! grep -Fxiq "Location: $redirect" < <(tr -d '\r' < "$tmp/headers"); then
        printf 'FAIL %s: expected redirect to %s\n' "$label" "$redirect" >&2
        return 1
    fi
    printf 'PASS %s: HTTP %s %s\n' "$label" "$status" "$redirect"
}

expect_response 'Login page' 200 '' "$base/login"
expect_response 'Unauthenticated OTT selection' 302 /login "$base/select-ott"
expect_response 'Register' 302 /login --data-urlencode "username=$username" \
    --data-urlencode "password=$password" --data-urlencode "confirmPassword=$password" "$base/register"
expect_response 'Login' 302 /select-ott -c "$tmp/cookies" --data-urlencode "username=$username" \
    --data-urlencode "password=$password" "$base/login"
if ! awk -F '\t' '$6 == "connect.sid" && length($7) { found = 1 } END { exit !found }' "$tmp/cookies"; then
    printf '%s\n' 'FAIL Login: session cookie missing' >&2
    exit 1
fi
printf '%s\n' 'PASS Login: session cookie present'
expect_response 'Authenticated OTT selection' 200 '' -b "$tmp/cookies" "$base/select-ott"
expect_response 'Wrong password' 401 '' --data-urlencode "username=$username" \
    --data-urlencode 'password=wrong-password' "$base/login"
