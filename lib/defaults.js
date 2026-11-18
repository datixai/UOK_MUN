// Default content. Admin edits are stored in the database and override these.
export const DEF = {
  site: { tagline: 'UNIVERSITY OF KOTLI MODEL UNITED NATIONS', cta: 'Register now', showCountdown: true, showStats: false, showVenue: false, showSeats: false, showNews: true, showHow: true, showCommittees: true, showAgendas: true, showSchedule: true, showStatus: true, regOpen: true, closedMsg: 'Registration is currently closed.', regNote: 'Your details are used only to run this conference.', showChairs: true, showContact: true, email: 'uokmun4@gmail.com', contacts: [{ name: 'Kashif Riaz', role: 'Event Head, President and Secretary General', phone: '0355 6650661' }, { name: 'Muztafeez Ur Rehman', role: 'Director General Registration', phone: '0355 6901008' }] },
  info: { date: '', venue: 'University of Kotli, Azad Jammu and Kashmir', fee: '', contact: '', about: 'UOK MUN is the Model United Nations conference of the University of Kotli. Students step into the role of diplomats, debate global issues, write resolutions and build their voice.' },
  committees: [
    { id: 'unsc', name: 'UNSC', full: 'United Nations Security Council', seats: 0, chairs: '', countries: '', a1: 'Maritime security in the Strait of Hormuz and the Red Sea: freedom of navigation and the limits of force', a2: 'Kashmir: reviving UN mechanisms for crisis stability between nuclear-armed neighbours' },
    { id: 'unhrc', name: 'UNHRC', full: 'United Nations Human Rights Council', seats: 0, chairs: '', countries: '', a1: 'Counter-terrorism laws and civic space: protecting peaceful protest and association', a2: 'Mass forced returns and non-refoulement: protecting refugees and migrants' },
    { id: 'oic', name: 'OIC', full: 'Organisation of Islamic Cooperation', seats: 0, chairs: '', countries: '', a1: "Gaza: stabilisation force, reconstruction and Palestinian governance, and the OIC's role", a2: 'Collective security in the Muslim world: defence pacts, mediation and Iran-Gulf de-escalation' },
    { id: 'pna', name: 'PNA', full: 'Pakistan National Assembly', seats: 0, chairs: '', countries: '', a1: 'Anti-terror law and the right to protest: proscription powers, proportionality and parliamentary oversight', a2: 'Emergency rule in the provinces: Articles 232 and 234, federal-provincial balance and constitutional safeguards' },
    { id: 'uncsw', name: 'UNCSW', full: 'UN Commission on the Status of Women', seats: 0, chairs: '', countries: '', a1: 'Honour killings: closing legal loopholes and ending impunity', a2: 'Child marriage in South Asia: minimum-age laws, legal pluralism and enforcement' },
    { id: 'unga', name: 'UNGA', full: 'Junior General Assembly', seats: 0, chairs: '', countries: '', note: 'For FSc and Intermediate students|Training workshop included', a1: 'Combating Misinformation and Fake News in the Digital Age', a2: '' },
    { id: 'crisis', name: 'Crisis Cell', full: 'Crisis Cell', seats: 0, chairs: '', countries: '', a1: 'Scenario kept secret', a2: 'Scenario kept secret' }
  ],
  schedule: [
    { day: 'Day 1', time: '09:00', title: 'Registration and opening ceremony' },
    { day: 'Day 1', time: '11:00', title: 'Committee session I' },
    { day: 'Day 2', time: '10:00', title: 'Committee session II and lobbying' },
    { day: 'Day 3', time: '10:00', title: 'Final session, resolutions and voting' },
    { day: 'Day 3', time: '15:00', title: 'Closing ceremony and awards' }
  ],
  news: []
};
export const LOGOS = { unsc: '/committees/unsc.png', unhrc: '/committees/unhrc.png', oic: '/committees/oic.png', pna: '/committees/pna.png', uncsw: '/committees/uncsw.png', unga: '/committees/unga.png' };
export const clogo = c => c.logo || LOGOS[c.id] || '';

// WhatsApp link from a local number such as 0355 6650661 (Pakistan, +92).
export function waLink(phone, text) {
  let d = String(phone || '').replace(/\D/g, '');
  if (d.startsWith('0')) d = '92' + d.slice(1);
  return 'https://wa.me/' + d + (text ? '?text=' + encodeURIComponent(text) : '');
}
