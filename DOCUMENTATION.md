# CertiVerify AI - Documentation Technique

## 1. Présentation Générale
**CertiVerify AI** est une plateforme moderne de certification académique visant à éliminer la fraude aux diplômes. Elle permet aux institutions d'émettre des certificats numériques sécurisés et aux recruteurs/organismes de vérifier instantanément leur authenticité.

## 2. Fonctionnalités Principales

### A. Vérification Multicanale (Triple Check)
La plateforme propose trois méthodes de vérification pour une flexibilité maximale :
1.  **Vérification par ID Unique** : Saisir manuellement l'identifiant à 9 caractères (ex: `WF6FOFBPV`).
2.  **Vérification par Lien/QR Code** : Le lien dynamique (ex: `?verify=ID`) permet une vérification instantanée sans saisie.
3.  **Vérification par Drag & Drop** : L'utilisateur dépose le fichier PDF. Le système analyse intelligemment :
    *   Le nom du fichier (extraction par Regex).
    *   Le contenu textuel du document (lecture de la signature numérique intégrée).

### B. Tableau de Bord Étudiant
*   Visualisation des certifications obtenues.
*   Téléchargement des certificats au format PDF sécurisé.
*   Partage social facilité.

## 3. Stack Technologique (Architecture)

*   **Frontend** : [React 18](https://reactjs.org/) avec [Vite](https://vitejs.dev/) pour une performance de build optimale.
*   **Langage** : [TypeScript](https://www.typescriptlang.org/) pour une robustesse et une sécurité du code accrues.
*   **Styling** : [Tailwind CSS v4](https://tailwindcss.com/) utilisant une approche utilitaire pour un design "mobile-first".
*   **Animations** : [Motion](https://motion.dev/) (anciennement Framer Motion) pour des transitions fluides et une expérience utilisateur premium.
*   **Navigation** : [React Router 6](https://reactrouter.com/) pour la gestion des routes (Home, Dashboard, Login).
*   **Icons** : [Lucide React](https://lucide.dev/) pour une iconographie propre et cohérente.

## 4. Sécurité Web et Intégrité des Données

C'est le point fort de CertiVerify AI. Bien que cette version soit une démonstration, elle implémente les principes suivants :

### A. Preuve Cryptographique (Hash)
Chaque certificat possède un "Digital Signature Hash". Il s'agit d'une empreinte unique générée à partir des données de l'étudiant, de la date et de l'identifiant. Toute modification d'une seule lettre sur le diplôme physique rendrait le hash invalide lors de la vérification.

### B. Algorithme d'Extraction Intelligente
La fonctionnalité de Drag & Drop ne se contente pas de lire le fichier, elle utilise des expressions régulières (Regex) avancées pour isoler l'identifiant de certification au milieu des métadonnées du fichier, simulant une analyse forensique numérique.

### C. Zéro-Stockage de Données Sensibles (Concept)
Le système est conçu pour vérifier la validité d'une signature sans nécessairement exposer l'intégralité du dossier académique de l'étudiant tant que la preuve n'est pas fournie (Approche Zero-Knowledge Proof).

### D. Validation des Entrées
Toutes les entrées (ID de recherche) font l'objet d'une sanitisation en temps réel (conversion en majuscules, limitation de longueur) pour prévenir les injections.

## 5. Dépendances Majeures

```json
{
  "dependencies": {
    "lucide-react": "^0.344.0",
    "motion": "^11.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.3",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.1"
  }
}
```

## 6. Installation et Utilisation Locale

### Pré-requis
*   Node.js (v18+)
*   NPM ou Yarn

### Configuration
1.  Cloner le projet.
2.  Installer les dépendances : `npm install`.
3.  Créer un fichier `.env` basé sur `.env.example`.
4.  Lancer le serveur de développement : `npm run dev`.

### Variables d'Environnement
*   `VITE_APP_URL` : URL de base pour la génération des liens de vérification.
*   `GEMINI_API_KEY` : Requis si les fonctionnalités d'analyse par IA avancée sont activées.

---
*Documentation rédigée le 28 Avril 2026 pour le projet CertiVerify AI.*
