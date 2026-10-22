require('dotenv').config({ quiet: true });
const dns = require("node:dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);
const mongoose = require('mongoose');
const User = require('../models/User');
const Itinerary = require('../models/Itinerary');

const DEMO_TITLE = 'DEMO ONLY - Rohit Mehra - Shymkent & Almaty (6D5N)';
const cloudinary = (id) => `https://res.cloudinary.com/docgnkjn9/image/upload/${id}`;
const image = (url, alt) => ({ url, publicId: '', alt });
const photo = (url, caption, alt) => ({ url, caption, alt });
const hotel = (destination, nights) => ({
  destination,
  name: '',
  alternative: `Preferred 5-star hotel in ${destination}; shortlist, live availability and final rate pending`,
  roomType: 'Room mix and bedding plan for 7 adults + 2 children to be confirmed',
  occupancy: 'Family/group allocation for 9 travelers; child ages and extra-bed requirements pending',
  mealPlan: 'Daily breakfast requested; confirm child rates and serving hours',
  nights,
  confirmation: 'pending'
});

// This is a clearly labelled sample offer. It is safe to seed repeatedly and
// deliberately keeps all supplier services and the custom extension unconfirmed.
const demoItinerary = {
  title: DEMO_TITLE,
  customerName: 'Rohit Mehra',
  customerContact: 'Phone: 9876543210 | Email: rahul246276@gmail.com | City: New Delhi',
  packageName: 'Almaty Getaway (5D/4N) + Shymkent Extension (1N) - Custom 6D/5N Demo',
  countries: ['Kazakhstan'],
  destinations: ['Shymkent', 'Almaty', 'Medeu', 'Shymbulak', 'Kok-Tobe'],
  route: [
    { city: 'Shymkent', nights: 1 },
    { city: 'Almaty', nights: 4 },
    { city: 'Medeu & Shymbulak', nights: 0 },
    { city: 'Kok-Tobe', nights: 0 }
  ],
  travelDates: { start: null, end: null },
  destinationIntroduction: 'DEMO ONLY — A tailored 6-day / 5-night Kazakhstan idea for Rohit Mehra and a party of 7 adults and 2 children, travelling in August (year and exact dates to be confirmed). The route pairs one night in Shymkent with four nights in Almaty, with city culture, mountain scenery and a relaxed family pace. The linked Bablons Almaty package is advertised as 5 days / 4 nights from INR 30,000 per person and describes a 4-star property, airport transfers, breakfast, sightseeing, an English-speaking guide, airfares and travel insurance. This proposal adapts that Almaty concept to a requested 5-star stay and adds Shymkent; those changes require a fresh supplier quote and are not included in the advertised starting price. No flights, hotels, transfers, tickets or guides are booked.',
  destinationHighlights: [
    'Shymkent arrival and an easy city orientation, with the local sightseeing sequence adjusted to arrival time',
    'Almaty city highlights: Panfilov Park, Zenkov / Ascension Cathedral exterior, Green Bazaar and central avenues (access and hours to reconfirm)',
    'Medeu and Shymbulak mountain outing, subject to weather, road access, lift operations, tickets and traveler suitability',
    'Kok-Tobe viewpoint and free time for family-friendly dining or shopping, subject to opening hours and transport',
    'One Shymkent night plus four Almaty nights, with requested 5-star hotel category and breakfast (properties not selected)',
    'A paced group plan with transfer vehicle capacity, room mix, child ages and accessibility needs checked before booking'
  ],
  packageHighlights: [
    '6 days / 5 nights: 1 night Shymkent + 4 nights Almaty',
    'Customer request: 7 adults + 2 children; child ages and rooming list required',
    'August travel; year and exact dates to be confirmed',
    '5-star hotel preference; availability and upgrade price pending',
    'Reference package advertised from INR 30,000 per person for its 5D/4N Almaty product; not a quote for this extended group itinerary',
    'Flights, transfers, breakfast, sightseeing, guide and insurance appear in the reference package feature list; exact inclusions and scope to be confirmed in writing',
    'All services, rates, schedule, entry requirements and cancellation terms remain unconfirmed; demo figures are illustrative only'
  ],
  destinationPhotos: [
    photo(cloudinary('v1791022592/bablons-travel/packages/nij8z2vjmfztqirtgklm.jpg'), 'Almaty getaway package inspiration', 'Almaty getaway package destination image'),
    photo(cloudinary('v1789197128/bablons-travel/destinations/m6l07gibxcqneregbheb.jpg'), 'Kazakhstan destination inspiration', 'Kazakhstan destination scenery'),
    photo(cloudinary('v1791022592/bablons-travel/packages/nij8z2vjmfztqirtgklm.jpg'), 'Mountain and city escape', 'Almaty trip inspiration'),
    photo(cloudinary('v1789197128/bablons-travel/destinations/m6l07gibxcqneregbheb.jpg'), 'Discover Kazakhstan', 'Kazakhstan landscape')
  ],
  days: 6,
  nights: 5,
  travelers: { adults: 7, children: 2, childrenAges: [] },
  days_plan: [
    {
      dayNumber: 1, title: 'Arrive in Shymkent | Welcome to Kazakhstan', shortTitle: 'Arrive in Shymkent', overnight: 'Shymkent',
      description: 'Arrival timing is not supplied yet. Keep this first day light and schedule the meet-and-greet only after flight details and passenger / luggage capacity are confirmed.',
      activities: ['Arrive at Shymkent International Airport; flight, terminal and arrival time TBC', 'Proposed group meet-and-greet and transfer to the selected 5-star hotel; vehicle size and supplier pending', 'Check in, settle in and rest after the journey', 'If arrival timing allows, take a short central orientation walk or enjoy hotel leisure time', 'Welcome dinner can be arranged as an optional add-on; venue, menu, child suitability and cost TBC'],
      hotel: 'Preferred 5-star Shymkent hotel - selection and availability pending', meals: ['Breakfast not assumed on arrival day', 'Other meals at own arrangement unless added'],
      transfer: 'Airport to hotel group transfer proposed; flight details, vehicle capacity for 9 passengers and luggage, waiting terms and rate pending',
      image: image(cloudinary('v1789197128/bablons-travel/destinations/m6l07gibxcqneregbheb.jpg'), 'Kazakhstan destination landscape')
    },
    {
      dayNumber: 2, title: 'Shymkent orientation | Travel to Almaty', shortTitle: 'Shymkent to Almaty', overnight: 'Almaty',
      description: 'A short Shymkent orientation is optional before the intercity journey. Select the travel mode after flight / train schedules, group baggage and August availability are checked; no mode is currently reserved.',
      activities: ['Breakfast at hotel, subject to booked meal plan and serving hours', 'Optional guided Shymkent city orientation or local market stop if timing permits (guide and attraction access TBC)', 'Check out; confirm luggage handling and any hotel checkout fees', 'Travel from Shymkent to Almaty by flight or rail/road option after schedule and group pricing review', 'Arrive in Almaty, transfer to hotel and check in; keep evening free'],
      hotel: 'Preferred 5-star Almaty hotel - selection and availability pending', meals: ['Breakfast subject to hotel confirmation', 'Lunch and dinner at own arrangement'],
      transfer: 'Shymkent-Almaty intercity transport and Almaty arrival transfer: mode, tickets, supplier, luggage allowance, timings and fares pending',
      image: image(cloudinary('v1791022592/bablons-travel/packages/nij8z2vjmfztqirtgklm.jpg'), 'Almaty package inspiration')
    },
    {
      dayNumber: 3, title: 'Almaty city | Parks, architecture and Green Bazaar', shortTitle: 'Almaty city discoveries', overnight: 'Almaty',
      description: 'An easy-paced city day using the reference package’s sightseeing concept. Guide, entrance fees, exact route, opening hours and vehicle plan need confirmation for the selected date.',
      activities: ['Breakfast at the hotel if confirmed in the selected rate', 'Meet the proposed English-speaking guide and vehicle (both pending confirmation)', 'Explore Panfilov Park and view Zenkov / Ascension Cathedral; entry subject to current access', 'Visit Green Bazaar for local produce and shopping; opening hours and dietary preferences to check', 'Continue with a central Almaty orientation and family-friendly free time', 'Return to hotel; evening at leisure'],
      hotel: 'Preferred 5-star Almaty hotel - selection pending', meals: ['Breakfast subject to hotel confirmation', 'Lunch and dinner at own arrangement'],
      transfer: 'Proposed private city vehicle for 9 travelers; suitable vehicle, guide, operating hours and rate pending',
      image: image(cloudinary('v1791022592/bablons-travel/packages/nij8z2vjmfztqirtgklm.jpg'), 'Almaty city and mountain getaway')
    },
    {
      dayNumber: 4, title: 'Medeu and Shymbulak | Tian Shan mountain day', shortTitle: 'Medeu and Shymbulak', overnight: 'Almaty',
      description: 'Mountain outing subject to operating schedules, road and weather conditions, access restrictions, ticket availability and the comfort of all travelers. Keep a city-based alternative available.',
      activities: ['Breakfast at hotel; confirm early meal arrangements if required', 'Depart for Medeu with proposed group vehicle and guide', 'Allow time for the Medeu mountain setting and viewpoints where public access is open', 'Optional Shymbulak cable car / mountain visit only if operating; tickets and applicable child rates not included unless quoted', 'Lunch stop at own arrangement; restaurant and dietary requirements TBC', 'Return to Almaty with a weather / access contingency plan'],
      hotel: 'Preferred 5-star Almaty hotel - selection pending', meals: ['Breakfast subject to hotel confirmation', 'Lunch and dinner at own arrangement'],
      transfer: 'Proposed round-trip group excursion vehicle; vehicle, road access, operating duration, guide, tickets and rate pending',
      image: image(cloudinary('v1789197128/bablons-travel/destinations/m6l07gibxcqneregbheb.jpg'), 'Kazakhstan mountain and nature scenery')
    },
    {
      dayNumber: 5, title: 'Kok-Tobe | Leisure and family time in Almaty', shortTitle: 'Kok-Tobe and free time', overnight: 'Almaty',
      description: 'A flexible final full day with a viewpoint visit and unhurried free time. Confirm attraction operation, tickets and family access for the August travel date.',
      activities: ['Breakfast at hotel if included', 'Optional Kok-Tobe Hill visit and viewpoint; access, transport and tickets TBC', 'Free time for shopping, café stops or a customer-selected museum / indoor activity', 'Optional farewell dinner can be quoted after cuisine, dietary requirements and budget are known', 'Return to hotel; pack and reconfirm next-day flight and airport pickup'],
      hotel: 'Preferred 5-star Almaty hotel - selection pending', meals: ['Breakfast subject to hotel confirmation', 'Other meals at own arrangement unless added'],
      transfer: 'Local group vehicle proposed as needed; operating hours and final route pending',
      image: image(cloudinary('v1791022592/bablons-travel/packages/nij8z2vjmfztqirtgklm.jpg'), 'Almaty leisure and sightseeing inspiration')
    },
    {
      dayNumber: 6, title: 'Almaty departure | End of journey', shortTitle: 'Almaty departure', overnight: '',
      description: 'Departure transfer and breakfast depend on confirmed flight time and hotel policy. Build in airline-recommended airport arrival time after the flight is ticketed.',
      activities: ['Breakfast at hotel if available at the required time and included in the booked rate', 'Check out; settle personal incidentals and confirm baggage', 'Proposed group transfer to Almaty International Airport; pickup time to be based on confirmed flight', 'Depart Almaty; end of sample itinerary'],
      hotel: 'Check out from Almaty hotel; late checkout / luggage storage subject to approval', meals: ['Breakfast subject to hotel confirmation'],
      transfer: 'Hotel-to-airport transfer for 9 travelers proposed; flight details, vehicle / luggage capacity, pickup and supplier rate pending',
      image: image(cloudinary('v1789197128/bablons-travel/destinations/m6l07gibxcqneregbheb.jpg'), 'Kazakhstan destination farewell')
    }
  ],
  hotels: [hotel('Shymkent', 1), hotel('Almaty', 4)],
  transferDetails: [
    { route: 'Shymkent International Airport to Shymkent hotel', type: 'Private group transfer - proposed', notes: 'Confirm flight, arrival terminal, meet-and-greet, suitable vehicle for 9 travelers and luggage, waiting time, child seats if required, supplier and rate.', confirmation: 'pending' },
    { route: 'Shymkent hotel to onward Almaty transport', type: 'Hotel transfer - proposed', notes: 'Mode and schedule (air / rail / road) to be selected after live timetable, group fare, baggage and travel time review; not booked.', confirmation: 'pending' },
    { route: 'Shymkent to Almaty', type: 'Intercity transport - pending selection', notes: 'Compare available flight and rail/road options for 7 adults and 2 children; tickets, baggage allowance, transfer connections and rate pending.', confirmation: 'pending' },
    { route: 'Almaty station / airport to Almaty hotel', type: 'Private group transfer - proposed', notes: 'Confirm arrival point and time, vehicle capacity, luggage, child seats if needed, supplier and rate.', confirmation: 'pending' },
    { route: 'Almaty city sightseeing', type: 'Private group vehicle + English-speaking guide - proposed', notes: 'Reference package lists sightseeing and an English-speaking guide; daily scope, guide hours, vehicle size, parking and admission fees to confirm.', confirmation: 'pending' },
    { route: 'Almaty - Medeu - Shymbulak - Almaty', type: 'Mountain excursion vehicle - proposed', notes: 'Check weather, access, operating status, vehicle suitability, ticket inventory and traveler needs before confirming.', confirmation: 'pending' },
    { route: 'Almaty hotel to Almaty International Airport', type: 'Private group transfer - proposed', notes: 'Set pickup after flight confirmation; verify 9-person luggage capacity, flight monitoring, waiting terms, child seats and supplier rate.', confirmation: 'pending' }
  ],
  optionalActivities: [
    { name: '5-star hotel upgrade / family room plan', price: null, notes: 'Requested hotel standard. Quote live August availability, room mix for 9 guests, child ages, extra beds, breakfast, taxes and cancellation conditions.' },
    { name: 'Shymkent guided orientation', price: null, notes: 'Optional short tour depending on arrival and intercity departure times; guide language, attractions and fees to quote.' },
    { name: 'Shymbulak cable car tickets', price: null, notes: 'Optional; operating schedule, weather, ticket tiers, child pricing and transport to be verified.' },
    { name: 'Kok-Tobe tickets / activities', price: null, notes: 'Optional; confirm operating hours, transport, attraction choice and current rates.' },
    { name: 'Kazakh family dinner', price: null, notes: 'Optional; confirm cuisine preference, dietary needs, child menu, venue and total cost.' },
    { name: 'International flights and travel insurance', price: null, notes: 'The reference package lists airfares and travel insurance among features; specific coverage, route, baggage, dates, supplier, policy terms and price are not established.' }
  ],
  pendingServices: [
    'Confirm August travel year and exact dates; the supplied month alone is not enough to check inventory or fares',
    'Confirm all 9 traveler names, child ages, passport nationalities, rooming and bedding plan, mobility and dietary needs',
    'Requote the advertised 5D/4N Almaty package for 7 adults and 2 children; confirm what the INR 30,000/person starting price covers and its validity',
    'Price the extra Shymkent night and intercity travel; the requested 6D/5N route is a custom extension',
    'Select and verify 5-star hotels in Shymkent and Almaty; check room capacity, breakfast, child supplements, taxes, availability and cancellation terms',
    'Confirm international flight routing from / to New Delhi, baggage, group fare and whether airfares are included in the quote',
    'Confirm airport, intercity, sightseeing and excursion vehicles can carry 9 travelers plus luggage; request child seats if needed',
    'Confirm English-speaking guide scope, sightseeing sequence, attraction opening hours, admission and cable car tickets',
    'Verify current official entry requirements for each passport nationality and recommend suitable travel insurance',
    'Prepare the dated quotation with currency, taxes, payment schedule, quote validity, inclusions, exclusions and supplier cancellation terms'
  ],
  policies: {
    child: 'Two children are included in the traveler count, but their ages are not supplied. Hotel bedding, extra beds, breakfast supplements, transfer seats, attraction ticket rates and any child pricing depend on exact ages and supplier policies; confirm before quoting.',
    payment: 'No payment is due on this demo. For a live proposal, issue an approved dated schedule only after supplier rates and booking terms are confirmed. Payment milestone examples in a draft must not be treated as invoices.',
    cancellation: 'No supplier is selected and no cancellation terms are attached. Provide the actual hotel, flight, transport, guide and ticket change / cancellation penalties, refundable amounts and deadlines before payment.',
    checkInOut: 'Check-in, check-out, early arrival, late departure and luggage storage follow the selected hotel policy and remain subject to availability.',
    visa: 'Entry and transit requirements depend on passport nationality, travel purpose and current official rules. Each traveler must verify requirements for the confirmed route before booking and departure.',
    travelDocuments: 'Confirm passports, airline rules, travel insurance, emergency contacts and required entry / transit documents for all travelers. Names must match travel documents before tickets are issued.',
    importantInformation: 'DEMO ONLY — not a booking, reservation, supplier confirmation or valid customer quotation. The reference Bablons Almaty listing is 5D/4N and advertises a starting price from INR 30,000 per person with a 4-star property; this sample changes that to a 5-star preference, adds Shymkent and includes 9 travelers, so fresh pricing and confirmation are essential. August year and dates are unknown. Images are illustrative package / destination photography and do not depict confirmed hotels or services. Confirm current access, schedules, official entry rules, insurance, accessibility, child suitability, suppliers, taxes, rates and all terms before customer use.'
  },
  closingMessage: 'Thank you, Rohit. This sample brings together your requested Shymkent and Almaty route, August travel, 5-star hotel preference and group of seven adults and two children. Share the travel year, exact dates, children’s ages, rooming preferences and flight requirements so Bablons Travel can check availability and prepare a complete dated quotation.',
  pricing: {
    basePrice: 30000,
    childBasePrice: 30000,
    gstPercentage: 5,
    gstAmount: 1500,
    childGstAmount: 1500,
    perPersonCost: 31500,
    childPerPersonCost: 31500,
    totalCost: 283500,
    totalPrice: 283500,
    currency: 'INR',
    flightCost: 0,
    additionalCharges: [],
    discounts: [],
    paymentSchedule: [],
    pricingNotes: 'DEMO ESTIMATE ONLY. This uses the advertised “from INR 30,000 per person” Almaty package starting price as a reference for 9 travelers (INR 270,000 before an illustrative 5% GST; INR 283,500 including that arithmetic estimate). The listing is 5D/4N and describes a 4-star property; this customer wants 6D/5N, Shymkent + Almaty and 5-star hotels. Therefore INR 283,500 is not a valid quote and may exclude costs or differ from supplier pricing. Flights, Shymkent extension, hotel upgrade, child rates, taxes and the actual package scope must be confirmed and recalculated. No payment schedule is issued.',
    priceStatus: 'estimate',
    inclusions: [
      'Reference package features: accommodation at advertised 4-star property (not the requested 5-star upgrade; upgrade pending)',
      'Reference package features list airport transfers, daily breakfast, sightseeing and English-speaking guide; exact route, quantity, service scope and final inclusion must be confirmed',
      'Reference package features list airfares and travel insurance; actual flights, coverage, exclusions and price must be confirmed',
      'One Shymkent night, intercity transport, all 5-star accommodations and services for 9 travelers are pending separate quote',
      'No service is booked or guaranteed by this illustrative estimate'
    ],
    exclusions: [
      'Any difference between the advertised Almaty starting price and the actual dated supplier quote',
      '5-star hotel upgrade, room supplements, extra beds, child supplements, taxes or peak-date surcharges unless itemized in a revised quote',
      'Shymkent extension, intercity flights / rail / road transport and related transfers unless itemized',
      'Unlisted meals, attraction / cable car tickets, personal expenses, tips and services not confirmed in writing',
      'Visa / entry fees where applicable and travel insurance until policy scope is confirmed'
    ]
  },
  coverImage: image(cloudinary('v1791022592/bablons-travel/packages/nij8z2vjmfztqirtgklm.jpg'), 'Almaty getaway package cover'),
  designKey: 'proposal',
  status: 'draft'
};

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not configured; no itinerary was created.');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  const existing = await Itinerary.findOne({ title: DEMO_TITLE });
  if (existing) {
    console.log(JSON.stringify({ created: false, id: String(existing._id), title: existing.title }));
    return;
  }
  const admin = await User.findOne({ isActive: true, role: { $in: ['super_admin', 'admin'] } }).select('_id').lean();
  if (!admin) throw new Error('No active admin account found; no itinerary was created.');
  const itinerary = await Itinerary.create({ ...demoItinerary, createdBy: admin._id });
  console.log(JSON.stringify({ created: true, id: String(itinerary._id), title: itinerary.title, days: itinerary.days, nights: itinerary.nights }));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  }).finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });
}

module.exports = { demoItinerary };
