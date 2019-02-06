using org.geonames as geonames from '../db/';

service GeonamesService {
  entity Geonames       as projection on geonames.Geonames
  entity AlternateNames as projection on geonames.AlternateNames

  entity FeatureClasses as projection on geonames.base.feature.Classes
  entity FeatureCodes   as projection on geonames.base.feature.Codes

  entity Countries      as projection on geonames.base.geo.Countries
  entity Continents     as projection on geonames.base.geo.Continents

  entity Languages      as projection on geonames.base.lang.LanguageCodes

  entity Timezones      as projection on geonames.base.time.Timezones
}