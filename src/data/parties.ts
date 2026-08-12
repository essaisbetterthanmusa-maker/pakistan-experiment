export type PartyId =
  | 'PMLN' | 'PTI' | 'PPP' | 'MQMP' | 'JUIF' | 'JI' | 'ANP'
  | 'BAP' | 'PKMAP' | 'BNPM' | 'GDA' | 'IPP' | 'TLP' | 'IND' | 'OTH';

export interface Party {
  id: PartyId;
  name: string;
  short: string;
  color: string;
  ideology: string;
  /** relative strength multiplier per province, 0 (no presence) - 1.3 (dominant) */
  provinceStrength: Record<'Punjab' | 'Sindh' | 'KP' | 'Balochistan' | 'Islamabad', number>;
  /** extra boost specifically in Karachi/Hyderabad urban Sindh seats */
  urbanSindhBoost?: number;
  /**
   * How the security establishment tends to regard this party, -2 (target of
   * active suppression) to +2 (reliable partner / "king's party"). Grounded in
   * the post-2022 picture: PTI under crackdown; PML-N seen as the backed option
   * in 2024; MQM-P, BAP and IPP as long-standing establishment-friendly
   * vehicles. A simulation abstraction, not a claim about any party's motives.
   */
  establishmentAffinity: number;
  playable: boolean;
  description: string;
}

export const PARTIES: Record<PartyId, Party> = {
  PMLN: {
    id: 'PMLN', name: 'Pakistan Muslim League (Nawaz)', short: 'PML-N', color: '#00693E',
    ideology: 'Centre-right, Punjab-based, pro-business',
    provinceStrength: { Punjab: 1.12, Sindh: 0.15, KP: 0.25, Balochistan: 0.2, Islamabad: 0.9 },
    establishmentAffinity: 1,
    playable: true,
    description: 'The dominant force in central and northern Punjab, built on a deep network of electables, biradari politics, and development patronage.',
  },
  PTI: {
    id: 'PTI', name: 'Pakistan Tehreek-e-Insaf', short: 'PTI', color: '#EB1C24',
    ideology: 'Populist, anti-establishment, youth/urban base',
    provinceStrength: { Punjab: 1.04, Sindh: 0.35, KP: 1.3, Balochistan: 0.3, Islamabad: 1.05 },
    urbanSindhBoost: 0.25,
    establishmentAffinity: -2,
    playable: true,
    description: 'Strongest in KP and among urban/youth voters nationwide; competitive in Punjab, especially where PTI-backed independents can absorb crackdowns on the party symbol.',
  },
  PPP: {
    id: 'PPP', name: 'Pakistan Peoples Party', short: 'PPP', color: '#E4181C',
    ideology: 'Centre-left, Sindh-based, federalist',
    provinceStrength: { Punjab: 0.2, Sindh: 1.3, KP: 0.2, Balochistan: 0.35, Islamabad: 0.35 },
    urbanSindhBoost: -0.1,
    establishmentAffinity: 1,
    playable: true,
    description: 'The unchallenged machine of rural Sindh, run through generations of waderas and local networks; weak outside Sindh and southern Punjab pockets.',
  },
  MQMP: {
    id: 'MQMP', name: 'Muttahida Qaumi Movement-Pakistan', short: 'MQM-P', color: '#D2001C',
    ideology: 'Urban Sindh, Mohajir representation',
    provinceStrength: { Punjab: 0, Sindh: 0.25, KP: 0, Balochistan: 0, Islamabad: 0 },
    urbanSindhBoost: 1.1,
    establishmentAffinity: 2,
    playable: true,
    description: 'Karachi and Hyderabad\'s urban Mohajir vote bank — weakened since its 2016 split but still a kingmaker in Sindh urban seats.',
  },
  JUIF: {
    id: 'JUIF', name: 'Jamiat Ulema-e-Islam (F)', short: 'JUI-F', color: '#0B6E2E',
    ideology: 'Deobandi religious-right, Pashtun belt',
    provinceStrength: { Punjab: 0.1, Sindh: 0.1, KP: 0.55, Balochistan: 0.45, Islamabad: 0.1 },
    establishmentAffinity: 0,
    playable: true,
    description: 'Draws on a dense network of madrassas and Deobandi clergy across southern KP and Pashtun Balochistan; a reliable coalition partner.',
  },
  JI: {
    id: 'JI', name: 'Jamaat-e-Islami', short: 'JI', color: '#00A651',
    ideology: 'Islamist, organized urban cadre',
    provinceStrength: { Punjab: 0.15, Sindh: 0.2, KP: 0.25, Balochistan: 0.15, Islamabad: 0.15 },
    urbanSindhBoost: 0.15,
    establishmentAffinity: 0,
    playable: true,
    description: 'A disciplined but small urban cadre party, competitive in pockets of Karachi and Lahore rather than a mass electoral force.',
  },
  ANP: {
    id: 'ANP', name: 'Awami National Party', short: 'ANP', color: '#E4181C',
    ideology: 'Secular Pashtun nationalist',
    provinceStrength: { Punjab: 0, Sindh: 0.05, KP: 0.3, Balochistan: 0.05, Islamabad: 0 },
    establishmentAffinity: 0,
    playable: true,
    description: 'Once KP\'s dominant secular Pashtun party, badly weakened by militancy-era violence and PTI\'s rise, but still holds pockets of Peshawar valley.',
  },
  BAP: {
    id: 'BAP', name: 'Balochistan Awami Party', short: 'BAP', color: '#8B5E3C',
    ideology: 'Balochistan electables\' vehicle, establishment-aligned',
    provinceStrength: { Punjab: 0, Sindh: 0, KP: 0, Balochistan: 0.55, Islamabad: 0 },
    establishmentAffinity: 2,
    playable: true,
    description: 'A "king\'s party" of Balochistan electables assembled to hold the province for whichever coalition controls the centre.',
  },
  PKMAP: {
    id: 'PKMAP', name: 'Pakhtunkhwa Milli Awami Party', short: 'PkMAP', color: '#F7941D',
    ideology: 'Pashtun nationalist (Balochistan)',
    provinceStrength: { Punjab: 0, Sindh: 0, KP: 0.05, Balochistan: 0.3, Islamabad: 0 },
    establishmentAffinity: 0,
    playable: true,
    description: 'Pashtun-belt Balochistan party rooted in tribal and nationalist politics around Quetta and the Afghan border districts.',
  },
  BNPM: {
    id: 'BNPM', name: 'Balochistan National Party (Mengal)', short: 'BNP-M', color: '#005B9A',
    ideology: 'Baloch nationalist',
    provinceStrength: { Punjab: 0, Sindh: 0, KP: 0, Balochistan: 0.35, Islamabad: 0 },
    establishmentAffinity: -1,
    playable: true,
    description: 'Baloch nationalist party strongest in central/southern Balochistan, frequently a swing coalition partner federally.',
  },
  GDA: {
    id: 'GDA', name: 'Grand Democratic Alliance', short: 'GDA', color: '#FFC72C',
    ideology: 'Anti-PPP Sindhi nationalist/electable alliance',
    provinceStrength: { Punjab: 0, Sindh: 0.3, KP: 0, Balochistan: 0, Islamabad: 0 },
    urbanSindhBoost: -0.2,
    establishmentAffinity: 1,
    playable: true,
    description: 'A patchwork of rural Sindhi electables and nationalists united mainly by opposition to PPP dominance.',
  },
  IPP: {
    id: 'IPP', name: 'Istehkam-e-Pakistan Party', short: 'IPP', color: '#1B3B6F',
    ideology: 'Electables\' vehicle, establishment-aligned',
    provinceStrength: { Punjab: 0.25, Sindh: 0.05, KP: 0.05, Balochistan: 0, Islamabad: 0.1 },
    establishmentAffinity: 2,
    playable: true,
    description: 'A newer Punjab-centric vehicle built from defected electables, competitive wherever it can attract a strong local candidate.',
  },
  TLP: {
    id: 'TLP', name: 'Tehreek-e-Labbaik Pakistan', short: 'TLP', color: '#0B6E2E',
    ideology: 'Barelvi religious-right, street movement',
    provinceStrength: { Punjab: 0.2, Sindh: 0.1, KP: 0.05, Balochistan: 0, Islamabad: 0.05 },
    urbanSindhBoost: 0.1,
    establishmentAffinity: -1,
    playable: true,
    description: 'A street-movement-turned-party with a hard core urban Punjab/Karachi Barelvi vote that rarely wins seats but reshapes margins.',
  },
  IND: {
    id: 'IND', name: 'Independent', short: 'IND', color: '#6b6375',
    ideology: 'No national platform — local electables',
    provinceStrength: { Punjab: 0.3, Sindh: 0.25, KP: 0.25, Balochistan: 0.5, Islamabad: 0.15 },
    establishmentAffinity: 0,
    playable: true,
    description: 'Local electables running on personal networks rather than a party symbol. Powerful in individual seats, structurally incapable of a manufactured national majority.',
  },
  OTH: {
    id: 'OTH', name: 'Other / Minor Parties', short: 'OTH', color: '#9aa0a6',
    ideology: 'Assorted minor and religious-minority parties',
    provinceStrength: { Punjab: 0.05, Sindh: 0.05, KP: 0.05, Balochistan: 0.05, Islamabad: 0.05 },
    establishmentAffinity: 0,
    playable: false,
    description: 'A catch-all for small parties that occasionally pick up a seat or two.',
  },
};

export const PARTY_LIST = Object.values(PARTIES);
export const PLAYABLE_PARTIES = PARTY_LIST.filter(p => p.playable);
