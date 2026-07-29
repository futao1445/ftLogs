/**
 * SvgIcons.tsx
 *
 * All SVG icons used across the futao-logs-client application.
 * Style: 2px stroke, round cap/join, currentColor.
 *
 * Sections:
 *  1. Mood Icons     – calm (leaf), happy, sad, fire, idea (lightbulb), sparkle
 *  2. Nav Icons      – diary (notepad), calendar, search, user
 *  3. Action Icons   – edit (pencil), trash, more (dots), close (x),
 *                      plus, chevron-left, chevron-right, upload
 *  4. Empty State    – decorative leaf illustration
 *  5. Mood Mapper    – MoodIcon helper component
 */

// ------------------------------------------------------------------ //
//  Shared props                                                       //
// ------------------------------------------------------------------ //

interface IconProps {
  className?: string;
}

// ------------------------------------------------------------------ //
//  1. MOOD ICONS                                                      //
// ------------------------------------------------------------------ //

export function LeafIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 20A7 7 0 0 1 9.8 6.4C15.5 4.3 19.5 4 20 4c.5 0 .7 4.5-.4 9.6A7 7 0 0 1 11 20Z" />
    </svg>
  );
}

export function HappyIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M8 14Q12 17 16 14" />
      <circle cx="9" cy="10" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SadIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M8 14Q12 10 16 14" />
      <circle cx="9" cy="10" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FireIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2C8 7 5 10 5 14c0 3.9 3.1 7 7 7s7-3.1 7-7c0-4-3-7-7-12z" />
    </svg>
  );
}

export function IdeaIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 12V8c0-2 2-4 4-4s4 2 4 4v4c0 1-.5 2-1 3H10c-.5-1-1-2-1-3z" />
      <line x1="10" y1="15" x2="14" y2="15" />
      <line x1="11" y1="18" x2="13" y2="18" />
    </svg>
  );
}

export function SparkleIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2l1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5z" />
    </svg>
  );
}

// ------------------------------------------------------------------ //
//  2. NAV ICONS                                                       //
// ------------------------------------------------------------------ //

export function DiaryIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 2h10l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
      <path d="M14 2v4h4" />
      <path d="M8 8h8" />
      <path d="M8 12h6" />
      <path d="M8 16h4" />
    </svg>
  );
}

export function CalendarIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

export function SearchIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export function UserIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-8 8-8s8 4 8 8" />
    </svg>
  );
}

// ------------------------------------------------------------------ //
//  3. ACTION ICONS                                                    //
// ------------------------------------------------------------------ //

export function EditIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 3a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      <path d="M15 5l4 4" />
    </svg>
  );
}

export function TrashIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M19 6l-1.14 14.28A2 2 0 0 1 15.86 22H8.14a2 2 0 0 1-2-1.72L5 6" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

export function MoreIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="5" cy="12" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function CloseIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function PlusIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function ChevronLeftIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export function ChevronRightIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export function UploadIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M12 3v12" />
      <path d="M8 7l4-4 4 4" />
    </svg>
  );
}

// ------------------------------------------------------------------ //
//  4. EMPTY STATE ILLUSTRATION                                        //
// ------------------------------------------------------------------ //

/**
 * Decorative leaf illustration for empty diary states.
 * Default size is larger than standard icons to fill the empty view.
 */
export function EmptyStateIllustration({ className = 'w-24 h-24' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Leaf outline */}
      <path d="M24 6C17 13 7 18 7 26c0 6 4 10 8 11 3 1 5-2 9-4 4 2 6 5 9 4 4-1 8-5 8-11 0-8-10-13-17-20z" />
      {/* Stem */}
      <path d="M24 6v28" />
      {/* Side veins */}
      <path d="M24 14l-7 4" />
      <path d="M24 22l-5 3" />
      <path d="M24 30l-3 2" />
      <path d="M24 14l7 4" />
      <path d="M24 22l5 3" />
      {/* Small decorative dots */}
      <circle cx="14" cy="26" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="34" cy="26" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

// ------------------------------------------------------------------ //
//  5. MOOD ICON MAPPER                                                //
// ------------------------------------------------------------------ //

const moodIconMap: Record<string, React.ComponentType<IconProps>> = {
  calm: LeafIcon,
  happy: HappyIcon,
  sad: SadIcon,
  fire: FireIcon,
  idea: IdeaIcon,
  sparkle: SparkleIcon,
};

export { moodIconMap };

/**
 * Returns the matching React component for a mood key.
 * Returns null if the mood is unknown.
 */
export function getMoodIcon(
  mood: string
): React.ComponentType<IconProps> | null {
  return moodIconMap[mood] || null;
}

/**
 * Dynamic mood icon renderer.
 * Usage: <MoodIcon mood="calm" className="w-6 h-6" />
 */
export function MoodIcon({
  mood,
  className,
}: IconProps & { mood: string }) {
  const Icon = moodIconMap[mood];
  if (!Icon) return null;
  return <Icon className={className} />;
}
