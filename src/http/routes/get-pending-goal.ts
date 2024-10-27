import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { getWeekPedingGoals } from '../../functions/get-week-peding-goals'

export const getPendingGoalRoute: FastifyPluginAsyncZod = async app => {
  app.get('/pending-goals', async () => {
    const { pendingGoals } = await getWeekPedingGoals()
    return { pendingGoals }
  })
}
