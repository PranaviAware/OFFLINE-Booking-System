#!/usr/bin/env pwsh
# ==============================================================================
# Keycloak Auto-Configuration Script for Office Link
# Creates: realm, client (PKCE), roles (admin/user), test users
# ==============================================================================

$KC_BASE  = "http://localhost:8080"
$ADMIN_USER = "admin"
$ADMIN_PASS = "admin"
$REALM    = "officelink"
$CLIENT   = "officelink-frontend"
$REDIRECT = "http://localhost:5173/*"
$WEB_ORIGIN = "http://localhost:5173"

Write-Host "`n🔑 Getting admin access token..." -ForegroundColor Cyan
$tokenResp = Invoke-RestMethod -Method POST `
  -Uri "$KC_BASE/realms/master/protocol/openid-connect/token" `
  -ContentType "application/x-www-form-urlencoded" `
  -Body "client_id=admin-cli&username=$ADMIN_USER&password=$ADMIN_PASS&grant_type=password"
$TOKEN = $tokenResp.access_token
$H = @{ Authorization = "Bearer $TOKEN"; "Content-Type" = "application/json" }

# ── 1. Create Realm ────────────────────────────────────────────────────────
Write-Host "🌍 Creating realm '$REALM'..." -ForegroundColor Cyan
$realmBody = @{
  realm            = $REALM
  displayName      = "Office Link"
  enabled          = $true
  registrationAllowed = $false
  loginWithEmailAllowed = $true
  duplicateEmailsAllowed = $false
  sslRequired      = "none"
  accessTokenLifespan = 1800
} | ConvertTo-Json
try {
  Invoke-RestMethod -Method POST -Uri "$KC_BASE/admin/realms" -Headers $H -Body $realmBody | Out-Null
  Write-Host "  ✔ Realm '$REALM' created" -ForegroundColor Green
} catch {
  Write-Host "  ℹ Realm '$REALM' already exists, continuing..." -ForegroundColor Yellow
}

# ── 2. Create Roles ────────────────────────────────────────────────────────
Write-Host "👥 Creating realm roles..." -ForegroundColor Cyan
foreach ($role in @("admin", "user")) {
  $roleBody = @{ name = $role; description = "Office Link $role role" } | ConvertTo-Json
  try {
    Invoke-RestMethod -Method POST -Uri "$KC_BASE/admin/realms/$REALM/roles" -Headers $H -Body $roleBody | Out-Null
    Write-Host "  ✔ Role '$role' created" -ForegroundColor Green
  } catch {
    Write-Host "  ℹ Role '$role' already exists" -ForegroundColor Yellow
  }
}

# ── 3. Create Frontend Client (Public, PKCE) ───────────────────────────────
Write-Host "🔧 Creating OIDC client '$CLIENT'..." -ForegroundColor Cyan
$clientBody = @{
  clientId                  = $CLIENT
  name                      = "Office Link Frontend"
  enabled                   = $true
  publicClient              = $true
  standardFlowEnabled       = $true
  implicitFlowEnabled       = $false
  directAccessGrantsEnabled = $false
  serviceAccountsEnabled    = $false
  redirectUris              = @($REDIRECT, "http://localhost:5173/auth/callback", "http://localhost:5173/")
  webOrigins                = @($WEB_ORIGIN, "+")
  protocol                  = "openid-connect"
  attributes = @{
    "pkce.code.challenge.method" = "S256"
    "post.logout.redirect.uris"  = "http://localhost:5173/*"
  }
} | ConvertTo-Json -Depth 5
try {
  Invoke-RestMethod -Method POST -Uri "$KC_BASE/admin/realms/$REALM/clients" -Headers $H -Body $clientBody | Out-Null
  Write-Host "  ✔ Client '$CLIENT' created with PKCE" -ForegroundColor Green
} catch {
  Write-Host "  ℹ Client '$CLIENT' already exists" -ForegroundColor Yellow
}

# Get client internal ID for role mapping
$clients = Invoke-RestMethod -Uri "$KC_BASE/admin/realms/$REALM/clients?clientId=$CLIENT" -Headers $H
$clientUUID = $clients[0].id

# ── 4. Add 'roles' mapper to include realm_access in token ─────────────────
Write-Host "🗺  Adding realm roles mapper to client token..." -ForegroundColor Cyan
$mapperBody = @{
  name            = "realm-roles"
  protocol        = "openid-connect"
  protocolMapper  = "oidc-usermodel-realm-role-mapper"
  consentRequired = $false
  config = @{
    "multivalued"         = "true"
    "userinfo.token.claim"= "true"
    "id.token.claim"      = "true"
    "access.token.claim"  = "true"
    "claim.name"          = "roles"
    "jsonType.label"      = "String"
  }
} | ConvertTo-Json -Depth 5
try {
  Invoke-RestMethod -Method POST -Uri "$KC_BASE/admin/realms/$REALM/clients/$clientUUID/protocol-mappers/models" `
    -Headers $H -Body $mapperBody | Out-Null
  Write-Host "  ✔ Realm roles mapper added" -ForegroundColor Green
} catch {
  Write-Host "  ℹ Roles mapper already exists" -ForegroundColor Yellow
}

# ── 5. Create Users ────────────────────────────────────────────────────────
Write-Host "👤 Creating test users..." -ForegroundColor Cyan
$users = @(
  @{ username="admin.kpit"; email="admin@kpit.com"; firstName="KPIT"; lastName="Admin"; role="admin"; password="Admin@123" },
  @{ username="bob.employee"; email="bob@kpit.com"; firstName="Bob"; lastName="Employee"; role="user"; password="User@123" },
  @{ username="charlie.employee"; email="charlie@kpit.com"; firstName="Charlie"; lastName="Employee"; role="user"; password="User@123" }
)

foreach ($u in $users) {
  $userBody = @{
    username      = $u.username
    email         = $u.email
    firstName     = $u.firstName
    lastName      = $u.lastName
    enabled       = $true
    emailVerified = $true
    credentials   = @(@{ type="password"; value=$u.password; temporary=$false })
  } | ConvertTo-Json -Depth 5

  try {
    Invoke-RestMethod -Method POST -Uri "$KC_BASE/admin/realms/$REALM/users" -Headers $H -Body $userBody | Out-Null
    Write-Host "  ✔ User '$($u.email)' created" -ForegroundColor Green
  } catch {
    Write-Host "  ℹ User '$($u.email)' already exists" -ForegroundColor Yellow
  }

  # Assign role
  $userSearch = Invoke-RestMethod -Uri "$KC_BASE/admin/realms/$REALM/users?email=$($u.email)" -Headers $H
  $userId = $userSearch[0].id
  $roleObj = Invoke-RestMethod -Uri "$KC_BASE/admin/realms/$REALM/roles/$($u.role)" -Headers $H
  $roleMapping = @($roleObj) | ConvertTo-Json
  Invoke-RestMethod -Method POST `
    -Uri "$KC_BASE/admin/realms/$REALM/users/$userId/role-mappings/realm" `
    -Headers $H -Body $roleMapping | Out-Null
  Write-Host "  ✔ Assigned role '$($u.role)' to '$($u.email)'" -ForegroundColor Green
}

Write-Host "`n✅ Keycloak configuration complete!" -ForegroundColor Green
Write-Host "─────────────────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host "  Realm:      $REALM" -ForegroundColor White
Write-Host "  Client:     $CLIENT (Public + PKCE)" -ForegroundColor White
Write-Host "  Admin URL:  http://localhost:8080/admin" -ForegroundColor White
Write-Host "  OIDC URL:   http://localhost:8080/realms/$REALM" -ForegroundColor White
Write-Host "─────────────────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host "  Test Users:" -ForegroundColor White
Write-Host "    admin@kpit.com  / Admin@123  (role: admin)" -ForegroundColor Cyan
Write-Host "    bob@kpit.com    / User@123   (role: user)" -ForegroundColor Cyan
Write-Host "    charlie@kpit.com/ User@123   (role: user)" -ForegroundColor Cyan
Write-Host "─────────────────────────────────────────────────────`n" -ForegroundColor DarkGray
