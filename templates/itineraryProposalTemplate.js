const { toProposalModel } = require('./itineraryProposalModel');
const brand = require('../config/itineraryBrand');
const countryPacks = require('../config/itineraryCountryPacks');
const { isAllowedPdfImageUrl } = require('../utils/pdfImageAllowlist');
const fs = require('node:fs');
const path = require('node:path');
const { contactIconImage } = require('./itineraryContactIcons');
const ICON_PATHS = {
  members: '<circle cx="12" cy="8" r="3.25"/><path d="M5.5 20v-1.4a6.5 6.5 0 0 1 13 0V20zM18 5.3a3.2 3.2 0 0 1 0 5.9M20.5 19.8v-1.2a5 5 0 0 0-2.1-4.1"/>',
  dates: '<rect x="3.5" y="5" width="17" height="16" rx="2.2"/><path d="M7.5 3v4M16.5 3v4M3.5 9.5h17M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01"/>',
  package: '<path d="m12 3 8.5 4.5v9L12 21l-8.5-4.5v-9L12 3Z"/><path d="m3.8 7.7 8.2 4.5 8.2-4.5M12 12.2V21M8 5.1l8.5 4.6"/>',
  route: '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h2.5a3.5 3.5 0 0 0 0-7h-1a3.5 3.5 0 0 1 0-7H16"/>',
  duration: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  hotel: '<path d="M3 20V5M3 16h18v4M3 12h18v4M7 12V8h5v4M21 20V9M15 12V9h4v3"/>',
  transfer: '<path d="M5 17h14l-1.2-7.2a2 2 0 0 0-2-1.8H8.2a2 2 0 0 0-2 1.8L5 17ZM7 17v2M17 17v2M5.5 13h13M8 8l1-3h6l1 3"/><circle cx="8" cy="15" r=".8"/><circle cx="16" cy="15" r=".8"/>',
  child: '<circle cx="12" cy="7" r="3"/><path d="M6 20v-2a6 6 0 0 1 12 0v2M9 12l3 2 3-2M12 14v6"/>',
  payment: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>',
  cancellation: '<path d="M20 7v5h-5M4 17v-5h5M5.5 9a7 7 0 0 1 11.8-2L20 12M4 12l2.7 5a7 7 0 0 0 11.8-2"/>',
  checkin: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  visa: '<path d="M5 3h11l4 4v14H5zM15.5 3v5H20M8 12h8M8 16h5"/><circle cx="10" cy="8" r="1.2"/>',
  documents: '<path d="M6 3h9l4 4v14H6zM14.5 3v5H19M9 12h7M9 16h7"/>'
};
function pdfIcon(name, className = '') {
  return ICON_PATHS[name] ? `<svg class="pdf-icon ${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g>${ICON_PATHS[name]}</g></svg>` : '';
}

const esc = (value = '') => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const chunk = (items = [], size = 6) => { const out = []; for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size)); return out; };
function balancedChunks(items = [], maxSize = 5) {
  if (!items.length) return [];
  const groupCount = Math.ceil(items.length / maxSize);
  const baseSize = Math.floor(items.length / groupCount);
  const largerGroupCount = items.length % groupCount;
  const groups = [];
  let cursor = 0;
  for (let index = 0; index < groupCount; index += 1) {
    const size = baseSize + (index < largerGroupCount ? 1 : 0);
    groups.push(items.slice(cursor, cursor + size));
    cursor += size;
  }
  return groups;
}
function splitText(value = '', limit = 650) { const result=[]; let part=''; for (const word of String(value||'').split(/\s+/).filter(Boolean)) { if (part && part.length+word.length+1>limit) { result.push(part); part=''; } part += `${part?' ':''}${word}`; } if (part) result.push(part); return result; }

function proposalHTML(itinerary = {}) {
  const m = toProposalModel(itinerary, brand, countryPacks);
  const pages = [];
  const addPage = (body, className = '') => pages.push(`<section class="page ${className}">${body}${className.includes('cover') || className.includes('back-cover') ? '' : footer()}</section>`);
  const destinations = [...new Set((m.route.length ? m.route.map((stop) => typeof stop === 'string' ? stop : stop.city) : m.destinations).filter(Boolean))];
  const routeText = destinations.join('  â†’  ') || m.destinations.join('  â†’  ') || 'Destination to be confirmed';
  const dateText = dateRange(m.travelDates);
  const hero = safeImage(m.hero || m.destinationPhotos[0]?.url);
  const photoFor = (city, index) => {
    const linked = m.cityCards.find((item) => item.name.toLowerCase() === String(city || '').toLowerCase());
    return linked?.heroImage || m.destinationPhotos[index]?.url || '';
  };
  const brandLogo = getBrandLogoDataUri();
  const logo = `<div class="brand-mark">${brandLogo ? `<span class="brand-logo-frame"><img src="${brandLogo}" alt="Bablons Travel logo"></span>` : '<span class="brand-icon">B</span>'}<span class="brand-wordmark"><b>${esc(brand.name)}</b><small>${esc(brand.contacts.website.replace(/^https?:\/\//, ''))}</small></span></div>`;
  const title = m.country || m.destinations.join(' · ') || m.title || 'Your Journey';

  // 1. Cover
  addPage(`<div class="cover-image"${hero ? ` style="background-image:linear-gradient(180deg,rgba(8,22,55,.48),rgba(8,22,55,.2) 38%,rgba(8,18,44,.9) 100%),url('${esc(hero)}')"` : ''}></div><div class="cover-inner"><div class="cover-top">${logo}<span class="cover-edition">BESPOKE<br>TRAVEL PROPOSAL</span></div><div class="cover-title"><p class="eyebrow">YOUR JOURNEY</p><p class="proposal-title">${esc(m.title)}</p><h1>${esc(title)}</h1><div class="gold-bar"></div><p class="tagline">${esc(m.tagline)}</p>${m.customerName ? `<p class="prepared">Prepared especially for <strong>${esc(m.customerName)}</strong></p>` : ''}</div><div class="trip-panel"><h2>Trip at a glance</h2><div class="trip-grid">${tripRow('members','Travelers',`${m.travelers.adults} Adults${m.travelers.children ? ` + ${m.travelers.children} Child${m.childrenAges.length ? ` (age ${m.childrenAges.join(', ')})` : ''}` : ''}`)}${tripRow('dates','Travel dates',dateText)}${tripRow('package','Package',m.packageName || `${m.daysCount} Days / ${m.nights} Nights`)}${tripRow('route','Route',routeText)}${tripRow('duration','Duration',`${m.daysCount} Days / ${m.nights} Nights`)}</div></div></div>`, 'cover');
  // 2. Discover
  const discoverStops = destinations.length ? destinations : m.destinationPhotos.map((photo) => photo.caption).filter(Boolean);
  const cityTileGroups = chunk(discoverStops, 4).map((stops, groupIndex) => stops.map((city, index) => {
    const cityIndex = groupIndex * 4 + index;
    const photo = safeImage(photoFor(city, cityIndex));
    return `<article class="destination-tile">${photo ? `<img src="${esc(photo)}" alt="${esc(city)}">` : `<div class="photo-fallback">${esc(city)}</div>`}<h3>${esc(city)}</h3><p>${esc(m.cityCards.find((item) => item.name.toLowerCase() === city.toLowerCase())?.shortDescription || m.destinationPhotos[cityIndex]?.caption || 'A memorable stop on your journey')}</p></article>`;
  }).join(''));
  const introText = m.destinationIntroduction || `Explore ${routeText} on a carefully planned ${m.daysCount}-day journey, with time to enjoy each destination at a relaxed pace.`;
  const experiences = m.destinationHighlights.slice(0, 8).map((item) => `<li>${esc(item)}</li>`).join('');
  const packageHighlights = m.packageHighlights.slice(0, 8).map((item) => `<li>${esc(item)}</li>`).join('');
  if (introText || cityTileGroups.length || experiences || packageHighlights) addPage(`${pageHead('YOUR DESTINATIONS','Discover')}${introText ? `<p class="intro">${esc(introText)}</p>` : ''}${cityTileGroups[0] ? `<div class="destination-grid" style="grid-template-columns:repeat(${discoverStops.length === 1 ? 1 : 2},1fr)">${cityTileGroups[0]}</div>` : ''}${experiences ? `<h2 class="section-title">Experiences to look forward to</h2><ul class="experience-list">${experiences}</ul>` : ''}${packageHighlights ? `<h2 class="section-title compact-section">Package highlights</h2><ul class="experience-list">${packageHighlights}</ul>` : ''}`);
  for (const [index, tiles] of cityTileGroups.slice(1).entries()) addPage(`${pageHead('YOUR DESTINATIONS',`Discover · continued ${index + 1}`)}<div class="destination-grid">${tiles}</div>`);

  for (const items of chunk(m.destinationHighlights.slice(8), 12)) addPage(`${pageHead('MORE TO LOOK FORWARD TO','Experiences · continued')}<ul class="experience-list">${items.map((item)=>`<li>${esc(item)}</li>`).join('')}</ul>`);
  for (const items of chunk(m.packageHighlights.slice(8), 12)) addPage(`${pageHead('PACKAGE DETAILS','Package highlights · continued')}<ul class="experience-list">${items.map((item)=>`<li>${esc(item)}</li>`).join('')}</ul>`);
  // 3. At a glance
  const glanceInclusions = m.inclusions.slice(0, 4).map((item) => `<span>✓ ${esc(item)}</span>`).join('');
  for (const [index, days] of balancedChunks(m.days, 5).entries()) {
    const glance = days.map((day) => { const photo = safeImage(day.image || photoFor(day.overnight, day.number - 1)); return `<article class="timeline-row">${photo ? `<img src="${esc(photo)}" alt="${esc(day.shortTitle)}">` : `<div class="timeline-placeholder">Day ${day.number}</div>`}<div><span class="day-label">DAY ${day.number}</span><h3>${esc(day.shortTitle)}</h3><p>${esc(day.overnight ? `Overnight in ${day.overnight}` : 'Departure day')}</p></div></article>`; }).join('');
    addPage(`${pageHead('THE JOURNEY AT A GLANCE',index ? 'At a glance · continued' : 'At a glance')}<div class="glance-layout"><div class="timeline">${glance || '<p class="muted">Day-wise plan to be confirmed.</p>'}</div></div>${index===0 && glanceInclusions ? `<div class="inclusion-strip">${glanceInclusions}</div>` : ''}`);
  }

  // 4. Day-by-day, maximum six days on each fixed-size page.
  for (const days of balancedChunks(m.days, 4)) {
    const blocks = days.map((day) => `<article class="day-block"><div class="day-heading"><span>DAY ${day.number}</span><h2>${esc(day.title)}</h2></div>${day.description ? `<p class="day-description">${esc(day.description)}</p>` : ''}<ul>${(day.activities.length ? day.activities : ['Activities to be confirmed']).map((activity) => `<li>${esc(activity)}</li>`).join('')}</ul><p class="day-meta">${[day.transfer && `Transfer: ${day.transfer}`, day.meals.length && `Meals: ${day.meals.join(', ')}`, day.overnight && `Overnight: ${day.overnight}`].filter(Boolean).map(esc).join('  ·  ')}</p></article>`).join('');
    addPage(`${pageHead('YOUR DAILY JOURNEY', days.length > 1 ? 'Day-wise Itinerary' : `Day ${days[0]?.number || ''}`)}<div class="day-list">${blocks || '<p class="muted">Daily itinerary to be confirmed.</p>'}</div>`);
  }
  // 5. Inclusions and exclusions
  const includeItems = m.inclusions.map((item) => `<li><span class="check">✓</span><span>${esc(item)}</span></li>`).join('');
  const excludeItems = m.exclusions.map((item) => `<li><span class="cross">✕</span><span>${esc(item)}</span></li>`).join('');
  const widePhoto = safeImage(m.destinationPhotos[1]?.url);
  addPage(`${pageHead('WHAT YOUR PACKAGE COVERS','Inclusions & Exclusions')}<div class="two-columns inclusion-columns"><section><h2>Included</h2><ul>${includeItems || '<li><span class="muted">No inclusions listed.</span></li>'}</ul></section><section><h2>Not included</h2><ul>${excludeItems || '<li><span class="muted">No exclusions listed.</span></li>'}</ul></section></div>${m.pricingNotes ? `<aside class="note-box">${esc(m.pricingNotes)}</aside>` : ''}${widePhoto ? `<img class="wide-photo" src="${esc(widePhoto)}" alt="${esc(title)}">` : ''}`);

  // 6. Hotels, transfers and important trip information
  const hotelGroups = chunk(m.hotels, 4), transferGroups = chunk(m.transfers, 4), pendingGroups = chunk(m.pendingServices, 4);
  const logisticsPageCount = Math.max(1, hotelGroups.length, transferGroups.length, pendingGroups.length);
  for (let i = 0; i < logisticsPageCount; i += 1) {
    const hotelDetails = (hotelGroups[i] || []).map((hotel) => `<div class="compact-record"><b>${esc(hotel.destination || 'Stay')}: ${esc(hotel.name || hotel.alternative || 'To be confirmed')}</b><span>${esc([hotel.nights ? `${hotel.nights} nights` : '', hotel.roomType, hotel.occupancy, hotel.mealPlan, status(hotel.confirmation)].filter(Boolean).join(' · '))}</span></div>`).join('');
    const transferDetails = (transferGroups[i] || []).map((item) => `<div class="compact-record"><b>${esc(item.route || 'Transfer')}: ${esc(item.type || 'To be confirmed')}</b><span>${esc([item.notes, status(item.confirmation)].filter(Boolean).join(' · '))}</span></div>`).join('');
    const pendingDetails = (pendingGroups[i] || []).map((item) => `<div class="compact-record"><b>${esc(item)}</b></div>`).join('');
    const hotelCard = hotelDetails ? card('hotel','Hotels',hotelDetails) : '';
    const transferCard = transferDetails ? card('transfer','Transfers',transferDetails) : '';
    const importantCard = pendingDetails || m.policies.importantInformation
      ? card('documents','Important information',`${pendingDetails}${m.policies.importantInformation ? `<p>${esc(m.policies.importantInformation)}</p>` : ''}`)
      : '';
    addPage(`${pageHead('STAYS, MOVEMENT & DETAILS',i ? 'Hotels, Transfers & Info · continued' : 'Hotels, Transfers & Info')}<div class="card-stack">${hotelCard || (!i && !transferCard && !importantCard ? card('hotel','Hotels','<p>Hotel details to be confirmed.</p>') : '')}${transferCard}${importantCard}</div>`);
  }

  // 7. Trip policies
  const policyItems = [['child','Child policy',m.policies.child],['payment','Payment policy',m.policies.payment],['cancellation','Cancellation',m.policies.cancellation],['checkin','Check-in & check-out',m.policies.checkInOut],['visa','Visa information',m.policies.visa],['documents','Travel documents',m.policies.travelDocuments]].filter(([, , value],index)=>index<4 || String(value||'').trim());
  const policyParts = policyItems.map(([icon,label,value])=>({icon,label,parts:splitText(value || 'Details will be confirmed with your travel consultant.',400)}));
  const policyCards = policyParts.map(({icon,label,parts}) => `<article class="policy-card"><span class="policy-icon">${pdfIcon(icon)}</span><h2>${esc(label)}</h2><div>${esc(parts[0] || '')}</div></article>`).join('');
  if (policyCards) addPage(`${pageHead('BEFORE YOU TRAVEL','Plan Your Trip')}<div class="policy-grid">${policyCards}</div>`);
  const policyContinued = policyParts.flatMap(({icon,label,parts})=>parts.slice(1).map((text)=>[icon,`${label} · continued`,text]));
  for (const items of chunk(policyContinued,4)) addPage(`${pageHead('BEFORE YOU TRAVEL','Plan Your Trip · continued')}<div class="policy-grid">${items.map(([icon,label,text])=>`<article class="policy-card"><span class="policy-icon">${pdfIcon(icon)}</span><h2>${esc(label)}</h2><div>${esc(text)}</div></article>`).join('')}</div>`);
  // 8. Pricing and payment schedule
  const p = m.pricing;
  const derivedSubtotal = p.adults * p.adultBase + p.children * p.childBase;
  const derivedGst = p.adults * p.adultGst + p.children * p.childGst;
  const derivedTotal = derivedSubtotal + derivedGst + p.additionalCharges.reduce((sum, row) => sum + (Number(row.amount) || 0), 0) - p.discounts.reduce((sum, row) => sum + (Number(row.amount) || 0), 0) + p.flightCost;
  const grandTotal = p.totalPrice > 0 ? p.totalPrice : derivedTotal;
  const gstLabel = p.gstPercentage > 0 ? `GST (${p.gstPercentage}%)` : 'GST';
  const priceRows = [[`Adults (${p.adults} × ${money(p.adultBase,p.currency)} per person)`,p.adults*p.adultBase],...(p.children ? [[`Child${m.childrenAges.length ? ` (age ${m.childrenAges.join(', ')})` : ''} (${p.children} × ${money(p.childBase,p.currency)})`,p.children*p.childBase]] : []),['Subtotal',derivedSubtotal],[gstLabel,derivedGst],...p.additionalCharges.map((row)=>[row.label||'Additional charge',Number(row.amount)||0]),...p.discounts.map((row)=>[row.label||'Discount',-(Number(row.amount)||0)]),...(p.flightCost ? [['Flights',p.flightCost]] : [])];
  const priceGroups = chunk(priceRows,8), scheduleGroups = chunk(p.paymentSchedule,8);
  
  const pricingNote = `${esc(p.priceStatus === 'confirmed' ? 'Package pricing confirmed as of the proposal date.' : p.priceStatus === 'pending' ? 'Pricing is pending supplier confirmation.' : 'This is an estimate and remains subject to availability and final confirmation.')}${p.pricingNotes ? `<br>${esc(p.pricingNotes)}` : ''}`;
  if (grandTotal > 0 || scheduleGroups.length) priceGroups.forEach((rows,index)=>{
    const includeSchedule = index===priceGroups.length-1 && scheduleGroups.length>0;
    const schedule = includeSchedule ? scheduleGroups[0].map((row)=>`<div class="schedule-row"><span>${esc(row.label || 'Payment')}</span><b>${money(row.amount,p.currency)}</b></div>`).join('') : '';
    addPage(`${pageHead(index ? 'PACKAGE INVESTMENT' : 'A CLEAR BREAKDOWN',index ? 'Pricing · continued' : 'Pricing')}<div class="pricing-table"><h2 class="pricing-heading">Package investment</h2>${rows.map(([label,value])=>`<div class="price-row"><span>${esc(label)}</span><b>${money(value,p.currency)}</b></div>`).join('')}${index===priceGroups.length-1 ? `<div class="grand-total"><span>Total package price</span><b>${money(grandTotal,p.currency)}</b></div>` : ''}</div>${includeSchedule ? `<h2 class="section-title">Payment schedule</h2><div class="schedule">${schedule}</div>` : ''}${index===0 ? `<aside class="pricing-note">${pricingNote}</aside>` : ''}`);
  });
  const remainingSchedule = priceGroups.length ? [] : scheduleGroups;
  for (const [index,rows] of remainingSchedule.entries()) addPage(`${pageHead('PAYMENT DETAILS',index ? 'Payment schedule · continued' : 'Payment schedule')}<div class="schedule">${rows.map((row)=>`<div class="schedule-row"><span>${esc(row.label || 'Payment')}</span><b>${money(row.amount,p.currency)}</b></div>`).join('')}</div>${index===remainingSchedule.length-1 ? `<aside class="pricing-note">${pricingNote}</aside>` : ''}`);

  // 9. Six-photo preview gallery.
  for (const [galleryIndex, galleryPhotos] of chunk(m.destinationPhotos, 6).entries()) {
    addPage(`${pageHead('A FEW PLACES YOU’LL REMEMBER',galleryIndex ? `Preview Gallery · continued ${galleryIndex}` : 'Preview Gallery')}<div class="gallery-grid">${galleryPhotos.map((photo,index)=>{const photoIndex=galleryIndex*6+index;return `<figure><img src="${esc(safeImage(photo.url))}" alt="${esc(photo.alt||photo.caption||'Travel destination')}"><figcaption><b>${esc(photo.caption||destinations[photoIndex%Math.max(destinations.length,1)]||'Discover')}</b><span>${esc(photo.alt||'')}</span></figcaption></figure>`;}).join('')}</div>`);
  }

  // 10. Back cover
  const primaryContacts = [
    { icon: 'phone', label: 'Call us', detail: brand.contacts.call, href: `tel:${brand.contacts.call.replace(/[^+\d]/g, '')}` },
    { icon: 'whatsapp', label: 'WhatsApp', detail: brand.contacts.whatsapp, href: `https://wa.me/${brand.contacts.whatsapp.replace(/\D/g, '')}` },
    { icon: 'email', label: 'Email', detail: brand.contacts.email, href: `mailto:${brand.contacts.email}` }
  ];
  const socialContacts = [
    ['website', 'Website', 'bablonstravelent.com', brand.contacts.website],
    ['instagram', 'Instagram', '@travelwithbablons', brand.contacts.socials.instagram],
    ['linkedin', 'LinkedIn', 'Bablons Tours & Entertainment', brand.contacts.socials.linkedin],
    ['facebook', 'Facebook', 'Bablons Travel & Entertainment', brand.contacts.socials.facebook],
    ['x', 'X / Twitter', '@BablonsTravel', brand.contacts.socials.x],
    ['pinterest', 'Pinterest', 'Bablons Travel & Entertainment', brand.contacts.socials.pinterest],
    ['youtube', 'YouTube', '@travelwithbablons', brand.contacts.socials.youtube],
    ['googleBusiness', 'Google Business', 'View our business profile', brand.contacts.socials.googleBusiness]
  ];
  const primaryContactCards = primaryContacts.map(({ icon, label, detail, href }) => `<a class="primary-contact" href="${esc(href)}"><span class="contact-mark">${contactIconImage(icon, 'contact-mark-image')}</span><span class="contact-copy"><small>${esc(label)}</small><b>${esc(detail)}</b></span><span class="contact-arrow">↗</span></a>`).join('');
  const socialContactCards = socialContacts.map(([icon, label, detail, href]) => `<a class="social-contact" href="${esc(href)}"><span class="social-mark">${contactIconImage(icon, 'social-mark-image')}</span><span class="social-copy"><b>${esc(label)}</b><small>${esc(detail)}</small></span></a>`).join('');
  addPage(`<div class="back-art"${hero ? ` style="background-image:linear-gradient(180deg,rgba(15,31,75,.28),rgba(15,31,75,.72) 42%,rgba(8,18,44,.96)),url('${esc(hero)}')"` : ''}></div><div class="back-content"><div class="back-top"><div class="back-logo-card">${brandLogo ? `<img src="${brandLogo}" alt="Bablons Travel logo">` : `<span class="brand-icon">B</span>`}<span class="back-brand-name">${esc(brand.name)}<small>Thoughtfully planned journeys</small></span></div><span class="back-edition">YOUR JOURNEY<br><b>STARTS HERE</b></span></div><div class="back-message"><p class="back-eyebrow">A WORLD OF EXPERIENCES, ONE MESSAGE AWAY</p><h1>Thank you${m.customerName ? `, ${esc(m.customerName)}` : ''}.<br>Let’s plan your<br><em>next adventure.</em></h1><p>Tell us where you want to go. We’ll help you make the journey memorable.</p></div><section class="back-contact-panel"><div class="back-panel-heading"><div><small>WE’RE HERE TO HELP</small><h2>Connect with us</h2></div><span class="back-panel-mark">BT&amp;E</span></div><div class="primary-contact-grid">${primaryContactCards}</div><div class="social-heading"><span>Find us online</span><span class="social-heading-line"></span></div><div class="social-contact-grid">${socialContactCards}</div></section><div class="back-footer"><span>LET’S PLAN YOUR NEXT ADVENTURE!</span><a href="${esc(brand.contacts.website)}">${esc(brand.contacts.website.replace(/^https?:\/\//, ''))}</a></div></div>`, 'back-cover');

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@600;700;800&display=swap" rel="stylesheet"><style>${styles()}</style></head><body>${pages.join('')}</body></html>`;
}

function pageHead(eyebrow,title) { return `<header class="page-head"><p class="eyebrow">${esc(eyebrow)}</p><h1>${esc(title)}</h1><div class="gold-bar"></div></header>`; }
function footer() { return `<footer><span>${esc(brand.name)}</span><a href="${esc(brand.contacts.website)}">${esc(brand.contacts.website.replace(/^https?:\/\//,''))}</a><svg class="watermark" viewBox="0 0 500 35" aria-hidden="true"><path d="M3 33 18 18l12 15 13-21 18 21 18-16 14 16 19-25 21 25 17-13 15 13 13-20 19 20 17-15 17 15 18-23 18 23 20-12 20 12 16-18 18 18h105"/></svg></footer>`; }
function tripRow(icon,label,value) { return `<div class="trip-row"><span class="trip-icon-wrap">${pdfIcon(icon)}</span><span class="trip-label">${esc(label)}</span><b>${esc(value || 'To be confirmed')}</b></div>`; }
function card(icon,title,content) { return `<article class="info-card"><span class="card-icon">${pdfIcon(icon)}</span><div><p class="eyebrow">${esc(title)}</p>${content}</div></article>`; }
function safeImage(value) { if (!isAllowedPdfImageUrl(value)) return ''; try { return new URL(value).href.replace(/["'()\\]/g,(c)=>`%${c.charCodeAt(0).toString(16)}`); } catch { return ''; } }
function getBrandLogoDataUri() {
  try {
    const logoPath = path.resolve(__dirname, '../assets/branding', brand.logo);
    return `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;
  } catch {
    return '';
  }
}
function status(value) { return String(value||'provisional').replace(/^./,(c)=>c.toUpperCase()); }
function money(value,currency) { return `${esc(currency)} ${Number(value||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`; }
function ordinal(day) { const mod100=day%100; return `${day}${mod100>=11&&mod100<=13?'th':({1:'st',2:'nd',3:'rd'}[day%10]||'th')}`; }
function formatDate(value) { if(!value)return ''; const d=new Date(value); if(Number.isNaN(d.getTime()))return ''; return `${ordinal(d.getDate())} ${d.toLocaleDateString('en-IN',{month:'short',year:'numeric',timeZone:'UTC'})}`; }
function dateRange(dates={}) { const start=formatDate(dates.start),end=formatDate(dates.end); return start&&end?`${start} – ${end}`:start||end||'To be confirmed'; }

function styles() { return `
.back-cover{background:#0F1F4B}
.back-cover .back-art{inset:0 0 auto;height:103mm;background-position:center 44%;background-image:linear-gradient(180deg,rgba(15,31,75,.08),rgba(15,31,75,.2) 48%,#0F1F4B 100%)}
.back-cover .back-content{position:relative;z-index:1;width:100%;height:100%;min-height:100%;padding:11mm 15mm 12mm;display:flex;flex-direction:column;justify-content:space-between;gap:5mm;color:#fff}
.back-top{display:flex;justify-content:space-between;align-items:center;gap:5mm}
.back-logo-card{display:flex;align-items:center;gap:3mm;min-height:19mm;padding:2mm 4mm;border:1px solid rgba(201,160,64,.65);border-radius:4mm;background:rgba(251,247,240,.96);color:#0F1F4B}
.back-logo-card img{display:block;width:17mm;height:17mm;object-fit:contain}
.back-brand-name{font:700 10pt/1.2 Inter,sans-serif}
.back-brand-name small{display:block;margin-top:1mm;color:#6B7280;font-size:7pt;font-weight:500}
.back-edition{color:rgba(255,255,255,.72);font-size:7pt;line-height:1.6;letter-spacing:1.3px;text-align:right}
.back-edition b{color:#E5C572;font-size:8pt}
.back-message{max-width:160mm}
.back-eyebrow{margin:0 0 3mm;color:#E5C572;font-size:8pt;font-weight:700;letter-spacing:1.6px}
.back-message h1{margin:0;color:#fff;font:700 31pt/1.08 'Playfair Display',serif}
.back-message h1 em{color:#E5C572;font-weight:600}
.back-message>p:last-child{max-width:125mm;margin:3mm 0 0;color:rgba(255,255,255,.8);font-size:9pt;line-height:1.45}
.back-contact-panel{padding:5mm 5.5mm;border:1px solid rgba(229,197,114,.68);border-radius:5mm;background:rgba(10,24,57,.91);box-shadow:0 3mm 10mm rgba(3,10,31,.2)}
.back-panel-heading{display:flex;justify-content:space-between;align-items:center;margin-bottom:3mm}
.back-panel-heading small{color:#E5C572;font-size:7pt;font-weight:700;letter-spacing:1.4px}
.back-panel-heading h2{margin:1mm 0 0;color:#fff;font:600 17pt 'Playfair Display',serif}
.back-panel-mark{color:rgba(229,197,114,.42);font:700 12pt 'Playfair Display',serif;letter-spacing:1px}
.primary-contact-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:2mm}
.primary-contact{display:grid;grid-template-columns:8mm minmax(0,1fr) 4mm;align-items:center;gap:2mm;min-height:16mm;padding:2mm;border:1px solid rgba(255,255,255,.16);border-radius:2.5mm;background:#FBF7F0;color:#0F1F4B;text-decoration:none}
.contact-mark{display:grid;place-items:center;width:8mm;height:8mm;border-radius:50%;background:#fff}
.contact-mark-image{display:block;width:5mm;height:5mm;object-fit:contain}
.contact-copy{min-width:0}
.contact-copy small,.contact-copy b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.contact-copy small{margin-bottom:.7mm;color:#6B7280;font-size:6.5pt;text-transform:uppercase;letter-spacing:.5px}
.contact-copy b{font-size:7.2pt}
.contact-arrow{color:#A47D32;font-size:11pt}
.social-heading{display:flex;align-items:center;gap:3mm;margin:4mm 0 2mm;color:rgba(255,255,255,.86);font-size:8pt;font-weight:700}
.social-heading-line{height:.25mm;flex:1;background:rgba(229,197,114,.4)}
.social-contact-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:2mm}
.social-contact{display:flex;align-items:center;gap:2mm;min-width:0;min-height:13mm;padding:1.5mm 2mm;border:1px solid rgba(15,31,75,.08);border-radius:2.5mm;background:#FBF7F0;color:#0F1F4B;text-decoration:none}
.social-mark{display:grid;place-items:center;flex:0 0 7.5mm;width:7.5mm;height:7.5mm;border-radius:50%;background:#fff}
.social-mark-image{display:block;width:4.8mm;height:4.8mm;object-fit:contain}
.social-copy{display:block;min-width:0}
.social-copy b,.social-copy small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.social-copy b{font-size:7pt}
.social-copy small{margin-top:.6mm;color:#6B7280;font-size:5.8pt}
.back-footer{display:flex;justify-content:space-between;align-items:center;gap:4mm;padding-top:2.5mm;border-top:1px solid rgba(255,255,255,.25);color:#E5C572;font-size:7.5pt;font-weight:700;letter-spacing:1px}
.back-footer a{color:rgba(255,255,255,.76);font-size:7pt;font-weight:500;letter-spacing:.2px;text-decoration:none}
@page{size:210mm 297mm;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;width:210mm;background:#FBF7F0;color:#0F1F4B;font-family:Inter,sans-serif;font-size:10.5pt;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:210mm;min-height:297mm;height:auto;max-height:none;position:relative;overflow:visible;padding:15mm 18mm 12mm;background:#FBF7F0;page-break-after:always;break-after:page;display:flex;flex-direction:column;orphans:3;widows:3}.page:last-child{page-break-after:auto;break-after:auto}.eyebrow{margin:0 0 3mm;color:#1F7A6E;font-size:11pt;font-weight:700;letter-spacing:1.7px;text-transform:uppercase}.page-head{flex:0 0 auto;margin-bottom:7mm;break-after:avoid;page-break-after:avoid}.page-head h1,.cover-title h1,.back-content h1{margin:0;color:#0F1F4B;font:800 34pt/1.08 'Playfair Display',serif}.gold-bar{width:16mm;height:1.1mm;margin-top:3mm;background:#C9A040}.page-head{position:relative}.page:not(.cover):not(.back-cover)::before{content:'';position:absolute;top:0;left:0;width:100%;height:3mm;background:#0F1F4B}.page-head .eyebrow{margin-top:0}footer{position:relative;left:auto;right:auto;bottom:auto;display:flex;justify-content:space-between;margin-top:auto;padding-top:2mm;border-top:.25mm solid rgba(15,31,75,.14);color:#6B7280;font-size:8pt;flex:0 0 7mm}footer a{color:#6B7280;text-decoration:none}.page-number{margin-left:auto;padding-right:4mm;color:#0F1F4B;font-size:7pt;font-weight:700;letter-spacing:.5px}footer .watermark{position:absolute;right:0;bottom:-5mm;width:80mm;height:8mm;fill:none;stroke:#C9A040;stroke-width:1;opacity:.13}
.cover,.back-cover{padding:0;background:#0F1F4B;color:white}.cover-image,.back-art{position:absolute;inset:0;background-color:#253a66;background-position:center;background-size:cover}.cover-image{background-image:linear-gradient(155deg,#3e6381,#15264d 58%,#101e42)}.cover-inner{position:relative;z-index:1;display:flex;flex:1;flex-direction:column;height:100%;padding:13mm 18mm 17mm}.cover-top{display:flex;justify-content:space-between;align-items:center}.brand-mark{display:flex;gap:3mm;align-items:center;color:#fff;font-weight:800;font-size:11pt}.brand-mark small{display:block;margin-top:1mm;color:rgba(255,255,255,.7);font-size:7pt;font-weight:500}.brand-icon{display:grid;place-items:center;width:12mm;height:12mm;border:1px solid #C9A040;border-radius:50%;color:#C9A040;font:700 19pt 'Playfair Display',serif}.cover-edition{font-size:7pt;letter-spacing:1.5px}.cover-title{margin-top:auto;margin-bottom:auto}.proposal-title{margin:0 0 2mm;color:#FBF7F0;font:600 14pt 'Playfair Display',serif}.thank-you{margin:0 0 5mm;color:#FBF7F0;font:italic 12pt 'Playfair Display',serif}.cover-title .eyebrow{color:#C9A040}.cover-title h1{max-width:165mm;color:white;font-size:39pt}.cover-title .tagline{font:italic 14pt 'Playfair Display',serif;color:#FBF7F0}.prepared{margin-top:8mm;color:#fff;font-size:10pt}.trip-panel{padding:5mm 7mm;border-radius:5mm;background:#0F1F4B;box-shadow:0 3mm 10mm rgba(3,10,31,.22)}.trip-panel h2{margin:0 0 2mm;color:#fff;font:600 18pt 'Playfair Display',serif}.trip-grid{display:grid;grid-template-columns:1fr;gap:0}.trip-row{display:grid;grid-template-columns:8mm 24mm 1fr;align-items:center;min-height:8mm;border-bottom:.2mm solid rgba(255,255,255,.15);color:white;font-size:8.5pt}.trip-icon-wrap{display:grid;place-items:center;width:6mm;height:6mm;border-radius:50%;background:#C9A040;color:#0F1F4B}.pdf-icon{display:block;width:5mm;height:5mm;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.trip-icon-wrap .pdf-icon{width:4mm;height:4mm}.trip-label{color:rgba(255,255,255,.68)}.trip-row b{font-weight:600}.cover .gold-bar{background:#C9A040}
.intro{margin:0 0 6mm;color:#374151;font:12pt/1.55 'Playfair Display',serif}.destination-grid{display:grid;grid-template-columns:1fr 1fr;gap:4mm}.destination-tile{overflow:hidden;min-height:57mm;border-radius:4mm;background:#F3EAD7;text-align:center}.destination-tile img{display:block;width:100%;height:39mm;object-fit:cover}.photo-fallback{display:grid;place-items:center;width:100%;height:39mm;background:linear-gradient(135deg,#e2d7c1,#b4c3bd);color:#0F1F4B;font:700 18pt 'Playfair Display',serif}.destination-tile h3{margin:2mm 2mm 0;font:700 12pt 'Playfair Display',serif}.destination-tile p{margin:1mm 3mm 2mm;color:#6B7280;font-size:7.5pt}.section-title{margin:6mm 0 3mm;font:700 17pt 'Playfair Display',serif}.experience-list{display:grid;grid-auto-flow:column;grid-template-rows:repeat(3,auto);grid-template-columns:1fr 1fr;gap:2mm 8mm;margin:0;padding:0;list-style:none}.experience-list li{font-size:9pt;line-height:1.4}.experience-list li:before{content:'✦';margin-right:2mm;color:#C9A040}
.glance-layout{display:grid;grid-template-columns:minmax(0,1fr);gap:0;min-height:0;flex:1}.timeline{display:flex;flex-direction:column;justify-content:space-around}.timeline-row{display:grid;grid-template-columns:58mm minmax(0,1fr);gap:5mm;align-items:center;min-height:33mm;padding:1.5mm 0;border-bottom:.25mm solid rgba(15,31,75,.1)}.timeline-row img,.timeline-placeholder{width:58mm;height:31.75mm;border-radius:3mm;object-fit:cover}.timeline-placeholder{display:grid;place-items:center;background:linear-gradient(135deg,#e2d7c1,#b4c3bd);color:#0F1F4B;font:700 12pt 'Playfair Display',serif;text-align:center}.day-label{color:#C9A040;font-size:8pt;font-weight:800;letter-spacing:1px}.timeline-row h3{margin:1mm 0;font:700 12pt 'Playfair Display',serif}.timeline-row p{margin:0;color:#6B7280;font:italic 8.5pt 'Playfair Display',serif}.inclusion-strip{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:3mm 5mm;margin-top:4mm;padding:4mm 5mm;border:1px solid rgba(201,160,64,.45);border-radius:3mm;background:#0F1F4B;color:#fff;font-size:8pt;line-height:1.35}.inclusion-strip span{display:block;padding-left:4mm;position:relative}.inclusion-strip span:before{content:"✓";position:absolute;left:0;color:#E5C572;font-weight:800}.day-list{display:flex;flex-direction:column;gap:2mm;min-height:0;overflow:visible}.day-block{flex:0 0 auto;min-height:0;padding:2.5mm 4mm;border-radius:4mm;background:#F3EAD7;overflow:visible;break-inside:avoid;page-break-inside:avoid}.day-heading{display:flex;gap:4mm;align-items:baseline}.day-heading span{color:#C9A040;font-size:8pt;font-weight:800;letter-spacing:1px}.day-heading h2{margin:0;color:#0F1F4B;font:700 14pt 'Playfair Display',serif}.day-description{margin:1mm 0;color:#4B5563;font:italic 8pt/1.3 'Playfair Display',serif}.day-block ul{margin:1mm 0 0;padding-left:4mm}.day-block li{margin:0 0 .8mm;color:#374151;font-size:8pt;line-height:1.25}.day-meta{margin:1mm 0 0;padding-top:1mm;border-top:.2mm solid rgba(15,31,75,.12);color:#6B7280;font-size:7pt}
.two-columns{display:grid;grid-template-columns:1fr 1fr;gap:8mm}.inclusion-columns section{padding:5mm;border-radius:4mm;background:#F3EAD7}.inclusion-columns h2{margin:0 0 4mm;font:700 17pt 'Playfair Display',serif}.inclusion-columns ul{display:flex;flex-direction:column;gap:3mm;margin:0;padding:0;list-style:none}.inclusion-columns li{display:grid;grid-template-columns:6mm 1fr;gap:2mm;color:#374151;font-size:9pt;line-height:1.4}.check{color:#1F7A6E;font-weight:800}.cross{color:#B94A3E;font-weight:800}.note-box{margin-top:5mm;padding:4mm 5mm;border-radius:3mm;background:#F1F2F4;color:#6B7280;font-size:8.5pt;line-height:1.45}.wide-photo{width:100%;height:53mm;margin-top:auto;border-radius:4mm;object-fit:cover}
.card-stack{display:flex;flex-direction:column;gap:5mm}.info-card{display:grid;grid-template-columns:16mm 1fr;gap:4mm;align-items:center;min-height:38mm;padding:5mm;border-radius:4mm;background:#F3EAD7}.card-icon,.policy-icon{display:grid;place-items:center;width:13mm;height:13mm;border-radius:50%;background:#0F1F4B;color:#E5C572}.card-icon .pdf-icon,.policy-icon .pdf-icon{width:7mm;height:7mm}.info-card .eyebrow{margin-bottom:1mm}.info-card h3{margin:0 0 1mm;font:700 13pt 'Playfair Display',serif}.info-card p:not(.eyebrow){margin:0;color:#6B7280;font-size:8.5pt}.compact-record{display:flex;flex-direction:column;gap:1mm;margin:1mm 0 2mm;padding-bottom:2mm;border-bottom:.2mm solid rgba(15,31,75,.12);font-size:8pt}.compact-record:last-child{border-bottom:0}.compact-record span{color:#6B7280}.policy-grid{display:grid;grid-template-columns:1fr 1fr;gap:6mm}.policy-card{display:flex;flex-direction:column;align-items:flex-start;min-height:66mm;padding:5mm;border-radius:4mm;background:#F3EAD7}.policy-card .policy-icon{width:14mm;height:14mm;background:#1F7A6E;color:#fff}.policy-card .policy-icon .pdf-icon{width:7mm;height:7mm}.policy-card h2{margin:3mm 0 2mm;font:700 15pt 'Playfair Display',serif}.policy-card div{color:#4B5563;font-size:9pt;line-height:1.5;white-space:pre-line}
.pricing-table,.schedule{overflow:hidden;border-radius:4mm;background:#F3EAD7}.pricing-heading{margin:0;padding:4mm 5mm;border-bottom:.2mm solid rgba(15,31,75,.1);font:700 13pt 'Playfair Display',serif}.price-row,.schedule-row{display:flex;justify-content:space-between;gap:8mm;padding:4mm 5mm;border-bottom:.2mm solid rgba(15,31,75,.1);font-size:9pt}.grand-total{display:flex;justify-content:space-between;padding:5mm;background:#0F1F4B;color:white;font-size:13pt;font-weight:700}.schedule{margin-bottom:4mm}.pricing-note{margin-top:auto;padding:5mm;border-radius:3mm;background:#0F1F4B;color:white;font-size:8.5pt;line-height:1.45}.schedule-row b,.price-row b{white-space:nowrap}.gallery-grid{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(3,1fr);gap:4mm;flex:1}.gallery-grid figure{display:flex;flex-direction:column;min-height:0;overflow:hidden;margin:0;border-radius:4mm;background:#F3EAD7}.gallery-grid img{flex:1;min-height:0;width:100%;height:auto;object-fit:cover}.gallery-grid figcaption{display:flex;flex-direction:column;gap:1mm;padding:2.5mm 3mm}.gallery-grid figcaption b{font:700 11pt 'Playfair Display',serif}.gallery-grid figcaption span{overflow:hidden;color:#6B7280;font-size:7.5pt;text-overflow:ellipsis;white-space:nowrap}.muted{color:#6B7280}
.back-content{position:relative;z-index:1;min-height:297mm;padding:15mm 18mm;display:flex;flex-direction:column;justify-content:flex-end}.planning-pill{align-self:flex-start;margin-bottom:5mm;padding:3mm 5mm;border:1px solid #C9A040;border-radius:99px;color:#C9A040;font-size:8pt;font-weight:700;letter-spacing:1px}.back-content h1{color:white;font-size:34pt}.back-content .gold-bar{margin-bottom:8mm}.contact-grid{display:grid;grid-template-columns:1fr 1fr;gap:3mm}.contact-grid div{display:grid;grid-template-columns:10mm 1fr;grid-template-rows:auto auto;align-items:center;padding:3mm;border:1px solid rgba(255,255,255,.22);border-radius:3mm;background:rgba(15,31,75,.5)}.contact-grid div>span{grid-row:1/3;color:#C9A040;font-size:15pt}.contact-grid small{color:rgba(255,255,255,.7);font-size:7pt;text-transform:uppercase}.contact-grid b{color:white;font-size:8pt;overflow-wrap:anywhere}.logo-card{align-self:flex-start;margin-top:7mm;padding:4mm 6mm;border-radius:3mm;background:#0F1F4B}.logo-card .brand-mark{font-size:9pt}.logo-card .brand-icon{width:9mm;height:9mm;font-size:14pt}
/* Cover refinements: one compact brand lockup, clear title hierarchy, and a stable trip summary zone. */
.cover-image{background-image:linear-gradient(180deg,rgba(8,22,55,.48),rgba(8,22,55,.2) 38%,rgba(8,18,44,.9) 100%)}
.cover-inner{padding:14mm 16mm 14mm}
.cover-top{min-height:28mm;padding:3mm 4mm;border:1px solid rgba(255,255,255,.24);border-radius:4mm;background:rgba(9,25,66,.72)}
.brand-mark{display:flex;align-items:center;gap:3mm;min-width:0}
.brand-wordmark{display:block;max-width:82mm;min-width:0}
.brand-wordmark b,.brand-wordmark small{display:block;overflow-wrap:anywhere}
.brand-wordmark b{color:#fff;font-size:9pt;line-height:1.25}
.brand-wordmark small{margin-top:1mm;color:rgba(255,255,255,.72);font-size:7pt}
.brand-logo-frame{display:grid;flex:0 0 21mm;place-items:center;width:21mm;height:21mm;padding:1mm;border:1px solid rgba(229,197,114,.65);border-radius:3mm;background:#FBF7F0;overflow:hidden}
.brand-logo-frame img{display:block;width:100%;height:100%;object-fit:contain}
.cover-edition{max-width:40mm;color:#F7E5B2;text-align:right;font-size:7pt;font-weight:700;line-height:1.55;letter-spacing:1.35px}
.cover-title{max-width:178mm;margin:auto 0;padding:0 2mm}
.cover-title .eyebrow{margin-bottom:2mm;color:#E5C572}
.proposal-title{max-width:158mm;margin:0 0 3mm;color:rgba(255,255,255,.86);font:600 12pt/1.35 'Playfair Display',serif}
.cover-title h1{max-width:160mm;font-size:40pt;line-height:1.02;text-shadow:0 2px 12px rgba(0,0,0,.26)}
.cover-title .gold-bar{width:18mm;height:1.2mm;margin-top:4mm}
.cover-title .tagline{margin:4mm 0 0}
.prepared{margin:4mm 0 0;font-size:9pt}
.trip-panel{margin-top:0;padding:5mm 7mm;border:1px solid rgba(229,197,114,.72);border-radius:4mm;background:rgba(10,27,69,.96)}
.trip-panel h2{margin-bottom:2mm}
.trip-row{min-height:8.5mm;grid-template-columns:8mm 27mm minmax(0,1fr);padding:1.5mm 0;align-items:start}
.trip-row b{min-width:0;overflow-wrap:anywhere;word-break:normal;line-height:1.35}
.cover,.back-cover{min-height:297mm}
.cover-inner{min-height:297mm;height:auto;flex:none}
.cover-title{break-inside:avoid}
.destination-grid{align-items:stretch;break-inside:auto}
.destination-tile{break-inside:avoid;page-break-inside:avoid}
.intro,.day-description,.policy-card div,.compact-record,.note-box{orphans:3;widows:3;overflow-wrap:anywhere}
.section-title{break-after:avoid;page-break-after:avoid}
.timeline-row,.info-card,.policy-card,.price-row,.schedule-row,figure{break-inside:avoid;page-break-inside:avoid}
.day-block{break-inside:auto;page-break-inside:auto}
.day-heading{break-after:avoid;page-break-after:avoid}
.day-description{break-after:avoid;page-break-after:avoid}
.two-columns{display:block}
.inclusion-columns section{margin:0 0 5mm;padding:5mm;border-radius:4mm;background:#F3EAD7}
.card-stack{display:block}
.info-card{margin:0 0 4mm;display:grid;grid-template-columns:12mm minmax(0,1fr);align-items:start;min-height:0;break-inside:auto}
.policy-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6mm;align-items:stretch}
.policy-card{min-height:66mm;margin:0;padding:5mm;break-inside:avoid;page-break-inside:avoid}
.policy-card h2{break-after:avoid;page-break-after:avoid}
.pricing-table,.schedule{overflow:visible}
.price-row,.schedule-row{align-items:flex-start}
.price-row span,.schedule-row span{min-width:0;overflow-wrap:anywhere;line-height:1.4}
.price-row b,.schedule-row b{flex:0 0 auto;max-width:48%;white-space:normal;overflow-wrap:anywhere;text-align:right}
.grand-total{gap:4mm;align-items:flex-start}
.grand-total span,.grand-total b{min-width:0;overflow-wrap:anywhere}
.gallery-grid{grid-template-rows:repeat(3,auto);grid-auto-rows:auto;flex:none}
.gallery-grid figure{overflow:visible;break-inside:avoid;page-break-inside:avoid}
.gallery-grid img{flex:none;width:100%;height:42mm;object-fit:cover}
.gallery-grid figcaption span{white-space:normal;overflow-wrap:anywhere;text-overflow:clip}
.back-content{height:auto;min-height:297mm}
.back-footer{flex-wrap:wrap}
.day-list{overflow:visible}
.day-block{break-inside:auto;page-break-inside:auto;overflow:visible}
.day-date{margin:-5mm 0 5mm;color:#6B7280;font-size:9pt}
.day-hero{display:block;width:100%;height:58mm;margin:0 0 5mm;border-radius:4mm;object-fit:cover}
.day-block ul{margin:1mm 0 0;padding-left:5mm}
.day-block li{margin:0 0 1.5mm;color:#374151;font-size:9pt;line-height:1.45}
.day-description{margin:1mm 0 3mm;color:#4B5563;font:italic 10pt/1.5 'Playfair Display',serif;overflow-wrap:anywhere}
.day-meta{margin:4mm 0 0;padding-top:2mm;border-top:.2mm solid rgba(15,31,75,.12);color:#6B7280;font-size:8pt;overflow-wrap:anywhere}
.contact-copy b{overflow:visible;white-space:normal;overflow-wrap:anywhere;word-break:break-word;line-height:1.2}
.primary-contact{min-height:19mm;align-items:start}
.contact-copy{padding-top:1mm}
.page-number{color:#6B7280;font-size:7pt;letter-spacing:.4px}
.page-head{margin-bottom:3.5mm}
.page-head h1{font-size:31pt;line-height:1.04}
.intro{margin-bottom:2.5mm;font-size:9.5pt;line-height:1.32}
.destination-grid{gap:2.5mm}
.destination-tile{min-height:39mm}
.destination-tile img,.destination-tile .photo-fallback{height:22mm}
.destination-tile h3{margin:1.2mm 2mm 0;font-size:11pt}
.destination-tile p{margin:.8mm 3mm 1mm;font-size:7pt;line-height:1.2}
.section-title{margin:2.5mm 0 1mm}
.experience-list{gap:1mm 5mm}
.experience-list{grid-template-columns:1fr 1fr;grid-template-rows:repeat(4,auto);grid-auto-flow:column}
.experience-list li{font-size:8pt;line-height:1.28}
.inclusion-strip{margin-top:3mm;padding:3mm 4mm}
.day-block{margin-bottom:3mm;padding:3mm 4mm;border-left:1mm solid #C9A040;border-radius:2mm 4mm 4mm 2mm}
.day-block li{line-height:1.4}
.compact-record{margin:1mm 0 1.5mm;padding-bottom:1.5mm;line-height:1.35}
.info-card{padding:4mm 5mm;border-radius:3mm}
.pricing-heading{padding:3.5mm 5mm}
.price-row,.schedule-row{padding:3mm 5mm;line-height:1.4}
.policy-grid{gap:4mm}
.policy-card{padding:4mm;min-height:58mm}
.gallery-grid{gap:3mm}
.back-contact-panel{padding:4.5mm 5mm}
.primary-contact-grid,.social-contact-grid{gap:1.7mm}
`; }

module.exports = { proposalHTML, getBrandLogoDataUri };
