let current = null;

export const setLenis = (lenis) => {
  current = lenis;
};

export const getLenis = () => current;

export function scrollToHash(hash) {
  if (current) current.scrollTo(hash);
  else document.querySelector(hash)?.scrollIntoView();
}
