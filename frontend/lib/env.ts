export const isSynphoraPageTest = () => {
  return process.env.NEXT_PUBLIC_SYNPHORA_PAGE_TEST === "true";
}