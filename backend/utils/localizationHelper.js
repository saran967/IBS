// utils/localizationHelper.js

export const localize = (doc, lang) => {
  if (!doc || typeof doc !== "object") return doc;

  const localized = {};

  for (const key in doc) {
    const value = doc[key];

    if (value && typeof value === "object" && "en" in value && "ta" in value) {
      if (lang === "both") {
        // If 'both', return the full object.
        localized[key] = value;
      } else {
       
        localized[key] = value[lang] || value["en"] || null;
      }
    }
    
    else if (Array.isArray(value)) {
      localized[key] = value.map((item) => localize(item, lang));
    }
    // 3. Handle nested objects (recurse)
    else if (typeof value === "object" && value !== null) {
      localized[key] = localize(value, lang);
    }
    
    else {
      localized[key] = value;
    }
  }

  return localized;
};
