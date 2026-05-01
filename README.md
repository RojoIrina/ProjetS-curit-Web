<div align="center">

# 🛡️ CertiVerify — Plateforme de Certification par Signature Numérique

**Système infalsifiable de génération, signature et vérification de documents académiques**

[![Stack](https://img.shields.io/badge/Stack-Node.js_|_React_|_PostgreSQL-4f46e5?style=for-the-badge)](.) [![Crypto](https://img.shields.io/badge/Crypto-RSA--2048_|_SHA--256-0f172a?style=for-the-badge)](.) [![License](https://img.shields.io/badge/License-Proprietary-10b981?style=for-the-badge)](.)

</div>

---

## Table des Matières

1. [Audit de l'Existant](#1-audit-de-lexistant)
2. [Architecture Technique & Schéma DB](#2-architecture-technique--schéma-db)
3. [Spécifications de Sécurité](#3-spécifications-de-sécurité)
4. [Guide de Déploiement Sécurisé](#4-guide-de-déploiement-sécurisé)
5. [Design System — "Trust & Security"](#5-design-system--trust--security)
6. [Roadmap de Développement](#6-roadmap-de-développement)
7. [🚀 Quick Start — Lancement du Site](#7--quick-start--lancement-du-site)

---

## 1. Audit de l'Existant

### 1.1 Résumé Critique

L'état actuel du projet est un **prototype frontend-only**. Aucune des promesses de sécurité affichées dans l'interface n'est réellement implémentée. Voici le verdict complet :

| Domaine | État actuel | Risque | Détail |
|---|---|---|---|
| **Backend** | ❌ Aucun | 🔴 Critique | Tout est exécuté côté client (React). Aucune API REST. |
| **Base de données** | ❌ `localStorage` | 🔴 Critique | Données éphémères, aucune persistance, modifiables via DevTools. |
| **Authentification** | ❌ Mots de passe en clair | 🔴 Critique | `password: 'admin'` codé en dur dans `StoreContext.tsx:27`. |
| **Hachage certificats** | ❌ `btoa()` (encodage Base64) | 🔴 Critique | Ce n'est **pas** du hachage cryptographique. `btoa()` est réversible en 1 seconde. |
| **Signature numérique** | ❌ Chaîne factice | 🔴 Critique | `hash: 'H4SH-SC-3OWSX6ULH'` — aucune signature RSA/ECDSA. |
| **Génération d'ID** | ⚠️ `Math.random()` | 🟠 Élevé | Prédictible. Un attaquant peut forger des IDs valides. |
| **Protection des routes** | ⚠️ Client-side `<Navigate>` | 🟠 Élevé | Sans backend, tout est contournable via la console. |
| **QR Code** | ⚠️ Pointe vers une URL non sécurisée | 🟡 Moyen | Le QR code existe mais la vérification sous-jacente est factice. |
| **Validation d'entrées** | ⚠️ Minimale | 🟡 Moyen | Seul un `.toUpperCase()` et un filtre de longueur existent. |

### 1.2 Fichiers Analysés

```
src/
├── App.tsx                          # Routeur, Layout — pas de guards serveur
├── main.tsx                         # Point d'entrée React
├── types.ts                         # Interfaces — Certificate.hash est un "dummy"
├── index.css                        # Styles Tailwind
├── context/StoreContext.tsx          # ⚠️ CRITIQUE: toute la logique métier ici
│                                    #   - Mots de passe en clair
│                                    #   - btoa() au lieu de SHA-256
│                                    #   - Math.random() pour les IDs
│                                    #   - localStorage comme "DB"
├── hooks/useStore.ts                # Simple re-export
├── pages/
│   ├── Home.tsx                     # Page d'accueil + vérificateur public
│   ├── Login.tsx                    # ⚠️ Identifiants de test affichés dans l'UI
│   ├── Admin/
│   │   ├── AdminDashboard.tsx       # Stats admin
│   │   ├── UserCRUD.tsx             # Gestion utilisateurs (pas de validation serveur)
│   │   └── ModuleCRUD.tsx           # Gestion modules
│   └── Student/
│       ├── StudentDashboard.tsx     # Progression + émission certificat
│       └── CertificateView.tsx      # Affichage + PDF + QR Code
```

### 1.3 Vulnérabilités Exploitables

```javascript
// ❌ VULN #1 : Mot de passe en clair — StoreContext.tsx:27
{ password: 'admin', role: 'admin' }

// ❌ VULN #2 : "Hash" = simple encodage Base64 réversible — StoreContext.tsx:127
hash: btoa(`${student.id}-${Date.now()}`).substr(0, 16)
// → atob('a3R3M3NxcnZ2LTE3') = données en clair

// ❌ VULN #3 : ID prédictible — StoreContext.tsx:123
id: Math.random().toString(36).substr(2, 9).toUpperCase()
// → Math.random() utilise un PRNG non-crypto, seed prédictible

// ❌ VULN #4 : Comparaison de mot de passe sans timing-safe — StoreContext.tsx:98
const user = users.find(u => u.email === email && u.password === password);
// → Pas de bcrypt.compare(), vulnérable aux timing attacks
```

---

## 2. Architecture Technique & Schéma DB

### 2.1 Architecture Cible

```mermaid
graph TB
    subgraph CLIENT["🖥️ Frontend — React / Vite / TypeScript"]
        UI["Interface Utilisateur"]
        QR["QR Code Scanner"]
        PDF["Générateur PDF"]
    end

    subgraph API["⚙️ Backend — Node.js / Express"]
        AUTH["Module Auth<br/>JWT + bcrypt"]
        CERT["Module Certificats<br/>Émission & Vérification"]
        CRYPTO["Module Crypto<br/>RSA-2048 + SHA-256"]
        AUDIT["Module Audit<br/>Logging sécurisé"]
        MW["Middlewares<br/>Rate Limit, CORS, Helmet"]
    end

    subgraph DB["🗄️ PostgreSQL"]
        USERS["users"]
        INST["institutions"]
        CERTS["certificates"]
        KEYS["key_pairs"]
        LOGS["verification_logs"]
        MODS["modules"]
    end

    subgraph VAULT["🔐 Secrets Manager"]
        HSM["HSM / Vault<br/>Stockage clé privée"]
    end

    UI -->|HTTPS/TLS 1.3| MW
    QR -->|API Call| CERT
    MW --> AUTH
    MW --> CERT
    MW --> AUDIT
    CERT --> CRYPTO
    CRYPTO -->|Sign/Verify| HSM
    AUTH --> USERS
    CERT --> CERTS
    CERT --> KEYS
    AUDIT --> LOGS

    style CLIENT fill:#f8fafc,stroke:#e2e8f0,color:#0f172a
    style API fill:#eef2ff,stroke:#c7d2fe,color:#312e81
    style DB fill:#f0fdf4,stroke:#bbf7d0,color:#14532d
    style VAULT fill:#fef2f2,stroke:#fecaca,color:#7f1d1d
```

### 2.2 Schéma PostgreSQL

> **Philosophie** : Chaque certificat est lié à une paire de clés cryptographiques appartenant à l'institution émettrice. La clé privée n'est **jamais** stockée en base — seule la clé publique y réside. La clé privée est dans un HSM ou un vault chiffré.

```sql
-- ================================================================
-- CERTIVERIFY — Schéma PostgreSQL de Production
-- ================================================================

-- Extension pour la génération d'UUID v4 cryptographiquement sûrs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ────────────────────────────────────────────────────────────────
-- TABLE: institutions
-- Organismes habilités à émettre des certificats
-- ────────────────────────────────────────────────────────────────
CREATE TABLE institutions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    domain          VARCHAR(255) NOT NULL UNIQUE,   -- ex: "sorbonne.fr"
    logo_url        TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────
-- TABLE: users
-- Administrateurs et étudiants, avec mots de passe bcrypt
-- ────────────────────────────────────────────────────────────────
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id  UUID REFERENCES institutions(id) ON DELETE SET NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,          -- bcrypt, JAMAIS en clair
    full_name       VARCHAR(255) NOT NULL,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'student', 'verifier')),
    is_active       BOOLEAN DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_institution ON users(institution_id);

-- ────────────────────────────────────────────────────────────────
-- TABLE: key_pairs
-- Paires de clés RSA par institution. CLÉ PRIVÉE = référence HSM.
-- ────────────────────────────────────────────────────────────────
CREATE TABLE key_pairs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    public_key_pem  TEXT NOT NULL,                  -- Clé publique RSA-2048 (PEM)
    private_key_ref VARCHAR(512) NOT NULL,          -- Référence HSM/Vault (JAMAIS la clé brute)
    algorithm       VARCHAR(50) DEFAULT 'RSA-SHA256',
    key_size        INTEGER DEFAULT 2048,
    is_active       BOOLEAN DEFAULT TRUE,
    expires_at      TIMESTAMPTZ,                    -- Rotation obligatoire
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_keypairs_institution ON key_pairs(institution_id);

-- ────────────────────────────────────────────────────────────────
-- TABLE: modules
-- Cursus et formations (unités de compétence)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE modules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    credit_hours    INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────
-- TABLE: user_modules
-- Relation M:N — progression des étudiants dans les modules
-- ────────────────────────────────────────────────────────────────
CREATE TABLE user_modules (
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    module_id       UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    status          VARCHAR(20) DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'in_progress', 'completed')),
    completed_at    TIMESTAMPTZ,
    PRIMARY KEY (user_id, module_id)
);

-- ────────────────────────────────────────────────────────────────
-- TABLE: certificates
-- Cœur du système : chaque ligne = un diplôme signé numériquement
-- ────────────────────────────────────────────────────────────────
CREATE TABLE certificates (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_uid     VARCHAR(12) NOT NULL UNIQUE,    -- ID court public (ex: "WF6FOFBPV")
    student_id          UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    institution_id      UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
    issued_by           UUID NOT NULL REFERENCES users(id),  -- Admin qui a signé
    key_pair_id         UUID NOT NULL REFERENCES key_pairs(id),

    -- Données du certificat
    title               VARCHAR(500) NOT NULL,          -- Intitulé du diplôme
    student_name        VARCHAR(255) NOT NULL,           -- Nom gravé sur le certificat
    description         TEXT,

    -- Sécurité cryptographique
    document_hash       VARCHAR(128) NOT NULL,           -- SHA-256 du contenu canonique
    digital_signature   TEXT NOT NULL,                   -- Signature RSA du hash (Base64)
    canonical_data      JSONB NOT NULL,                  -- Données canoniques signées

    -- Métadonnées
    issued_at           TIMESTAMPTZ DEFAULT NOW(),
    expires_at          TIMESTAMPTZ,                     -- NULL = validité permanente
    revoked_at          TIMESTAMPTZ,                     -- NULL = actif
    revocation_reason   TEXT,

    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_cert_uid ON certificates(certificate_uid);
CREATE INDEX idx_cert_student ON certificates(student_id);
CREATE INDEX idx_cert_institution ON certificates(institution_id);

-- ────────────────────────────────────────────────────────────────
-- TABLE: verification_logs
-- Journal immuable de chaque tentative de vérification
-- ────────────────────────────────────────────────────────────────
CREATE TABLE verification_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_id  UUID REFERENCES certificates(id) ON DELETE SET NULL,
    certificate_uid VARCHAR(12),                        -- Copie pour audit si cert supprimé
    method          VARCHAR(30) NOT NULL CHECK (method IN ('id_lookup', 'qr_scan', 'file_upload', 'api')),
    result          VARCHAR(20) NOT NULL CHECK (result IN ('valid', 'invalid', 'revoked', 'expired', 'not_found')),
    ip_address      INET,
    user_agent      TEXT,
    metadata        JSONB,                              -- Détails supplémentaires
    verified_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_verif_cert ON verification_logs(certificate_id);
CREATE INDEX idx_verif_date ON verification_logs(verified_at DESC);

-- ────────────────────────────────────────────────────────────────
-- TABLE: audit_trail
-- Log immutable de toutes les actions sensibles
-- ────────────────────────────────────────────────────────────────
CREATE TABLE audit_trail (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    action          VARCHAR(100) NOT NULL,              -- ex: 'certificate.issued', 'user.login'
    resource_type   VARCHAR(50),                        -- ex: 'certificate', 'user', 'key_pair'
    resource_id     UUID,
    details         JSONB,
    ip_address      INET,
    performed_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_trail(user_id);
CREATE INDEX idx_audit_action ON audit_trail(action);
CREATE INDEX idx_audit_date ON audit_trail(performed_at DESC);
```

### 2.3 Diagramme Entité-Relation

```mermaid
erDiagram
    INSTITUTIONS ||--o{ USERS : "emploie"
    INSTITUTIONS ||--o{ KEY_PAIRS : "possède"
    INSTITUTIONS ||--o{ MODULES : "propose"
    INSTITUTIONS ||--o{ CERTIFICATES : "émet"

    USERS ||--o{ USER_MODULES : "suit"
    MODULES ||--o{ USER_MODULES : "contient"

    USERS ||--o{ CERTIFICATES : "reçoit"
    KEY_PAIRS ||--o{ CERTIFICATES : "signe"

    CERTIFICATES ||--o{ VERIFICATION_LOGS : "vérifié par"
    USERS ||--o{ AUDIT_TRAIL : "déclenche"

    INSTITUTIONS {
        UUID id PK
        VARCHAR name
        VARCHAR domain UK
        BOOLEAN is_active
    }

    USERS {
        UUID id PK
        UUID institution_id FK
        VARCHAR email UK
        VARCHAR password_hash
        VARCHAR role
    }

    KEY_PAIRS {
        UUID id PK
        UUID institution_id FK
        TEXT public_key_pem
        VARCHAR private_key_ref
        VARCHAR algorithm
        TIMESTAMPTZ expires_at
    }

    CERTIFICATES {
        UUID id PK
        VARCHAR certificate_uid UK
        UUID student_id FK
        UUID key_pair_id FK
        VARCHAR document_hash
        TEXT digital_signature
        JSONB canonical_data
    }

    VERIFICATION_LOGS {
        UUID id PK
        UUID certificate_id FK
        VARCHAR method
        VARCHAR result
        INET ip_address
    }
```

---

## 3. Spécifications de Sécurité

### 3.1 Infrastructure de Clé Publique (PKI)

CertiVerify repose sur une **PKI privée** où chaque institution possède sa propre paire de clés RSA :

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUX DE SIGNATURE PKI                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. CANONICALISATION                                            │
│     Données du certificat → JSON canonique trié                 │
│     (même données = même sortie, toujours)                      │
│                                                                 │
│  2. HACHAGE                                                     │
│     SHA-256(canonical_json) → hash 256 bits (64 hex chars)      │
│     Propriétés : déterministe, irréversible, anti-collision     │
│                                                                 │
│  3. SIGNATURE                                                   │
│     RSA-2048.sign(hash, private_key) → signature Base64         │
│     Seul le détenteur de la clé privée peut produire ceci       │
│                                                                 │
│  4. VÉRIFICATION (par n'importe qui)                            │
│     RSA-2048.verify(hash, signature, public_key) → true/false   │
│     La clé publique est diffusée librement                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Implémentation Backend — Signature RSA

```typescript
// ──────────────────────────────────────────────────────
// crypto.service.ts — Module de signature numérique
// ──────────────────────────────────────────────────────
import crypto from 'node:crypto';

interface CertificatePayload {
  studentName: string;
  studentId: string;
  institutionId: string;
  title: string;
  issuedAt: string;
  certificateUid: string;
}

/**
 * Étape 1 : Canonicalisation
 * Trie les clés alphabétiquement pour garantir un résultat déterministe.
 * Même données = même JSON = même hash, TOUJOURS.
 */
function canonicalize(payload: CertificatePayload): string {
  const sorted = Object.keys(payload)
    .sort()
    .reduce((acc, key) => {
      acc[key] = payload[key as keyof CertificatePayload];
      return acc;
    }, {} as Record<string, string>);
  return JSON.stringify(sorted);
}

/**
 * Étape 2 : Hachage SHA-256
 * Produit une empreinte de 256 bits (64 caractères hexadécimaux).
 * Propriétés cruciales :
 * - Déterministe : même entrée → même sortie
 * - Irréversible : impossible de retrouver l'entrée depuis le hash
 * - Résistance aux collisions : quasi-impossible de trouver 2 entrées
 *   produisant le même hash (probabilité ≈ 1/2^128)
 */
function hashDocument(canonicalJson: string): string {
  return crypto
    .createHash('sha256')
    .update(canonicalJson, 'utf8')
    .digest('hex');
}

/**
 * Étape 3 : Signature RSA-2048
 * Utilise la clé privée de l'institution pour signer le hash.
 *
 * Pourquoi RSA-2048 ?
 * - Standard industriel (NIST, ANSSI)
 * - 2048 bits = sécurité estimée jusqu'en 2030+
 * - Support natif dans Node.js crypto
 * - Compatible avec les normes eIDAS européennes
 */
function signHash(hash: string, privateKeyPem: string): string {
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(hash);
  signer.end();
  return signer.sign(privateKeyPem, 'base64');
}

/**
 * Étape 4 : Vérification (publique, sans clé privée)
 * N'importe qui peut vérifier avec la clé publique.
 * Retourne true si et seulement si :
 * - Le hash correspond aux données du certificat
 * - La signature a été produite par la clé privée associée
 */
function verifySignature(
  hash: string,
  signatureBase64: string,
  publicKeyPem: string
): boolean {
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(hash);
  verifier.end();
  return verifier.verify(publicKeyPem, signatureBase64, 'base64');
}

/**
 * Génération de paire de clés RSA-2048
 * En production, la clé privée DOIT être stockée dans un HSM
 * (Hardware Security Module) ou un vault chiffré (HashiCorp Vault).
 * JAMAIS en base de données, JAMAIS dans le code source.
 */
function generateKeyPair(): { publicKey: string; privateKey: string } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding:  { type: 'spki',  format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { publicKey, privateKey };
}
```

### 3.3 Authentification & Sessions

| Mécanisme | Technologie | Justification |
|---|---|---|
| **Hachage mots de passe** | `bcrypt` (cost factor 12) | Résistant au brute-force GPU grâce à sa lenteur configurable |
| **Sessions** | JWT (RS256) signé avec une clé RSA dédiée | Stateless, vérifiable sans appel DB à chaque requête |
| **Refresh tokens** | Stockés en DB avec expiration | Permet la révocation explicite des sessions |
| **Rate limiting** | `express-rate-limit` (100 req/15min/IP) | Protège contre brute-force et DDoS L7 |
| **CSRF** | Token `csurf` + cookie `SameSite=Strict` | Protège les mutations POST/PUT/DELETE |

```typescript
// ──────────────────────────────────────────────────
// auth.service.ts — Hachage bcrypt
// ──────────────────────────────────────────────────
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12; // ~250ms par hash — volontairement lent

async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  // bcrypt.compare est timing-safe (résistant aux timing attacks)
  return bcrypt.compare(plaintext, hash);
}
```

### 3.4 Protection du QR Code

Le QR code actuel pointe vers `/?verify=ID`. C'est insuffisant car l'ID peut être deviné. La version sécurisée inclut un **HMAC** :

```typescript
// QR Code signé avec HMAC-SHA256
import crypto from 'node:crypto';

const QR_SECRET = process.env.QR_HMAC_SECRET!;

function generateSecureQRPayload(certificateUid: string): string {
  const hmac = crypto
    .createHmac('sha256', QR_SECRET)
    .update(certificateUid)
    .digest('hex')
    .substring(0, 16); // 16 premiers caractères suffisent

  // URL: /verify?uid=WF6FOFBPV&sig=a3b8d1b6e2c7f4e9
  return `${process.env.APP_URL}/verify?uid=${certificateUid}&sig=${hmac}`;
}

function verifyQRPayload(uid: string, sig: string): boolean {
  const expected = crypto
    .createHmac('sha256', QR_SECRET)
    .update(uid)
    .digest('hex')
    .substring(0, 16);
  // Comparaison timing-safe pour éviter les timing attacks
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}
```

### 3.5 Pourquoi ces choix cryptographiques ?

| Question | Réponse |
|---|---|
| **Pourquoi SHA-256 et pas MD5/SHA-1 ?** | MD5 et SHA-1 sont cassés (collisions trouvées). SHA-256 offre une résistance aux collisions de 2^128 opérations. |
| **Pourquoi RSA-2048 et pas RSA-1024 ?** | RSA-1024 est considéré comme faible depuis 2013 (NIST). RSA-2048 est le minimum recommandé par l'ANSSI jusqu'en 2030. |
| **Pourquoi pas ECDSA ?** | ECDSA (P-256) est plus rapide et compact, mais RSA est mieux supporté par les outils institutionnels existants. Les deux sont acceptables. |
| **Pourquoi bcrypt et pas SHA-256 pour les mots de passe ?** | SHA-256 est **trop rapide** (~milliards/sec sur GPU). bcrypt est intentionnellement lent (~250ms) pour rendre le brute-force impraticable. |
| **Pourquoi ne pas stocker la clé privée en DB ?** | Si la DB est compromise (injection SQL, backup volé), toutes les signatures pourraient être forgées. Un HSM rend l'extraction physiquement impossible. |
| **Pourquoi `crypto.timingSafeEqual` ?** | Une comparaison `===` classique court-circuite au premier octet différent. Un attaquant peut mesurer le temps de réponse pour deviner l'HMAC octet par octet (*timing attack*). |

---

## 4. Guide de Déploiement Sécurisé

### 4.1 Variables d'Environnement

```bash
# ──────────────────────────────────────────────────
# .env — NE JAMAIS COMMITER CE FICHIER
# ──────────────────────────────────────────────────

# ─── Base de données ───
DATABASE_URL="postgresql://certiverify:STRONG_PASSWORD@localhost:5432/certiverify_db?sslmode=require"

# ─── JWT ───
JWT_PRIVATE_KEY_PATH="/etc/certiverify/jwt-private.pem"   # RSA privée pour signer les JWT
JWT_PUBLIC_KEY_PATH="/etc/certiverify/jwt-public.pem"     # RSA publique pour vérifier
JWT_ACCESS_EXPIRY="15m"                                   # Courte durée de vie
JWT_REFRESH_EXPIRY="7d"

# ─── Cryptographie certificats ───
HSM_PROVIDER="aws-kms"                # ou "hashicorp-vault", "azure-keyvault"
HSM_KEY_ID="arn:aws:kms:eu-west-3:..." # Référence de la clé dans le HSM

# ─── Sécurité applicative ───
QR_HMAC_SECRET="<256-bit-random-hex>"
BCRYPT_ROUNDS=12
CORS_ORIGIN="https://certiverify.example.com"
RATE_LIMIT_WINDOW_MS=900000           # 15 minutes
RATE_LIMIT_MAX=100                    # 100 requêtes par fenêtre

# ─── Application ───
NODE_ENV="production"
PORT=3001
APP_URL="https://certiverify.example.com"
```

### 4.2 Middlewares Express (Configuration de Production)

```typescript
// ──────────────────────────────────────────────────
// server.ts — Configuration Express sécurisée
// ──────────────────────────────────────────────────
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

const app = express();

// ─── Headers de sécurité HTTP ───
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc:    ["'self'", "https://fonts.gstatic.com"],
      imgSrc:     ["'self'", "data:", "https:"],
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// ─── CORS strict ───
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

// ─── Rate Limiting global ───
app.use(rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS),
  max: Number(process.env.RATE_LIMIT_MAX),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes. Réessayez dans 15 minutes.' },
}));

// ─── Rate Limiting spécifique pour l'auth (plus strict) ───
app.use('/api/auth', rateLimit({
  windowMs: 900000,
  max: 10,  // Seulement 10 tentatives de login par 15 min
  message: { error: 'Trop de tentatives de connexion.' },
}));

app.use(express.json({ limit: '1mb' }));
```

### 4.3 Checklist Pré-Production

- [ ] `NODE_ENV=production` — désactive les stack traces détaillées
- [ ] HTTPS/TLS 1.3 via reverse proxy (Nginx/Caddy) — **jamais** de HTTP en production
- [ ] Certificat SSL Let's Encrypt ou certificat institutionnel
- [ ] `Strict-Transport-Security` (HSTS) activé
- [ ] Base de données avec `sslmode=require` (chiffrement en transit)
- [ ] Mots de passe DB avec au minimum 32 caractères aléatoires
- [ ] Clé privée RSA dans un HSM ou vault (jamais sur disque non chiffré)
- [ ] Sauvegardes chiffrées de la DB (AES-256) avec rotation quotidienne
- [ ] Logs structurés (JSON) avec rotation et rétention de 90 jours
- [ ] Monitoring avec alerting (temps de réponse, taux d'erreur, tentatives de brute-force)
- [ ] `.env` dans `.gitignore` — **vérifié** manuellement
- [ ] `npm audit` sans vulnérabilité haute/critique
- [ ] Désactiver les ports non utilisés (firewall `ufw` ou équivalent)

---

## 5. Design System — "Trust & Security"

### 5.1 Direction Artistique

> **Concept** : "Confiance Institutionnelle Numérique" — Un design qui inspire la même confiance qu'un document officiel tamponné, mais avec la modernité d'une application SaaS premium.

**Inspirations** : Apple Certificate Viewer, Stripe Identity, Estonian e-Residency.

### 5.2 Palette de Couleurs

```
┌──────────────────────────────────────────────────────────────┐
│                    CERTIVERIFY PALETTE                        │
├──────────────┬───────────┬───────────────────────────────────┤
│  Token       │  Hex      │  Usage                            │
├──────────────┼───────────┼───────────────────────────────────┤
│  slate-950   │  #0f172a  │  Texte principal, navbar, footer  │
│  slate-500   │  #64748b  │  Texte secondaire                 │
│  slate-100   │  #f1f5f9  │  Bordures, séparateurs            │
│  slate-50    │  #f8fafc  │  Fond de page                     │
│              │           │                                   │
│  indigo-600  │  #4f46e5  │  Accent principal, CTA            │
│  indigo-50   │  #eef2ff  │  Fond accent léger                │
│              │           │                                   │
│  emerald-500 │  #10b981  │  Succès, certificat valide        │
│  emerald-50  │  #ecfdf5  │  Fond succès                      │
│              │           │                                   │
│  rose-500    │  #f43f5e  │  Erreur, certificat invalide      │
│  rose-50     │  #fff1f2  │  Fond erreur                      │
│              │           │                                   │
│  amber-500   │  #f59e0b  │  Warning, certificat expiré       │
│  white       │  #ffffff  │  Cartes, modals, certificat PDF   │
└──────────────┴───────────┴───────────────────────────────────┘
```

### 5.3 Typographie

| Rôle | Police | Weight | Usage |
|---|---|---|---|
| **Sans-serif** | Inter | 400–900 | Interface générale, navigation, formulaires |
| **Serif** | Playfair Display | 900 / 900i | Héros, titres du certificat, citations |
| **Monospace** | JetBrains Mono | 400–700 | Hashes, IDs certificats, code, QR payloads |

### 5.4 Composants Clés

| Composant | Spécification |
|---|---|
| **Cartes Bento** | `border-radius: 1.5rem`, `border: 1px solid slate-200`, `shadow-sm` |
| **Boutons Primaires** | `bg-slate-950`, `hover:bg-indigo-600`, `rounded-xl`, `font-bold` |
| **Champs de saisie** | `bg-slate-50`, `rounded-2xl`, `focus:ring-4 ring-indigo-500/10` |
| **Badges de statut** | Arrondis `pill`, micro-text `10px`, `uppercase`, `tracking-widest` |
| **Certificat PDF** | Bordure classique à coins, filigrane diagonal, accents `slate-950` |
| **Animations** | Framer Motion : `fade-in + slide-up` (durée 300ms, easing spring) |

### 5.5 Principes UX

1. **"Less is more"** — Chaque élément à l'écran doit avoir une raison d'exister
2. **Hiérarchie typographique stricte** — 3 niveaux max par vue (titre, sous-titre, corps)
3. **Feedback immédiat** — Toute action utilisateur produit un retour visuel en <100ms
4. **État de confiance** — Les éléments de vérification (✓, bouclier, hash) sont toujours visibles sans chercher
5. **Mobile-first** — Toutes les vues critiques (vérification, QR scan) doivent fonctionner sur mobile

---

## 6. Roadmap de Développement

### Phase 1 — Fondations Backend (Semaines 1–3)

| Tâche | Détail | Priorité |
|---|---|---|
| Initialisation Express + TypeScript | Structure clean avec `src/routes`, `src/services`, `src/middleware` | 🔴 |
| Schéma PostgreSQL + migrations | Utiliser Prisma ou Knex.js pour le versioning du schéma | 🔴 |
| Module d'authentification | bcrypt + JWT RS256 + refresh tokens | 🔴 |
| CRUD Utilisateurs | API REST avec validation Zod | 🔴 |
| CRUD Modules | API REST liée aux institutions | 🟡 |

### Phase 2 — Moteur Cryptographique (Semaines 4–6)

| Tâche | Détail | Priorité |
|---|---|---|
| Génération de clés RSA-2048 | Service de key management avec rotation | 🔴 |
| Service de signature | `canonicalize → SHA-256 → RSA.sign` | 🔴 |
| Service de vérification | Endpoint public `/api/verify/:uid` | 🔴 |
| Émission de certificats | Workflow admin : sélection étudiant → génération → signature | 🔴 |
| QR Code signé (HMAC) | Payload sécurisé avec vérification timing-safe | 🟡 |

### Phase 3 — Intégration Frontend (Semaines 7–9)

| Tâche | Détail | Priorité |
|---|---|---|
| Migration vers API calls | Remplacer `localStorage` par `fetch()` + JWT | 🔴 |
| Page de vérification publique | Appel API au lieu de recherche locale | 🔴 |
| Tableau de bord Admin | CRUD via API, stats temps réel | 🟡 |
| Tableau de bord Étudiant | Certificats depuis l'API, téléchargement PDF | 🟡 |
| Upload de fichier pour vérification | Extraction de hash depuis PDF + vérification API | 🟡 |

### Phase 4 — Durcissement (Semaines 10–12)

| Tâche | Détail | Priorité |
|---|---|---|
| Rate limiting & WAF | Protection DDoS L7, blocage IP suspectes | 🔴 |
| Logs d'audit | Table `audit_trail` avec actions sensibles | 🔴 |
| Révocation de certificats | Endpoint admin pour révoquer + raison | 🟡 |
| Rotation des clés | Mécanisme de migration vers nouvelle paire | 🟡 |
| Tests E2E | Playwright / Cypress pour flux complets | 🟡 |

### Phase 5 — Production & Compliance (Semaines 13–16)

| Tâche | Détail | Priorité |
|---|---|---|
| Intégration HSM | AWS KMS, Azure Key Vault, ou HashiCorp Vault | 🔴 |
| Audit de sécurité externe | Pentest par cabinet spécialisé | 🔴 |
| RGPD compliance | Privacy by design, droit à l'oubli, DPO | 🟡 |
| Documentation API | OpenAPI 3.0 (Swagger) | 🟡 |
| CI/CD pipeline | GitHub Actions : lint → test → build → deploy | 🟡 |
| Monitoring production | Prometheus + Grafana / Datadog | 🟡 |

### Best Practices Anti-Falsification

```
┌─────────────────────────────────────────────────────────────┐
│            7 COUCHES DE PROTECTION CERTIVERIFY               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. HASH SHA-256                                             │
│     └─ Empreinte unique du contenu. 1 bit modifié =          │
│        hash complètement différent.                          │
│                                                             │
│  2. SIGNATURE RSA-2048                                       │
│     └─ Seule l'institution peut signer.                      │
│        Tout le monde peut vérifier.                          │
│                                                             │
│  3. QR CODE SIGNÉ (HMAC)                                     │
│     └─ Le QR contient un MAC qui empêche la                  │
│        fabrication de faux liens de vérification.             │
│                                                             │
│  4. ID CRYPTOGRAPHIQUE (UUID v4)                             │
│     └─ 2^122 possibilités. Impossible à deviner.             │
│                                                             │
│  5. JOURNAL D'AUDIT IMMUABLE                                 │
│     └─ Chaque vérification est loguée avec IP,               │
│        timestamp, méthode, résultat.                         │
│                                                             │
│  6. CLÉ PRIVÉE ISOLÉE (HSM)                                 │
│     └─ Même un accès root au serveur ne permet               │
│        pas d'extraire la clé de signature.                   │
│                                                             │
│  7. RÉVOCATION EXPLICITE                                     │
│     └─ Un certificat compromis peut être invalidé            │
│        instantanément avec horodatage et raison.             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. 🚀 Quick Start — Lancement du Site

### 7.1 Prérequis

| Outil | Version minimale | Vérification |
|---|---|---|
| **Node.js** | 18+ | `node -v` |
| **npm** | 9+ | `npm -v` |
| **PostgreSQL** | 14+ | `psql --version` |
| **OpenSSL** | 1.1+ | `openssl version` |

### 7.2 Installation & Configuration

**1. Cloner le dépôt et installer les dépendances :**

```bash
git clone <repo-url> && cd ProjetSecuriteWeb-CertyVerify
make install
# ou manuellement :
# npm install
# npm --prefix server install
```

**2. Créer la base de données PostgreSQL :**

```bash
psql -U postgres -c "CREATE DATABASE certiverify_db;"
```

**3. Configurer les variables d'environnement du serveur :**

```bash
# Créer le fichier server/.env avec le contenu suivant :
cat > server/.env << 'EOF'
DATABASE_URL="postgresql://postgres:VOTRE_MOT_DE_PASSE@localhost:5432/certiverify_db"
JWT_ACCESS_EXPIRY="15m"
JWT_REFRESH_EXPIRY="7d"
QR_HMAC_SECRET="changez-moi-avec-une-valeur-aleatoire-256-bits"
BCRYPT_ROUNDS=12
CORS_ORIGIN="http://localhost:3000"
PORT=3001
NODE_ENV="development"
EOF
```

> ⚠️ **Remplacez `VOTRE_MOT_DE_PASSE`** par le mot de passe de votre utilisateur PostgreSQL.

**4. Lancer le setup complet (clés RSA + Prisma + seed) :**

```bash
make setup
# ou manuellement :
# bash setup-server.sh
```

Ce script effectue automatiquement :
- Installation des dépendances serveur
- Génération d'une paire de clés RSA-2048 (JWT) dans `server/keys/`
- Génération du client Prisma
- Push du schéma vers PostgreSQL
- Seed de la base avec les données initiales

### 7.3 Lancement

**Démarrer le frontend + backend en une seule commande :**

```bash
make dev
```

**Ou séparément dans deux terminaux :**

```bash
# Terminal 1 — Backend (port 3001)
make server-dev

# Terminal 2 — Frontend (port 3000)
make client-dev
```

### 7.4 Accès

| Service | URL |
|---|---|
| **Frontend** | [http://localhost:3000](http://localhost:3000) |
| **API Backend** | [http://localhost:3001/api](http://localhost:3001/api) |

**Identifiants de test :**

| Rôle | Email | Mot de passe |
|---|---|---|
| Admin | `admin@certiverify.com` | `admin123` |
| Étudiant | `jean@student.com` | `student123` |

### 7.5 Commandes Utiles (Makefile)

```bash
make help          # Afficher toutes les commandes disponibles
make build         # Build frontend + server
make lint          # Vérification TypeScript
make db-studio     # Ouvrir Prisma Studio (UI de la DB)
make db-seed       # Re-seeder la base de données
make clean         # Supprimer les builds
```

---

<div align="center">

**CertiVerify** — *La confiance, enfin palpable.*

Documentation technique rédigée le 1er Mai 2026.

Architecte : Audit Senior Fullstack.

</div>
