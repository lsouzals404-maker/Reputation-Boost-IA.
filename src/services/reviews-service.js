import { generateReviewReply } from "./openai-service.js";
import { publishGoogleReviewReply } from "./google-service.js";
import { mutateState, readState } from "../store.js";

function sortReviews(reviews, sortOrder) {
  const sorted = [...reviews];
  sorted.sort((left, right) => new Date(right.date) - new Date(left.date));
  if (sortOrder === "oldest") {
    sorted.reverse();
  }
  if (sortOrder === "highest") {
    sorted.sort((left, right) => right.rating - left.rating || new Date(right.date) - new Date(left.date));
  }
  if (sortOrder === "lowest") {
    sorted.sort((left, right) => left.rating - right.rating || new Date(right.date) - new Date(left.date));
  }
  return sorted;
}

function filterReviews(reviews, filters) {
  return reviews.filter((review) => {
    if (filters.status && filters.status !== "all" && review.status !== filters.status) {
      return false;
    }
    if (filters.search) {
      const target = `${review.customerName} ${review.comment}`.toLowerCase();
      if (!target.includes(String(filters.search).toLowerCase())) {
        return false;
      }
    }
    return true;
  });
}

export async function getReviews(userId, filters = {}) {
  const state = await readState();
  const workspace = state.workspaces[userId];
  if (!workspace) {
    return [];
  }
  const filtered = filterReviews(workspace.reviews, filters);
  return sortReviews(filtered, filters.sort);
}

export async function getReviewById(userId, reviewId) {
  const state = await readState();
  const workspace = state.workspaces[userId];
  return workspace?.reviews.find((review) => review.id === reviewId) ?? null;
}

export async function generateReplyForReview(userId, reviewId) {
  const state = await readState();
  const workspace = state.workspaces[userId];
  if (!workspace) {
    const error = new Error("Workspace nao encontrado.");
    error.statusCode = 404;
    throw error;
  }

  const review = workspace.reviews.find((candidate) => candidate.id === reviewId);
  if (!review) {
    const error = new Error("Avaliacao nao encontrada.");
    error.statusCode = 404;
    throw error;
  }

  const generatedReply = await generateReviewReply({
    review,
    settings: workspace.settings,
    businessProfile: workspace.businessProfile,
  });

  return mutateState((draftState) => {
    const draftReview = draftState.workspaces[userId].reviews.find((candidate) => candidate.id === reviewId);
    draftReview.aiSuggestedReply = generatedReply;
    draftReview.draftReply = generatedReply;
    return draftReview;
  });
}

export async function saveReviewDraft(userId, reviewId, draftReply) {
  return mutateState((state) => {
    const workspace = state.workspaces[userId];
    const review = workspace?.reviews.find((candidate) => candidate.id === reviewId);
    if (!review) {
      const error = new Error("Avaliacao nao encontrada.");
      error.statusCode = 404;
      throw error;
    }

    review.draftReply = String(draftReply || "").trim();
    return review;
  });
}

export async function publishReviewReply(userId, reviewId, draftReply) {
  const state = await readState();
  const workspace = state.workspaces[userId];
  const review = workspace?.reviews.find((candidate) => candidate.id === reviewId);
  if (!review) {
    const error = new Error("Avaliacao nao encontrada.");
    error.statusCode = 404;
    throw error;
  }

  const replyToPublish = String(draftReply || review.draftReply || "").trim();
  if (!replyToPublish) {
    const error = new Error("Escreva uma resposta antes de publicar.");
    error.statusCode = 400;
    throw error;
  }

  await publishGoogleReviewReply(userId, review, replyToPublish);

  return mutateState((draftState) => {
    const draftReview = draftState.workspaces[userId].reviews.find((candidate) => candidate.id === reviewId);
    draftReview.draftReply = replyToPublish;
    draftReview.publishedReply = replyToPublish;
    draftReview.publishedAt = new Date().toISOString();
    draftReview.replyEdited = replyToPublish !== draftReview.aiSuggestedReply;
    draftReview.status = draftReview.replyEdited ? "edited" : "responded";
    return draftReview;
  });
}

export async function discardReviewReply(userId, reviewId) {
  return mutateState((state) => {
    const workspace = state.workspaces[userId];
    const review = workspace?.reviews.find((candidate) => candidate.id === reviewId);
    if (!review) {
      const error = new Error("Avaliacao nao encontrada.");
      error.statusCode = 404;
      throw error;
    }

    review.draftReply = review.publishedReply || review.aiSuggestedReply || "";
    return review;
  });
}
