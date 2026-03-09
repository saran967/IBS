// const getLocalizedText = (value, lang = "en") => {
//   if (!value) return "";

//   // If multilingual object { en, ta }
//   if (typeof value === "object") {
//     return value[lang] || value.en || value.ta || "";
//   }

//   // If already string / number
//   return String(value);
// };

// export default getLocalizedText;

const getLocalizedText = (value, lang = "en") => {
  // null or undefined
  if (value == null) return "—";

  // multilingual object: { en, ta }
  if (typeof value === "object") {
    if (lang === "en") return value.en || value.ta || "—";
    if (lang === "ta") return value.ta || value.en || "—";
    if (lang === "both") return `${value.en || "—"} / ${value.ta || "—"}`;

    return value.en || value.ta || "—";
  }

  // string / number
  return String(value);
};

export default getLocalizedText;