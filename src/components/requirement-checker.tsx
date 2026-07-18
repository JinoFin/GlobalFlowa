"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { getServiceBySlug } from "@/lib/catalog";
import {
  checkerQuestions,
  getRecommendations,
  type CheckerAnswerValue,
  type CheckerAnswers,
} from "@/lib/recommendations";

const storageKey = "globalflowa.requirementChecker";
const selectedServicesKey = "globalflowa.selectedServices";

export function RequirementChecker() {
  const initialState = useMemo(() => loadSavedCheckerState(), []);
  const [step, setStep] = useState(initialState.step);
  const [answers, setAnswers] = useState<CheckerAnswers>(initialState.answers);

  const isComplete = step >= checkerQuestions.length;
  const activeQuestion = checkerQuestions[step];
  const recommendations = useMemo(() => getRecommendations(answers), [answers]);
  const progress = Math.min(100, Math.round((step / checkerQuestions.length) * 100));

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify({ step, answers }));
  }, [answers, step]);

  function updateAnswer(key: string, value: CheckerAnswerValue) {
    setAnswers((current) => ({ ...current, [key]: value }));
  }

  function addToRequest(serviceSlug: string) {
    const existing = window.localStorage.getItem(selectedServicesKey);
    const selected = existing ? (JSON.parse(existing) as string[]) : [];
    const next = Array.from(new Set([...selected, serviceSlug]));
    window.localStorage.setItem(selectedServicesKey, JSON.stringify(next));
  }

  function reset() {
    setAnswers({});
    setStep(0);
    window.localStorage.removeItem(storageKey);
  }

  return (
    <div className="rounded-md border border-navy-100 bg-white shadow-sm">
      <div className="border-b border-navy-100 p-5">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-navy-950">
            {isComplete ? "Recommendation result" : `Question ${step + 1} of ${checkerQuestions.length}`}
          </p>
          <button type="button" onClick={reset} className="text-sm font-semibold text-teal-700">
            Reset
          </button>
        </div>
        <div role="progressbar" aria-label="Requirement checker progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={isComplete ? 100 : progress} className="mt-4 h-2 rounded-full bg-navy-100">
          <div className="h-2 rounded-full bg-teal-500 transition-all" style={{ width: `${isComplete ? 100 : progress}%` }} />
        </div>
      </div>

      {!isComplete && activeQuestion ? (
        <div className="p-5 sm:p-8">
          <fieldset>
            <legend className="text-2xl font-semibold text-navy-950">
              {activeQuestion.label}
            </legend>
            <div className="mt-6">
              {activeQuestion.type === "yes_no" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { label: "Yes", value: true },
                    { label: "No", value: false },
                  ].map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      aria-pressed={answers[activeQuestion.key] === option.value}
                      onClick={() => updateAnswer(activeQuestion.key, option.value)}
                      className={`rounded-md border px-5 py-4 text-left font-semibold outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 ${
                        answers[activeQuestion.key] === option.value
                          ? "border-teal-500 bg-teal-50 text-teal-800"
                          : "border-navy-100 bg-white text-navy-950"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : activeQuestion.type === "multiselect" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {activeQuestion.options?.map((option) => {
                    const selected = Array.isArray(answers[activeQuestion.key])
                      ? (answers[activeQuestion.key] as string[])
                      : [];
                    const isSelected = selected.includes(option);
                    return (
                      <label key={option} className={`flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 ${
                        isSelected ? "border-teal-500 bg-teal-50" : "border-navy-100 bg-white"
                      }`}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            updateAnswer(
                              activeQuestion.key,
                              isSelected
                                ? selected.filter((item) => item !== option)
                                : [...selected, option],
                            );
                          }}
                        />
                        <span className="font-medium text-navy-950">{option}</span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <input
                  type="text"
                  aria-label={activeQuestion.label}
                  value={(answers[activeQuestion.key] as string) ?? ""}
                  onChange={(event) => updateAnswer(activeQuestion.key, event.target.value)}
                  className="w-full rounded-md border border-navy-200 px-4 py-3 text-navy-950 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  placeholder="Enter details"
                />
              )}
            </div>
          </fieldset>
          <div className="mt-8 flex justify-between gap-3">
            <button
              type="button"
              disabled={step === 0}
              onClick={() => setStep((current) => Math.max(0, current - 1))}
              className="rounded-md border border-navy-200 px-5 py-2.5 text-sm font-semibold text-navy-950 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep((current) => current + 1)}
              className="rounded-md bg-navy-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-900"
            >
              {step === checkerQuestions.length - 1 ? "Show recommendations" : "Continue"}
            </button>
          </div>
        </div>
      ) : (
        <div className="p-5 sm:p-8">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-semibold text-navy-950">
              You may need these services
            </h2>
            <p className="mt-3 text-navy-650">
              These recommendations are a practical starting point. Globalflowa
              will review your submitted details before confirming the final
              path.
            </p>
            <p className="mt-3 text-sm leading-6 text-navy-650">The checker provides general operational guidance, not legal or tax advice. Product, business-model and sales-route facts can change the result.</p>
          </div>
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {recommendations.map((recommendation) => {
              const service = getServiceBySlug(recommendation.serviceSlug);
              if (!service) return null;

              return (
                <article key={recommendation.serviceSlug} className="rounded-md border border-navy-100 bg-navy-50 p-5">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-teal-700" />
                    <div>
                      <h3 className="text-lg font-semibold text-navy-950">{service.name}</h3>
                      <p className="mt-2 text-sm leading-6 text-navy-650">{recommendation.reason}</p>
                    </div>
                  </div>
                  <p className="mt-5 text-sm font-semibold text-navy-950">Documents commonly requested</p>
                  <ul className="mt-2 space-y-2 text-sm text-navy-650">
                    {recommendation.requiredDocuments.slice(0, 5).map((document) => (
                      <li key={document}>- {document}</li>
                    ))}
                  </ul>
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => addToRequest(service.slug)}
                      className="rounded-md bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white"
                    >
                      Add to request
                    </button>
                    <Link href={`/request?service=${service.slug}`} className="inline-flex items-center gap-2 px-1 py-2.5 text-sm font-semibold text-teal-700">
                      Request now <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
          <div className="mt-8">
            <Link href="/request" className="inline-flex items-center justify-center rounded-md bg-teal-500 px-5 py-3 text-sm font-semibold text-navy-950 hover:bg-teal-300">
              Continue to service request
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function loadSavedCheckerState() {
  if (typeof window === "undefined") {
    return { step: 0, answers: {} as CheckerAnswers };
  }

  const saved = window.localStorage.getItem(storageKey);
  if (!saved) {
    return { step: 0, answers: {} as CheckerAnswers };
  }

  try {
    const parsed = JSON.parse(saved) as { step?: number; answers?: CheckerAnswers };
    return { step: parsed.step ?? 0, answers: parsed.answers ?? {} };
  } catch {
    return { step: 0, answers: {} as CheckerAnswers };
  }
}
