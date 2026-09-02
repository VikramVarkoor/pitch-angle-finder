"use client";

import { useState } from "react";
import { fetchPitchAngles } from "@/lib/api";
import type { PitchAngle } from "@/lib/types";

const EXAMPLE_DESCRIPTION =
  "We make a browser extension that automatically finds and applies coupon codes at checkout, " +
  "and shares the savings 50/50 with the shopper instead of keeping affiliate commissions for itself.";

const HOOK_STYLES: Record<string, string> = {
  Timeliness: "bg-amber-100 text-amber-900 border-amber-300",
  "Human interest": "bg-rose-100 text-rose-900 border-rose-300",
  "Data & surprise factor": "bg-sky-100 text-sky-900 border-sky-300",
  "Industry relevance": "bg-emerald-100 text-emerald-900 border-emerald-300",
  "Conflict or tension": "bg-violet-100 text-violet-900 border-violet-300",
};

function hookStyle(hook: string): string {
  return HOOK_STYLES[hook] ?? "bg-neutral-100 text-neutral-900 border-neutral-300";
}

export default function Home() {
  const [description, setDescription] = useState("");
  const [angles, setAngles] = useState<PitchAngle[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (description.trim().length < 20) {
      setError("Give it a bit more detail (at least 20 characters) so the angles have something to work with.");
      return;
    }

    setLoading(true);
    setError(null);
    setAngles(null);

    try {
      const result = await fetchPitchAngles(description.trim());
      setAngles(result.angles);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong generating angles.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Pitch Angle Finder</h1>
        <p className="text-sm leading-relaxed text-neutral-600">
          Describe a company or product and get 2-3 realistic PR pitch angles a journalist might
          actually cover, each with the concrete reason it clears a real newsroom&apos;s bar.
        </p>
        <p className="text-xs text-neutral-400">
          Independent demo project exploring the PR / media-matching problem space. Not affiliated
          with or built for any specific PR agency or product.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label htmlFor="description" className="text-sm font-medium text-neutral-700">
          Company or product description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What does the company or product do? Who's it for? What's notable about it?"
          rows={5}
          className="w-full resize-none rounded-lg border border-neutral-300 p-3 text-sm outline-none focus:border-neutral-500"
        />
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setDescription(EXAMPLE_DESCRIPTION)}
            className="text-xs text-neutral-500 underline underline-offset-2 hover:text-neutral-800"
          >
            Fill with an example
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-neutral-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Finding angles..." : "Find pitch angles"}
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {angles && (
        <section className="flex flex-col gap-4">
          {angles.map((a, i) => (
            <article key={i} className="flex flex-col gap-2 rounded-xl border border-neutral-200 p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold">{a.headline}</h2>
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs font-medium ${hookStyle(a.newsworthy_hook)}`}
                >
                  {a.newsworthy_hook}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-neutral-800">{a.angle}</p>
              <p className="text-sm leading-relaxed text-neutral-600">
                <span className="font-medium text-neutral-700">Why it works: </span>
                {a.why_it_works}
              </p>
              <p className="text-xs text-neutral-500">
                <span className="font-medium">Pitch to: </span>
                {a.target_beat}
              </p>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
