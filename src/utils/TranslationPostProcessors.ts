type TranslationPostProcessor = (value: string) => string;

const PT_BR_LINE_MARKER_REPLACEMENTS: Array<[RegExp, string]> = [
  [/(\n\s*)um\.\s+/gi, "$1a. "],
  [/(\n\s*)eu\.\s+/gi, "$1i. "],
];

function fixPtBrCommentaryListMarkers(value: string) {
  return PT_BR_LINE_MARKER_REPLACEMENTS.reduce(
    (current, [pattern, replacement]) => current.replace(pattern, replacement),
    value,
  );
}

const TRANSLATION_POST_PROCESSORS_BY_LANGUAGE: Record<
  string,
  TranslationPostProcessor
> = {
  "pt-BR": fixPtBrCommentaryListMarkers,
};

export function postProcessTranslation(language: string, value: string) {
  return TRANSLATION_POST_PROCESSORS_BY_LANGUAGE[language]?.(value) ?? value;
}
