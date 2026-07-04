const { z } = require('zod')

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user id')

const name = z.string().trim().min(2, 'Name must be at least 2 characters').max(80, 'Name cannot exceed 80 characters')
const email = z.string().trim().toLowerCase().email('Please provide a valid email')
const password = z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password cannot exceed 128 characters')

const loginSchema = z.object({
  body: z.object({
    email,
    password: z.string().min(1, 'Password is required'),
  }),
})

const createAdminUserSchema = z.object({
  body: z.object({
    name,
    email,
    password,
  }),
})

const updateAdminUserSchema = z.object({
  params: z.object({
    id: objectId,
  }),
  body: z
    .object({
      name: name.optional(),
      email: email.optional(),
      password: password.optional(),
    })
    .refine((data) => Object.keys(data).length > 0, 'At least one field is required'),
})

const updateAdminUserStatusSchema = z.object({
  params: z.object({
    id: objectId,
  }),
  body: z.object({
    isActive: z.boolean(),
  }),
})

module.exports = {
  loginSchema,
  createAdminUserSchema,
  updateAdminUserSchema,
  updateAdminUserStatusSchema,
}
