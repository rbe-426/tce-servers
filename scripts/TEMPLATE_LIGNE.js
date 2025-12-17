/**
 * TEMPLATE: Copiez ce bloc pour ajouter une nouvelle ligne
 * 
 * Remplacez les valeurs entre {{ }}
 * Ajoutez le bloc dans le tableau LIGNES_DATA du fichier import-lignes-direct.js
 */

{
  numero: '{{NUMERO}}',                    // Ex: "4204", "50", "C1"
  nom: '{{NOM_LIGNE}}',                    // Ex: "LIGNE_GARE_AIRPORT", "SHUTTLE"
  type: '{{TYPE}}',                        // autobus, minibus, autocar, etc.
  jours: '{{JOURS}}',                      // L; M; M; J; V (lun-ven) ou S; D (week-end)
  heureDebut: '{{HEURE_DEBUT}}',           // Ex: "04h37", "06h00"
  heureFin: '{{HEURE_FIN}}',               // Ex: "23h45", "22h00"
  
  sens: [
    {
      nom: '{{NOM_SENS_1}}',               // Ex: "Aller", "Retour", "Bidirectionnel"
      direction: '{{DIRECTION_1}}',        // Ex: "Gare → Centre", "Aéroport ← Ville"
      services: [
        { heureDebut: '{{H_DEB_SRV_1}}', heureFin: '{{H_FIN_SRV_1}}' },  // Service 1
        { heureDebut: '{{H_DEB_SRV_2}}', heureFin: '{{H_FIN_SRV_2}}' },  // Service 2
        // Ajoutez d'autres services si nécessaire
      ]
    },
    {
      nom: '{{NOM_SENS_2}}',               // Ex: "Retour"
      direction: '{{DIRECTION_2}}',        // Ex: "Centre → Gare"
      services: [
        { heureDebut: '{{H_DEB_SRV_3}}', heureFin: '{{H_FIN_SRV_3}}' },
        { heureDebut: '{{H_DEB_SRV_4}}', heureFin: '{{H_FIN_SRV_4}}' },
      ]
    }
    // Ajoutez d'autres sens si nécessaire
  ]
}

/**
 * ==================== EXEMPLE COMPLÉTÉ ====================
 * 
 * Cas réel: Ligne 4299 - Shuttle Aéroport
 * Mercredi à Dimanche
 * 2 sens (Aller/Retour) avec 2 services chacun
 */

{
  numero: '4299',
  nom: 'SHUTTLE_AEROPORT',
  type: 'minibus',
  jours: 'M; M; J; V; S; D',              // Mercredi à Dimanche
  heureDebut: '05h00',
  heureFin: '23h00',
  
  sens: [
    {
      nom: 'Aller',
      direction: 'Centre Ville → Aéroport',
      services: [
        { heureDebut: '05h30', heureFin: '14h00' },  // Service matin
        { heureDebut: '14h30', heureFin: '22h30' }   // Service soir
      ]
    },
    {
      nom: 'Retour',
      direction: 'Aéroport → Centre Ville',
      services: [
        { heureDebut: '06h00', heureFin: '14h30' },  // Service matin
        { heureDebut: '15h00', heureFin: '23h00' }   // Service soir
      ]
    }
  ]
}

/**
 * ==================== FORMAT DES JOURS ====================
 * 
 * Code | Jour       | Exemple
 * -----+------------+--------
 *  L   | Lundi      | 'L'
 *  M   | Mardi      | 'M' (1er M)
 *  M   | Mercredi   | 'M' (2e M)
 *  J   | Jeudi      | 'J'
 *  V   | Vendredi   | 'V'
 *  S   | Samedi     | 'S'
 *  D   | Dimanche   | 'D'
 * 
 * Combinaisons:
 * 'L; M; M; J; V'      = Lundi à Vendredi (semaine de travail)
 * 'S; D'               = Samedi et Dimanche (week-end)
 * 'L; M; M; J; V; S; D' = Tous les jours
 * 
 * ⚠️ Format: Séparé par "; " (point-virgule + espace)
 * ⚠️ Important: L'ordre DOIT être L, M, M, J, V, S, D
 */

/**
 * ==================== FORMAT DES HEURES ====================
 * 
 * Format: HHhMM (avec 'h' comme séparateur)
 * 
 * ✅ Valide:
 * - '04h37'  (4 heures 37 minutes)
 * - '14h00'  (14 heures)
 * - '23h45'  (23 heures 45 minutes)
 * - '00h10'  (00 heures 10 minutes - après minuit)
 * 
 * ❌ Invalide:
 * - '4:37'   (mauvais séparateur)
 * - '14.00'  (point au lieu de h)
 * - '14h'    (minutes manquantes)
 * - '1437'   (pas de séparateur)
 * 
 * ⚠️ Important: Zéros de remplissage OBLIGATOIRES
 * - Écrivez '04h37', pas '4h37'
 * - Écrivez '00h10', pas '0h10'
 */

/**
 * ==================== TYPES DE VÉHICULES ====================
 * 
 * Valeurs acceptées:
 * - 'autobus'
 * - 'minibus'
 * - 'autocar'
 * - 'articulé'  (autobus articulé)
 * - 'midibus'
 * - etc.
 * 
 * (Dépend de votre système)
 */

/**
 * ==================== CHOSES À RETENIR ====================
 * 
 * ✅ À faire:
 * 1. Ajoutez une VIRGULE après la dernière ligne de données
 * 2. Séparez les sens par des VIRGULES
 * 3. Séparez les services par des VIRGULES
 * 4. Formatez les heures: '06h30', pas '6h3'
 * 5. Utilisez l'ordre correct des jours: L; M; M; J; V; S; D
 * 
 * ❌ À éviter:
 * 1. Oublier les accolades { }
 * 2. Oublier les crochets [ ]
 * 3. Oublier les virgules entre éléments
 * 4. Oublier les guillemets '' autour des valeurs
 * 5. Mélanger les jours (ex: 'M; L; J; V')
 * 
 * 💡 Conseil: Validez votre JSON avec https://jsonlint.com/
 */
