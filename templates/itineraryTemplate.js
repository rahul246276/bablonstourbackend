// Builds the HTML string that Puppeteer converts into the itinerary PDF.
// Kept framework-agnostic and self-contained (inline CSS) since Puppeteer renders it standalone.

function buildItineraryHTML(itinerary) {
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

  const dayCards = dayPlan
    .map(
      (d) => `
      <div class="day-card">
        <div class="day-badge">Day ${d.dayNumber}</div>
        <div class="day-body">
          <h3>${escapeHtml(d.title || '')}</h3>
          <p class="desc">${escapeHtml(d.description || '')}</p>
          ${
            d.activities && d.activities.length
              ? `<ul class="activities">${d.activities.map((a) => `<li>${escapeHtml(a)}</li>`).join('')}</ul>`
              : ''
          }
          <div class="day-meta">
            ${d.hotel ? `<span><strong>Stay:</strong> ${escapeHtml(d.hotel)}</span>` : ''}
            ${d.meals && d.meals.length ? `<span><strong>Meals:</strong> ${d.meals.join(', ')}</span>` : ''}
          </div>
        </div>
      </div>`
    )
    .join('');

  const inclusions = (pricing.inclusions || []).map((i) => `<li>${escapeHtml(i)}</li>`).join('');
  const exclusions = (pricing.exclusions || []).map((i) => `<li>${escapeHtml(i)}</li>`).join('');

  return `
  <!DOCTYPE html>
  <html>
  <head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1B2A4A; margin: 0; padding: 40px; background: #FAF7F0; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #D4A24C; padding-bottom: 16px; margin-bottom: 24px; }
    .header h1 { margin: 0; font-size: 26px; color: #1B2A4A; }
    .badge-row { display: flex; gap: 12px; margin-top: 8px; }
    .pill { background: #EFE6D3; color: #8a6a2f; font-size: 11px; padding: 4px 10px; border-radius: 12px; font-weight: 600; }
    .day-card { display: flex; gap: 16px; margin-bottom: 18px; border: 1px solid #e6e0d2; border-radius: 10px; overflow: hidden; page-break-inside: avoid; }
    .day-badge { background: #1B2A4A; color: #fff; min-width: 70px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; }
    .day-body { padding: 14px 16px; flex: 1; }
    .day-body h3 { margin: 0 0 6px; font-size: 16px; color: #1B2A4A; }
    .desc { font-size: 13px; color: #444; margin: 0 0 8px; line-height: 1.5; }
    .activities { margin: 0 0 8px; padding-left: 18px; font-size: 13px; color: #333; }
    .day-meta { font-size: 12px; color: #6b6b6b; display: flex; gap: 20px; }
    .pricing-box { margin-top: 24px; border: 2px dashed #D4A24C; border-radius: 10px; padding: 18px; background: #fff; }
    .pricing-box h2 { margin: 0 0 10px; font-size: 18px; color: #1B2A4A; }
    .price-grid { display: flex; justify-content: space-between; margin-bottom: 14px; }
    .price-grid .amount { font-size: 24px; font-weight: 700; color: #D4A24C; }
    .incl-excl { display: flex; gap: 24px; font-size: 12px; }
    .incl-excl > div { flex: 1; }
    .incl-excl h4 { margin: 0 0 6px; font-size: 13px; }
    .incl-excl ul { margin: 0; padding-left: 16px; }
    .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #999; }
  </style>
  </head>
  <body>
    <div class="header">
      <div>
        <h1>${escapeHtml(title || 'Travel Itinerary')}</h1>
        <div class="badge-row">
          <span class="pill">${destinations.join(', ')}</span>
          <span class="pill">${nights}N / ${days}D</span>
          <span class="pill">${travelers.adults || 0} Adults${travelers.children ? `, ${travelers.children} Children` : ''}</span>
        </div>
        ${customerName ? `<div style="margin-top:8px;font-size:12px;color:#6b6b6b;">Prepared for ${escapeHtml(customerName)}</div>` : ''}
      </div>
    </div>

    ${dayCards}

    <div class="pricing-box">
      <h2>Pricing</h2>
      <div class="price-grid">
        <div>Per person</div>
        <div class="amount">${pricing.currency || 'INR'} ${Number(pricing.perPersonCost || 0).toLocaleString()}</div>
      </div>
      <div class="price-grid">
        <div>Total (${(travelers.adults || 0) + (travelers.children || 0)} pax)</div>
        <div class="amount">${pricing.currency || 'INR'} ${Number(pricing.totalCost || 0).toLocaleString()}</div>
      </div>
      <div class="incl-excl">
        <div><h4>Inclusions</h4><ul>${inclusions}</ul></div>
        <div><h4>Exclusions</h4><ul>${exclusions}</ul></div>
      </div>
    </div>

    <div class="footer">Bablons Travel &amp; Entertainment · Generated on ${new Date().toLocaleDateString('en-IN')}</div>
  </body>
  </html>
  `;
}

function escapeHtml(str = '') {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

module.exports = { buildItineraryHTML };
