require('dotenv').config()

const connectDB = require('../config/db')
const Blog = require('../models/Blog')

const author = 'Bablons Travel & Entertainment'

const makeSections = (sections) => sections.map(([heading, body]) => ({ heading, body }))

const blogs = [
  {
    title: 'Dubai Tour Packages from India 2026: Complete Family, Honeymoon & Budget Guide',
    slug: 'dubai-tour-packages-from-india-2026',
    category: 'Travel',
    heroLabel: 'Dubai Holidays 2026',
    excerpt: 'Dubai Tour Packages from India 2026: Complete Family, Honeymoon & Budget Guide',
    highlights: [
      'Direct flights from every major Indian city',
      'Visa processing in 3-5 working days',
      'Desert safari, Burj Khalifa & Dubai Marina included',
      'Options for luxury, family & budget travelers',
      '24x7 WhatsApp support during your trip',
    ],
    tags: ['Dubai', 'Honeymoon', 'Family Holiday', 'Budget Travel', 'International Tour Packages'],
    sections: makeSections([
      [
        "Why Dubai Tops Every Indian Traveler's List in 2026",
        "Dubai remains the most searched international destination for Indian travelers, and for good reason. Direct flights from Delhi, Mumbai, Bangalore, and even smaller cities like Lucknow and Ahmedabad make it one of the easiest countries to reach. Add a visa process that takes just a few working days, and it's no surprise Dubai works for weekend getaways as well as full family vacations.",
      ],
      [
        'What\'s Included in a Typical Dubai Tour Package',
        'Most Dubai holiday packages combine flights, hotel stay, airport transfers, a desert safari with BBQ dinner, and a Burj Khalifa or Dubai Marina cruise experience. Depending on your budget, you can choose anywhere from a 3-star stay near Deira to a 5-star beachfront resort in Jumeirah.',
      ],
      [
        'Best Dubai Packages for Honeymooners',
        'Couples usually prefer a stay in Palm Jumeirah or Downtown Dubai, combined with a private dhow cruise, a spa evening, and optional add-ons like a hot air balloon ride over the desert. These experiences are typically bundled into our honeymoon-specific Dubai itineraries.',
      ],
      [
        'Family-Friendly Dubai Itinerary Ideas',
        'Families traveling with kids often prioritize IMG Worlds of Adventure, Aquaventure Waterpark, and the Dubai Aquarium alongside the standard sightseeing circuit. A well-planned 5-6 day itinerary comfortably covers both adventure and relaxation.',
      ],
      [
        'Best Time to Visit Dubai from India',
        'November to March offers the most comfortable weather for outdoor sightseeing and desert activities. Summer months (May-August) see heavy discounts on hotels but extreme heat can limit outdoor plans, so shopping festivals and indoor attractions work best during this period.',
      ],
      [
        'Book Your Dubai Package with Bablons Travel & Entertainment',
        'As an IATA-certified travel agency, we handle visa assistance, flight and hotel bundling, and full itinerary customization for Dubai trips. Call or WhatsApp +91 98102 12399 for a free quote tailored to your budget and travel dates.',
      ],
    ]),
    internalLinks: [
      { label: 'Dubai Honeymoon Packages', url: '/packages/dubai-honeymoon', type: 'package' },
      { label: 'Dubai Family Holiday Packages', url: '/packages/dubai-family', type: 'package' },
      { label: 'Visa Assistance Services', url: '/services/visa-assistance', type: 'page' },
    ],
    relatedBlogSlugs: ['best-international-tour-packages-from-india-2026', 'thailand-vs-dubai-budget-travel-comparison'],
    seo: {
      metaTitle: 'Dubai Tour Packages from India 2026 | Bablons Travel',
      metaDescription: 'Plan Dubai tour packages from India for family, honeymoon, luxury or budget travel with visa help, flights, hotels and curated experiences.',
      keywords: [
        'Dubai tour packages from India',
        'Dubai family holiday packages',
        'Dubai honeymoon tour packages',
        'Dubai luxury tour packages',
        'best time to visit Dubai from India',
      ],
    },
  },
  {
    title: 'Thailand Tour Packages from India 2026: Bangkok, Pattaya & Phuket Budget Guide',
    slug: 'thailand-tour-packages-from-india-2026',
    category: 'Travel',
    heroLabel: 'Thailand Holidays 2026',
    excerpt: 'Thailand Tour Packages from India 2026: Bangkok, Pattaya & Phuket Budget Guide',
    highlights: [
      'Most budget-friendly international destination from India',
      'Easy visa-on-arrival and e-visa options for Indians',
      'Perfect mix of beaches, nightlife & culture',
      "Ideal for friends' groups, couples & first-time travelers",
      'Island hopping tours in Phuket & Krabi included',
    ],
    tags: ['Thailand', 'Budget Travel', 'Bangkok', 'Phuket', 'Group Tour'],
    sections: makeSections([
      [
        "Why Thailand Is India's Favorite Budget International Destination",
        'Thailand consistently ranks as the top affordable international destination for Indian travelers. A combination of low-cost flights, budget-friendly hotels, and a favorable exchange rate means a full week-long holiday often costs less than a domestic luxury trip.',
      ],
      [
        'Bangkok: The City Experience',
        'Bangkok offers a mix of temples, street markets, rooftop bars, and modern shopping malls. Most itineraries include a city tour covering the Grand Palace and Wat Arun, along with a floating market excursion.',
      ],
      [
        'Pattaya: Beaches and Nightlife',
        "Just a short drive from Bangkok, Pattaya is popular for its beaches, water sports, and vibrant nightlife. It's a common stop on 5-6 day Thailand packages for both families and groups of friends.",
      ],
      [
        'Phuket & Krabi: Island Hopping',
        'For travelers wanting a quieter, beach-focused experience, Phuket and Krabi offer island-hopping tours, snorkeling, and stunning limestone cliff views, ideal for honeymooners and nature lovers alike.',
      ],
      [
        'Thailand Visa Process for Indian Travelers',
        'Indian passport holders can apply for a Thailand e-visa online, with processing typically completed within a few working days. Our team handles the full application and documentation process for a smoother experience.',
      ],
      [
        'Plan Your Thailand Trip with Bablons Travel & Entertainment',
        'From budget group tours to private honeymoon itineraries, we design Thailand packages around your schedule and budget. Call or WhatsApp +91 98102 12399 for a customized quote.',
      ],
    ]),
    internalLinks: [
      { label: 'Thailand Family Trip Packages', url: '/packages/thailand-family', type: 'package' },
      { label: 'Thailand Honeymoon Packages', url: '/packages/thailand-honeymoon', type: 'package' },
      { label: 'Budget Thailand Tour Packages', url: '/packages/thailand-budget', type: 'package' },
    ],
    relatedBlogSlugs: ['best-international-tour-packages-from-india-2026', 'dubai-tour-packages-from-india-2026'],
    seo: {
      metaTitle: 'Thailand Tour Packages from India 2026 | Bablons Travel',
      metaDescription: 'Explore Thailand tour packages from India for Bangkok, Pattaya, Phuket and Krabi with budget planning, visa help and custom itineraries.',
      keywords: [
        'Thailand tour packages from India',
        'Bangkok Pattaya Phuket tour packages',
        'budget Thailand tour packages',
        'Thailand honeymoon packages',
        'Thailand family trip packages',
      ],
    },
  },
  {
    title: 'Bali Honeymoon Packages from India 2026: Villas, Waterfalls & Beach Clubs',
    slug: 'bali-honeymoon-packages-from-india-2026',
    category: 'Travel',
    heroLabel: 'Bali Honeymoon Guide',
    excerpt: 'Bali Honeymoon Packages from India 2026: Villas, Waterfalls & Beach Clubs',
    highlights: [
      'Private pool villas for couples',
      'Ubud rice terraces & waterfall excursions',
      'Beach clubs in Seminyak & Canggu',
      'Customizable 5-7 day honeymoon itineraries',
      'Family-friendly options also available',
    ],
    tags: ['Bali', 'Honeymoon', 'Couples Travel', 'Family Holiday', 'Indonesia'],
    sections: makeSections([
      [
        "Why Bali Is India's Top Honeymoon Destination",
        'Bali has become the go-to honeymoon destination for Indian couples, offering a rare combination of privacy, natural beauty, and affordability. Private villas with plunge pools are widely available at a fraction of the cost of comparable properties in Europe or the Maldives.',
      ],
      [
        'Ubud: Nature and Culture',
        'Ubud is known for its rice terraces, waterfalls, and traditional Balinese temples. A day trip here typically includes the Tegalalang Rice Terrace, Tegenungan Waterfall, and a traditional Balinese lunch overlooking the valley.',
      ],
      [
        'Seminyak & Canggu: Beach Clubs and Sunsets',
        'For couples who want a livelier vibe, Seminyak and Canggu offer beach clubs, sunset dinners, and boutique shopping streets, a popular add-on to any honeymoon itinerary.',
      ],
      [
        'Nusa Penida & Island Day Trips',
        'A day trip to Nusa Penida is one of the most requested add-ons, known for its dramatic cliffs and turquoise water viewpoints like Kelingking Beach.',
      ],
      [
        'Ideal Bali Honeymoon Duration and Budget',
        'Most couples opt for a 5-7 day itinerary combining Ubud and Seminyak/Canggu. This allows enough time for both nature excursions and relaxed beach days without feeling rushed.',
      ],
      [
        'Book Your Bali Honeymoon with Bablons Travel & Entertainment',
        'We design fully customized Bali honeymoon packages, including private villas, curated excursions, and airport transfers. Call or WhatsApp +91 98102 12399 to start planning.',
      ],
    ]),
    internalLinks: [
      { label: 'Bali Honeymoon Packages', url: '/packages/bali-honeymoon', type: 'package' },
      { label: 'Bali Family Holiday Packages', url: '/packages/bali-family', type: 'package' },
    ],
    relatedBlogSlugs: ['best-international-tour-packages-from-india-2026', 'thailand-tour-packages-from-india-2026'],
    seo: {
      metaTitle: 'Bali Honeymoon Packages from India 2026 | Bablons Travel',
      metaDescription: 'Plan Bali honeymoon packages from India with private villas, Ubud waterfalls, beach clubs, island trips and custom romantic itineraries.',
      keywords: [
        'Bali honeymoon packages',
        'Bali family holiday packages',
        'Bali tour packages from India',
        'Ubud rice terrace tour',
        'Bali couples travel packages',
      ],
    },
  },
  {
    title: 'Georgia Tour Packages from India 2026: Tbilisi, Gudauri & Batumi Travel Guide',
    slug: 'georgia-tour-packages-from-india-2026',
    category: 'Travel',
    heroLabel: 'Offbeat Georgia 2026',
    excerpt: 'Georgia Tour Packages from India 2026: Tbilisi, Gudauri & Batumi Travel Guide',
    highlights: [
      'Visa-friendly for Indian passport holders',
      'Mountain landscapes ideal for hiking and photography',
      'Affordable luxury compared to Europe',
      'Great for offbeat and adventure travelers',
      'Combines city, mountain & seaside experiences',
    ],
    tags: ['Georgia', 'Offbeat Travel', 'Adventure', 'Tbilisi', 'Hiking'],
    sections: makeSections([
      [
        'Why Georgia Is Trending Among Indian Travelers',
        'Georgia has quickly become one of the most searched offbeat destinations from India. It offers a rare mix of European-style architecture, Caucasus mountain views, and affordable luxury, all without the visa complications associated with mainland Europe.',
      ],
      [
        'Tbilisi: Old Town Charm',
        'The capital city blends cobblestone old town streets, sulfur bathhouses, and a growing cafe culture. Most itineraries begin with a 2-day Tbilisi city tour before heading to the mountains.',
      ],
      [
        'Gudauri: Mountains and Adventure',
        "Gudauri is Georgia's premier mountain resort town, popular for cable car rides, panoramic viewpoints, and in winter, skiing. It's a favorite stop for travelers wanting adventure beyond city sightseeing.",
      ],
      [
        'Batumi: The Seaside Escape',
        'On the Black Sea coast, Batumi offers a boardwalk, botanical gardens, and a more relaxed pace, a nice contrast to the mountain legs of the trip.',
      ],
      [
        'Georgia Visa Process for Indians',
        'Indian travelers can apply for an e-visa online, with a straightforward documentation process. Processing is typically completed within a few working days.',
      ],
      [
        'Plan Your Georgia Trip with Bablons Travel & Entertainment',
        'We offer customized Georgia tour packages covering Tbilisi, Gudauri, and Batumi for both leisure and adventure travelers. Call or WhatsApp +91 98102 12399 for a detailed itinerary and quote.',
      ],
    ]),
    internalLinks: [
      { label: 'Georgia Mountain & Hiking Packages', url: '/packages/georgia-hiking', type: 'package' },
      { label: 'Georgia Tour Packages', url: '/packages/georgia', type: 'package' },
    ],
    relatedBlogSlugs: ['best-international-tour-packages-from-india-2026', 'uzbekistan-tour-packages-from-india-2026'],
    seo: {
      metaTitle: 'Georgia Tour Packages from India 2026 | Bablons Travel',
      metaDescription: 'Discover Georgia tour packages from India covering Tbilisi, Gudauri, Batumi, mountains, e-visa guidance and offbeat travel planning.',
      keywords: [
        'Georgia tour packages from India',
        'Tbilisi Gudauri Batumi tour packages',
        'Georgia mountain and hiking tour packages',
        'offbeat international destinations from India',
        'Georgia visa for Indians',
      ],
    },
  },
  {
    title: 'Uzbekistan Tour Packages from India 2026: Tashkent, Samarkand & Bukhara Silk Road Guide',
    slug: 'uzbekistan-tour-packages-from-india-2026',
    category: 'Travel',
    heroLabel: 'Silk Road Journeys 2026',
    excerpt: 'Uzbekistan Tour Packages from India 2026: Tashkent, Samarkand & Bukhara Silk Road Guide',
    highlights: [
      'Rich Silk Road history and architecture',
      'Ideal for culture and heritage-focused travelers',
      'Affordable compared to European heritage trips',
      'Growing direct flight connectivity from India',
      'Great option for group and corporate tours',
    ],
    tags: ['Uzbekistan', 'Silk Road', 'Culture Tour', 'Group Travel', 'Heritage'],
    sections: makeSections([
      [
        'Why Uzbekistan Is Becoming a Must-Visit for Indian Travelers',
        'Uzbekistan offers something few destinations can: centuries of Silk Road history preserved in stunning mosques, madrasas, and marketplaces. For Indian travelers looking to move beyond typical beach holidays, it is an increasingly popular choice.',
      ],
      [
        'Tashkent: The Modern Gateway',
        "Uzbekistan's capital blends Soviet-era architecture with modern city life. Most itineraries spend 1-2 days here before heading to the historic cities.",
      ],
      [
        'Samarkand: The Jewel of the Silk Road',
        'Home to the iconic Registan Square, Samarkand is often the highlight of any Uzbekistan itinerary, showcasing some of the most well-preserved Islamic architecture in the world.',
      ],
      [
        'Bukhara: Living History',
        "Bukhara's old town feels frozen in time, with centuries-old trading domes, mosques, and mausoleums still forming the heart of the city.",
      ],
      [
        'Best Time to Visit Uzbekistan',
        'Spring (March-May) and autumn (September-November) offer the most comfortable weather for sightseeing, avoiding both the summer heat and winter cold.',
      ],
      [
        'Book Your Uzbekistan Tour with Bablons Travel & Entertainment',
        'We offer curated Silk Road itineraries covering Tashkent, Samarkand, and Bukhara for individuals, families, and group tours. Call or WhatsApp +91 98102 12399 for a personalized plan.',
      ],
    ]),
    internalLinks: [
      { label: 'Uzbekistan Cultural Tour Packages', url: '/packages/uzbekistan-culture', type: 'package' },
      { label: 'Group Tour Packages', url: '/packages/group-tours', type: 'package' },
    ],
    relatedBlogSlugs: ['georgia-tour-packages-from-india-2026', 'best-international-tour-packages-from-india-2026'],
    seo: {
      metaTitle: 'Uzbekistan Tour Packages from India 2026 | Bablons Travel',
      metaDescription: 'Plan Uzbekistan tour packages from India covering Tashkent, Samarkand, Bukhara, Silk Road heritage, group travel and culture tours.',
      keywords: [
        'Uzbekistan tour packages from India',
        'Tashkent Samarkand Bukhara tour packages',
        'cultural Uzbekistan tour packages',
        'Silk Road tour from India',
        'Uzbekistan group tour packages',
      ],
    },
  },
  {
    title: 'Europe Tour Packages from India 2026: Best Multi-Country Itineraries for Families & Groups',
    slug: 'europe-tour-packages-from-india-2026',
    category: 'Travel',
    heroLabel: 'Europe Holidays 2026',
    excerpt: 'Europe Tour Packages from India 2026: Best Multi-Country Itineraries for Families & Groups',
    highlights: [
      'Multi-country itineraries covering 3-5 destinations',
      'Ideal for families, groups & milestone celebrations',
      'Schengen visa assistance included',
      'Mix of iconic cities and scenic countryside',
      'Flexible luxury and mid-budget options',
    ],
    tags: ['Europe', 'Group Tour', 'Family Holiday', 'Multi-Country Tour', 'Schengen Visa'],
    sections: makeSections([
      [
        'Why Europe Remains a Bucket-List Favorite for Indian Travelers',
        'A Europe trip is often a once-in-a-lifetime milestone for Indian families, celebrating an anniversary, a retirement, or simply ticking off a long-held travel goal. Multi-country packages make it possible to see several iconic destinations in a single, well-planned trip.',
      ],
      [
        'Popular Multi-Country Combinations',
        'Common itineraries combine France, Switzerland, and Italy, or a Central Europe circuit covering Germany, Austria, and Switzerland. Each combination is designed to balance city sightseeing with scenic countryside stops.',
      ],
      [
        'Understanding the Schengen Visa Process',
        "A single Schengen visa allows travel across most of Europe's member countries, making multi-country trips far simpler than applying separately for each destination. Documentation and appointment scheduling are handled as part of our package.",
      ],
      [
        'Best Time to Visit Europe from India',
        'April to June and September to October offer the most pleasant weather across most of Europe, avoiding both peak summer crowds and winter cold in most regions.',
      ],
      [
        'Budget Planning for a Europe Trip',
        'Costs vary significantly by season and city choice. Central and Eastern Europe generally offer better value than Western Europe capitals, making them a good option for families managing a tighter budget.',
      ],
      [
        'Plan Your Europe Trip with Bablons Travel & Entertainment',
        'From luxury multi-country circuits to budget-friendly group tours, we handle visa assistance, flights, hotels, and full itinerary planning. Call or WhatsApp +91 98102 12399 for a customized Europe holiday quote.',
      ],
    ]),
    internalLinks: [
      { label: 'Europe Multi-Country Packages', url: '/packages/europe-multi-country', type: 'package' },
      { label: 'Group Tour Packages', url: '/packages/group-tours', type: 'package' },
    ],
    relatedBlogSlugs: ['best-international-tour-packages-from-india-2026', 'dubai-tour-packages-from-india-2026'],
    seo: {
      metaTitle: 'Europe Tour Packages from India 2026 | Bablons Travel',
      metaDescription: 'Explore Europe tour packages from India with multi-country itineraries, family and group trips, Schengen visa help and flexible budgets.',
      keywords: [
        'Europe holiday packages from India',
        'multi-country Europe tour packages',
        'Europe tour packages 2026',
        'Schengen visa assistance India',
        'group tour packages Europe',
      ],
    },
  },
]

const seedBlogs = async () => {
  try {
    await connectDB()

    const publishedAt = new Date()

    for (const blog of blogs) {
      const doc = new Blog({
        ...blog,
        author,
        isPublished: true,
        publishedAt,
        coverImage: {
          url: '',
          publicId: '',
          alt: blog.title,
        },
        seo: {
          ...blog.seo,
          canonicalUrl: '',
          ogImage: '',
        },
      })
      await doc.validate()
      const payload = doc.toObject({ virtuals: false })
      delete payload._id

      await Blog.findOneAndUpdate(
        { $or: [{ slug: doc.slug }, { title: blog.title }] },
        { $set: payload },
        { upsert: true, runValidators: true, setDefaultsOnInsert: true }
      )

      console.log(`Upserted blog: ${blog.title}`)
    }

    console.log(`Seeded ${blogs.length} blogs successfully`)
    process.exit(0)
  } catch (error) {
    console.error(`Blog seed failed: ${error.message}`)
    process.exit(1)
  }
}

seedBlogs()
