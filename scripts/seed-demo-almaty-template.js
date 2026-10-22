require('dotenv').config({ quiet: true });
const dns = require("node:dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);
const mongoose = require('mongoose');
const User = require('../models/User');
const ItineraryTemplate = require('../models/ItineraryTemplate');

const TEMPLATE_NAME = 'DEMO ONLY - Kazakhstan Almaty 5D4N Discovery';

const templateData = {
  name: TEMPLATE_NAME,
  countries: ['Kazakhstan'],
  destinations: ['Almaty', 'Medeu', 'Shymbulak', 'Big Almaty Lake'],
  route: ['Almaty', 'Medeu', 'Shymbulak', 'Big Almaty Lake'],
  description: 'Dummy five-day/four-night Almaty city and mountain itinerary for internal demonstration. All services, access, opening hours, and prices require supplier and local verification.',
  destinationIntroduction: 'DEMO COPY: Almaty is a sample base for a city-and-mountain itinerary in southeastern Kazakhstan. The plan below is illustrative only. Verify seasonal access, weather, permits, local conditions, transport, and attraction operations before offering it to a traveler.',
  days: 5,
  nights: 4,
  days_plan: [
    { dayNumber: 1, title: 'Arrive in Almaty', shortTitle: 'Arrival and city centre', description: 'Sample arrival schedule. Adjust activities to the confirmed flight time; no transfer or hotel is booked.', activities: ['Arrive at Almaty International Airport (flight details TBC)', 'Meet-and-greet and private transfer concept (TBC)', 'Hotel check-in and rest', 'Optional short walk near the hotel'], hotel: 'Almaty hotel - selection pending', meals: ['Dinner'], transfer: 'Airport to hotel - vehicle and timing pending' },
    { dayNumber: 2, title: 'Almaty city highlights', shortTitle: 'City and culture', description: 'Flexible city day; confirm guide, opening days, ticket requirements, and current operating hours.', activities: ['Panfilov Park and Ascension Cathedral area (visit subject to access)', 'Green Bazaar visit (opening hours TBC)', 'Central city orientation and free time', 'Optional evening at a local restaurant'], hotel: 'Almaty hotel - selection pending', meals: ['Breakfast'], transfer: 'Local transport and guide pending' },
    { dayNumber: 3, title: 'Medeu and Shymbulak mountain day', shortTitle: 'Mountain scenery', description: 'Weather- and season-dependent sample excursion. Check road conditions, lift operations, tickets, and altitude suitability before confirming.', activities: ['Drive to Medeu area (route and access TBC)', 'Optional Shymbulak cable car or mountain visit, subject to operations', 'Free time for lunch and viewpoints', 'Return to Almaty'], hotel: 'Almaty hotel - selection pending', meals: ['Breakfast'], transfer: 'Round-trip mountain transport pending' },
    { dayNumber: 4, title: 'Big Almaty Lake or flexible nature day', shortTitle: 'Nature and free time', description: 'Big Almaty Lake access can be restricted or regulated. Do not promise vehicle access; verify current rules and choose an approved alternative if needed.', activities: ['Nature excursion proposal: Big Almaty Lake area, subject to current access rules and permits', 'Alternative if access is restricted: approved nearby nature viewpoint or a relaxed Almaty day', 'Free time for shopping or optional activities'], hotel: 'Almaty hotel - selection pending', meals: ['Breakfast'], transfer: 'Excursion transport and any required permits pending' },
    { dayNumber: 5, title: 'Departure from Almaty', shortTitle: 'Checkout and departure', description: 'Keep the morning flexible around the confirmed flight. No departure service is booked.', activities: ['Breakfast and hotel checkout', 'Optional short activity if flight timing allows', 'Transfer to airport and onward flight (TBC)'], hotel: '', meals: ['Breakfast'], transfer: 'Hotel to airport - timing and vehicle pending' }
  ],
  hotelPreferences: ['Centrally located Almaty property', 'Guest rating and room category to be chosen after availability and budget check', 'Breakfast basis preferred; exact meal plan to be confirmed', 'Family room or extra bed subject to written confirmation'],
  hotels: [
    { destination: 'Almaty', name: '', alternative: 'To be selected after availability check', roomType: 'Standard room - TBC', occupancy: '2 adults per room - TBC', mealPlan: 'Breakfast - TBC', nights: 4, confirmation: 'pending' }
  ],
  transfers: ['Airport arrival and departure transfers - pending supplier quote', 'Almaty city transport - route and vehicle pending', 'Medeu/Shymbulak excursion transport - seasonal access and vehicle pending', 'Nature excursion transport - only after access rules are verified'],
  highlights: ['Almaty city orientation', 'Panfilov Park and Ascension Cathedral area (access TBC)', 'Medeu and Shymbulak mountain excursion (season and operations TBC)', 'Flexible nature day with an access-checked alternative', 'Four nights based in Almaty'],
  inclusions: ['Four nights accommodation allowance in Almaty (property not selected)', 'Breakfast on days 2-5, subject to hotel confirmation', 'Suggested itinerary planning and coordination (scope to be agreed)'],
  exclusions: ['International and domestic flights', 'Visa fees or document services', 'Lunches and dinners except where later confirmed', 'Attraction tickets, cable cars, permits, and guide fees unless explicitly added', 'Travel insurance, personal expenses, tips, and unlisted services'],
  pricingNotes: 'DUMMY TEMPLATE: no live supplier rates or verified package total are included. Prepare a dated quotation only after confirming flights, hotel availability, transfers, tickets/permits, traveler count, and applicable taxes.',
  optionalActivities: [
    { name: 'Guided Almaty city tour (sample option)', price: null, notes: 'Guide, duration, inclusions, availability, and rate to be quoted.' },
    { name: 'Shymbulak cable car / mountain activity (sample option)', price: null, notes: 'Seasonal operation, ticket tier, weather, and rate to be verified.' },
    { name: 'Local food experience (sample option)', price: null, notes: 'Menu, dietary needs, venue, and cost to be confirmed.' }
  ],
  pendingServices: ['Travel dates and international flight details', 'Hotel name, room inventory, occupancy, and cancellation terms', 'Airport, city, and excursion transport suppliers', 'Current access rules, operating hours, tickets, permits, and guide arrangements', 'Traveler nationality and applicable entry/visa requirements', 'Final quote, taxes, currency conversion, payment milestones, and cancellation penalties'],
  policies: {
    child: 'Demo wording only. Confirm child age bands, extra bed, breakfast, attraction ticket, and supplier-specific child pricing for the actual travelers.',
    payment: 'Not configured. Add the approved payment schedule and due dates to the customer-specific quotation.',
    cancellation: 'Not configured. Attach the selected hotel, transport, and activity suppliers’ cancellation terms before confirmation.',
    checkInOut: 'Times depend on the selected property; confirm directly. Early check-in and late checkout are not included unless written into the final quotation.',
    visa: 'Entry requirements depend on passport nationality and may change. Verify current official requirements for every traveler before booking.',
    travelDocuments: 'Travelers must check passport validity, airline requirements, insurance, and any required entry documents before departure.',
    importantInformation: 'DEMO ONLY. Suggested visits and routes are not reservations. Mountain weather, seasonal operations, road access, permits, and local restrictions may change. Confirm each service and suitability before customer use.'
  },
  closingMessage: 'Thank you for reviewing this sample Almaty itinerary. We can prepare a customer-specific quotation after your travel dates, traveler details, and service preferences are confirmed.',
  status: 'active'
};

(async () => {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not configured; template was not inserted.');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });

  const existing = await ItineraryTemplate.findOne({ name: TEMPLATE_NAME });
  if (existing) {
    console.log(JSON.stringify({ created: false, id: String(existing._id), name: existing.name }));
    return;
  }

  const admin = await User.findOne({ isActive: true, role: { $in: ['super_admin', 'admin'] } }).select('_id').lean();
  if (!admin) throw new Error('No active admin account is available for createdBy; template was not inserted.');

  const item = await ItineraryTemplate.create({ ...templateData, createdBy: admin._id, updatedBy: admin._id });
  console.log(JSON.stringify({ created: true, id: String(item._id), name: item.name, days: item.days, nights: item.nights }));
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
});
