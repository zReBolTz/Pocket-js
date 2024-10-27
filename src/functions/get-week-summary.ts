import dayjs from 'dayjs'
import { db } from '../db'
import { goalCompletions, goals } from '../db/schema'
import { and, eq, gte, lte, sql } from 'drizzle-orm'

export async function getWeekSummary() {
  const firstDayOfWeek = dayjs().startOf('week').toDate()
  const lastDayOfWeek = dayjs().endOf('week').toDate()

  const goalsCreatedUpToWeek = db.$with('goals_created_up_to_week').as(
    db
      .select({
        id: goals.id,
        title: goals.title,
        desiredWeeklyFrequency: goals.desiredWeeklyFrequency,
        createAt: goals.createdAt,
      })
      .from(goals)
      .where(lte(goals.createdAt, lastDayOfWeek))
  )

  const goalCompletedInweek = db.$with('goal_completed_in_week').as(
    db
      .select({
        id: goalCompletions.id,
        title: goals.title,
        completedAt: goalCompletions.createdAt,
        completedAtDate: sql`DATE(${goalCompletions.createdAt})`.as(
          'completedAtDate'
        ),
      })
      .from(goalCompletions)
      .innerJoin(goals, eq(goals.id, goalCompletions.goalId))
      .where(
        and(
          gte(goalCompletions.createdAt, firstDayOfWeek),
          lte(goalCompletions.createdAt, lastDayOfWeek)
        )
      )
  )

  const goalCompletedByWeekDay = db.$with('goal_completed_by_week_day').as(
    db
      .select({
        completedAtDate: goalCompletedInweek.completedAtDate,
        completions: sql`JSON_AGG(
                            JSON_BUILD_OBJECT(
                              'id',${goalCompletedInweek.id},
                              'title',${goalCompletedInweek.title},
                              'completedAt',${goalCompletedInweek.completedAt}
                            ))`.as('completions'),
      })
      .from(goalCompletedInweek)
      .groupBy(goalCompletedInweek.completedAtDate)
  )

  const result = await db
    .with(goalsCreatedUpToWeek, goalCompletedInweek, goalCompletedByWeekDay)
    .select({
      completed: sql`(SELECT COUNT(*) FROM ${goalCompletedInweek})`.mapWith(
        Number
      ),
      total:
        sql`(SELECT SUM(${goalsCreatedUpToWeek.desiredWeeklyFrequency}) FROM ${goalsCreatedUpToWeek})`.mapWith(
          Number
        ),
      goalPerDay: sql`JSON_OBJECT_AGG(${goalCompletedByWeekDay.completedAtDate}, ${goalCompletedByWeekDay.completions})`,
    })

    .from(goalCompletedByWeekDay)

  return {
    summary: result,
  }
}
