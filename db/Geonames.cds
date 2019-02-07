namespace org.geonames;

using org.geonames.base.time    as time    from './Time';
using org.geonames.base.geo     as geo     from './Geographic';
using org.geonames.base.feature as feature from './Features';

// ---------------------------------------------------------------------------------------------------------------------
// Geonames
//
// All geographical points are listed in this table.  This could be anything, ranging from an entire country, province,
// state or county, down to a small geographical feature such as a disused airfield or village pond
//
// It must be accepted that geographical points can have multiple names - possibly in multiple languages.  Some names
// will be official, some abbreviations and some colloquial.  The "Name" field below therefore contains only the offical
// name of that geographical point.  Alternative names for the same point are held in entity "AlternateNames"
//
// The Admin[1-4] codes are arbitrary and country specific.  To create a hierarchy of adminstrative regions within a
// country, sort the entries for given country code by Admin4 within Admin3 within Admin 2 within Admin1
// ---------------------------------------------------------------------------------------------------------------------
entity Geonames {
  key GeonameId         : Integer64     @title: "Geoname Id"
                                        @description: "Unique geoname id";
      Name              : String(200)   @title: "Name"
                                        @description: "Name of geographical point (utf8)";
      Latitude          : Decimal(12,9) @title: "Latitude"
                                        @description: "Latitude in decimal degrees (wgs84)";
      Longitude         : Decimal(12,9) @title: "Longitude"
                                        @description: "Longitude in decimal degrees (wgs84)";
      CountryCodesAlt   : String(200)   @title: "Alt Country Codes"
                                        @description: "Comma seperated list of alternate, ISO-3166 2-character, country codes";
      Admin1            : String(20)    @title: "Admin Level 1"
                                        @description: "FIPS code (subject to change to ISO code)";
      Admin2            : String(80)    @title: "Admin Level 2"
                                        @description: "Code for the second administrative division";
      Admin3            : String(20)    @title: "Admin Level 3"
                                        @description: "Code for third level administrative division";
      Admin4            : String(20)    @title: "Admin Level 4"
                                        @description: "Code for fourth level administrative division";
      Population        : Integer64     @title: "Population"
                                        @description: "Population";
      Elevation         : Integer       @title: "Elevation"
                                        @description: "Elevation above sea level of this geographical point in meters";
      DEM               : Integer       @title: "DEM"
                                        @description: "Digital elevation model. srtm3 or gtopo30";
      LastModified      : String(10)    @title: "Last Modified"
                                        @description: "Date country file was last modification in yyyy-MM-dd format";

      FeatureClass      : Association to feature.Classes;
      FeatureCode       : Association to feature.Codes;
      Timezone          : Association to time.Timezones not null;
      CountryCode       : Association to geo.Countries not null;
}

// ---------------------------------------------------------------------------------------------------------------------
// AlternateNames
//
// If a geographical point has more names than simply the official one used in entity "Geonames", that name is listed
// here along with flags to indicate whether the name is a short-form, colloquial or historical (and therefore obsolete)
//
// The "ISOLanguage" field name is badly named because in reality, this field could hold not only an ISO langauge code,
// but also an indicator that describes the type of information in the "AlternateName" field.
//
// Any of the following values or type indicators are possible:
// * Any 2- or 3-character ISO 639 language code
// * 'post' for postal codes
// * 'iata','icao' and 'faac' for airport codes
// * 'fr_1793' for French Revolution names
// * 'abbr' for abbreviation
// * 'wkdt' for the WikiData id
// * 'link' for the URL to a website (mostly Wikipedia)
//
// The inUseFrom and inUseTo field usually holds dates, but might also hold a URL pointing to a fuller explanation of the
// circumstances behind the name change
// ---------------------------------------------------------------------------------------------------------------------
entity AlternateNames {
  key AlternateNameId   : Integer64             @title: "Alternate Name Id"
                                                @description: "Id of this alternate name";
      ISOLanguage       : String(7)             @title: "Type"
                                                @description: "Either an ISO language code or a type indicator";
      AlternateName     : String(400)           @title: "Alternate Name"
                                                @description: "Alternate name or name variant (utf8)";
      isPreferredName   : Boolean default false @title: "Preferred Name?"
                                                @description: "Is this an official/preferred name?";
      isShortName       : Boolean default false @title: "Shortened Name?"
                                                @description: "Is this a shortened name? E.G. shortening 'State of California' to 'California'";
      isColloquial      : Boolean default false @title: "Colloquial Name?"
                                                @description: "Is this a colloquial or slang name? E.G. referring to 'New York' as 'The Big Apple'";
      isHistoric        : Boolean default false @title: "Historical Name?"
                                                @description: "Is this a historical name? E.G. 'Bombay' is the former name for 'Mumbai'";
      inUsefrom         : String(200)           @title: "In Use From"
                                                @description: "Date when historic name started being used or a link to a webpage containing further details";
      inUseto           : String(200)           @title: "In Use Until"
                                                @description: "Date when historic name stopped being used or a link to a webpage containing further details";

      GeonameId         : Association to Geonames not null;
}
