"use client";

import { useState } from "react";
import { StarRating } from "@/components/ui/star-rating";
import { showSuccess, showError } from "@/components/ui/toast-utils";

interface ReviewFormProps {
  courseId: string;
  existingReview?: { rating: number; comment: string | null } | null;
  onReviewSubmitted: () => void;
}

export function ReviewForm({
  courseId,
  existingReview,
  onReviewSubmitted,
}: ReviewFormProps) {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [comment, setComment] = useState(existingReview?.comment || "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (rating === 0) {
      showError("Selecione uma avaliação de 1 a 5 estrelas");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          comment: comment.trim() || null,
        }),
      });

      if (res.ok) {
        showSuccess(
          existingReview
            ? "Avaliação atualizada!"
            : "Avaliação enviada! Obrigado pelo feedback."
        );
        onReviewSubmitted();
      } else {
        const data = await res.json();
        showError(data.error || "Erro ao enviar avaliação");
      }
    } catch {
      showError("Erro de conexão. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  const isEditing = !!existingReview;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {isEditing ? "Sua avaliação atual" : "Qual sua avaliação para este curso?"}
        </p>
        <StarRating
          rating={rating}
          size="lg"
          interactive
          onChange={setRating}
          showValue
        />
      </div>

      <div>
        <label
          htmlFor="review-comment"
          className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Comentário (opcional)
        </label>
        <textarea
          id="review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Compartilhe sua experiência com este curso..."
          maxLength={1000}
          rows={3}
          className="w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white dark:placeholder:text-zinc-500"
        />
        <p className="mt-1 text-right text-[10px] text-zinc-400">
          {comment.length}/1000
        </p>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          type="submit"
          disabled={submitting || rating === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {submitting ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent dark:border-zinc-900" />
              {isEditing ? "Atualizando..." : "Enviando..."}
            </>
          ) : isEditing ? (
            "Atualizar Avaliação"
          ) : (
            "Enviar Avaliação"
          )}
        </button>
      </div>
    </form>
  );
}
