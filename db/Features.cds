namespace org.geonames.base.feature;

// ---------------------------------------------------------------------------------------------------------------------
// Feature Classes
//
// A 1-character code that broadly categorises a geographical feature
// ---------------------------------------------------------------------------------------------------------------------
entity Classes {
  key FeatureClass : String(1)   @title: "Feature Class" @description: "The class to which a geographical feature belongs";
      Description  : String(100) @title: "Description";
}



// ---------------------------------------------------------------------------------------------------------------------
// Feature Codes
//
// A 2- to 5-character code specifically categorises a geographic feature
// ---------------------------------------------------------------------------------------------------------------------
entity Codes {
  key FeatureCode      : String(10)   @title: "Feature Code" @description: "The category to which a geographical feature belongs";
      ShortDescription : String(100)  @title: "Short Description";
      LongDescription  : String(1000) @title: "Long Description";

      FeatureClass     : Association to Classes
}
