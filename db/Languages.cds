namespace org.geonames.base.lang;

// ---------------------------------------------------------------------------------------------------------------------
// ISO 639 Language Codes
//
// All known languages are listed here, including historical, extinct and constructed languages
// The ISO 639-3 field is the only language code guarunteed to be present
// ---------------------------------------------------------------------------------------------------------------------
entity LanguageCodes {
  key ISO639_3     : String(3)   @title: "ISO 639-3 Language Code"
                                 @description: "3-Character ISO 639-3 code";
      ISO639_2     : String(12)  @title: "ISO 639-3 Language Code"
                                 @description: "3-Character ISO 639-2 code";
      ISO639_1     : String(2)   @title: "ISO 639-3 Language Code"
                                 @description: "2-Character ISO 639-1 code";
      LanguageName : String(60)  @title: "Language Name"
                                 @description: "Language name in English";
}

