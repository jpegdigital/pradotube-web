#!/usr/bin/env pwsh
# Launches Claude Code with Supabase MCP secrets pulled from 1Password.
$env:SUPABASE_ACCESS_TOKEN = op read "op://Developer/Supabase pof4/access_token"
$env:SUPABASE_PROJECT_REF  = op read "op://Developer/Supabase pof4/project_ref"
claude @args
