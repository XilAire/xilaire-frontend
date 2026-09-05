"use client";

import {
  useState,
  useTransition,
  type ReactNode,
} from "react";

import { saveLessonAssessmentAction } from "@/app/actions/university-assessments";
import type {
  AdminAssessmentQuestion,
  AdminLessonAssessmentDraft,
} from "@/lib/university/assessments";

export default function LessonAssessmentBuilder({
  courseId,
  moduleId,
  lessonId,
  initialAssessment,
}: {
  courseId: string;
  moduleId: string;
  lessonId: string;
  initialAssessment?: AdminLessonAssessmentDraft;
}) {
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [draft, setDraft] =
    useState<AdminLessonAssessmentDraft>(
      initialAssessment ?? {
        title: "Lesson Quiz",
        instructions: "",
        passingScore: 80,
        isRequired: true,
        status: "draft",
        questions: [],
      },
    );

  function updateQuestion(
    index: number,
    question: AdminAssessmentQuestion,
  ) {
    setDraft((current) => ({
      ...current,
      questions: current.questions.map(
        (item, questionIndex) =>
          questionIndex === index
            ? question
            : item,
      ),
    }));
  }

  function addQuestion(
    type:
      | "multiple_choice"
      | "true_false",
  ) {
    const question: AdminAssessmentQuestion =
      type === "true_false"
        ? {
            questionType: type,
            prompt: "",
            explanation: "",
            answers: [
              {
                answerText: "True",
                isCorrect: true,
              },
              {
                answerText: "False",
                isCorrect: false,
              },
            ],
          }
        : {
            questionType: type,
            prompt: "",
            explanation: "",
            answers: [
              {
                answerText: "",
                isCorrect: true,
              },
              {
                answerText: "",
                isCorrect: false,
              },
            ],
          };

    setDraft((current) => ({
      ...current,
      questions: [
        ...current.questions,
        question,
      ],
    }));
  }

  function moveQuestion(
    index: number,
    direction: "up" | "down",
  ) {
    const targetIndex =
      direction === "up"
        ? index - 1
        : index + 1;

    if (
      targetIndex < 0 ||
      targetIndex >= draft.questions.length
    ) {
      return;
    }

    const questions = [...draft.questions];

    [
      questions[index],
      questions[targetIndex],
    ] = [
      questions[targetIndex],
      questions[index],
    ];

    setDraft({
      ...draft,
      questions,
    });
  }

  function saveAssessment() {
    setNotice(null);

    startTransition(async () => {
      const result =
        await saveLessonAssessmentAction({
          courseId,
          moduleId,
          lessonId,
          assessment: draft,
        });

      setNotice({
        type: result.success
          ? "success"
          : "error",
        message: result.message,
      });
    });
  }

  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] shadow-[var(--shadow-sm)]">
      <header className="flex flex-col gap-4 border-b border-[var(--border-subtle)] px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--primary)]">
            Assessment
          </p>

          <h2 className="mt-2 text-xl font-bold text-[var(--text-primary)]">
            Lesson quiz
          </h2>

          <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">
            Create a scored lesson assessment. A published,
            required assessment must be passed before the
            learner can complete this lesson.
          </p>
        </div>

        <button
          type="button"
          onClick={saveAssessment}
          disabled={isPending}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-[var(--primary-foreground)] shadow-[var(--shadow-primary)] transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending
            ? "Saving..."
            : "Save assessment"}
        </button>
      </header>

      <div className="space-y-6 p-5 sm:p-6">
        {notice ? (
          <div
            role="status"
            className={[
              "rounded-xl border px-4 py-3 text-sm",
              notice.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
                : "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200",
            ].join(" ")}
          >
            {notice.message}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Assessment title">
            <input
              value={draft.title}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  title: event.target.value,
                })
              }
              className={inputClassName}
            />
          </Field>

          <Field
            label="Passing score"
            hint="Percentage required to pass."
          >
            <div className="relative">
              <input
                type="number"
                min={1}
                max={100}
                value={draft.passingScore}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    passingScore: Number(
                      event.target.value,
                    ),
                  })
                }
                className={`${inputClassName} pr-10`}
              />

              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-bold text-[var(--text-muted)]">
                %
              </span>
            </div>
          </Field>

          <Field label="Assessment status">
            <select
              value={draft.status}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  status:
                    event.target
                      .value as AdminLessonAssessmentDraft["status"],
                })
              }
              className={inputClassName}
            >
              <option value="draft">
                Draft
              </option>
              <option value="published">
                Published
              </option>
              <option value="archived">
                Archived
              </option>
            </select>
          </Field>

          <label className="flex min-h-11 items-center gap-3 self-end rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-4 text-sm font-semibold text-[var(--text-primary)]">
            <input
              type="checkbox"
              checked={draft.isRequired}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  isRequired:
                    event.target.checked,
                })
              }
              className="h-4 w-4 accent-[var(--primary)]"
            />

            Required to complete lesson
          </label>
        </div>

        <Field
          label="Instructions"
          hint="Optional directions shown before the learner begins."
        >
          <textarea
            rows={3}
            value={draft.instructions}
            onChange={(event) =>
              setDraft({
                ...draft,
                instructions:
                  event.target.value,
              })
            }
            className={textareaClassName}
          />
        </Field>

        <div className="border-t border-[var(--border-subtle)] pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Questions
              </h3>

              <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                {draft.questions.length}{" "}
                {draft.questions.length === 1
                  ? "question"
                  : "questions"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  addQuestion(
                    "multiple_choice",
                  )
                }
                className={secondaryButtonClassName}
              >
                Add multiple choice
              </button>

              <button
                type="button"
                onClick={() =>
                  addQuestion("true_false")
                }
                className={secondaryButtonClassName}
              >
                Add True / False
              </button>
            </div>
          </div>

          {draft.questions.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--surface-muted)] px-5 py-9 text-center">
              <p className="text-sm font-bold text-[var(--text-primary)]">
                No assessment questions yet
              </p>

              <p className="mx-auto mt-2 max-w-xl text-xs leading-5 text-[var(--text-muted)]">
                Add a multiple-choice or True / False
                question. Keep the assessment in Draft until
                it is ready for learners.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {draft.questions.map(
                (question, index) => (
                  <QuestionEditor
                    key={`${question.id ?? "new"}-${index}`}
                    number={index + 1}
                    question={question}
                    canMoveUp={index > 0}
                    canMoveDown={
                      index <
                      draft.questions.length - 1
                    }
                    onMoveUp={() =>
                      moveQuestion(index, "up")
                    }
                    onMoveDown={() =>
                      moveQuestion(
                        index,
                        "down",
                      )
                    }
                    onChange={(nextQuestion) =>
                      updateQuestion(
                        index,
                        nextQuestion,
                      )
                    }
                    onDelete={() =>
                      setDraft((current) => ({
                        ...current,
                        questions:
                          current.questions.filter(
                            (
                              _question,
                              questionIndex,
                            ) =>
                              questionIndex !==
                              index,
                          ),
                      }))
                    }
                  />
                ),
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function QuestionEditor({
  number,
  question,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onChange,
  onDelete,
}: {
  number: number;
  question: AdminAssessmentQuestion;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onChange: (
    question: AdminAssessmentQuestion,
  ) => void;
  onDelete: () => void;
}) {
  function setCorrectAnswer(
    answerIndex: number,
  ) {
    onChange({
      ...question,
      answers: question.answers.map(
        (answer, index) => ({
          ...answer,
          isCorrect:
            index === answerIndex,
        }),
      ),
    });
  }

  function updateAnswer(
    answerIndex: number,
    answerText: string,
  ) {
    onChange({
      ...question,
      answers: question.answers.map(
        (answer, index) =>
          index === answerIndex
            ? {
                ...answer,
                answerText,
              }
            : answer,
      ),
    });
  }

  function moveAnswer(
    answerIndex: number,
    direction: "up" | "down",
  ) {
    const targetIndex =
      direction === "up"
        ? answerIndex - 1
        : answerIndex + 1;

    if (
      targetIndex < 0 ||
      targetIndex >= question.answers.length
    ) {
      return;
    }

    const answers = [...question.answers];

    [
      answers[answerIndex],
      answers[targetIndex],
    ] = [
      answers[targetIndex],
      answers[answerIndex],
    ];

    onChange({
      ...question,
      answers,
    });
  }

  function removeAnswer(
    answerIndex: number,
  ) {
    if (
      question.questionType ===
        "true_false" ||
      question.answers.length <= 2
    ) {
      return;
    }

    const nextAnswers =
      question.answers.filter(
        (_answer, index) =>
          index !== answerIndex,
      );

    if (
      !nextAnswers.some(
        (answer) => answer.isCorrect,
      )
    ) {
      nextAnswers[0] = {
        ...nextAnswers[0],
        isCorrect: true,
      };
    }

    onChange({
      ...question,
      answers: nextAnswers,
    });
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)]">
      <header className="flex flex-col gap-3 border-b border-[var(--border-subtle)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-[var(--text-primary)]">
            Question {number}
          </p>

          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            {question.questionType ===
            "true_false"
              ? "True / False"
              : "Multiple choice"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <MiniButton
            label="Up"
            disabled={!canMoveUp}
            onClick={onMoveUp}
          />

          <MiniButton
            label="Down"
            disabled={!canMoveDown}
            onClick={onMoveDown}
          />

          <button
            type="button"
            onClick={onDelete}
            className="min-h-8 rounded-lg border border-red-200 bg-red-50 px-2.5 text-[11px] font-bold text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200"
          >
            Delete
          </button>
        </div>
      </header>

      <div className="space-y-4 p-4 sm:p-5">
        <Field label="Question prompt">
          <textarea
            rows={3}
            value={question.prompt}
            onChange={(event) =>
              onChange({
                ...question,
                prompt:
                  event.target.value,
              })
            }
            className={textareaClassName}
          />
        </Field>

        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Answer choices
          </p>

          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Select exactly one correct answer.
          </p>

          <div className="mt-3 space-y-2">
            {question.answers.map(
              (answer, answerIndex) => (
                <div
                  key={`${answer.id ?? "new-answer"}-${answerIndex}`}
                  className="flex flex-col gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-3 lg:flex-row lg:items-center"
                >
                  <label className="flex shrink-0 items-center gap-2 text-xs font-bold text-[var(--text-secondary)]">
                    <input
                      type="radio"
                      checked={
                        answer.isCorrect
                      }
                      onChange={() =>
                        setCorrectAnswer(
                          answerIndex,
                        )
                      }
                      className="h-4 w-4 accent-[var(--primary)]"
                    />

                    Correct
                  </label>

                  <input
                    value={answer.answerText}
                    disabled={
                      question.questionType ===
                      "true_false"
                    }
                    onChange={(event) =>
                      updateAnswer(
                        answerIndex,
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  />

                  <div className="flex shrink-0 gap-1.5">
                    <MiniButton
                      label="↑"
                      disabled={
                        answerIndex === 0
                      }
                      onClick={() =>
                        moveAnswer(
                          answerIndex,
                          "up",
                        )
                      }
                    />

                    <MiniButton
                      label="↓"
                      disabled={
                        answerIndex ===
                        question.answers.length -
                          1
                      }
                      onClick={() =>
                        moveAnswer(
                          answerIndex,
                          "down",
                        )
                      }
                    />

                    {question.questionType ===
                      "multiple_choice" ? (
                      <button
                        type="button"
                        onClick={() =>
                          removeAnswer(
                            answerIndex,
                          )
                        }
                        disabled={
                          question.answers
                            .length <= 2
                        }
                        className="min-h-8 rounded-lg px-2 text-[11px] font-bold text-red-600 disabled:opacity-35"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>
              ),
            )}
          </div>

          {question.questionType ===
          "multiple_choice" ? (
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...question,
                  answers: [
                    ...question.answers,
                    {
                      answerText: "",
                      isCorrect: false,
                    },
                  ],
                })
              }
              className={`${secondaryButtonClassName} mt-3`}
            >
              Add answer
            </button>
          ) : null}
        </div>

        <Field
          label="Answer explanation"
          hint="Shown to the learner after submission."
        >
          <textarea
            rows={3}
            value={question.explanation}
            onChange={(event) =>
              onChange({
                ...question,
                explanation:
                  event.target.value,
              })
            }
            className={textareaClassName}
          />
        </Field>
      </div>
    </article>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[var(--text-primary)]">
        {label}
      </span>

      {hint ? (
        <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">
          {hint}
        </span>
      ) : null}

      <span className="mt-2 block">
        {children}
      </span>
    </label>
  );
}

function MiniButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="min-h-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-2.5 text-[11px] font-bold text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] disabled:cursor-not-allowed disabled:opacity-35"
    >
      {label}
    </button>
  );
}

const inputClassName =
  "min-h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-3.5 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)] disabled:cursor-not-allowed disabled:opacity-60";

const textareaClassName =
  `${inputClassName} min-h-24 resize-y py-3 leading-6`;

const secondaryButtonClassName =
  "inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-4 text-xs font-bold text-[var(--text-primary)] transition hover:border-[var(--border-strong)]";
