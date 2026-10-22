const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType
} = require('docx');
const { toProposalModel } = require('../templates/itineraryProposalModel');
const brand = require('../config/itineraryBrand');
const countryPacks = require('../config/itineraryCountryPacks');
const { getPackageHighlights } = require('../utils/itineraryHighlights');

function dayToParagraphs(day) {
  const parts = [
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 80 },
      children: [new TextRun({ text: `Day ${day.dayNumber}: ${day.title || ''}`, bold: true })]
    })
  ];

  if (day.description) parts.push(new Paragraph({ text: day.description, spacing: { after: 80 } }));

  (day.activities || []).forEach((a) => parts.push(new Paragraph({ text: `• ${a}`, spacing: { after: 40 } })));

  const metaBits = [];
  if (day.hotel) metaBits.push(`Stay: ${day.hotel}`);
  if (day.meals && day.meals.length) metaBits.push(`Meals: ${day.meals.join(', ')}`);
  if (day.transfer) metaBits.push(`Transfer: ${day.transfer}`);
  if (metaBits.length) {
    parts.push(
      new Paragraph({
        spacing: { before: 80 },
        children: [new TextRun({ text: metaBits.join('   |   '), italics: true, size: 20 })]
      })
    );
  }

  return parts;
}

function pricingTable(pricing = {}, travelers = {}) {
  const cell = (text, bold = false) =>
    new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text, bold })] })],
      width: { size: 50, type: WidthType.PERCENTAGE }
    });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [cell('Per person cost', true), cell(`${pricing.currency || 'INR'} ${Number(pricing.perPersonCost || 0).toLocaleString()}`)] }),
      ...(Number(travelers.children || 0) > 0 ? [new TableRow({ children: [cell(pricing.childBasePrice == null ? 'Child price per person (adult rate applied)' : 'Child price per person', true), cell(`${pricing.currency || 'INR'} ${Number(pricing.childPerPersonCost ?? pricing.perPersonCost ?? 0).toLocaleString()}`)] })] : []),
      new TableRow({ children: [cell('Base price per person', true), cell(`${pricing.currency || 'INR'} ${Number(pricing.basePrice || 0).toLocaleString()}`)] }),
      new TableRow({ children: [cell(`GST per person (${Number(pricing.gstPercentage ?? 5)}%)`, true), cell(`${pricing.currency || 'INR'} ${Number(pricing.gstAmount || 0).toLocaleString()}`)] }),
      new TableRow({ children: [cell(`Price status`, true), cell(String(pricing.priceStatus || 'estimate').toUpperCase())] }),
      ...(pricing.flightCost ? [new TableRow({ children: [cell('Flights (booking total)', true), cell(`${pricing.currency || 'INR'} ${Number(pricing.flightCost).toLocaleString()}`)] })] : []),
      ...(pricing.additionalCharges || []).map((item) => new TableRow({ children: [cell(item.label), cell(`${pricing.currency || 'INR'} ${Number(item.amount || 0).toLocaleString()}`)] })),
      ...(pricing.discounts || []).map((item) => new TableRow({ children: [cell(`${item.label} (discount)`), cell(`- ${pricing.currency || 'INR'} ${Number(item.amount || 0).toLocaleString()}`)] })),
      new TableRow({ children: [cell('Total cost', true), cell(`${pricing.currency || 'INR'} ${Number(pricing.totalPrice ?? pricing.totalCost ?? 0).toLocaleString()}`)] }),
      new TableRow({ children: [cell('Travelers', true), cell(`${travelers.adults || 0} Adults, ${travelers.children || 0} Children`)] })
    ]
  });
}

/**
 * Renders the given itinerary document to a DOCX buffer.
 * Same rule as the PDF service: nothing persisted, buffer returned to the caller only.
 */
async function generateItineraryDocxBuffer(itinerary) {
  if (itinerary.designKey === 'proposal') return generateProposalDocxBuffer(itinerary);
  const { title, customerName, customerContact, travelDates = {}, packageName, destinations = [], days, nights, days_plan: dayPlan = [], pricing = {}, travelers = {} } = itinerary;

  const text = (value) => String(value || '').trim();
  const sectionHeading = (label) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 120 }, text: label });
  const lines = (label, values = []) => values.length ? [new Paragraph({ heading: HeadingLevel.HEADING_3, text: label }), ...values.map((value) => new Paragraph({ text: `• ${value}` }))] : [];
  const dateText = [travelDates.start && new Date(travelDates.start).toLocaleDateString('en-IN'), travelDates.end && new Date(travelDates.end).toLocaleDateString('en-IN')].filter(Boolean).join(' – ');
  const hotelParagraphs = (itinerary.hotels || []).map((hotel) => new Paragraph({ text: `${hotel.destination || 'Stay'}: ${hotel.name || hotel.alternative || 'Hotel to be confirmed'} | ${hotel.roomType || 'Room TBC'} | ${hotel.occupancy || 'Occupancy TBC'} | ${hotel.mealPlan || 'Meal plan TBC'} | ${hotel.nights || 0} nights | ${hotel.confirmation || 'provisional'}` }));
  const transferParagraphs = (itinerary.transferDetails || []).map((item) => new Paragraph({ text: `${item.route || 'Route'}: ${item.type || 'Transfer TBC'}${item.notes ? ` — ${item.notes}` : ''} (${item.confirmation || 'provisional'})` }));
  const policyParagraphs = Object.entries({ 'Child policy': itinerary.policies?.child, 'Payment policy': itinerary.policies?.payment, 'Cancellation policy': itinerary.policies?.cancellation, 'Check-in / check-out': itinerary.policies?.checkInOut, 'Visa information': itinerary.policies?.visa, 'Travel documents': itinerary.policies?.travelDocuments, 'Important information': itinerary.policies?.importantInformation }).filter(([, value]) => text(value)).map(([label, value]) => new Paragraph({ children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun({ text: value })] }));

  const children = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: title || 'Travel Itinerary', bold: true })] }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: `${customerName ? `Prepared for ${customerName} | ` : ''}${customerContact ? `${customerContact} | ` : ''}${(Array.isArray(destinations) ? destinations : []).join(', ')} | ${nights}N/${days}D${dateText ? ` | ${dateText}` : ''}${packageName ? ` | ${packageName}` : ''}`,
          italics: true
        })
      ]
    }),
    ...(itinerary.destinationIntroduction ? [sectionHeading('Destination overview'), new Paragraph({ text: itinerary.destinationIntroduction })] : []),
    ...lines('Destination highlights', itinerary.destinationHighlights || []),
    ...lines('Package highlights', getPackageHighlights(itinerary)),
    ...(itinerary.destinationPhotos || []).map((photo) => new Paragraph({ text: `${photo.caption || 'Destination photo'}${photo.url ? ` — ${photo.url}` : ''}` })),
    ...(dayPlan.length ? [sectionHeading('At a glance'), ...dayPlan.map((day) => new Paragraph({ text: `Day ${day.dayNumber}: ${day.shortTitle || day.title}${day.transfer ? ` | Route / transfer: ${day.transfer}` : ''}${day.hotel ? ` | Overnight: ${day.hotel}` : ''}${day.meals?.length ? ` | Meals: ${day.meals.join(', ')}` : ''}` }))] : []),
    sectionHeading('Detailed daily itinerary'),
    ...dayPlan.flatMap(dayToParagraphs),
    ...(hotelParagraphs.length || transferParagraphs.length ? [sectionHeading('Hotels and transfers'), ...hotelParagraphs, ...transferParagraphs] : []),
    ...lines('Optional activities (extra cost)', (itinerary.optionalActivities || []).map((item) => `${item.name}${item.price != null ? ` — ${pricing.currency || 'INR'} ${item.price}` : ''}${item.notes ? ` — ${item.notes}` : ''}`)),
    ...lines('Services pending confirmation', itinerary.pendingServices || []),
    ...(policyParagraphs.length ? [sectionHeading('Policies and important information'), ...policyParagraphs] : []),
    new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 }, text: 'Pricing' }),
    pricingTable(pricing, travelers)
  ];

  if (pricing.inclusions && pricing.inclusions.length) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 200 }, text: 'Inclusions' }));
    pricing.inclusions.forEach((i) => children.push(new Paragraph({ text: `• ${i}` })));
  }
  if (pricing.exclusions && pricing.exclusions.length) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 200 }, text: 'Exclusions' }));
    pricing.exclusions.forEach((i) => children.push(new Paragraph({ text: `• ${i}` })));
  }
  if (pricing.pricingNotes) children.push(new Paragraph({ text: `Pricing notes: ${pricing.pricingNotes}` }));
  if (pricing.paymentSchedule?.length) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 200 }, text: 'Payment schedule' }));
    pricing.paymentSchedule.forEach((item) => children.push(new Paragraph({ text: `${item.label}: ${pricing.currency || 'INR'} ${Number(item.amount || 0).toLocaleString()}` })));
  }
  if (itinerary.closingMessage) children.push(new Paragraph({ spacing: { before: 300 }, alignment: 'center', text: itinerary.closingMessage }));

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}

async function generateProposalDocxBuffer(itinerary) {
  const model = toProposalModel(itinerary, brand, countryPacks);
  const heading = (text, level = HeadingLevel.HEADING_1) => new Paragraph({ heading: level, text });
  const bullet = (text) => new Paragraph({ text: `• ${text}`, spacing: { after: 80 } });
  const children = [
    new Paragraph({ heading: HeadingLevel.TITLE, text: model.country || model.title || 'Travel Proposal' }),
    new Paragraph({ text: model.tagline, italics: true }),
    new Paragraph({ text: `Prepared for ${model.customerName || 'Traveler'} · ${model.destinations.join(', ')} · ${model.daysCount} days / ${model.nights} nights` }),
    ...(model.destinationIntroduction ? [heading('Discover'), new Paragraph({ text: model.destinationIntroduction })] : []),
    ...(itinerary.destinationHighlights?.length ? [heading('Experiences to look forward to'), ...itinerary.destinationHighlights.map(bullet)] : []),
    ...(model.packageHighlights.length ? [heading('Package highlights'), ...model.packageHighlights.map(bullet)] : []),
    ...model.days.map((day) => [heading(`Day ${day.number}: ${day.title}`, HeadingLevel.HEADING_2), ...day.bullets.map(bullet), ...(day.transfer ? [new Paragraph({ text: `Transfer: ${day.transfer}` })] : []), ...(day.meals.length ? [new Paragraph({ text: `Meals: ${day.meals.join(', ')}` })] : []), ...(day.overnight ? [new Paragraph({ text: `Overnight: ${day.overnight}` })] : [])]).flat(),
    ...(model.inclusions.length ? [heading('Included'), ...model.inclusions.map(bullet)] : []),
    ...(model.exclusions.length ? [heading('Not included'), ...model.exclusions.map(bullet)] : []),
    heading('Package investment'),
    new Paragraph({ text: `Package price: ${model.pricing.currency} ${(model.pricing.adults * model.pricing.adultBase + model.pricing.children * model.pricing.childBase).toLocaleString('en-IN')}` }),
    new Paragraph({ text: `GST: ${model.pricing.currency} ${(model.pricing.adults * model.pricing.adultGst + model.pricing.children * model.pricing.childGst).toLocaleString('en-IN')}` }),
    ...model.pricing.additionalCharges.map((row) => new Paragraph({ text: `${row.label}: ${model.pricing.currency} ${Number(row.amount || 0).toLocaleString('en-IN')}` })),
    ...model.pricing.discounts.map((row) => new Paragraph({ text: `${row.label}: -${model.pricing.currency} ${Number(row.amount || 0).toLocaleString('en-IN')}` })),
    new Paragraph({ children: [new TextRun({ text: `Total: ${model.pricing.currency} ${model.pricing.totalPrice.toLocaleString('en-IN')}`, bold: true })] }),
    ...(model.pricing.paymentSchedule.length ? [heading('Payment schedule'), ...model.pricing.paymentSchedule.map((row) => new Paragraph({ text: `${row.label}: ${model.pricing.currency} ${Number(row.amount || 0).toLocaleString('en-IN')}` }))] : []),
    ...Object.entries({ 'Child policy': model.policies.child, 'Payment policy': model.policies.payment, 'Cancellation policy': model.policies.cancellation, 'Check-in / check-out': model.policies.checkInOut, 'Visa information': model.policies.visa, 'Travel documents': model.policies.travelDocuments, 'Important information': model.policies.importantInformation }).filter(([, value]) => String(value || '').trim()).map(([label, value]) => new Paragraph({ children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun({ text: value })] })),
    new Paragraph({ text: model.closingMessage || 'We look forward to helping you enjoy a wonderful journey.' }),
    new Paragraph({ text: `${brand.contacts.call} · ${brand.contacts.whatsapp} · ${brand.contacts.email} · ${brand.contacts.website}` })
  ];
  return Packer.toBuffer(new Document({ sections: [{ children }] }));
}

module.exports = { generateItineraryDocxBuffer };
