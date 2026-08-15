"use client";

import Link from "next/link";
import { FaUserFriends, FaUserGraduate, FaSchool } from "react-icons/fa";

/**
 * "Who is signing in?" — the first thing anyone sees at /login.
 *
 * Before this, a parent arriving at the login page was shown an email and
 * password form that would never work for them: guardians sign in with a Parent
 * ID and a PIN, on a completely different route. They had no way to discover
 * that, and no reason to guess it.
 *
 * Three large tiles rather than a dropdown or a tab strip. The audience
 * includes guardians with low digital confidence, so the choice has to be
 * obvious at a glance, thumb-sized, and labelled in plain words — never
 * "authentication method".
 */

const ROLES = [
  {
    href: "/parent/login",
    icon: FaUserFriends,
    emoji: "👨‍👩‍👧",
    title: "Parent",
    titleNe: "अभिभावक",
    description: "See your child's school life",
    hint: "Use your Parent Card, or your Parent ID and PIN",
    tone: "border-purple-300 bg-purple-50 hover:border-purple-500",
  },
  {
    href: "/student/login",
    icon: FaUserGraduate,
    emoji: "🎓",
    title: "Student",
    titleNe: "विद्यार्थी",
    description: "Your writing, events and journey",
    hint: "Use the username your school gave you",
    tone: "border-sky-300 bg-sky-50 hover:border-sky-500",
  },
  {
    href: "/login?as=school",
    icon: FaSchool,
    emoji: "🏫",
    title: "School",
    titleNe: "विद्यालय",
    description: "Teachers and administrators",
    hint: "Use your email address and password",
    tone: "border-slate-300 bg-white hover:border-slate-500",
  },
];

export default function RoleChooser() {
  return (
    <div className="space-y-3">
      <p className="text-center text-sm font-semibold text-[var(--brand-muted)]">
        Who is signing in? / कस्ले साइन इन गर्दै हुनुहुन्छ?
      </p>

      {ROLES.map((role) => {
        const Icon = role.icon;
        return (
          <Link
            key={role.href}
            href={role.href}
            className={`flex min-h-[88px] items-center gap-4 rounded-2xl border-2 px-4 py-3 transition-colors ${role.tone}`}
          >
            <span aria-hidden="true" className="text-3xl">
              {role.emoji}
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-[var(--brand-ink)]">
                  {role.title}
                </span>
                <span className="text-sm text-[var(--brand-muted)]">
                  {role.titleNe}
                </span>
              </span>
              <span className="block text-sm text-[var(--brand-ink)]">
                {role.description}
              </span>
              {/* Says what they will actually be asked for, so nobody arrives
                  at a form expecting different credentials. */}
              <span className="mt-0.5 block text-xs text-[var(--brand-muted)]">
                {role.hint}
              </span>
            </span>

            <Icon
              aria-hidden="true"
              className="h-5 w-5 shrink-0 text-[var(--brand-muted)]"
            />
          </Link>
        );
      })}
    </div>
  );
}
