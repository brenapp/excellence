import "./App.css";
import { useMemo, useState, useEffect } from "react";
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/solid";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import {
  useEvent,
  useEventExcellenceAwards,
  useEventRankings,
  useEventSkills,
  useEventRegisteredTeams,
  useEventTeamsByDivision,
  useEventsToday,
  useEventPresentTeams,
} from "./util/eventHooks";
import AwardEvaluation from "./components/AwardEvaluation";

function App() {
  // Initialize SKU from URL query params
  const [sku, setSku] = useState(() => {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get("sku") ?? "";
  });

  // Update URL when SKU changes
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (sku) {
      searchParams.set("sku", sku);
    } else {
      searchParams.delete("sku");
    }
    const newUrl = searchParams.toString() 
      ? `${window.location.pathname}?${searchParams}` 
      : window.location.pathname;
    window.history.replaceState({}, "", newUrl);
  }, [sku]);

  const {
    data: event,
    isLoading: isLoadingEvent,
    isFetched: isFetchedEvent,
  } = useEvent(sku);

  const {
    data: divisionTeams,
    isLoading: isLoadingTeams,
    isFetched: isFetchedTeams,
  } = useEventTeamsByDivision(event);

  const {
    data: eventRegisteredTeams,
    isLoading: isLoadingEventRegisteredTeams,
    isFetched: isFetchedEventRegisteredTeams,
  } = useEventRegisteredTeams(event);

  const {
    data: eventPresentTeams,
    isLoading: isLoadingEventPresentTeams,
    isFetched: isFetchedEventPresentTeams,
  } = useEventPresentTeams(event);

  const {
    data: awards,
    isLoading: isLoadingAwards,
    isFetched: isFetchedAwards,
  } = useEventExcellenceAwards(event);

  const {
    data: rankings,
    isLoading: isLoadingRankings,
    isFetched: isFetchedRankings,
  } = useEventRankings(event);

  const {
    data: skills,
    isLoading: isLoadingSkills,
    isFetched: isFetchedSkills,
  } = useEventSkills(event);

  const { data: eventsToday, isLoading: isLoadingEventsToday } =
    useEventsToday();

  const eventsByStartDate = useMemo(() => {
    if (!eventsToday) return {};
    return Object.groupBy(eventsToday, (event) => {
      const date = Date.parse(event.start ?? "");
      return new Date(date).toISOString();
    });
  }, [eventsToday]);

  const multipleDivisions = (event?.divisions?.length ?? 0) > 1;

  const isLoading =
    isLoadingEvent ||
    isLoadingAwards ||
    isLoadingTeams ||
    isLoadingEventRegisteredTeams ||
    isLoadingEventPresentTeams ||
    isLoadingRankings ||
    isLoadingSkills;

  const isFetched =
    isFetchedEvent &&
    isFetchedAwards &&
    isFetchedTeams &&
    isFetchedEventRegisteredTeams &&
    isFetchedEventPresentTeams &&
    isFetchedRankings &&
    isFetchedSkills &&
    sku.length > 0;

  const hasExcellence = awards && awards.length > 0;

  const displayEvaluation = isFetched && hasExcellence;

  return (
    <>
      <header>
        <h1 className="text-3xl mb-4 text-center">Excellence Eligibility</h1>
        <section className="mt-8">
          <p>
            The{" "}
            <a
              href="https://kb.roboticseducation.org/hc/en-us/articles/15336117158679-Judging-Resource-Excellence-Award-Criteria-Checklist"
              target="_blank"
              rel="noopener noreferrer"
            >
              Event Award Criteria Checklist
            </a>{" "}
            in the Guide to Judging for the 2025-2026 season states that the
            following conditions must be met for a team to be eligible for the
            Excellence Award:
          </p>
          <ol className="list-decimal m-4">
            <li>Team is in the top 40% of overall Skills Rankings*</li>
            <li>
              Team is the top 40% of Autonomous Coding Skills Rankings* with a
              score above zero
            </li>
            <li>Team is in the top 40% of Qualification Rankings*</li>
            <li>Team has exhibited a high-quality Team Interview</li>
            <li>
              Team has submitted a notebook that is ranked at or near the top of
              Engineering Notebook rankings and is a strong candidate for the
              Design Award
            </li>
            <li>
              Both the Team Interview and Engineering Notebook demonstrate
              independent inquiry from the beginning stages of their design
              process through execution
            </li>
            <li>
              Team has been nominated or ranked for multiple other Judged Awards
              at the event
            </li>
            <li>
              Team exhibits positive and student-centered team conduct, good
              sportsmanship, and professionalism
            </li>
          </ol>
          <details className="bg-zinc-100 dark:bg-zinc-900 rounded-md mb-2 p-2">
            <summary className="m-2">
              <span className="ml-2">Blended Events</span>
            </summary>
            <p>
              For events with a single Excellence Award, percentages are based
              on the number of teams at the event. For blended grade level
              events with two grade specific Excellence Awards, percentages
              should be based on the teams in each grade level for each award.
            </p>
          </details>
          <p>
            The purpose of this utility is to help Judges quickly determine
            which teams are currently eligible for the Excellence Award at their
            event.
          </p>
          <p className="mt-4">
            Disclaimer: This utility is designed to assist Judges at an event.
            Competitors, please remember that judges consider many other factors
            when making decisions besides what can be automatically checked.{" "}
            <em>
              As always, be mindful of &lt;G1&gt; and the REC Foundation Code of
              Conduct.
            </em>
          </p>
          <p className="mt-4">
            To begin, enter your Event Code below (looks like RE-VRC-XX-XXXX).
          </p>
        </section>
        <section className="grid lg:grid-cols-8 gap-4 mt-4">
          <select
            className="px-4 py-4 rounded-md bg-zinc-100 dark:bg-zinc-900 col-span-6"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            disabled={isLoadingEventsToday}
          >
            <option value="">Select An Event</option>
            {Object.entries(eventsByStartDate)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, events]) => (
                <optgroup key={date} label={date.split("T")[0]}>
                  {events?.map((event) => (
                    <option key={event.sku} value={event.sku}>
                      {event.name}
                    </option>
                  ))}
                </optgroup>
              ))}
          </select>
          <input
            type="text"
            pattern="RE-(VRC|V5RC|VURC|VIQRC|VEXU|VIQC)-[0-9]{2}-[0-9]{4}"
            placeholder="SKU"
            className="font-mono px-4 py-4 rounded-md invalid:bg-red-500 bg-zinc-100 dark:bg-zinc-900 lg:col-span-2"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            title="The RobotEvents Event Code"
          />
        </section>
        {event && (
          <>
            <p className="font-bold pt-4">
              <CheckCircleIcon
                height={18}
                className="text-green-400 inline mr-2"
              />
              {event?.name}{" "}
              <span className="italic font-normal mr-2">
                [
                <a href={event.getURL()} target="_blank">
                  {event.sku}
                </a>
                ]
              </span>
            </p>
            <section className="mt-2">
              <p>{event.location.venue}</p>
              <p>{event.location.address_1}</p>
              <p>{event.location.address_2}</p>
              <p>
                {event.location.city}, {event.location.region},{" "}
                {event.location.country}
              </p>
            </section>
          </>
        )}
        {multipleDivisions && (
          <p className="pt-4">
            <ExclamationCircleIcon
              height={18}
              className="inline mr-2 text-yellow-400"
            />
            <span className="text-yellow-400">
              This event has multiple divisions.{" "}
            </span>
            <span>
              This utility evaluates qualification rankings individually for
              each combination of division and grade level. Some events with
              multiple divisions may have different rules for Excellence Award
              eligibility.
            </span>
          </p>
        )}
        {awards && !hasExcellence && (
          <p className="pt-4">
            <ExclamationCircleIcon
              height={18}
              className="inline mr-2 text-red-400"
            />
            <span className="text-red-400">No Excellence Award. </span>
            <span>This event does not have an Excellence Award</span>
          </p>
        )}
        {isFetched && <hr className="mt-4" />}
        {isLoading && (
          <div className="flex justify-center p-8">
            <ArrowPathIcon className="animate-spin" height={18} />
          </div>
        )}
      </header>
      <main className="mt-4">
        {displayEvaluation &&
          divisionTeams &&
          eventRegisteredTeams &&
          eventPresentTeams &&
          rankings &&
          skills &&
          awards?.map((excellence) => (
            <>
              {event?.divisions?.map((division) => (
                <AwardEvaluation
                  key={(excellence.award.id ?? 0) + (division.id ?? 0)}
                  event={event}
                  divisionTeams={divisionTeams}
                  eventTeams={eventPresentTeams}
                  rankings={rankings}
                  division={division.id ?? 0}
                  skills={skills}
                  excellence={excellence}
                />
              ))}
              <hr className="mt-4" />
            </>
          ))}
      </main>
    </>
  );
}

export default App;
