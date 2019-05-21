<a name="top"></a>
# geonames\_hana


<!-- *********************************************************************** -->
<a name="description"></a>
## Description

This repository contains a CDS data model to represent all the open-source, geopolitical information available from the <http://geonames.org> website

The data model must first be deployed to a HANA, the start the HTTP server.

The HTTP server responds to RESTful HTTP queries and supplies a wide range of information available from <http://geonames.org>

Since the data on <http://geonames.org> is crowd-sourced, it changes regularly.  Therefore, the data that has been transferred into HANA will potentially become stale after 24 hours (or 1440 minutes).  Therefore, from the HTTP server's `/admin` page, you can see a list of all the countries and the timestamp of when each country's data was last refreshed.  Simply hit the "Refresh Server Data" button and as long a gap of at least 1440 minutes has elapsed, the HANA database will be updated



<!-- *********************************************************************** -->
<a name="requirements"></a>
## Requirements

In order to implement this server, you will need:

1. A HANA instance.  A productive HANA instance is preferable, but a trial HANA instance will suffice.
1. An HDI container - the default name for this container being `geonames-hdi`.  
    Its fine to use a different HDI container name, but you must then change the name `geonames-hdi` where it appears in lines 21 and 23 of `mta.yaml`
1. Access to SAP Web IDE Full-Stack.  Web IDE must be configured to connect to the Cloud Foundry account in which the above HDI Container lives


<!-- *********************************************************************** -->
<a name="download"></a>
## Download and Installation

Clone this repository into Web IDE Full-Stack



<!-- *********************************************************************** -->
<a name="configuration"></a>
## Configuration

***IMPORTANT***
Some of the data loaded into the HANA database changes so infrequently, that is can be considered static.  Therefore, this data has been hard-coded into `.csv` files that are part of the CDS data model definition.

1. Build and deploy the `/db` folder.  This will deploy the CDS data model to your HANA instance and load ***some*** of the tables with static data
1. Run the `/srv` service to start the server.  When this server starts for the very first time, the two main database tables will be empty.  Go to the `/admin` screen and press the "Refresh Server Data" button.  This will download all the relevant ZIP files from <http://geonames.org> (approximately 500 files - 2 per country), unzip them, and transfer the tab-delimited text data into the two main database tables:
    * `ORG_GEONAMES_GEONAMES` 
    * `ORG_GEONAMES_ALTERNATENAMES`

***WARNING***  
The `ORG_GEONAMES_BASE_GEO_COUNTRIES` table contains data not only for all 252 countries in the world, but also a special country with the non-standard country code `XX`.

This is the country code for geopolitical information that does ***not*** belong to any particular country (such as underwater features that exist in international waters).  However, the geopolitical data falling into this category is downloaded from a file called `no-country.zip` rather than the expected `XX.zip`.

Data belonging to country `XX` must be treated as a special case in various parts of the coding

<!-- *********************************************************************** -->
<a name="functionality"></a>
## Functionality

### Startup Sequence

When the server starts, an HTTP server is made available that will respond to simple RESTful queries.

Every 24 hours (1440 minutes) the data in the HANA database needs to be refreshed.  This is done from the `/admin` page.  It is not possible to refresh the data more often then every 24 hours.

When loading all the country data into a productive HANA instance, synchronisation takes between 12 and 15 minutes; however, if you are using a trial HANA instance, it could be as long as 30 minutes.

Also, the GeoNames website does not allow more than about 5 open sockets from the same IP address; hence, all download requests must be grouped into batches of 5.  This is the main reason for why the refresh process takes as long as it does

***IMPORTANT***  
Occasionally, the Geonames server will unexpectedly close an open socket, thus killing the server start up process.  If this happens, simply restart the server and restart the synchronisation process

### Refresh Period

The data in <http://geonames.org> is crowd-sourced and typically changes every day.  Therefore, it is necessary to define a refresh period, after which, the duplicated data in the HANA database must be refreshed.

The refresh period is defined in minutes at the start of file [`srv/config/config.js`](./srv/config/config.js).

```javascript
// DB refresh period in minutes
const refreshFrequency = 1440
```

By default, it is set to 24 hours (1440 minutes)

### HANA write batch size

When writing data to HANA, table rows are grouped into batches.  By default, the batch size is 20,000 rows, but if needed, this can be changed by altering the value of `hanaWriteBatchSize` at the start of file [`srv/config/config.js`](./srv/config/config.js).

```javascript
// Number of rows to write to HANA in a single batch
const hanaWriteBatchSize = 20000
```

## Data Model

The data model is derived from the table structure used by <http://geonames.org>

### Table Names

The following table names are used by the API.  These names are used only by the API and exist for convenience.  The underlying database tables names are shown in the table below

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



## API

The server accepts non-modifying HTTP requests.  Query or read requests will be accepted, but update, delete or create requests will be rejected.

When specifying field names in a query string, you must use the camel-cased version of the property name seen in the returned JSON object, or you can use the convenience API name described [below](#user-content-alt-field-names).

### Query Requests

#### Simple Query

`https://<hostname>/api/v1/<table-name>`

This will return the first 1000 rows of `<table-name>` as a JSON object

#### Read

`https://<hostname>/api/v1/<table-name>/<key-value>`

This will return the JSON Object whose key exactly matches `<key-value>`, or an empty list.

For example, the URL `https://<hostname>/api/v1/languages/deu` will return the single row from the `languages` table that has the key `deu`:

```json
[
  {
    "ISO639_3": "deu",
    "ISO639_2": "deu / ger*",
    "ISO639_1": "de",
    "LANGUAGENAME": "German"
  }
]
```

#### Query

`https://<hostname>/api/v1/<table-name>?<key-name>=<key-value>`

This will return zero or more rows where `<key-name>` matches `<key-value>`.  For instance, the above READ request shown above can be turned into an equivalent QUERY request as follows:

`https://<hostname>/api/v1/languages?iso639-3=deu`

<a name="alt-field-names"></a>
#### Alternative Field Names

The property names of the returned JSON objects are not always intuitive.  For example, the 3-character language code in the `languages` table is stored in field `iso639-3`.  Such field names are technical and obscure and therefore don't improve the API's usability.  Therefore, alternate, human-readable names have been configured that can be used in the API as more user-friendly alternatives.

These alternative names are listed in file [`srv/config/config.js`](./srv/config/config.js).  Look at the definition of object `api_v1`.  This object contains multiple properties whose names are the URL paths used to read a particular table.

Each pathname property is itself an object containing a `parameters` property.  For instance, part of the pathname object for `api/v1/countries` contains this `parameters` configuration:

```javascript
'/api/v1/countries' : {
  // Snip
  , parameters   : {
      countryCode        : { operators : simpleEquality, colName : 'ISO2'}
    , iso2               : { operators : simpleEquality, colName : 'ISO2'}
    , countryCode3       : { operators : simpleEquality, colName : 'ISO3'}
    , iso3               : { operators : simpleEquality, colName : 'ISO3'}
    , numericCountryCode : { operators : simpleEquality, colName : 'ISONUMERIC'}
    , isoNumeric         : { operators : simpleEquality, colName : 'ISONUMERIC'}
    // Snip
    }
  }
```

Each properties in the `parameters` object defines the name of a field permitted in the query string.  However, notice that the properties `countryCode` and `iso2` are both configured with the `colName` of `ISO2`, and the properties `countryCode3` and `iso3` are both configured with the column name of `ISO3`

This means that either of the property names can be used to read the `ISO2` or `ISO3` database columns.  This means that the following pairs of query strings will have equivalent results:

`https://<hostname>/api/v1/countries?iso2=GB`  
`https://<hostname>/api/v1/countries?countryCode=GB`

Both will return the country having the 2-character country code of `GB` (I.E. Great Britain)

`https://<hostname>/api/v1/countries?iso3=DEU`  
`https://<hostname>/api/v1/countries?countryCode3=DEU`

Both will return the country having the 3-character country code of `DEU` (I.E. Germany)

#### Operator Values in Query String Fields

Often you will need to issue a query that tests a value using some operator other than simple equivalence (`=`)

For instance, if you wish to search for all cities or administrative regions having a population greater than 10 million, you should issue the following query to the `geonames` table:

`https://<hostname>/api/v1/geonames?featureClass=P&population=(GT,10000000)`  

Notice the syntax for the `population` query string parameter: `(GT,10000000)` 

By placing parentheses around the value, you can specify the operator first, followed by a comma, then the value.  The general pattern is:

`(<operator>,<value>)`

The operators that are permitted for a given parameter are defined in the `operators` property of the `parameters` object with each pathname object.

These operators can be specified either as the mathematical symbol (`=`, `>`, `<=` etc), or as their character equivalents (`EQ`, `GT`, `LTE` etc)

Refer to the `numericOperatorsMap` object in file [`srv/config/config.js`](./srv/config/config.js) for a complete list of the permitted operators.

<!-- *********************************************************************** -->
<a name="limitations"></a>
## Limitations

1. All query string parameter values are `And`'ed together.  It is not possible to create an API query that uses the `OR` operator across the query string parameters

1. Only one parenthesised operator can be specified for a given query string parameter

1. If the server remains running for more than 24 hours (the default refresh period), the data in the database will need to be refreshed.  This is done by visiting the `/admin` page and pressing "Refresh Server Data"


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

Chris Whealy  <chris@whealy.com>

<a name="license"></a>
## License

This project is licensed under the Apache Software License, Version 2.0 except as noted otherwise in the [LICENSE](LICENSE) file.
