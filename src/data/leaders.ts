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
  { name: 'Khawaja Asif', role: 'PML-N Defence Minister', party: 'PMLN' },
  { name: 'Ahsan Iqbal', role: 'PML-N Planning Minister / Secretary-General', party: 'PMLN' },
  { name: 'Rana Sanaullah', role: 'PML-N Inter-Provincial Coordination Minister', party: 'PMLN' },
  { name: 'Imran Khan', role: 'PTI Founder-Chairman', party: 'PTI' },
  { name: 'Barrister Gohar Ali Khan', role: 'PTI Chairman', party: 'PTI' },
  { name: 'Omar Ayub Khan', role: 'PTI Senior Leader, former NA Opposition Leader', party: 'PTI' },
  { name: 'Shibli Faraz', role: 'PTI Senior Leader, former Senate Opposition Leader', party: 'PTI' },
  { name: 'Ali Amin Gandapur', role: 'PTI Senior Leader, former KP Chief Minister', party: 'PTI' },
  { name: 'Shah Mahmood Qureshi', role: 'PTI Vice Chairman', party: 'PTI' },
  { name: 'Dr Yasmin Rashid', role: 'PTI Senior Punjab Leader', party: 'PTI' },
  { name: 'Asif Ali Zardari', role: 'PPP Co-Chairman', party: 'PPP' },
  { name: 'Bilawal Bhutto Zardari', role: 'PPP Chairman', party: 'PPP' },
  { name: 'Murad Ali Shah', role: 'PPP Sindh Chief Minister', party: 'PPP' },
  { name: 'Sherry Rehman', role: 'PPP Vice President', party: 'PPP' },
  { name: 'Syed Naveed Qamar', role: 'PPP Senior Leader', party: 'PPP' },
  { name: 'Raja Pervaiz Ashraf', role: 'PPP Senior Leader, former NA Speaker', party: 'PPP' },
  { name: 'Faisal Karim Kundi', role: 'PPP Senior Leader, Governor KP', party: 'PPP' },
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
    { id: 'khawaja_asif', name: 'Khawaja Asif', role: 'Defence Minister', blurb: 'Sharp-tongued and unafraid of a televised fight. Reassures the security establishment more than he reassures his own backbenchers.', real: true },
    { id: 'ahsan_iqbal', name: 'Ahsan Iqbal', role: 'Planning Minister / Secretary-General', blurb: 'The party\'s policy brain and organizational glue. Long on five-year plans, short on street charisma.', real: true },
    { id: 'rana_sanaullah', name: 'Rana Sanaullah', role: 'Inter-Provincial Coordination Minister', blurb: 'A Punjab street-politics veteran who\'d rather fix a coalition dispute over tea than in a press conference.', real: true },
  ],
  PTI: [
    { id: 'imran', name: 'Imran Khan', role: 'Founder-Chairman', blurb: 'The movement is the party. Unmatched street pull nationwide, but governing coalitions get harder to build around you.', real: true },
    { id: 'gohar', name: 'Barrister Gohar Ali Khan', role: 'Party Chairman', blurb: 'Running the symbol while the founder is sidelined. Keeps the legal fights and the base loyal, but every decision gets second-guessed from outside.', real: true },
    { id: 'omar_ayub', name: 'Omar Ayub Khan', role: 'Senior Leader, former NA Opposition Leader', blurb: 'A blue-blood technocrat turned street-side agitator. Fluent in parliamentary procedure, allergic to compromise.', real: true },
    { id: 'shibli_faraz', name: 'Shibli Faraz', role: 'Senior Leader, former Senate Opposition Leader', blurb: 'Calm, media-savvy, and one of the few PTI voices establishment figures will still take a call from.', real: true },
    { id: 'gandapur', name: 'Ali Amin Gandapur', role: 'Senior Leader, former KP Chief Minister', blurb: 'Ran KP like a permanent rally. Beloved by the base for picking fights with Islamabad, exhausting to everyone who has to clean up after.', real: true },
    { id: 'qureshi', name: 'Shah Mahmood Qureshi', role: 'Vice Chairman', blurb: 'Old-school Multan aristocracy with a foreign minister\'s Rolodex. Years in and out of custody haven\'t dented the polish.', real: true },
    { id: 'yasmin_rashid', name: 'Dr Yasmin Rashid', role: 'Senior Punjab Leader', blurb: 'A doctor-turned-street-fighter who won her seat from a jail cell. The party\'s most credible face left standing in Punjab.', real: true },
  ],
  PPP: [
    { id: 'zardari', name: 'Asif Ali Zardari', role: 'Co-Chairman', blurb: 'The dealmaker. Nobody negotiates a coalition better, and nobody\'s trusted less by anyone outside Sindh.', real: true },
    { id: 'bilawal', name: 'Bilawal Bhutto Zardari', role: 'Chairman', blurb: 'The Bhutto name carries the base; you\'re still proving you can carry it beyond Sindh.', real: true },
    { id: 'murad_shah', name: 'Murad Ali Shah', role: 'Sindh Chief Minister', blurb: 'The engineer who actually runs Sindh day to day. Unglamorous, competent, and the reason the machine keeps working.', real: true },
    { id: 'sherry_rehman', name: 'Sherry Rehman', role: 'Vice President', blurb: 'The party\'s most polished English-language voice — sharp in parliament and on camera, a favorite of foreign diplomats.', real: true },
    { id: 'naveed_qamar', name: 'Syed Naveed Qamar', role: 'Senior Leader', blurb: 'A steady hand on the federal brief — the kind of leader coalition partners ask for by name in budget season.', real: true },
    { id: 'raja_pervaiz', name: 'Raja Pervaiz Ashraf', role: 'Senior Leader, former NA Speaker', blurb: 'Punjab\'s PPP elder statesman, forever tasked with proving the party still has a pulse north of Sindh.', real: true },
    { id: 'faisal_kundi', name: 'Faisal Karim Kundi', role: 'Senior Leader, Governor KP', blurb: 'Holding PPP\'s ceremonial foothold in PTI territory — mostly ribbon-cutting, occasionally real leverage.', real: true },
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
