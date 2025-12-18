/**
 * Vehicle types configuration
 * Shared across backend services and exposed to frontend
 */

export const VEHICLE_TYPES = [
  'TCP - Autocars BC/NOC/EXPRESS',
  'TCP - Autobus Standard',
  'TCP - Autobus articulé',
  'TCP - Autobus Standard BHNS',
  'TCP - Autobus articulé BHNS',
  'TCP - Midibus',
  'TCP - Midibus L (Heuliez)',
  'TCP - Minibus',
];

/**
 * Vehicle eligibility by line
 * Defines which vehicle types are suitable for each bus line
 */
export const VEHICLE_LINES_ELIGIBILITY = {
  '4201': ['TCP - Autobus Standard', 'TCP - Autobus Standard BHNS', 'TCP - Autobus articulé', 'TCP - Autobus articulé BHNS'],
  '4202': ['TCP - Autobus Standard', 'TCP - Autobus Standard BHNS'],
  '4203': ['TCP - Autobus articulé', 'TCP - Autobus articulé BHNS', 'TCP - Autobus Standard', 'TCP - Autobus Standard BHNS'], // Priorité articulés
  '4204': ['TCP - Autobus Standard', 'TCP - Autobus Standard BHNS'],
  '4205': ['TCP - Autobus Standard', 'TCP - Autobus Standard BHNS'],
  '4206': ['TCP - Autobus articulé', 'TCP - Autobus articulé BHNS'],
  '4212': ['TCP - Autobus Standard', 'TCP - Autobus Standard BHNS'],
  '4213': ['TCP - Autobus Standard', 'TCP - Autobus Standard BHNS'],
  'N139': ['TCP - Autocars BC/NOC/EXPRESS'],
};
