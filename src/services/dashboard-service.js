import { readState } from "../store.js";

function toDate(value) {
  return new Date(value);
}

function isWithinLastDays(value, days) {
  const date = toDate(value);
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - days);
  return date >= threshold;
}

function calculateWeightedAverageRating(reviews, baselineCount, baselineAverage) {
  const reviewTotal = reviews.reduce((sum, review) => sum + review.rating, 0);
  const baselineTotal = baselineCount * baselineAverage;
  const totalCount = baselineCount + reviews.length;
  if (!totalCount) {
    return 0;
  }
  return Number(((baselineTotal + reviewTotal) / totalCount).toFixed(1));
}

function calculateGrowth(reviews) {
  const now = new Date();
  const currentThreshold = new Date(now);
  currentThreshold.setDate(currentThreshold.getDate() - 30);
  const previousThreshold = new Date(now);
  previousThreshold.setDate(previousThreshold.getDate() - 60);

  let current = 0;
  let previous = 0;
  for (const review of reviews) {
    const date = new Date(review.date);
    if (date >= currentThreshold) {
      current += 1;
    } else if (date >= previousThreshold) {
      previous += 1;
    }
  }
  if (!previous) {
    return current ? 100 : 0;
  }
  return Math.round(((current - previous) / previous) * 100);
}

function buildTrendSeries(reviews, baselineTotal) {
  const points = [];
  const today = new Date();
  const sorted = [...reviews].sort((left, right) => new Date(left.date) - new Date(right.date));

  for (let index = 5; index >= 0; index -= 1) {
    const pointDate = new Date(today);
    pointDate.setDate(pointDate.getDate() - index * 7);
    const cumulative = baselineTotal + sorted.filter((review) => new Date(review.date) <= pointDate).length;
    points.push({
      label: pointDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: cumulative,
    });
  }

  return points;
}

export async function getDashboardData(userId) {
  const state = await readState();
  const workspace = state.workspaces[userId];
  if (!workspace) {
    return null;
  }

  const reviews = [...workspace.reviews].sort((left, right) => new Date(right.date) - new Date(left.date));
  const ratings30d = reviews.filter((review) => isWithinLastDays(review.date, 30));
  const pendingCount = reviews.filter((review) => review.status === "pending").length;
  const respondedCount = reviews.filter((review) => review.status !== "pending").length;
  const totalReviews = workspace.businessProfile.historicReviewCount + reviews.length;
  const averageRating = calculateWeightedAverageRating(
    reviews,
    workspace.businessProfile.historicReviewCount,
    workspace.businessProfile.historicAverageRating,
  );

  return {
    businessName: workspace.businessProfile.businessName,
    locationName: workspace.businessProfile.localArea,
    averageRating,
    totalReviews,
    newReviewsLast30Days: ratings30d.length,
    pendingReviews: pendingCount,
    respondedReviews: respondedCount,
    reviewGrowthRate: workspace.activity.reviewGrowthRate || calculateGrowth(reviews),
    positiveReviewRate: workspace.activity.positiveReviewRate,
    averageResponseHours: workspace.activity.averageResponseHours,
    reviewRequestsSent: workspace.activity.reviewRequestsSent,
    googleConnected: workspace.googleConnection.status !== "disconnected",
    trendSeries: buildTrendSeries(reviews, workspace.businessProfile.historicReviewCount),
    recentReviews: reviews.slice(0, 4),
  };
}

