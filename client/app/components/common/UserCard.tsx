import { format, parseISO } from "date-fns";
import { ExternalLink, MapPin, Briefcase } from "lucide-react";

import type { UserSummaryItem } from "~/lib/api";

const MAX_SKILL_CHIPS = 3;

function formatJobStartDate(date: string): string {
  try {
    return format(parseISO(date), "MMM d, yyyy");
  } catch {
    return date;
  }
}

/** Nullable field rendered as "—" when missing. */
function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm text-foreground" title={value ?? undefined}>
        {value ?? "—"}
      </dd>
    </div>
  );
}

interface UserCardProps {
  user: UserSummaryItem;
  className?: string;
}

export function UserCard({ user, className }: UserCardProps) {
  const skills = user.skills ?? [];
  const visibleSkills = skills.slice(0, MAX_SKILL_CHIPS);
  const extraSkills = skills.length - visibleSkills.length;

  return (
    <article
      className={
        className ??
        "flex flex-col gap-3 rounded-xl border border-border bg-card p-4 @container"
      }
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-foreground">
            {user.fullName}
          </h3>
          <p className="truncate text-sm text-muted-foreground">
            {user.jobTitle ?? "—"}
            {user.jobCompanyName ? ` · ${user.jobCompanyName}` : ""}
          </p>
        </div>
        {user.linkedinUrl && (
          <a
            href={`https://${user.linkedinUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary underline-offset-2 hover:underline"
          >
            LinkedIn
            <ExternalLink className="size-3" />
          </a>
        )}
      </header>

      <dl className="grid grid-cols-1 gap-2 @sm:grid-cols-3">
        <Field label="Gender" value={user.gender} />
        <div className="min-w-0">
          <dt className="flex items-center gap-1 text-xs text-muted-foreground">
            <Briefcase className="size-3" />
            Job start date
          </dt>
          <dd className="text-sm text-foreground">
            {user.jobStartDate ? formatJobStartDate(user.jobStartDate) : "—"}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3" />
            Location
          </dt>
          <dd
            className="truncate text-sm text-foreground"
            title={user.locationName ?? undefined}
          >
            {user.locationName ?? "—"}
          </dd>
        </div>
      </dl>

      {visibleSkills.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Skills">
          {visibleSkills.map((skill, i) => (
            <li
              key={`${i}-${skill}`}
              className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
            >
              {skill}
            </li>
          ))}
          {extraSkills > 0 && (
            <li className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
              +{extraSkills}
            </li>
          )}
        </ul>
      )}

      {user.summary && (
        <p className="line-clamp-3 text-sm text-muted-foreground">
          {user.summary}
        </p>
      )}
    </article>
  );
}
