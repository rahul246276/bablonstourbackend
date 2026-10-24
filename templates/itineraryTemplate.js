// Builds the HTML string that Puppeteer converts into the itinerary PDF.
// Kept framework-agnostic and self-contained (inline CSS) since Puppeteer renders it standalone.
const { isAllowedPdfImageUrl } = require('../utils/pdfImageAllowlist');
const { proposalHTML, getBrandLogoDataUri } = require('./itineraryProposalTemplate');
const { contactIconImage } = require('./itineraryContactIcons');
const designRegistry = require('../config/itineraryDesigns');
const brand = require('../config/itineraryBrand');
const { getPackageHighlights } = require('../utils/itineraryHighlights');

function buildItineraryHTML(itinerary) {
  if (itinerary.designKey === 'proposal' && designRegistry.proposal) return proposalHTML(itinerary);
  const {
    title,
    customerName,
    destinations = [],
    days,
    nights,
    travelers = {},
    days_plan: dayPlan = [],
    pricing = {}
  } = itinerary;

  const dayCards = (Array.isArray(dayPlan) ? dayPlan : [])
    .map(
      (d) => `
      <div class="day-card">
        <div class="day-badge">Day ${d.dayNumber}</div>
        <div class="day-body">
          ${d.image?.url && isAllowedImageUrl(d.image.url) ? `<img class="day-photo" src="${escapeAttribute(d.image.url)}" alt="${escapeAttribute(d.image.alt || d.title || '')}" />` : ''}
          <h3>${escapeHtml(d.title || '')}</h3>
          <p class="desc">${escapeHtml(d.description || '')}</p>
          ${
            d.activities && d.activities.length
            ? `<ul class="activities">${d.activities.map((a) => `<li>${escapeHtml(a)}</li>`).join('')}</ul>`
              : ''
          }
          <div class="day-meta">
            ${d.hotel ? `<span><strong>Stay:</strong> ${escapeHtml(d.hotel)}</span>` : ''}
            ${d.meals && d.meals.length ? `<span><strong>Meals:</strong> ${d.meals.map(escapeHtml).join(', ')}</span>` : ''}
            ${d.transfer ? `<span><strong>Transfer:</strong> ${escapeHtml(d.transfer)}</span>` : ''}
          </div>
        </div>
      </div>`
    )
    .join('');

  const inclusions = (Array.isArray(pricing.inclusions) ? pricing.inclusions : []).map((i) => `<li>${escapeHtml(i)}</li>`).join('');
  const exclusions = (Array.isArray(pricing.exclusions) ? pricing.exclusions : []).map((i) => `<li>${escapeHtml(i)}</li>`).join('');
  const summaryRows = (Array.isArray(dayPlan) ? dayPlan : []).map((day) => `<tr><td>Day ${Number(day.dayNumber) || ''}</td><td>${escapeHtml(day.shortTitle || day.title || '')}</td><td>${escapeHtml(day.transfer || '')}</td><td>${escapeHtml(day.hotel || '')}</td><td>${(day.meals || []).map(escapeHtml).join(', ')}</td></tr>`).join('');
  const photos = (Array.isArray(itinerary.destinationPhotos) ? itinerary.destinationPhotos : []).filter((photo) => isAllowedImageUrl(photo.url)).map((photo) => `<figure><img src="${escapeAttribute(photo.url)}" alt="${escapeAttribute(photo.alt || photo.caption || '')}"/><figcaption>${escapeHtml(photo.caption || '')}</figcaption></figure>`).join('');
  const highlights = renderList(itinerary.destinationHighlights);
  const packageHighlights = renderList(getPackageHighlights(itinerary));
  const introSection = itinerary.destinationIntroduction || highlights || packageHighlights || photos ? `<section class="section destination"><h2>Discover ${escapeHtml((destinations || []).join(', '))}</h2>${itinerary.destinationIntroduction ? `<p>${escapeHtml(itinerary.destinationIntroduction)}</p>` : ''}${highlights}${packageHighlights ? `<h3>Package highlights</h3>${packageHighlights}` : ''}<div class="photo-grid">${photos}</div></section>` : '';
  const summarySection = summaryRows ? `<section class="section"><h2>At a glance</h2><table><thead><tr><th>Day</th><th>Plan</th><th>Route / transfer</th><th>Overnight</th><th>Meals</th></tr></thead><tbody>${summaryRows}</tbody></table></section>` : '';
  const detailedDays = dayCards ? `<section class="section"><h2>Detailed daily itinerary</h2>${dayCards}</section>` : '';
  const hotelRows = (itinerary.hotels || []).map((hotel) => `<tr><td>${escapeHtml(hotel.destination || '')}</td><td>${escapeHtml(hotel.name || hotel.alternative || 'To be confirmed')}</td><td>${escapeHtml(hotel.roomType || '')}</td><td>${escapeHtml(hotel.occupancy || '')}</td><td>${escapeHtml(hotel.mealPlan || '')}</td><td>${Number(hotel.nights) || 0}</td><td>${escapeHtml(humanizeStatus(hotel.confirmation))}</td></tr>`).join('');
  const transferRows = (itinerary.transferDetails || []).map((item) => `<tr><td>${escapeHtml(item.route || '')}</td><td>${escapeHtml(item.type || '')}</td><td>${escapeHtml(item.notes || '')}</td><td>${escapeHtml(humanizeStatus(item.confirmation))}</td></tr>`).join('');
  const logisticsSection = hotelRows || transferRows ? `<section class="section"><h2>Hotels and transfers</h2>${hotelRows ? `<h3>Accommodation</h3><table><thead><tr><th>Area</th><th>Hotel / alternative</th><th>Room</th><th>Occupancy</th><th>Meal plan</th><th>Nights</th><th>Status</th></tr></thead><tbody>${hotelRows}</tbody></table>` : ''}${transferRows ? `<h3>Transfers</h3><table><thead><tr><th>Route</th><th>Type</th><th>Details</th><th>Status</th></tr></thead><tbody>${transferRows}</tbody></table>` : ''}</section>` : '';
  const optionalRows = (itinerary.optionalActivities || []).map((item) => `<li><strong>${escapeHtml(item.name)}</strong>${item.price != null ? ` — ${escapeHtml(pricing.currency || 'INR')} ${formatMoney(item.price)}` : ''}${item.notes ? ` — ${escapeHtml(item.notes)}` : ''} (optional, extra cost)</li>`).join('');
  const pending = renderList(itinerary.pendingServices);
  const policyRows = Object.entries({ 'Child policy': itinerary.policies?.child, 'Payment policy': itinerary.policies?.payment, 'Cancellation policy': itinerary.policies?.cancellation, 'Check-in / check-out': itinerary.policies?.checkInOut, 'Visa information': itinerary.policies?.visa, 'Travel documents': itinerary.policies?.travelDocuments, 'Important information': itinerary.policies?.importantInformation }).filter(([, value]) => value).map(([label, value]) => `<div class="policy"><h3>${label}</h3><p>${escapeHtml(value)}</p></div>`).join('');
  const termsSection = optionalRows || pending || policyRows ? `<section class="section"><h2>Package terms and important information</h2>${optionalRows ? `<h3>Optional activities</h3><ul>${optionalRows}</ul>` : ''}${pending ? `<h3>Pending confirmation</h3>${pending}` : ''}${policyRows}</section>` : '';
  const chargeRows = (pricing.additionalCharges || []).map((row) => `<tr><td>${escapeHtml(row.label)}</td><td>${escapeHtml(pricing.currency || 'INR')} ${formatMoney(row.amount)}</td></tr>`).join('');
  const discountRows = (pricing.discounts || []).map((row) => `<tr><td>${escapeHtml(row.label)}</td><td>− ${escapeHtml(pricing.currency || 'INR')} ${formatMoney(row.amount)}</td></tr>`).join('');
  const paymentRows = (pricing.paymentSchedule || []).map((row) => `<tr><td>${escapeHtml(row.label)}</td><td>${escapeHtml(pricing.currency || 'INR')} ${formatMoney(row.amount)}</td></tr>`).join('');
  const pricingMeta = `<p class="status">Price status: ${escapeHtml(humanizeStatus(pricing.priceStatus || 'estimate'))}. Per-person pricing applies equally to adults and children unless otherwise agreed.</p>${pricing.pricingNotes ? `<p>${escapeHtml(pricing.pricingNotes)}</p>` : ''}`;
  const pricingRows = chargeRows || discountRows ? `<table><tbody>${chargeRows}${discountRows}</tbody></table>` : '';
  const paymentSection = paymentRows ? `<h3>Payment schedule</h3><table><tbody>${paymentRows}</tbody></table>` : '';
  const closingImageUrl = [itinerary.coverImage?.url, ...(itinerary.destinationPhotos || []).map((photo) => photo.url)]
    .filter(isAllowedImageUrl).map(safeCssUrl).find(Boolean);
  const closingImageStyle = closingImageUrl ? `style="background-image:linear-gradient(0deg,rgba(19,34,74,.84),rgba(19,34,74,.12)),url('${escapeAttribute(closingImageUrl)}')"` : '';
  const closingPrimaryContacts = [
    ['Call', brand.contacts.call, `tel:${brand.contacts.call.replace(/[^+\d]/g, '')}`],
    ['WhatsApp', brand.contacts.whatsapp, `https://wa.me/${brand.contacts.whatsapp.replace(/\D/g, '')}`],
    ['Email', brand.contacts.email, `mailto:${brand.contacts.email}`],
    ['Website', 'bablonstravelent.com', brand.contacts.website]
  ];
  const closingSocialContacts = [
    ['IG', 'Instagram', '@travelwithbablons', brand.contacts.socials.instagram],
    ['in', 'LinkedIn', 'Bablons Tours & Entertainment', brand.contacts.socials.linkedin],
    ['f', 'Facebook', 'Bablons Travel & Entertainment', brand.contacts.socials.facebook],
    ['X', 'X / Twitter', '@BablonsTravel', brand.contacts.socials.x],
    ['P', 'Pinterest', 'Bablons Travel & Entertainment', brand.contacts.socials.pinterest],
    ['▶', 'YouTube', '@travelwithbablons', brand.contacts.socials.youtube],
    ['G', 'Google Business', 'View business profile', brand.contacts.socials.googleBusiness]
  ];
  const closingLogo = getBrandLogoDataUri();
  const closingSection = `<section class="closing"><div class="closing-art" ${closingImageStyle}></div><div class="closing-copy"><div class="closing-brand">${closingLogo ? `<img src="${closingLogo}" alt="Bablons Travel logo">` : ''}<span><b>${escapeHtml(brand.name)}</b><small>Thoughtfully planned journeys</small></span></div><div class="closing-eyebrow">LET’S PLAN YOUR NEXT ADVENTURE</div><h1>Thank you${customerName ? `, ${escapeHtml(customerName)}` : ''}</h1><p>${escapeHtml(itinerary.closingMessage || 'We look forward to helping you plan a wonderful journey.')}</p><div class="closing-summary"><span>${escapeHtml((destinations || []).join(' · ') || 'Your selected destinations')}</span><span>${Number(nights) || 0} nights · ${Number(days) || dayPlan.length || 1} days</span><span>${Number(travelers.adults) || 0} adults${travelers.children ? ` · ${Number(travelers.children)} children${travelers.childrenAges?.length ? ` (ages ${travelers.childrenAges.map(Number).join(', ')})` : ''}` : ''}</span></div><div class="closing-contacts">${closingPrimaryContacts.map(([label, detail, href], index) => `<a href="${escapeAttribute(href)}"><span class="closing-contact-mark">${contactIconImage(['phone','whatsapp','email','website'][index], 'closing-contact-icon')}</span><span class="closing-contact-copy"><small>${escapeHtml(label)}</small><b>${escapeHtml(detail)}</b></span></a>`).join('')}</div><div class="closing-social-heading">Connect with us online</div><div class="closing-socials">${closingSocialContacts.map(([mark, label, detail, href], index) => `<a href="${escapeAttribute(href)}"><span class="closing-social-mark">${contactIconImage(['instagram','linkedin','facebook','x','pinterest','youtube','googleBusiness'][index], 'closing-social-icon')}</span><span class="closing-social-copy"><b>${escapeHtml(label)}</b><small>${escapeHtml(detail)}</small></span></a>`).join('')}</div><div class="closing-footer">Your travel team at ${escapeHtml(brand.name)}</div></div></section>`;

  const detailed = `
  <!DOCTYPE html>
  <html>
  <head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; }
    @page { size: A4; margin: 16mm 16mm 19mm; }
    * { box-sizing: border-box; }
    html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #25334d; margin: 0; padding: 0; background: #fff; font-size: 10pt; line-height: 1.48; }
    .header { position: relative; display: block; border-bottom: 2px solid #c9a04a; padding: 0 0 15px; margin: 0 0 23px; break-inside: avoid; }
    .header:before { content: 'BABLONS TRAVEL  /  JOURNEY PROPOSAL'; display: block; margin-bottom: 8px; color: #8c6b2d; font-size: 8pt; font-weight: 700; letter-spacing: 1.5px; }
    .header h1 { margin: 0; color: #14284b; font: 700 25pt/1.12 Georgia, serif; }
    .badge-row { display: flex; flex-wrap:wrap; gap: 7px; margin-top: 12px; }
    .package-label { margin-top:5px; color:#64748b; font-size:10pt; }
    .date-line { margin-top: 10px; color:#394967; font-size:9pt; font-weight:600; }
    .pill { background: #f4efe4; color: #70551f; font-size: 8pt; padding: 5px 9px; border-radius: 20px; font-weight: 600; }
    .header [style] { color: #667085 !important; }
    .day-card { display: flex; gap: 0; margin: 0 0 12px; border: 1px solid #e2e7ee; border-radius: 9px; overflow: hidden; page-break-inside: avoid; break-inside: avoid; background: #fff; }
    .day-badge { background: #14284b; color: #fff; min-width: 67px; padding: 12px 8px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 10pt; }
    .day-body { padding: 13px 15px; flex: 1; min-width: 0; }
    .day-photo { display:block; width:100%; height:115px; margin:0 0 10px; border-radius:6px; object-fit:cover; }
    .day-body h3 { margin: 0 0 5px; font: 700 13pt Georgia,serif; color: #14284b; }
    .desc { font-size: 9pt; color: #475467; margin: 0 0 7px; line-height: 1.5; }
    .activities { margin: 0 0 8px; padding-left: 17px; font-size: 9pt; color: #344054; }
    .activities li { margin: 2px 0; }
    .day-meta { font-size: 8pt; color: #586579; display: flex; flex-wrap: wrap; gap: 5px 16px; padding-top: 7px; border-top: 1px solid #edf0f4; }
    .pricing-box { margin-top: 20px; border: 1px solid #d8c28f; border-top: 3px solid #c9a04a; border-radius: 9px; padding: 17px; background: #fbfaf7; }
    .pricing-box h2 { margin: 0 0 12px; font: 700 17pt Georgia,serif; color: #14284b; }
    .price-grid { display: flex; justify-content: space-between; gap: 14px; margin-bottom: 8px; padding-bottom: 7px; border-bottom: 1px solid #e9e6dd; font-size: 9pt; }
    .price-grid > div:last-child { text-align: right; font-weight: 600; }
    .price-grid .amount { font-size: 14pt; font-weight: 700; color: #8b6929; }
    .incl-excl { display: flex; gap: 20px; font-size: 8.5pt; }
    .incl-excl > div { flex: 1; min-width: 0; }
    .incl-excl h4 { margin: 8px 0 5px; font-size: 9pt; color: #14284b; }
    .incl-excl ul { margin: 0; padding-left: 16px; }
    .footer { margin-top: 24px; text-align: center; font-size: 8pt; color: #8992a1; }
    .section { margin: 23px 0; } .section h2 { color:#14284b; margin: 0 0 12px; border-bottom:1px solid #d8c28f; padding-bottom:8px; font:700 17pt Georgia,serif; break-after:avoid; page-break-after:avoid; }
    .section h3 { color:#344766; font-size:10pt; margin:15px 0 7px; break-after:avoid; page-break-after:avoid; }
    table { width:100%; border-collapse:collapse; margin:10px 0 17px; font-size:8pt; } tr { break-inside:avoid; page-break-inside:avoid; } th,td { border-bottom:1px solid #e2e7ee; padding:7px 6px; text-align:left; vertical-align:top; overflow-wrap:anywhere; } th { background:#14284b; color:#fff; font-size:7.5pt; font-weight:600; }
    tbody tr:nth-child(even) { background:#f7f8fa; }
    .photo-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; } figure { margin:0; break-inside:avoid; page-break-inside:avoid; } figure img { display:block; width:100%; height:165px; object-fit:cover; border-radius:7px; } figcaption { font-size:8pt; color:#667085; margin-top:5px; }
    .policy { break-inside:avoid; page-break-inside:avoid; margin:12px 0; padding:10px 12px; border-left:2px solid #c9a04a; background:#f8f9fb; } .policy h3 { margin:0 0 4px; font-size:9pt; } .policy p { white-space:pre-wrap; font-size:8.5pt; line-height:1.5; margin:0; }
    .section ul { padding-left:18px; } .section li { margin:3px 0; }
    .status { color:#76591e; font-weight:bold; }
    .closing { margin:0; min-height:245mm; overflow:hidden; border-radius:14px; background:#13224A; color:#fff; break-before:page; page-break-before:always; break-inside:avoid; display:flex; flex-direction:column; }
    .closing-art { height:86mm; flex:0 0 auto; background-color:#13224A; background-position:center; background-size:cover; border-bottom:3px solid #C99A3B; }
    .closing-copy { display:flex; flex:1; flex-direction:column; justify-content:center; padding:14mm 18mm; }
    .closing-eyebrow { margin-bottom:5mm; color:#E0B75D; font-size:10px; font-weight:800; letter-spacing:2px; text-transform:uppercase; }
    .closing h1 { margin:0 0 5mm; color:#fff; font:32px Georgia,serif; }
    .closing-copy > p { max-width:145mm; margin:0; color:#F2F0EB; font:15px/1.6 Georgia,serif; }
    .closing-summary { display:flex; flex-wrap:wrap; gap:8px; margin-top:9mm; }
    .closing-summary span { padding:8px 12px; border:1px solid rgba(224,183,93,.55); border-radius:999px; color:#F7E8C4; font-size:10px; }
    .closing-contacts { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:10mm; }
    .closing-contacts small { color:#E0B75D; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1px; }
    .closing-footer { margin-top:9mm; color:#b9c2d1; font-size:9px; }
    .closing { height:252mm; min-height:252mm; background:#0F1F4B; }
    .closing-art { height:62mm; background-image:radial-gradient(circle at 76% 22%,rgba(201,160,64,.24),transparent 32%),linear-gradient(135deg,#2A4C79 0%,#0F1F4B 58%,#1F7A6E 100%); border-bottom:2px solid #C9A040; }
    .closing-copy { justify-content:space-between; gap:3mm; padding:7mm 13mm 9mm; }
    .closing-brand { display:flex; align-items:center; gap:3mm; align-self:flex-start; padding:2mm 4mm; border:1px solid rgba(201,160,64,.65); border-radius:10px; background:#FBF7F0; color:#0F1F4B; }
    .closing-brand img { width:14mm; height:14mm; object-fit:contain; }
    .closing-brand b,.closing-brand small { display:block; }
    .closing-brand b { font-size:11px; }
    .closing-brand small { margin-top:2px; color:#6B7280; font-size:8px; }
    .closing-eyebrow { margin:0; color:#E5C572; }
    .closing h1 { margin:0; font:30px Georgia,serif; }
    .closing-copy > p { margin:0; font-size:13px; }
    .closing-summary { margin:0; gap:6px; }
    .closing-summary span { padding:6px 9px; font-size:9px; }
    .closing-contacts { grid-template-columns:repeat(4,minmax(0,1fr)); gap:6px; margin:0; }
    .closing-contacts a { display:grid; grid-template-columns:22px minmax(0,1fr); align-items:center; gap:7px; min-width:0; padding:8px 9px; border:1px solid rgba(255,255,255,.16); border-radius:8px; background:rgba(255,255,255,.08); color:#fff; text-decoration:none; overflow-wrap:anywhere; }
    .closing-contact-mark { display:grid; width:22px; height:22px; place-items:center; border-radius:50%; background:#FBF7F0; }
    .closing-contact-icon { display:block; width:13px; height:13px; object-fit:contain; }
    .closing-contact-copy { display:flex; min-width:0; flex-direction:column; gap:3px; }
    .closing-contacts small { color:#E5C572; font-size:8px; }
    .closing-contacts b { overflow:hidden; font-size:9px; text-overflow:ellipsis; white-space:nowrap; }
    .closing-social-heading { color:#E5C572; font-size:9px; font-weight:800; letter-spacing:1px; text-transform:uppercase; }
    .closing-socials { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:6px; }
    .closing-socials a { display:grid; grid-template-columns:22px minmax(0,1fr); align-items:center; column-gap:7px; min-width:0; padding:6px 7px; border:1px solid rgba(255,255,255,.15); border-radius:7px; background:rgba(255,255,255,.08); color:#fff; text-decoration:none; }
    .closing-social-mark { grid-row:1/3; display:grid; width:22px; height:22px; place-items:center; border-radius:50%; background:#FBF7F0; }
    .closing-social-icon { display:block; width:14px; height:14px; object-fit:contain; }
    .closing-social-copy { display:flex; min-width:0; flex-direction:column; gap:2px; }
    .closing-socials b,.closing-socials small { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .closing-socials b { font-size:8px; }
    .closing-socials small { color:#b9c2d1; font-size:7px; }
    .closing-footer { margin:0; padding-top:2mm; border-top:1px solid rgba(255,255,255,.18); color:#E5C572; }
    /* Print-flow safeguards: preserve long itinerary content instead of clipping or moving whole days. */
    p, li, td, .policy p { orphans:3; widows:3; overflow-wrap:anywhere; }
    .header h1, .section h2, .section h3 { break-after:avoid; page-break-after:avoid; }
    .day-card { display:block; overflow:visible; break-inside:auto; page-break-inside:auto; border-left:3px solid #c9a04a; }
    .day-badge { display:inline-block; min-width:0; margin:10px 0 0 13px; padding:5px 10px; border-radius:999px; background:#f4efe4; color:#70551f; }
    .day-body { padding-top:8px; }
    .day-body h3 { break-after:avoid; page-break-after:avoid; }
    .day-meta, .policy, figure, tr { break-inside:avoid; page-break-inside:avoid; }
    .pricing-box, .section, .incl-excl, .policy { overflow:visible; }
    th, td { overflow-wrap:anywhere; word-break:normal; }
    .closing { height:auto; min-height:245mm; max-height:none; overflow:visible; break-inside:auto; page-break-inside:auto; }
    .closing-copy { flex:1 0 auto; }
    .closing-contacts { grid-template-columns:repeat(2,minmax(0,1fr)); }
    .closing-contacts b, .closing-socials b, .closing-socials small { overflow:visible; white-space:normal; text-overflow:clip; overflow-wrap:anywhere; }
    .closing-socials { grid-template-columns:repeat(2,minmax(0,1fr)); }
    .header-brand { display:flex; align-items:center; gap:10px; margin:0 0 14px; }
    .header-brand img { display:block; width:17mm; height:17mm; padding:2px; border:1px solid #d8c28f; border-radius:6px; background:#fff; object-fit:contain; }
    .header-brand b, .header-brand small { display:block; }
    .header-brand b { color:#14284b; font-size:10pt; }
    .header-brand small { margin-top:3px; color:#667085; font-size:8pt; }
    /* Refined spacing and hierarchy for the existing detailed itinerary. */
    .header { margin-bottom:18px; padding-bottom:13px; }
    .header-brand { gap:12px; margin-bottom:12px; }
    .header h1 { font-size:27pt; line-height:1.08; }
    .badge-row { gap:6px; margin-top:10px; }
    .pill { padding:5px 10px; line-height:1.25; }
    .section { margin:18px 0; }
    .section h2 { margin-bottom:10px; padding-bottom:7px; }
    .section h3 { margin:12px 0 6px; }
    .day-card { margin-bottom:14px; border-color:#e5e8ee; border-radius:10px; box-shadow:0 2px 8px rgba(20,40,75,.045); }
    .day-body { padding:14px 16px; }
    .day-body h3 { margin-bottom:7px; line-height:1.25; }
    .desc { margin-bottom:9px; line-height:1.55; }
    .activities { margin:0 0 10px; padding-left:18px; line-height:1.45; }
    .activities li { margin:4px 0; padding-left:2px; }
    .day-meta { gap:6px 14px; padding-top:8px; line-height:1.45; }
    .pricing-box { margin-top:18px; padding:18px 20px; border-radius:10px; }
    .price-grid { gap:16px; margin-bottom:9px; padding-bottom:8px; line-height:1.4; }
    table { margin:9px 0 14px; }
    th,td { padding:8px 7px; line-height:1.4; }
    .photo-grid { gap:14px; }
    figure img { border-radius:8px; }
    .policy { margin:10px 0; padding:11px 13px; line-height:1.5; }
    .closing-copy { gap:4mm; }
  </style>
  </head>
  <body>
    <div class="header">
      <div>
        <div class="header-brand">${closingLogo ? `<img src="${closingLogo}" alt="Bablons Travel logo">` : ''}<span><b>${escapeHtml(brand.name)}</b><small>${escapeHtml(brand.contacts.website.replace(/^https?:\/\//, ''))}</small></span></div>
        <h1>${escapeHtml(title || 'Travel Itinerary')}</h1>
        ${itinerary.packageName ? `<div class="package-label">${escapeHtml(itinerary.packageName)}</div>` : ''}
        <div class="badge-row">
          <span class="pill">${(Array.isArray(destinations) ? destinations : []).map(escapeHtml).join(', ')}</span>
          <span class="pill">${Number(nights) || 0}N / ${Number(days) || (dayPlan?.length || 1)}D</span>
          <span class="pill">${travelers.adults || 0} Adults${travelers.children ? `, ${travelers.children} Children` : ''}${travelers.childrenAges?.length ? ` · ages ${travelers.childrenAges.join(', ')}` : ''}</span>
        </div>
        ${itinerary.travelDates?.start || itinerary.travelDates?.end ? `<div class="date-line">Travel: ${formatDate(itinerary.travelDates.start)}${itinerary.travelDates?.end ? ` – ${formatDate(itinerary.travelDates.end)}` : ''}</div>` : ''}
        ${customerName ? `<div style="margin-top:8px;font-size:12px;color:#6b6b6b;">Prepared for ${escapeHtml(customerName)}</div>` : ''}
        ${itinerary.customerContact ? `<div style="font-size:12px;color:#6b6b6b;">Contact: ${escapeHtml(itinerary.customerContact)}</div>` : ''}
      </div>
    </div>

    ${introSection}
    ${summarySection}

    ${detailedDays}

    <div class="pricing-box">
      <h2>Pricing</h2>
      <div class="price-grid">
        <div>Adult base price per person</div>
        <div>${escapeHtml(pricing.currency || 'INR')} ${formatMoney(pricing.basePrice ?? 0)}</div>
      </div>
      <div class="price-grid"><div>Adult GST per person (${Number(pricing.gstPercentage ?? 5)}%)</div><div>${escapeHtml(pricing.currency || 'INR')} ${formatMoney(pricing.gstAmount || 0)}</div></div>
      <div class="price-grid"><div>Adult final price per person</div><div class="amount">${escapeHtml(pricing.currency || 'INR')} ${formatMoney(pricing.perPersonCost || 0)}</div></div>
      ${Number(travelers.children || 0) > 0 ? `<div class="price-grid"><div>Child final price per person ${pricing.childBasePrice == null ? '(adult rate applied)' : `(${escapeHtml(pricing.currency || 'INR')} ${formatMoney(pricing.childBasePrice)} base + ${Number(pricing.gstPercentage ?? 5)}% GST)`}</div><div>${escapeHtml(pricing.currency || 'INR')} ${formatMoney(pricing.childPerPersonCost ?? pricing.perPersonCost)}</div></div>` : ''}
      ${pricingRows}
      ${Number(pricing.flightCost || 0) ? `<div class="price-grid"><div>Flights (booking total)</div><div>${escapeHtml(pricing.currency || 'INR')} ${formatMoney(pricing.flightCost)}</div></div>` : ''}
      <div class="price-grid">
        <div>Total (${(travelers.adults || 0) + (travelers.children || 0)} pax)</div>
        <div class="amount">${escapeHtml(pricing.currency || 'INR')} ${formatMoney(pricing.totalPrice ?? pricing.totalCost ?? 0)}</div>
      </div>
      <div class="incl-excl">
        <div><h4>Inclusions</h4><ul>${inclusions}</ul></div>
        <div><h4>Exclusions</h4><ul>${exclusions}</ul></div>
      </div>
      ${pricingMeta}
      ${paymentSection}
    </div>

    ${logisticsSection}
    ${termsSection}
    ${closingSection}

  </body>
  </html>
  `;
  return detailed;
}

function escapeHtml(str = '') {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function escapeAttribute(value = '') { return escapeHtml(value); }
function isAllowedImageUrl(value = '') { return isAllowedPdfImageUrl(value); }
function safeCssUrl(value = '') {
  try { return new URL(value).href.replace(/["'()\\]/g, (character) => `%${character.charCodeAt(0).toString(16)}`); }
  catch { return ''; }
}
function renderList(values = []) { const items = (Array.isArray(values) ? values : []).filter(Boolean); return items.length ? `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''; }
function humanizeStatus(value = '') { return String(value).replace(/_/g, ' ').replace(/^./, (letter) => letter.toUpperCase()); }
function formatMoney(value) { return (Number(value) || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }
function formatDate(value) { if (!value) return ''; const date = new Date(value); return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-IN'); }

module.exports = { buildItineraryHTML };
