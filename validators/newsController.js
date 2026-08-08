const { z } = require("zod");
const { NEWS_CATEGORIES } = require("../models/News");

const baseNewsBody = z.object({
  title: z.string().trim().min(1, "Title is required").max(200).optional(),
  slug: z.string().trim().min(1).optional(),
  summary: z.string().trim().min(1, "Summary is required").max(400).optional(),
  content: z.string().trim().min(1, "Content is required").optional(),
  featuredImage: z.string().trim().min(1, "Featured image is required").optional(),
  category: z.enum(NEWS_CATEGORIES).optional(),
  country: z.string().trim().optional(),
  tags: z.array(z.string().trim()).optional(),
  sourceName: z.string().trim().optional(),
  sourceUrl: z.string().trim().url().optional().or(z.literal("")),
  publishedAt: z.string().trim().optional(),
  author: z.string().trim().optional(),
  status: z.enum(["draft", "published"]).optional(),
  featured: z.boolean().optional(),
  seoTitle: z.string().trim().max(70).optional(),
  seoDescription: z.string().trim().max(170).optional(),
  keywords: z.array(z.string().trim()).optional(),
  relatedDestinations: z.array(z.string()).optional(),
  relatedPackages: z.array(z.string()).optional(),
  relatedBlogs: z.array(z.string()).optional(),
});

const createNewsSchema = z.object({
  body: baseNewsBody.refine((value) => value.title && value.summary && value.content && value.featuredImage, {
    message: "Title, summary, content, and featured image are required",
    path: ["body"],
  }),
  params: z.object({}).strict(),
  query: z.object({}).strict(),
});

const updateNewsSchema = z.object({
  body: baseNewsBody.partial(),
  params: z.object({ id: z.string().min(1) }).strict(),
  query: z.object({}).strict(),
});

const idParamSchema = z.object({
  body: z.object({}).strict(),
  params: z.object({ id: z.string().min(1) }).strict(),
  query: z.object({}).strict(),
});

const parseNumber = z.preprocess((value) => {
  if (typeof value === 'string' && value.trim() !== '') return Number(value)
  if (typeof value === 'number') return value
  return undefined
}, z.number().int().positive().optional())

const parseBooleanString = z.preprocess((value) => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value === 'true'
  return undefined
}, z.boolean().optional())

const listQuerySchema = z.object({
  body: z.object({}).strict(),
  params: z.object({}).strict(),
  query: z.object({
    page: parseNumber,
    limit: parseNumber,
    search: z.string().optional(),
    category: z.enum(NEWS_CATEGORIES).optional(),
    status: z.enum(["draft", "published"]).optional(),
    country: z.string().optional(),
    featured: parseBooleanString,
    sortBy: z.string().optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }).strict(),
});

module.exports = {
  createNewsRules: createNewsSchema,
  updateNewsRules: updateNewsSchema,
  idParamRule: idParamSchema,
  listQueryRules: listQuerySchema,
};
