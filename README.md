<div align="center">

#  CertiVerify — Authenticité vérifiable des certificat

**L'intégrité et l'authenticité des diplômes à l'ère du numérique**

[![Stack](https://img.shields.io/badge/Stack-React_|_Node.js_|_Supabase-0ea5e9?style=for-the-badge)](.)
[![Crypto](https://img.shields.io/badge/Crypto-RSA--2048_|_SHA--256-0f172a?style=for-the-badge)](.)
[![UX](https://img.shields.io/badge/UX-QR_|_Mobile--First-22c55e?style=for-the-badge)](.)

</div>

---

## Table des Matières

1. [Présentation & Vision](#1-présentation--vision)
2. [Points Forts & Avantages](#2-points-forts--avantages)
3. [Choix Technologiques (Justifiés)](#3-choix-technologiques-justifiés)
4. [Architecture & Sécurité Web](#4-architecture--sécurité-web)
5. [Schéma de Base de Données (Supabase)](#5-schéma-de-base-de-données-supabase)
6. [Mode d'Utilisation](#6-mode-dutilisation)
7. [Guide d'Installation (Supabase)](#7-guide-dinstallation-supabase)

---

## 1. Présentation & Vision

Les fraudes documentaires académiques explosent à l'ère du numérique. **CertiVerify** répond à ce défi en garantissant que chaque diplôme présenté en ligne est **authentique, infalsifiable et vérifiable instantanément**.

Notre approche combine signature numérique, traçabilité et expérience utilisateur fluide pour transformer la vérification des diplômes en un acte simple, fiable et universel.

>  **Thème central** : _L'intégrité et l'authenticité des diplômes à l'ère du numérique_.

---

## 2. Points Forts & Avantages

|  Valeur | Impact concret |
|---|---|
| **Confiance instantanée pour les recruteurs** | Validation publique en quelques secondes, sans contact manuel. |
| **Zéro falsification possible** | Hash SHA-256 + signature RSA : seule l'institution peut signer. |
| **Expérience utilisateur fluide** | Mobile-first, vérification par QR Code, preuve visuelle immédiate. |
| **Traçabilité totale** | Chaque certificat possède un identifiant public unique et une signature vérifiable. |
| **Conformité et sécurité** | Isolation des secrets, gestion des accès, contrôle par rôles. |

**Avantage clé** : même si un attaquant lit la base de données, il ne peut **pas** créer un faux diplôme valide. La signature numérique est **liée de manière unique** au contenu du document et à l'identité cryptographique de l'émetteur.

---

## 3. Choix Technologiques (Justifiés)

| Technologie | Pourquoi ce choix | Bénéfice sécurité |
|---|---|---|
| **Supabase (PostgreSQL)** | Robustesse relationnelle, migrations simples, API temps réel | **Row Level Security** pour isoler les données sensibles |
| **Supabase Auth** | Gestion sécurisée des sessions et tokens | Réduction des risques de session hijacking |
| **React + Tailwind** | Interface moderne “Trust & Security” et responsive | UI claire pour limiter les erreurs humaines |
| **Node.js Crypto** | API native, auditée, standardisée | RSA-2048 + SHA-256 sans dépendance opaque |

---

## 4. Architecture & Sécurité Web

### 4.1 Signature Numérique vs Encodage

| Concept | Objectif | Réversibilité | Sécurité |
|---|---|---|---|
| **Encodage (ex: Base64)** | Représentation | Réversible |  Aucune garantie d'authenticité |
| **Hachage (SHA-256)** | Empreinte unique | Non réversible | Détection d'altération |
| **Signature numérique (RSA)** | Authentifier l'émetteur | Vérifiable publiquement | Preuve cryptographique |

### 4.2 Flux de confiance (de bout en bout)

1. **Validation Admin** : l'établissement valide l'étudiant et ses modules.
2. **Canonicalisation** : le contenu du diplôme est normalisé (JSON déterministe).
3. **Hash SHA-256** : génération de l'empreinte unique du document.
4. **Signature RSA** : la clé privée de l'institution signe le hash.
5. **Vérification publique** : le recruteur vérifie avec la clé publique.

### 4.3 Garantie anti-falsification

Même si la base de données est lue, **un certificat ne peut pas être falsifié** :

- La signature est mathématiquement liée au contenu du document.
- Toute modification du texte change le hash et invalide la signature.
- Seule la clé privée de l'institution peut générer une signature valide.

---

## 5. Schéma de Base de Données (Supabase)

> **Objectif** : simplicité, traçabilité et intégrité. Les signatures et l'image du certificat sont stockées pour une vérification visuelle immédiate.

```sql
-- ================================================================
-- CERTIVERIFY — Schéma Supabase (PostgreSQL)
-- ================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Utilisateurs (admins et étudiants)
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT NOT NULL UNIQUE,
  full_name       TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('admin', 'student')),
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Modules / cours
CREATE TABLE modules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Inscriptions et progression des étudiants
CREATE TABLE enrollments (
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_id       UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  status          TEXT NOT NULL CHECK (status IN ('enrolled', 'in_progress', 'completed')),
  completed_at    TIMESTAMPTZ,
  PRIMARY KEY (user_id, module_id)
);

-- Certificats signés
CREATE TABLE certificates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_uid     TEXT NOT NULL UNIQUE,     -- ID public court (ex: "WF6FOFBPV")
  student_id          UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title               TEXT NOT NULL,
  description         TEXT,

  -- Sécurité cryptographique
  document_hash       TEXT NOT NULL,            -- SHA-256 du contenu canonique
  digital_signature   TEXT NOT NULL,            -- Signature RSA (Base64)
  canonical_data      JSONB NOT NULL,           -- Données canoniques signées

  -- Stockage visuel (Supabase Storage)
  certificate_image_url TEXT NOT NULL,          -- URL vers l'image du certificat

  issued_at           TIMESTAMPTZ DEFAULT NOW(),
  revoked_at          TIMESTAMPTZ,
  revocation_reason   TEXT
);

CREATE INDEX idx_cert_student ON certificates(student_id);
CREATE INDEX idx_cert_uid ON certificates(certificate_uid);
```

---

## 6. Mode d'Utilisation

###  Admin

- Création et gestion des modules/cours.
- Validation des étudiants et émission des certificats.
- Révocation si un diplôme est compromis.

###  Étudiant

- Suivi de progression par module.
- Consultation et téléchargement du certificat.
- Modification autonome du mot de passe.

###  Vérificateur (Public)

- Saisie d'une clé publique ou scan QR.
- Affichage immédiat de la **Preuve Visuelle** (photo du certificat).
- Validation cryptographique en un clic depuis la page d'accueil.

---

## 7. Guide d'Installation (Supabase)

### 7.1 Pré-requis

| Outil | Version minimale |
|---|---|
| Node.js | 18+ |
| npm | 9+ |
| Supabase CLI (optionnel) | Dernière |


### 7.2 Variables d'environnement

**Frontend (Vite)**

```bash
# .env
VITE_SUPABASE_URL="https://<project>.supabase.co"
VITE_SUPABASE_ANON_KEY="<public-anon-key>"
```

**Backend (si utilisé pour la signature)**

```bash
# server/.env
SUPABASE_URL="https://<project>.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
QR_HMAC_SECRET="<random-256-bit-hex>"
```

### 7.4 Lancement local

```bash
make install
make dev
```

---

<div align="center">

**CertiVerify** — *La confiance, enfin vérifiable.*

Documentation mise à jour le 3 Mai 2026.

</div>
