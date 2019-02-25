namespace org.geonames.base.time;

using org.geonames.base.geo as geo from './Geographic';

// ---------------------------------------------------------------------------------------------------------------------
// Timezones
//
// All timezones with their offsets to Greenwich Meantime both with and without accounting for daylight saving time
// ---------------------------------------------------------------------------------------------------------------------
entity Timezones {
  key TimezoneName : String(40)   @title: "Timezone Name"
                                  @description: "IANA timezone name";
      GMTOffset    : Decimal(4,2) @title: "GMT Offset"
                                  @description: "Hours offset from GMT (On January 1st this year)";
      RawOffset    : Decimal(4,2) @title: "Raw Offset"
                                  @description: "Hours offset from GMT without accounting for daylight saving time";
      DSTOffset    : Decimal(4,2) @title: "DST Offset"
                                  @description: "Hours offset from GMT accounting for daylight saving time (On July 1st this year)";

      CountryCode  : Association to geo.Countries not null;
}

