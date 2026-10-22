require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const Itinerary = require('../models/Itinerary');
const User = require('../models/User');

(async () => {
  if (!process.env.MONGODB_URI) throw new Error('Database connection is not configured');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  let item = await Itinerary.findOne({ title: 'DEMO ONLY - Sample Central Asia itinerary' });
  if (item) {
    console.log(JSON.stringify({ created: false, id: String(item._id), title: item.title }));
    return;
  }
  const admin = await User.findOne({ isActive: true, role: { $in: ['super_admin', 'admin'] } }).select('_id').lean();
  if (!admin) throw new Error('No active admin account is available for createdBy');
  item = await Itinerary.create({
    createdBy: admin._id,
    title: 'DEMO ONLY - Sample Central Asia itinerary',
    customerName: 'Demo Customer',
    customerContact: 'demo@example.invalid',
    travelDates: { start: new Date('2027-04-10T00:00:00.000Z'), end: new Date('2027-04-13T00:00:00.000Z') },
    packageName: 'DEMO - Tashkent and Samarkand discovery',
    destinationIntroduction: 'Demonstration copy only: a sample multi-city proposal outline for Tashkent and Samarkand. Verify all destination information and practical arrangements before presenting this itinerary to a customer.',
    destinationHighlights: ['Sample city orientation in Tashkent', 'Suggested free time in Samarkand', 'Flexible multi-city route (all logistics pending confirmation)'],
    destinations: ['Tashkent', 'Samarkand'],
    days: 4,
    nights: 3,
    travelers: { adults: 3, children: 1, childrenAges: [8] },
    days_plan: [
      { dayNumber: 1, title: 'Arrive in Tashkent', shortTitle: 'Tashkent arrival', description: 'Sample arrival day. Arrival time, airport transfer, and hotel check-in are not booked.', activities: ['Meet-and-greet concept (sample only; pending confirmation)', 'Check in and rest', 'Optional independent evening walk'], hotel: 'Hotel selection pending', meals: ['Dinner'], transfer: 'Airport transfer pending confirmation' },
      { dayNumber: 2, title: 'Tashkent city day', shortTitle: 'Explore Tashkent', description: 'Flexible sample sightseeing day. Final route, opening hours, guide, and admission arrangements must be confirmed.', activities: ['Suggested city orientation', 'Suggested local market visit', 'Free time for customer-selected activities'], hotel: 'Hotel selection pending', meals: ['Breakfast'], transfer: 'Local transport pending confirmation' },
      { dayNumber: 3, title: 'Travel to Samarkand', shortTitle: 'Tashkent to Samarkand', description: 'Sample intercity travel day. Train or road transport has not been selected or booked.', activities: ['Checkout in Tashkent', 'Intercity journey (mode and timing pending)', 'Check in and free time in Samarkand'], hotel: 'Hotel selection pending', meals: ['Breakfast'], transfer: 'Intercity transfer pending confirmation' },
      { dayNumber: 4, title: 'Samarkand and departure', shortTitle: 'Departure day', description: 'Sample departure plan. Sightseeing is subject to flight timing; departure transfer is not booked.', activities: ['Optional short city visit if schedule allows', 'Checkout and onward departure'], hotel: '', meals: ['Breakfast'], transfer: 'Departure transfer pending confirmation' }
    ],
    hotels: [
      { destination: 'Tashkent', name: '', alternative: 'To be selected', roomType: 'To be confirmed', occupancy: 'To be confirmed', mealPlan: 'Breakfast (sample)', nights: 2, confirmation: 'pending' },
      { destination: 'Samarkand', name: '', alternative: 'To be selected', roomType: 'To be confirmed', occupancy: 'To be confirmed', mealPlan: 'Breakfast (sample)', nights: 1, confirmation: 'pending' }
    ],
    transferDetails: [
      { route: 'Tashkent airport to hotel', type: 'To be arranged', notes: 'Vehicle, supplier, and timing not selected.', confirmation: 'pending' },
      { route: 'Tashkent to Samarkand', type: 'Train or road (TBC)', notes: 'Transport mode and tickets not selected or booked.', confirmation: 'pending' },
      { route: 'Samarkand hotel to departure point', type: 'To be arranged', notes: 'Transfer not booked.', confirmation: 'pending' }
    ],
    optionalActivities: [
      { name: 'Optional guided city tour (sample)', price: 2500, notes: 'Sample estimate per person; availability and final price require confirmation.' },
      { name: 'Optional museum visit (sample)', price: 1200, notes: 'Sample estimate per person; admission and guide not included unless confirmed.' }
    ],
    pendingServices: ['Hotel names and room inventory', 'Airport, local, and intercity transfers', 'Guide and attraction admission arrangements', 'International flights and baggage', 'Final supplier costs and tax treatment'],
    policies: {
      child: 'Sample child pricing is shown for demonstration only. Confirm age rules, bed/meal arrangements, and supplier child terms before quoting.',
      payment: 'Sample schedule only: INR 29,000 on confirmation, INR 29,000 at the agreed interim date, and INR 39,000 before departure. Replace with approved terms.',
      cancellation: 'Cancellation terms are not configured. Add supplier-specific penalties and deadlines before sending to a customer.',
      checkInOut: 'Hotel check-in and check-out times are not confirmed; verify with the selected properties.',
      visa: 'Visa requirements depend on traveler nationality and can change. Verify for each traveler before booking.',
      travelDocuments: 'Travelers should verify passport validity and required travel documents before departure.',
      importantInformation: 'DEMO ITINERARY ONLY. Suggested activities, dates, services, and figures are examples. Nothing is booked or guaranteed. Obtain supplier confirmation and approval before sharing.'
    },
    closingMessage: 'Thank you for reviewing this demonstration proposal. We would be happy to prepare a verified quotation after confirming your travel requirements.',
    designKey: 'proposal',
    pricing: {
      currency: 'INR',
      basePrice: 26000,
      childBasePrice: 16000,
      gstPercentage: 5,
      flightCost: 0,
      additionalCharges: [{ label: 'Sample booking administration charge', amount: 1000 }],
      discounts: [{ label: 'Sample promotional discount', amount: 2700 }],
      paymentSchedule: [{ label: 'Sample deposit', amount: 29000 }, { label: 'Sample interim payment', amount: 29000 }, { label: 'Sample balance before departure', amount: 39000 }],
      priceStatus: 'estimate',
      inclusions: ['Sample accommodation allowance (hotel not selected)', 'Sample breakfasts as listed in the day plan'],
      exclusions: ['International flights', 'Visa fees', 'Unlisted meals and personal expenses', 'Optional activities unless selected'],
      pricingNotes: 'ALL AMOUNTS ARE DUMMY EXAMPLES ONLY. Estimated sample total: INR 97,000 for 3 adults and 1 child, including sample GST, charge, and discount. Not a supplier quotation; confirm rates and applicable taxes before sharing.'
    },
    status: 'draft'
  });
  console.log(JSON.stringify({ created: true, id: String(item._id), title: item.title }));
})().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
