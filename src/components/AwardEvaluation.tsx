import { useCallback, useMemo } from "react";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import {
  EventExcellenceAwards,
  EventRankings,
  EventSkills,
  EventTeams,
  EventTeamsByDivision,
} from "../util/eventHooks";
import { Event } from "robotevents/out/endpoints/events";
import { getTeamEligibility } from "../util/eligibility";
import * as csv from "csv-stringify/browser/esm/sync";

type AwardEvaluationProps = {
  event: Event | null | undefined;
  rankings: EventRankings;
  divisionTeams: EventTeamsByDivision;
  eventTeams: EventTeams;
  division: number;
  excellence: EventExcellenceAwards;
  skills: EventSkills;
};

export interface TeamEligibilityCriterion {
  eligible: boolean;
  reason: string;
  rank: number;
}

export interface TeamEligibility {
  eligible: boolean;
  ranking: TeamEligibilityCriterion;
  autoSkills: TeamEligibilityCriterion & { score: number };
  skills: TeamEligibilityCriterion & { score: number };
}

function toCSVString(teamEligibility: TeamEligibility[]) {
  return csv.stringify(teamEligibility, {
    header: true,
    columns: [
      { key: "team.number", header: "Team" },
      { key: "eligible", header: "Eligible" },
      { key: "ranking.eligible", header: "Ranking Eligible" },
      { key: "ranking.reason", header: "Ranking Reason" },
      { key: "ranking.rank", header: "Ranking Rank" },
      { key: "skills.eligible", header: "Overall Skills Eligible" },
      { key: "skills.reason", header: "Overall Skills Reason" },
      { key: "skills.rank", header: "Overall Skills Rank" },
      { key: "skills.score", header: "Overall Skills Score" },
      { key: "autoSkills.eligible", header: "Auto Skills Eligible" },
      { key: "autoSkills.reason", header: "Auto Skills Reason" },
      { key: "autoSkills.rank", header: "Auto Skills Rank" },
      { key: "autoSkills.score", header: "Auto Skills Score" },
    ],
    cast: {
      boolean: (value) => (value ? "TRUE" : "FALSE"),
    },
  });
}

const AwardEvaluation: React.FC<AwardEvaluationProps> = (props) => {
  const division = props.event?.divisions.find(
    (d) => d.id === props.division
  ) ?? { id: 1, name: "Competition", order: 1 };

  const teams = useMemo(
    () =>
      props.excellence.grade === "Overall"
        ? props.divisionTeams[division.id].overall
        : props.divisionTeams[division.id].grades[props.excellence.grade] ?? [],
    [division.id, props.divisionTeams, props.excellence.grade]
  );

  const eventTeams = useMemo(
    () =>
      props.excellence.grade === "Overall"
        ? props.eventTeams.overall
        : props.eventTeams.grades[props.excellence.grade] ?? [],
    [props.excellence.grade, props.eventTeams]
  );

  const award = props.excellence.award;

  const rankings = useMemo(
    () =>
      props.excellence.grade === "Overall"
        ? props.rankings[division.id].overall
        : props.rankings[division.id].grades[props.excellence.grade] ?? [],
    [division.id, props.excellence.grade, props.rankings]
  );

  const skills = useMemo(
    () =>
      props.excellence.grade === "Overall"
        ? props.skills.overall ?? []
        : props.skills.grades[props.excellence.grade] ?? [],
    [props.excellence.grade, props.skills.grades, props.skills.overall]
  );

  const teamsInGroup = teams.length ?? 0;
  const rankingThreshold = Math.round(teamsInGroup * 0.4);

  const teamsInAge = eventTeams.length ?? 0;
  const skillsThreshold = Math.round(teamsInAge * 0.4);

  const teamEligibility = useMemo(() => {
    if (!teams) return [];
    return getTeamEligibility({
      teams,
      rankings,
      skills,
      rankingThreshold,
      skillsThreshold,
    });
  }, [teams, rankings, skills, rankingThreshold, skillsThreshold]);

  const eligibleTeams = useMemo(() => {
    if (!teams) return [];
    return teams.filter((_, i) => teamEligibility[i].eligible);
  }, [teamEligibility, teams]);

  const onExportToCSV = useCallback(() => {
    const data = toCSVString(teamEligibility);
    const blob = new Blob([data], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const filename = [
      props.event?.sku,
      division.name.toLowerCase().replace(/ /g, "_"),
      props.excellence.grade.toLowerCase().replace(/ /g, "_"),
      "excellence.csv",
    ].join("_");

    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", filename);
    a.click();
  }, [
    division.name,
    props.event?.sku,
    props.excellence.grade,
    teamEligibility,
  ]);

  if ((props.event?.divisions.length ?? 1) > 1 && teams.length === 0) {
    return null;
  }

  return (
    <section className="mt-4">
      <h2 className="font-bold">
        {award.title}
        {(props.event?.divisions.length ?? 1) > 1
          ? ` — ${division.name}`
          : null}
      </h2>
      <p>Teams In Group: {teamsInGroup}</p>
      <p>
        Top 40% Threshold for Rankings: {(teamsInGroup * 0.4).toFixed(2)} ⟶{" "}
        {rankingThreshold}
      </p>
      <p>
        Top 40% Threshold for Skills: {(teamsInAge * 0.4).toFixed(2)} ⟶{" "}
        {skillsThreshold}
      </p>
      <p className="mt-4">
        Teams Eligible For Excellence:{" "}
        <span className="italic">
          {eligibleTeams.length === 0 ? "None" : null}
        </span>
      </p>
      <ul className="flex flex-wrap gap-2 mt-2">
        {eligibleTeams.map((team) => (
          <li className="bg-green-400 text-black px-2 font-mono rounded-md">
            {team.number}
          </li>
        ))}
      </ul>
      <nav className="flex items-center justify-end">
        <button
          className="font-mono flex gap-2 items-center bg-purple-600 px-2 py-1 rounded-md hover:bg-purple-400 active:bg-purple-400"
          title="Export as CSV"
          onClick={onExportToCSV}
        >
          <ArrowDownTrayIcon height={18} />
          csv
        </button>
      </nav>
      <table className="w-full mt-4">
        <thead className="text-left sr-only md:not-sr-only">
          <tr>
            <th>Team</th>
            <th>Qualification Rank</th>
            <th>Overall Skills Rank</th>
            <th>Autonomous Coding Skills</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team, i) => {
            const { eligible, ranking, autoSkills, skills } =
              teamEligibility[i];
            return (
              <tr key={team.id}>
                <td className="mt-4 md:mt-0 block md:table-cell">
                  {eligible ? (
                    <CheckCircleIcon
                      height={18}
                      className="inline text-green-400"
                    />
                  ) : (
                    <XCircleIcon height={18} className="inline text-red-400" />
                  )}
                  <span
                    className={`ml-2 font-mono px-2 rounded-md ${
                      eligible ? "bg-green-400 text-black" : "bg-transparent"
                    }`}
                  >
                    {team.number}
                  </span>
                </td>

                <td className="text-gray-400 block md:table-cell">
                  <span
                    className={`${
                      ranking.eligible ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {ranking.reason}
                  </span>
                </td>
                <td className="text-gray-400 block md:table-cell">
                  <span
                    className={`${
                      skills.eligible ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {skills.reason}
                  </span>
                </td>
                <td className="text-gray-400 block md:table-cell">
                  <span
                    className={`${
                      autoSkills.eligible ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {autoSkills.reason}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
};

export default AwardEvaluation;
