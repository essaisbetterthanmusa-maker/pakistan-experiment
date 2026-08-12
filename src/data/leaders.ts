import type { PartyId } from './parties';

export interface Figure {
  name: string;
  role: string;
  party?: PartyId;
}

// Real public figures used only as fictionalized/satirical characters — no
// real quotes, statements, or predictions are attributed to them anywhere.
export const FIGURES: Figure[] = [
  { name: 'Nawaz Sharif', role: 'PML-N Supreme Leader', party: 'PMLN' },
  { name: 'Shehbaz Sharif', role: 'PML-N President', party: 'PMLN' },
  { name: 'Maryam Nawaz', role: 'PML-N Senior Vice President', party: 'PMLN' },
  { name: 'Ishaq Dar', role: 'PML-N Deputy PM / Foreign Minister', party: 'PMLN' },
  { name: 'Imran Khan', role: 'PTI Founder-Chairman', party: 'PTI' },
  { name: 'Barrister Gohar Ali Khan', role: 'PTI Chairman', party: 'PTI' },
  { name: 'Asif Ali Zardari', role: 'PPP Co-Chairman', party: 'PPP' },
  { name: 'Bilawal Bhutto Zardari', role: 'PPP Chairman', party: 'PPP' },
  { name: 'Maulana Fazlur Rehman', role: 'JUI-F Chief', party: 'JUIF' },
  { name: 'Khalid Maqbool Siddiqui', role: 'MQM-P Convener', party: 'MQMP' },
  { name: 'Hafiz Naeem ur Rehman', role: 'Jamaat-e-Islami Ameer', party: 'JI' },
  { name: 'Mohsin Naqvi', role: 'Interior Minister' },
];

export interface LeaderOption {
  id: string;
  name: string;
  role: string;
  blurb: string;
  real: boolean;
}

/**
 * Playable leader options per party. Where a party is genuinely built around
 * one or two real figures, those are offered by name (fictionalized
 * playstyle blurb only — never a real quote or claim). Smaller/regional
 * parties get archetype-style fictional leaders instead, since they aren't
 * one-person shows in the same way.
 */
export const LEADERS_BY_PARTY: Record<PartyId, LeaderOption[]> = {
  PMLN: [
    { id: 'nawaz', name: 'Nawaz Sharif', role: 'Supreme Leader', blurb: 'Four-decade party patriarch. Instant command over the Punjab machine, but every rival waits for the next disqualification.', real: true },
    { id: 'shehbaz', name: 'Shehbaz Sharif', role: 'Party President', blurb: 'The administrator. Establishment finds you easy to work with — the party base finds you a little dull for it.', real: true },
    { id: 'maryam', name: 'Maryam Nawaz', role: 'Senior Vice President', blurb: 'The heir apparent, media-fluent and combative. Energizes younger Punjab voters, unsettles the old guard.', real: true },
    { id: 'dar', name: 'Ishaq Dar', role: 'Deputy PM / Foreign Minister', blurb: 'The technocrat fixer — four-time finance minister, trusted with the numbers and the diplomacy no one else wants to touch.', real: true },
  ],
  PTI: [
    { id: 'imran', name: 'Imran Khan', role: 'Founder-Chairman', blurb: 'The movement is the party. Unmatched street pull nationwide, but governing coalitions get harder to build around you.', real: true },
    { id: 'gohar', name: 'Barrister Gohar Ali Khan', role: 'Party Chairman', blurb: 'Running the symbol while the founder is sidelined. Keeps the legal fights and the base loyal, but every decision gets second-guessed from outside.', real: true },
  ],
  PPP: [
    { id: 'zardari', name: 'Asif Ali Zardari', role: 'Co-Chairman', blurb: 'The dealmaker. Nobody negotiates a coalition better, and nobody\'s trusted less by anyone outside Sindh.', real: true },
    { id: 'bilawal', name: 'Bilawal Bhutto Zardari', role: 'Chairman', blurb: 'The Bhutto name carries the base; you\'re still proving you can carry it beyond Sindh.', real: true },
  ],
  MQMP: [
    { id: 'khalid_maqbool', name: 'Khalid Maqbool Siddiqui', role: 'Convener', blurb: 'Karachi\'s vote bank is real but fractured since the 2016 split — holding it together is the whole job.', real: true },
  ],
  JUIF: [
    { id: 'fazl', name: 'Maulana Fazlur Rehman', role: 'Party Chief', blurb: 'Decades of madrassa-network discipline. A reliable coalition partner who always extracts a price.', real: true },
  ],
  JI: [
    { id: 'naeem', name: 'Hafiz Naeem ur Rehman', role: 'Ameer, Jamaat-e-Islami', blurb: 'Small, disciplined, ideologically rigid. You will never lack organization — you will always lack seats.', real: true },
  ],
  ANP: [
    { id: 'anp_leader', name: 'A Wali Khan-Line Leader', role: 'Party President', blurb: 'Carrying a once-dominant secular Pashtun legacy through its leanest era.', real: false },
  ],
  BAP: [
    { id: 'bap_leader', name: 'A Balochistan Electables\' Convener', role: 'Party President', blurb: 'The party exists because Islamabad needed one. Loyalty here is rented, not owned.', real: false },
  ],
  PKMAP: [
    { id: 'pkmap_leader', name: 'A Pashtunkhwa Nationalist Elder', role: 'Party President', blurb: 'Tribal-belt Pashtun nationalism with a narrow but steady base around Quetta.', real: false },
  ],
  BNPM: [
    { id: 'bnpm_leader', name: 'A Baloch Nationalist Veteran', role: 'Party President', blurb: 'Principled Baloch nationalism — respected, rarely in government, always a swing vote.', real: false },
  ],
  GDA: [
    { id: 'gda_leader', name: 'A Rural Sindh Alliance Elder', role: 'Alliance Convener', blurb: 'United by one thing: not being PPP. Coordinating this coalition is harder than winning the seats.', real: false },
  ],
  IPP: [
    { id: 'ipp_leader', name: 'A Recently-Defected Electable', role: 'Party President', blurb: 'A vehicle for people who left somewhere else. Untested loyalty, well-funded ambition.', real: false },
  ],
  TLP: [
    { id: 'tlp_leader', name: 'A Barelvi Movement Successor', role: 'Party Chief', blurb: 'Street power built on religious mobilization. Small in seats, loud in every news cycle.', real: false },
  ],
  IND: [
    { id: 'ind_organizer', name: 'A Local Independent Network', role: 'Coordinating Candidate', blurb: 'No national brand, no national machine — just whichever local strongmen you can hold together after polling day.', real: false },
  ],
  OTH: [
    { id: 'oth_leader', name: 'A Minor Party Figure', role: 'Party Leader', blurb: 'Small, scattered, occasionally decisive when the arithmetic gets tight.', real: false },
  ],
};
