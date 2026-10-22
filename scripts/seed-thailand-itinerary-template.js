require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const User = require('../models/User');
const ItineraryTemplate = require('../models/ItineraryTemplate');

const name = 'Thailand — Bangkok 6D5N (starter draft; verify before use)';
const activities = [
  ['Arrive at Bangkok airport', 'Meet the local representative', 'Transfer to the hotel', 'Check in and settle in', 'Explore the nearby area', 'Rest after the journey'],
  ['Enjoy breakfast at the hotel', 'Visit the Grand Palace area', 'Explore Wat Pho', 'Discover Bangkok by river boat', 'Enjoy free time in the afternoon', 'Return to the hotel'],
  ['Enjoy breakfast at the hotel', 'Visit a local market', 'Explore a Bangkok neighbourhood', 'Pause for lunch at your own choice', 'Browse local shops', 'Return to the hotel'],
  ['Enjoy breakfast at the hotel', 'Choose a cultural attraction', 'Explore at a relaxed pace', 'Enjoy free time for shopping', 'Return to the hotel', 'Prepare for the next day'],
  ['Enjoy breakfast at the hotel', 'Choose an optional day activity', 'Explore a local area', 'Enjoy free time in the afternoon', 'Return to the hotel', 'Pack for departure'],
  ['Enjoy breakfast at the hotel', 'Check out of the hotel', 'Transfer to the airport', 'Allow time for airport check-in', 'Depart Bangkok', 'Continue your onward journey']
];
const templateData = {
  name, countries: ['Thailand'], destinations: ['Bangkok'], route: [{ city: 'Bangkok', nights: 5 }],
  description: 'Editable starter itinerary. This is not transcribed from the unavailable reference PDF. Verify every activity, supplier, inclusion, price, and operating detail before sharing with a customer.',
  destinationIntroduction: 'Bangkok combines historic temples, lively neighbourhoods, river routes, and contemporary city life. Tailor the visit order to opening hours, weather, customer interests, and confirmed services.',
  days: 6, nights: 5,
  days_plan: activities.map((items, index) => ({ dayNumber: index + 1, title: ['Arrival in Bangkok', 'Bangkok temples and river', 'Markets and neighbourhoods', 'Culture and free time', 'Flexible Bangkok day', 'Departure from Bangkok'][index], shortTitle: ['Arrive in Bangkok', 'Temples and river', 'Markets and local life', 'Culture and shopping', 'A day at your pace', 'Departure'][index], overnight: index < 5 ? 'Bangkok' : '', activities: items, meals: index === 0 ? ['Dinner'] : index === 5 ? ['Breakfast'] : ['Breakfast'] })),
  hotels: [{ destination: 'Bangkok', name: '', alternative: '', roomType: '', occupancy: '', mealPlan: 'To be confirmed', nights: 5, confirmation: 'pending' }],
  transfers: [{ route: 'Airport – hotel – airport', type: 'PVT', notes: 'Confirm vehicle, timing, and supplier', confirmation: 'pending' }],
  highlights: ['Explore Bangkok’s historic temple district', 'See the city from the river', 'Visit a local market', 'Leave time for independent discovery'],
  packageHighlights: ['Five nights in Bangkok', 'Six days to explore at a comfortable pace', 'Activities and services require customer-specific confirmation'],
  inclusions: [], exclusions: [], pendingServices: ['Confirm travel dates and flight details', 'Select hotel and confirm room availability', 'Confirm transfers, tickets, meals, and guide services', 'Prepare customer-specific pricing and payment schedule'],
  policies: {}, status: 'active'
};

(async () => {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not configured; no template was inserted.');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  const existing = await ItineraryTemplate.findOne({ name });
  if (existing) { console.log(JSON.stringify({ created: false, id: String(existing._id), name: existing.name })); return; }
  const admin = await User.findOne({ isActive: true, role: { $in: ['super_admin', 'admin'] } }).select('_id').lean();
  if (!admin) throw new Error('No active admin account is available; no template was inserted.');
  const item = await ItineraryTemplate.create({ ...templateData, createdBy: admin._id, updatedBy: admin._id });
  console.log(JSON.stringify({ created: true, id: String(item._id), name: item.name, days: item.days, nights: item.nights }));
})().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(async () => { if (mongoose.connection.readyState) await mongoose.disconnect(); });
