// Each team in a tournament gets a colour by its place in the pick order, so teams can be told apart at a glance:
// its crest, its panel and its name on the Draft page and in the fixtures. Green (you) and red (on the clock, live)
// come last, as they already mean something; past six they come round again.
const TONES = ["blue", "amber", "violet", "teal", "green", "red"] as const;

/** The CSS colour for the team at this index in the tournament's teams. */
export const teamTone = (index: number) =>
  `var(--tone-${TONES[((index % TONES.length) + TONES.length) % TONES.length]})`;

/** A team's own page (TournamentTeam): wherever a team is shown, it links here. */
export const teamHref = (slug: string, teamId: number) => `/tournaments/${slug}/teams/${teamId}`;
