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
      new TableRow({ children: [cell('Total cost', true), cell(`${pricing.currency || 'INR'} ${Number(pricing.totalCost || 0).toLocaleString()}`)] }),
      new TableRow({ children: [cell('Travelers', true), cell(`${travelers.adults || 0} Adults, ${travelers.children || 0} Children`)] })
    ]
  });
}

/**
 * Renders the given itinerary document to a DOCX buffer.
 * Same rule as the PDF service: nothing persisted, buffer returned to the caller only.
 */
async function generateItineraryDocxBuffer(itinerary) {
  const { title, customerName, destinations = [], days, nights, days_plan: dayPlan = [], pricing = {}, travelers = {} } = itinerary;

  const children = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: title || 'Travel Itinerary', bold: true })] }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: `${customerName ? `Prepared for ${customerName} | ` : ''}${destinations.join(', ')} | ${nights}N/${days}D`,
          italics: true
        })
      ]
    }),
    ...dayPlan.flatMap(dayToParagraphs),
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

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}

module.exports = { generateItineraryDocxBuffer };
