<a name="top"></a>
# geonames\_hana


<!-- *********************************************************************** -->
<a name="description"></a>
## Description

This repository contains a CDS data model to represent all the open-source, geopolitical information available from the <http://geonames.org> website

Once the data model has been deployed to HANA, this app starts an HTTP server that first synchronises the data in the HANA database with the current data available from <http://geonames.org>, then accepts HTTP calls to search that data



<!-- *********************************************************************** -->
<a name="requirements"></a>
## Requirements

In order to implement this server, you will need:

1. A HANA instance.  A productive HANA instance is preferable, but a trial HANA instance will suffice.
1. An HDI container - the default name for this container being `geonames-hdi`.  
    Its fine to use a different HDI container name, but you must then change `geonames-hdi` name where it appears in lines 21 and 23 of `mta.yaml`
1. Access to SAP Web IDE Full-Stack.  Web IDE must be configured to connect to the Cloud Foundry account in which the above HDI Container lives
1. Via Web IDE Full-Stack, you have installed an up-to-date Builder application in your CF account


<!-- *********************************************************************** -->
<a name="download"></a>
## Download and Installation

Clone this repository into Web IDE Full-Stack



<!-- *********************************************************************** -->
<a name="configuration"></a>
## Configuration

1. Build and deploy the `db/` folder.  This will deploy the CDS data model to your HANA instance and load ***some*** of the tables with static data
1. Run the `srv/` service to start the server.  When this server starts for the first time, it will download all the relevant ZIP files from <http://geonames.org> (approximately 500 files), unzip them, and transfer the tab-delimited text data into the two main database tables:
    * `ORG_GEONAMES_GEONAMES` 
    * `ORG_GEONAMES_ALTERNATENAMES`

***WARNING***  
The `ORG_GEONAMES_BASE_GEO_COUNTRIES` table contains data not only for all 252 countries in the world, but also a special country with the country code `XX`.

This is the country code for geopolitical information that does not belong to any particular country.  However, the geopolitical data falling into this category is downloaded from a GeoNames.org file called `no-country.zip` rather than the expected `XX.zip`.

<!-- *********************************************************************** -->
<a name="functionality"></a>
## Functionality

### Startup Sequence

When the server starts, it will first synchronise all the country data from <http://geonames.org> into your HANA HDI Container.  When loading all the country data into a productive HANA instance, synchronisation takes between 12 and 15 minutes; however, if you are using a trial HANA instance, it could be as long as 30 minutes.

Also, the GeoNames website does not allow more than about 5 open sockets from the same IP address; hence, all download requests must be grouped into batches of 5.

***IMPORTANT***  
Occasionally, the Geonames server will unexpectedly close an open socket, thus killing the server start up process.  If this happens, simply restart the server and the synchronisation will continue from where it last stopped

### Refresh Period

The data in <http://geonames.org> is crowd sourced and typically changes every day.  Therefore, it is necessary to define a refresh period, after which, the duplicated data in the HANA database must be refreshed.

The refresh period is defined in minutes at the start of file `srv/config/config.js`.

```javascript
// DB refresh period in minutes
const refreshFrequency = 1440
```

By default, it is set to 24 hours (1440 minutes)

## Data Model

The data model is derived from the table structure used by <http://geonames.org>

### Table Names

The following table names are used by the API; however, these names are used for convenience rather than directly exposing the underlying database tables names

| API Table Name | API Key Field | Type | DB Table Name | Description |
|---|---|---|---|---|
| `geonames` | `geonameId` | `Integer64` | `ORG_GEONAMES_GEONAMES` | All geopolitical data 
| `alternate-names` | `alternateNameId` | `Integer64` | `ORG_GEONAMES_ALTERNATENAMES` |  Colloquial, shortened or language-specific names for entries in the `geonames` table
| `countries` | `countryCode` | `String(2)` | `ORG_GEONAMES_BASE_GEO_COUNTRIES` |  All countries worldwide
| `continents` | `continentCode` | `String(2)` | `ORG_GEONAMES_BASE_GEO_CONTINENTS` |  All continents
| `feature-classes` | `featureClass` | `String(1)` | `ORG_GEONAMES_BASE_FEATURE_CLASSES` |  Broad categorisation of geopolitical features
| `feature-codes` | `featureCode` | `String(10)` | `ORG_GEONAMES_BASE_FEATURE_CODES` |  Sub-categories within a feature class
| `languages` | `iso639-3` | `String(3)` | `ORG_GEONAMES_BASE_LANG_LANGUAGECODES` |  All known languages.  This includes not only langauges that are extinct, ancient, historical or constructed, but also macrolanguages (E.G. There are many regional dialects of Arabic, but all belong to the macrolanguage known as "Generic Arabic")
| `timezones` | `name` | `String(40)` | `ORG_GEONAMES_BASE_TIME_TIMEZONES` |  All timezones


### GEONAMES

This table contains all the geopolitical data keyed by `geonameId`.  The `geonameId` is an arbitrary 64-bit integer assigned by the <http://geonames.org> organisation

| API Field Name | DB Field Name | Type | Description
|---|---|---|---|
| `geonameId` | `GEONAMEID` | `Integer64` | Unique geoname id
| `name` | `NAME` | `String(200)` | Name of geographical point (utf8)
| `Latitude` | `Decimal(12,9)` | Latitude in decimal degrees (wgs84)
| `Longitude` | `Decimal(12,9)` | Longitude in decimal degrees (wgs84)
| `CountryCodesAlt` | `String(200)` | Comma seperated list of alternate, ISO-3166 2-character, country codes
| `Admin1` | `String(20)` | FIPS code (subject to change to ISO code)
| `Admin2` | `String(80)` | Code for the second administrative division
| `Admin3` | `String(20)` | Code for third level administrative division
| `Admin4` | `String(20)` | Code for fourth level administrative division
| `Population` | `Integer64` | Population
| `Elevation` | `Integer` | Elevation above sea level of this geographical point in meters
| `DEM` | `Integer` | Digital elevation model. srtm3 or gtopo30
| `LastModified` | `String(10)` | Date country file was last modification in yyyy-MM-dd format


## API

Once the server has started, it will accept non-modifying HTTP requests.  Query or read requests will be accepted, but update, delete or create requests will be rejected.

When specifying field names in a query string, you can use either the camel-cased version of the property name seen in the returned JSON object, or you can use the convenience API name listed in the table structure above.

### Query Requests

***Simple Query***

`https://<hostname>/api/v1/<table-name>`

This will return the first 1000 rows of `<table-name>` as a JSON object

***Query***


<!-- *********************************************************************** -->
<a name="limitations"></a>
## Limitations

None so far...


<!-- *********************************************************************** -->
<a name="issues"></a>
## Known Issues

None so far...



<!-- *********************************************************************** -->
<a name="support"></a>
## Support

This project is provided "as-is": there is no guarantee that raised issues will be answered or addressed in future releases.



<!-- *********************************************************************** -->
<a name="contributing"></a>
## Contributing

Chris Whealy

<a name="license"></a>
## License

This project is licensed under the Apache Software License, Version 2.0 except as noted otherwise in the [LICENSE](LICENSE) file.
