// Usage tracking is not used: this is kept as a no-op so callers stay simple.
export const trackEvent = (
  _category: string,
  _action: string,
  _label?: string,
  _value?: number,
) => {};
