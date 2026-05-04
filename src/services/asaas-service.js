export function validateTransfer(payload) {
  const transferId = payload?.transfer?.id || payload?.bill?.id;

  if (!transferId) {
    return {
      status: "REFUSED",
      refuseReason: "ID da transferência não informado.",
    };
  }

  // 🔧 REGRA TEMPORÁRIA (substituir depois por banco real)
  const isLegit = transferId === "123";

  if (isLegit) {
    return { status: "APPROVED" };
  }

  return {
    status: "REFUSED",
    refuseReason: "Transação não reconhecida pelo sistema de origem.",
  };
}