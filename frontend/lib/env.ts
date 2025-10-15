export const isSynphoraPageTest = () => {
  return process.env.NEXT_PUBLIC_SYNPHORA_PAGE_TEST === "true";
}

export const isShowDebugInfo = () => {
  return process.env.NEXT_PUBLIC_SHOW_DEBUG_INFO === "true";
}