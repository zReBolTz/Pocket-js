import z from 'zod'

const env$chema = z.object({
  DATABASE_URL: z.string().url(),
})

export const env = env$chema.parse(process.env)
