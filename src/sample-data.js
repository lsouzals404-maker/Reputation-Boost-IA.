function formatIso(date) {
  return new Date(date).toISOString();
}

function buildSeedReply(customerName, businessName, rating) {
  if (rating >= 5) {
    return `Olá ${customerName}, muito obrigado pela avaliação incrível. Ficamos felizes em saber que sua experiência com a ${businessName} foi excelente. Conte com a nossa equipe sempre que precisar.`;
  }
  if (rating === 4) {
    return `Olá ${customerName}, agradecemos pelo seu feedback. Ficamos felizes que sua experiência com a ${businessName} foi positiva e vamos seguir melhorando para entregar um atendimento ainda melhor na próxima visita.`;
  }
  return `Olá ${customerName}, obrigado por compartilhar sua experiência. Sentimos que ela não foi perfeita e queremos entender melhor o que aconteceu para corrigir rapidamente.`;
}

function createReview(review) {
  const businessName = "Blue Harbor Dental";
  const aiReply = buildSeedReply(review.customerName, businessName, review.rating);
  const manualReply =
    review.status === "edited"
      ? `${aiReply} Caso queira, nossa equipe também está disponível por WhatsApp para acompanhar qualquer detalhe da sua visita.`
      : aiReply;

  return {
    id: review.id,
    customerName: review.customerName,
    customerInitials: review.customerInitials,
    rating: review.rating,
    comment: review.comment,
    date: formatIso(review.date),
    status: review.status,
    source: "Google",
    locationId: review.locationId,
    locationTitle: review.locationTitle,
    googleReviewName: review.googleReviewName,
    aiSuggestedReply: aiReply,
    draftReply: review.status === "pending" ? aiReply : manualReply,
    publishedReply: review.status === "pending" ? "" : manualReply,
    replyEdited: review.status === "edited",
    publishedAt: review.status === "pending" ? null : formatIso(review.replyDate ?? review.date),
  };
}

function buildSeedReviews() {
  return [
    createReview({
      id: "rev_001",
      customerName: "Sarah Mitchell",
      customerInitials: "SM",
      rating: 5,
      comment: "Absolutely amazing experience. The staff was welcoming, organized and made me feel comfortable during the whole visit.",
      date: "2026-04-25T14:20:00Z",
      replyDate: "2026-04-25T15:00:00Z",
      status: "responded",
      locationId: "loc_001",
      locationTitle: "Blue Harbor Dental - Downtown",
      googleReviewName: "accounts/116278/locations/842190/reviews/1001",
    }),
    createReview({
      id: "rev_002",
      customerName: "Michael Thompson",
      customerInitials: "MT",
      rating: 4,
      comment: "Great service and very professional team. I had all my questions answered clearly and quickly.",
      date: "2026-04-23T09:00:00Z",
      replyDate: "2026-04-23T11:30:00Z",
      status: "responded",
      locationId: "loc_001",
      locationTitle: "Blue Harbor Dental - Downtown",
      googleReviewName: "accounts/116278/locations/842190/reviews/1002",
    }),
    createReview({
      id: "rev_003",
      customerName: "Lisa Nguyen",
      customerInitials: "LN",
      rating: 5,
      comment: "Very impressed with the level of care and attention to detail. Everything felt smooth from check-in to follow-up.",
      date: "2026-04-21T18:00:00Z",
      replyDate: "2026-04-21T20:10:00Z",
      status: "edited",
      locationId: "loc_002",
      locationTitle: "Blue Harbor Dental - Midtown",
      googleReviewName: "accounts/116278/locations/842191/reviews/1003",
    }),
    createReview({
      id: "rev_004",
      customerName: "David Carter",
      customerInitials: "DC",
      rating: 4,
      comment: "Overall a good experience. I would have liked a little less waiting time, but the team was helpful and attentive.",
      date: "2026-04-18T12:00:00Z",
      status: "pending",
      locationId: "loc_001",
      locationTitle: "Blue Harbor Dental - Downtown",
      googleReviewName: "accounts/116278/locations/842190/reviews/1004",
    }),
    createReview({
      id: "rev_005",
      customerName: "Robert Parker",
      customerInitials: "RP",
      rating: 5,
      comment: "Professional, calm and efficient. Best appointment experience I have had in years.",
      date: "2026-04-15T10:30:00Z",
      replyDate: "2026-04-15T12:00:00Z",
      status: "responded",
      locationId: "loc_002",
      locationTitle: "Blue Harbor Dental - Midtown",
      googleReviewName: "accounts/116278/locations/842191/reviews/1005",
    }),
    createReview({
      id: "rev_006",
      customerName: "Emily Johnson",
      customerInitials: "EJ",
      rating: 5,
      comment: "Friendly team, clear explanations and great follow-up. Highly recommend.",
      date: "2026-04-10T16:30:00Z",
      replyDate: "2026-04-10T17:10:00Z",
      status: "responded",
      locationId: "loc_002",
      locationTitle: "Blue Harbor Dental - Midtown",
      googleReviewName: "accounts/116278/locations/842191/reviews/1006",
    }),
    createReview({
      id: "rev_007",
      customerName: "Olivia Chen",
      customerInitials: "OC",
      rating: 3,
      comment: "The treatment itself was good, but the front desk communication felt rushed and confusing.",
      date: "2026-04-07T13:00:00Z",
      status: "pending",
      locationId: "loc_001",
      locationTitle: "Blue Harbor Dental - Downtown",
      googleReviewName: "accounts/116278/locations/842190/reviews/1007",
    }),
    createReview({
      id: "rev_008",
      customerName: "James Davis",
      customerInitials: "JD",
      rating: 5,
      comment: "Excellent care and the team genuinely made me feel looked after. Super smooth experience.",
      date: "2026-04-02T08:15:00Z",
      replyDate: "2026-04-02T09:20:00Z",
      status: "responded",
      locationId: "loc_001",
      locationTitle: "Blue Harbor Dental - Downtown",
      googleReviewName: "accounts/116278/locations/842190/reviews/1008",
    }),
    createReview({
      id: "rev_009",
      customerName: "Sophia Martinez",
      customerInitials: "SM",
      rating: 4,
      comment: "Helpful team and very clean office. I would return and recommend it.",
      date: "2026-03-28T18:00:00Z",
      replyDate: "2026-03-28T19:40:00Z",
      status: "responded",
      locationId: "loc_002",
      locationTitle: "Blue Harbor Dental - Midtown",
      googleReviewName: "accounts/116278/locations/842191/reviews/1009",
    }),
    createReview({
      id: "rev_010",
      customerName: "Daniel Brooks",
      customerInitials: "DB",
      rating: 4,
      comment: "Good experience overall. The staff was polite and the appointment ran close to schedule.",
      date: "2026-03-18T15:00:00Z",
      replyDate: "2026-03-18T17:00:00Z",
      status: "edited",
      locationId: "loc_002",
      locationTitle: "Blue Harbor Dental - Midtown",
      googleReviewName: "accounts/116278/locations/842191/reviews/1010",
    }),
    createReview({
      id: "rev_011",
      customerName: "Ava Williams",
      customerInitials: "AW",
      rating: 5,
      comment: "Excellent from start to finish. Everyone was kind and explained the process really well.",
      date: "2026-03-08T11:00:00Z",
      replyDate: "2026-03-08T14:10:00Z",
      status: "responded",
      locationId: "loc_001",
      locationTitle: "Blue Harbor Dental - Downtown",
      googleReviewName: "accounts/116278/locations/842190/reviews/1011",
    }),
    createReview({
      id: "rev_012",
      customerName: "Noah Bennett",
      customerInitials: "NB",
      rating: 4,
      comment: "Solid service and a comfortable environment. I would appreciate more proactive reminders.",
      date: "2026-02-27T09:30:00Z",
      replyDate: "2026-02-27T12:00:00Z",
      status: "responded",
      locationId: "loc_001",
      locationTitle: "Blue Harbor Dental - Downtown",
      googleReviewName: "accounts/116278/locations/842190/reviews/1012",
    }),
  ];
}

function buildSeedLocations() {
  return [
    {
      id: "loc_001",
      accountName: "accounts/116278",
      name: "accounts/116278/locations/842190",
      title: "Blue Harbor Dental - Downtown",
      address: "145 Main Street, Austin, TX",
      verified: true,
      reviewCount: 126,
      rating: 4.9,
    },
    {
      id: "loc_002",
      accountName: "accounts/116278",
      name: "accounts/116278/locations/842191",
      title: "Blue Harbor Dental - Midtown",
      address: "807 Pine Avenue, Austin, TX",
      verified: true,
      reviewCount: 112,
      rating: 4.7,
    },
    {
      id: "loc_003",
      accountName: "accounts/116278",
      name: "accounts/116278/locations/842192",
      title: "Blue Harbor Dental - Northside",
      address: "5200 West Park Blvd, Austin, TX",
      verified: true,
      reviewCount: 84,
      rating: 4.8,
    },
  ];
}

export function createWorkspaceSeed(ownerName, ownerEmail) {
  const businessName = ownerName ? `${ownerName.split(" ")[0]}'s Local Business` : "Blue Harbor Dental";
  return {
    businessProfile: {
      businessName,
      industry: "Local services",
      ownerEmail,
      localArea: "Austin, TX",
      activeLocationId: "loc_001",
      historicReviewCount: 226,
      historicAverageRating: 4.79,
    },
    settings: {
      autoPilotEnabled: true,
      tone: "Professional",
      customInstructions:
        "Agradeca pela avaliacao, demonstre cuidado genuino e convide o cliente a voltar. Em notas baixas, reconheca o atrito e abra caminho para resolver offline.",
      seoKeywords: ["dentist near me", "family dental care", "Austin smile clinic", "teeth cleaning Austin"],
    },
    googleConnection: {
      status: "disconnected",
      provider: "demo",
      connectedAt: null,
      availableLocations: buildSeedLocations(),
      selectedLocationIds: [],
      accessToken: "",
      refreshToken: "",
      tokenExpiry: null,
      pendingState: "",
      accountEmail: "",
    },
    reviews: buildSeedReviews(),
    agency: {
      clients: [
        {
          id: "client_001",
          businessName: "Blue Harbor Dental",
          status: "Ativo",
          averageRating: 4.8,
          locations: 3,
          autopilotEnabled: true,
        },
        {
          id: "client_002",
          businessName: "Bella Skin Studio",
          status: "Aguardando conexao",
          averageRating: 4.6,
          locations: 1,
          autopilotEnabled: false,
        },
        {
          id: "client_003",
          businessName: "Summit Roofing Co.",
          status: "Ativo",
          averageRating: 4.9,
          locations: 2,
          autopilotEnabled: true,
        },
      ],
    },
    subscription: {
      provider: "stripe",
      planName: "Growth",
      monthlyPrice: 149,
      currency: "USD",
      status: "active",
      nextBillingDate: "2026-05-12T00:00:00Z",
      stripeCustomerId: "",
      stripeSubscriptionId: "",
      asaasSubscriptionId: "",
      invoices: [
        {
          id: "inv_2026_04",
          label: "Fatura Abril 2026",
          amount: 149,
          status: "paid",
          paidAt: "2026-04-12T10:30:00Z",
        },
        {
          id: "inv_2026_03",
          label: "Fatura Marco 2026",
          amount: 149,
          status: "paid",
          paidAt: "2026-03-12T09:10:00Z",
        },
        {
          id: "inv_2026_02",
          label: "Fatura Fevereiro 2026",
          amount: 149,
          status: "paid",
          paidAt: "2026-02-12T09:00:00Z",
        },
      ],
    },
    activity: {
      averageResponseHours: 2.1,
      reviewRequestsSent: 12,
      reviewGrowthRate: 28,
      positiveReviewRate: 98,
      unreadNotifications: 3,
    },
  };
}

export function buildInitialState() {
  return {
    version: 1,
    users: [],
    workspaces: {},
  };
}

