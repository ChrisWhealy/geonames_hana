namespace org.geonames.base.geo;

// ---------------------------------------------------------------------------------------------------------------------
// Continents
//
// Continent codes and their English names
//
// The Geonames file from which this data is obtained also contains the Geoname Id for each continent, but this has been
// omitted to avoid creating a circular dependency
// ---------------------------------------------------------------------------------------------------------------------
entity Continents {
  key ContinentCode : String(2)   @title: "Continent Code" 
                                  @description: "Geoname specific, 2-character continent code";
      ContinentName : String(20)  @title: "Continent Name" 
                                  @description: "Name of continent in English";
}


// ---------------------------------------------------------------------------------------------------------------------
// Countries
//
// The FIPS country codes are a US-only standard
//
// The list of languages spoken in a country could be either the 2-character ISO 639-1 language code, or the locale
// formed from the 2-character ISO 639-1 language code and the ISO 3166 country code, separated by a hyphen character
//
// The Geonames file from which this data is obtained also contains the Geoname Id for each country, but this has been
// omitted to avoid creating a circular dependency
//
// The field EquivalentFipsCode is also omitted
// ---------------------------------------------------------------------------------------------------------------------
entity Countries {
  key ISO2             : String(2)     @title: "2-Character Country Code"
                                       @description: "ISO 3166 2-character country code";
      ISO3             : String(3)     @title: "3-Character Country Code"
                                       @description: "ISO 3166 3-character country code";
      ISONumeric       : String(3)     @title: "Numeric Country Code"
                                       @description: "ISO 3166 numeric country code (Held as a string to preserve leading zeroes)";
      FIPS             : String(2)     @title: "FIPS Code"
                                       @description: "Federal Information Processing Standard country code (Not used outside the US)";
      CountryName      : String(100)   @title: "Country Name"
                                       @description: "Country name in English";
      Capital          : String(40)    @title: "Capital"
                                       @description: "Capital city name in English name";
      Area             : Decimal(10,2) @title: "Area"
                                       @description: "Territorial area in sq km";
      Population       : Integer       @title: "Population"
                                       @description: "Population";
      TLD              : String(3)     @title: "TLD"
                                       @description: "Top level domain name";
      CurrencyCode     : String(3)     @title: "Currency Code"
                                       @description: "Currency code";
      CurrencyName     : String(20)    @title: "Currency Name"
                                       @description: "Currency name";
      DiallingCode     : String(20)    @title: "Dialling Code"
                                       @description: "International dialling code";
      PostalCodeFormat : String(100)   @title: "Postal Code Formats"
                                       @description: "Pipe delimited list of valid postal code formats";
      PostalCodeRegex  : String(200)   @title: "Postal Code Regex"
                                       @description: "Regular expression for validating postal code";
      Languages        : String(120)   @title: "Langauges"
                                       @description: "Comma delimited list of ISO language codes or locales spoken in this country";
      Neighbours       : String(80)    @title: "Neighbours"
                                       @description: "Comma delimited list of neighbouring countries by ISO 6133 country code";

      Continent        : Association to Continents not null;
}


