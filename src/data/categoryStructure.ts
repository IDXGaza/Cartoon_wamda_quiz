export const CATEGORIES = {
  "العلوم والطبيعة": {
    topics: ["فضاء وتقنية", "جغرافيا", "جسم الإنسان", "علوم", "معلومات عامة"]
  },
  "الجغرافيا والتاريخ": {
    topics: ["جغرافيا", "تاريخ", "معلومات عامة"]
  },
  "الثقافة والأدب": {
    topics: ["أدب", "ثقافة", "إسلاميات", "معلومات عامة"]
  },
  "الدين والقيم": {
    topics: ["إسلاميات", "قيم وأخلاق", "معلومات عامة"]
  },
  "الرياضة": {
    topics: ["رياضة ومصارعة", "كرة قدم", "معلومات عامة"]
  },
  "المنوعات": {
    topics: ["دارك سولز", "ون بيس", "اوفرواتش", "معلومات عامة"]
  }
};

export const getCategoryNames = () => Object.keys(CATEGORIES);
export const getTopicsForCategory = (category: string) => CATEGORIES[category as keyof typeof CATEGORIES]?.topics || [];
