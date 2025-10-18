import * as robotevents from "robotevents";
import { UseQueryResult, useQuery } from "react-query";
import { useMemo } from "react";
import { Grade, Team, Award, Ranking, Skill, Event } from "robotevents";

const ROBOTEVENTS_TOKEN =
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIzIiwianRpIjoiYjM5Y2I1NGNhMTk0OTM0ODNmNTc0MDQ2MTRhZDY0MDZjYTY1ZmQzMjAzNDlhMmM5YmUwOThlNmJjNzhhZWJmZmZjYzU0ZWY2MTQ2ZmQyYjEiLCJpYXQiOjE2ODc2NDIzODcuNTUwMjg4LCJuYmYiOjE2ODc2NDIzODcuNTUwMjkxMSwiZXhwIjoyNjM0NDE3MTg3LjUzNzIzNjIsInN1YiI6Ijk3MDY5Iiwic2NvcGVzIjpbXX0.k0DEt3QRKkgZnyV8X9mDf6VYyc8aOsIEfQbVN4Gi6Csr7O5ILLGFENXZouvplqbcMDdQ8gBMMLg5hIR38RmrTsKcWHMndq1T8wYkGZQfRhc_uZYLQhGQCaanf_F_-gnKocFwT1AKQJmAPkAbV-Itb2UzHeGpNuW8vV_TaNL3coaYvmM6rubwBuNYgyZhTHW_Mgvzh5-XBqqGpmQLm9TGl4gkeqnS-6a5PfoqRTc8v3CQWSCURFry5BA2oXz0lcWmq92FY5crr2KKv1O3chPr--oMba97elY0y9Dw0q2ipKcTm4pE7bbFP8t7-a_RKU4OyXuHRIQXjw3gEDCYXY5Hp22KMY0idnRIPhat6fybxcRfeyzUzdnubRBkDMNklwlgNCyeu2ROqEOYegtu5727Wwvy2I-xW-ZVoXg0rggVu7jVq6zmBqDFIcu50IS9R4P6a244pg2STlBaAGpzT2VfUqCBZrbtBOvdmdNzxSKIkl1AXeOIZOixo1186PX54p92ehXfCbcTgWrQSLuAAg_tBa6T7UFKFOGecVFo3v0vkmE__Q5-701f1qqcdDRNlOG-bzzFh9QLEdJWlpEajwYQ1ZjTAlbnBpKy3IrU0Aa-Jr0aqxtzgr5ZlghNtOcdYYRw5_BN0BOMmAnkvtm0_xzIJSsFbWJQJ8QpPk_n4zKZf-Y";

const CURRENT_SEASON = "2025-2026" as const satisfies robotevents.Year;

const client = robotevents.Client({
  authorization: { token: ROBOTEVENTS_TOKEN },
});

export function useEvent(sku: string) {
  return useQuery(["event", sku], async () => {
    if (!sku) {
      return null;
    }

    const event = await client.events.getBySKU(sku);
    return event.data;
  });
}

export type GradeSeperated<T> = {
  overall: T;
  grades: Partial<Record<Grade, T>>;
};

export function byGrade<T>(
  value: GradeSeperated<T>,
  grade: Grade | "Overall",
  def: T
): T {
  return grade === "Overall" ? value.overall : value.grades[grade] ?? def;
}

export function useByGrade<T>(
  value: GradeSeperated<T>,
  grade: Grade | "Overall",
  def: T
): T {
  return useMemo(() => byGrade(value, grade, def), [value, grade, def]);
}

export type EventExcellenceAwards = {
  grade: "Overall" | Grade;
  award: Award;
};

export function useEventExcellenceAwards(
  event: Event | null | undefined
): UseQueryResult<EventExcellenceAwards[] | null> {
  return useQuery(["excellence_awards", event?.sku], async () => {
    if (!event) {
      return null;
    }

    const awards = await event.awards();

    const excellenceAwards = (awards.data ?? []).filter((a) =>
      a.title?.includes("Excellence Award")
    );

    if (excellenceAwards.length === 0) {
      return [];
    }

    if (excellenceAwards.length < 2) {
      return [
        {
          grade: "Overall" as Grade | "Overall",
          award: excellenceAwards[0],
        },
      ];
    }

    const grades = [
      "College",
      "High School",
      "Middle School",
      "Elementary School",
    ] as Grade[];

    return excellenceAwards.map((award) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const grade = grades.find((g) => award.title?.includes(g))!;
      return { grade, award };
    });
  });
}

export type EventTeams = GradeSeperated<Team[]>;

export function useEventRegisteredTeams(
  event: Event | null | undefined
): UseQueryResult<EventTeams> {
  return useQuery(["teams", event?.sku], async () => {
    if (!event) {
      return { overall: [], grades: {} };
    }

    const teamsResponse = await event.teams({ registered: true });
    const teamsData = teamsResponse.data || [];
    const grades = Object.groupBy(
      teamsData,
      (t) => t.grade || "Unknown"
    ) as Partial<Record<Grade, Team[]>>;

    return { overall: teamsData, grades };
  });
}

export type EventDivisionRankings = GradeSeperated<Ranking[]>;
export type EventRankings = Record<number, EventDivisionRankings>;

export function useEventRankings(
  event: Event | null | undefined
): UseQueryResult<EventRankings> {
  const { data: teams } = useEventRegisteredTeams(event);

  return useQuery(["rankings", event?.sku, teams], async () => {
    if (!event || !teams || !event.divisions) {
      return {};
    }

    const rankingsByDivision = await Promise.all(
      event.divisions.map(async (division) => {
        if (!division.id) return null;

        const rankingsResponse = await event.rankings(division.id);
        const rankingsData = rankingsResponse.data || [];

        const grades = Object.groupBy(
          rankingsData,
          (r) =>
            teams.overall.find((t) => t.id === r.team?.id)?.grade || "Unknown"
        ) as Partial<Record<string, Ranking[]>>;

        const processedGrades = Object.fromEntries(
          Object.entries(grades).map(([grade, rankings]) => {
            return [
              grade,
              (rankings || []).sort((a, b) => (a.rank || 0) - (b.rank || 0)),
            ];
          })
        );

        return [
          division.id,
          {
            overall: rankingsData.sort((a, b) => (a.rank || 0) - (b.rank || 0)),
            grades: processedGrades,
          },
        ] as const;
      })
    );

    return Object.fromEntries(
      rankingsByDivision.filter(
        (item): item is [number, EventDivisionRankings] => item !== null
      )
    );
  });
}

export function useEventPresentTeams(
  event: Event | null | undefined
): UseQueryResult<GradeSeperated<Team[]>> {
  const { data: rankings } = useEventRankings(event);
  const { data: teams } = useEventRegisteredTeams(event);

  return useQuery(["present_teams", event?.sku, rankings], async () => {
    if (!event || !rankings || !event.divisions) {
      return { overall: [], grades: {} };
    }

    const presentTeams: Team[] = [];

    for (const division of event.divisions) {
      if (!division.id || !rankings[division.id]) continue;

      for (const ranking of rankings[division.id].overall) {
        const id = ranking.team?.id;
        if (!id) continue;

        const team = teams?.overall.find((t) => t.id === id);
        if (!team) {
          continue;
        }

        presentTeams.push(team);
      }
    }

    const grades = Object.groupBy(
      presentTeams,
      (t) => t.grade || "Unknown"
    ) as Partial<Record<Grade, Team[]>>;

    return {
      overall: presentTeams,
      grades,
    } satisfies GradeSeperated<Team[]>;
  });
}

export type EventTeamsByDivision = Record<number, EventTeams>;

export function useEventTeamsByDivision(
  event: Event | null | undefined
): UseQueryResult<EventTeamsByDivision> {
  const { data: rankings } = useEventRankings(event);
  const { data: teams } = useEventRegisteredTeams(event);

  const allTeams = teams?.overall ?? [];
  const allGrades = teams?.grades ?? {};

  return useQuery(
    ["teams_by_division", event?.sku, rankings, teams],
    async () => {
      if (!event || !rankings || !event.divisions) {
        return {};
      }

      const teamsByDivision = await Promise.all(
        event.divisions.map(async (division) => {
          if (!division.id || !rankings[division.id]) return null;

          const divisionTeams = {
            overall: new Set(
              rankings[division.id].overall
                .map((r) => r.team?.id)
                .filter(Boolean)
            ),
            grades: Object.fromEntries(
              Object.entries(rankings[division.id].grades).map(
                ([grade, divRankings]) => [
                  grade,
                  new Set(
                    (divRankings as Ranking[])
                      .map((r) => r.team?.id)
                      .filter(Boolean)
                  ),
                ]
              )
            ),
          };

          const overall = allTeams.filter((t) =>
            divisionTeams.overall.has(t.id)
          );

          const grades = Object.fromEntries(
            Object.entries(allGrades).map(([grade, gradeTeams]) => [
              grade,
              (gradeTeams || []).filter((t) =>
                divisionTeams.grades[grade]?.has(t.id)
              ),
            ])
          );

          return [division.id, { overall, grades }] as const;
        })
      );

      return Object.fromEntries(
        teamsByDivision.filter(
          (item): item is [number, EventTeams] => item !== null
        )
      );
    }
  );
}

export type TeamRecord = {
  driver: Skill | null;
  programming: Skill | null;
  overall: number;
};

export type EventSkills = GradeSeperated<TeamRecord[]> & {
  teamSkills: Record<string, TeamRecord>;
};

export function useEventSkills(
  event: Event | null | undefined
): UseQueryResult<EventSkills> {
  const { data: teams } = useEventRegisteredTeams(event);

  return useQuery(["skills", event?.sku, teams], async () => {
    if (!event || !teams) {
      return { overall: [] as TeamRecord[], grades: {}, teamSkills: {} };
    }

    const skillsResponse = await event.skills();
    const skillsData = skillsResponse.data || [];

    const teamSkills: Record<string, TeamRecord> = {};
    const skillsOverall: TeamRecord[] = [];
    const grades: Partial<Record<Grade, TeamRecord[]>> = {};

    for (const team of teams.overall) {
      const driver =
        skillsData.find((s) => s.team?.id === team.id && s.type === "driver") ??
        null;
      const programming =
        skillsData.find(
          (s) => s.team?.id === team.id && s.type === "programming"
        ) ?? null;
      const overall = (driver?.score ?? 0) + (programming?.score ?? 0);

      const record = {
        driver,
        programming,
        overall,
      };

      teamSkills[team.number] = record;
      skillsOverall.push(record);

      const teamGrade = team.grade;
      if (teamGrade) {
        if (!grades[teamGrade]) {
          grades[teamGrade] = [];
        }
        grades[teamGrade]?.push(record);
      }
    }

    return {
      teamSkills,
      overall: skillsOverall.sort((a, b) => b.overall - a.overall),
      grades: Object.fromEntries(
        Object.entries(grades).map(([grade, skills]) => [
          grade,
          skills?.sort((a, b) => b.overall - a.overall) ?? [],
        ])
      ),
    };
  });
}

export function useEventsToday(): UseQueryResult<Event[]> {
  const currentSeasons = (
    [
      robotevents.programs.V5RC,
      robotevents.programs.VURC,
      robotevents.programs.VIQRC,
    ] as const
  ).map((program) => robotevents.seasons[program][CURRENT_SEASON]) as number[];

  return useQuery("events_today", async () => {
    const today = new Date();

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 3);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 3);

    const eventsResponse = await client.events.search({
      start: yesterday.toISOString(),
      end: tomorrow.toISOString(),
      "season[]": currentSeasons,
    });

    const eventsData = eventsResponse.data || [];
    return eventsData.sort((a, b) => a.name.localeCompare(b.name));
  });
}
