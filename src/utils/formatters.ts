export const formatPrice = (value: number) => {
  return new Intl.NumberFormat('fa-IR').format(value);
};