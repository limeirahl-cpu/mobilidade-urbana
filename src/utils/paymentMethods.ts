export interface PaymentMethod {
  key: string;
  label: string;
}

export const PAYMENT_METHODS: PaymentMethod[] = [
  { key: "dinheiro", label: "Dinheiro" },
  { key: "pix", label: "Pix" },
  { key: "cartao_credito", label: "Cartão de crédito" },
  { key: "cartao_debito", label: "Cartão de débito" },
];

export function getPaymentMethodLabel(key: string | null): string | null {
  return PAYMENT_METHODS.find((m) => m.key === key)?.label ?? null;
}
