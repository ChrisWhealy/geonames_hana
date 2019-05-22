<a name="top"></a>
# geonames\_hana

An NodeJS HTTP server that provides a wide range of geopolitical information available from <http://geonames.org>


## Table of Contents

* [Description](#user-content-description)
* [Requirements](#user-content-requirements)
* [Download](#user-content-download)
* [Configuration](#user-content-configuration)
* [Functionality](#user-content-functionality)
    * [Startup](#user-content-startup)
    * [Refresh Period](#user-content-refresh)
    * [HANA Write Batch Size](#user-content-batch-size)
* [Data Model](#user-content-datamodel)
* [API](#user-content-api)
    * [Simple Query](#user-content-simple-query)
    * [Simple Read](#user-content-simple-read)
    * [Parameterised Query](#user-content-parameterised-query)
    * [Alternative API Field Names](#user-content-alt-field-names)
    * [API Field Names for Generated HANA DB Column Names](#user-content-gen-field-names)
    * [Querying Boolean Fields](#user-content-boolean-fields)
    * [Operator Values in Query String Fields](#user-content-op-values)
* [Limitations](#user-content-limitations)
* [Issues](#user-content-issues)
* [Support](#user-content-support)
* [Contributing](#user-content-contributing)
* [License](#user-content-license)



<!-- *********************************************************************** -->
<a name="description"></a>
## Description

The HTTP server responds to read-only, RESTful queries and supplies a wide range of geopolitical information available from <http://geonames.org>

This server is designed for public access, therefore, incoming requests do not require any authentication.  

[Top](#user-content-top)

<!-- *********************************************************************** -->
<a name="requirements"></a>
## Requirements

In order to implement this server, you will need:

1. A HANA instance.  A productive HANA instance is preferable, but a trial HANA instance will suffice.
1. An HDI container - the default name for this container being `geonames-hdi`.  
    Its fine to use a different HDI container name, but you must then change the name `geonames-hdi` where it appears in lines 21 and 23 of `mta.yaml`
1. Access to SAP Web IDE Full-Stack.  Web IDE must be configured to connect to the Cloud Foundry account in which the above HDI Container lives

[Top](#user-content-top)



<!-- *********************************************************************** -->
<a name="download"></a>
## Download and Installation

Clone this repository into Web IDE Full-Stack

[Top](#user-content-top)



<!-- *********************************************************************** -->
<a name="configuration"></a>
## Configuration

***IMPORTANT***  
Some of the data loaded into the HANA database changes so infrequently, that it can be considered static.  Therefore, this data has been hard-coded into [`.csv`](./db/src/csv) files that are part of the CDS data model definition.

1. Build and deploy the `/db` folder.  This will deploy the CDS data model to your HANA instance and load ***some*** of the tables with static data
1. Run the `/srv` service to start the server.  When this server starts for the very first time, the two main database tables will be empty.  Go to the `/admin` screen and press the "Refresh Server Data" button.  
    This will download all the relevant ZIP files from <http://geonames.org> (approximately 500 files - 2 per country), unzip them, and transfer the tab-delimited text data into the two main database tables:
    * `ORG_GEONAMES_GEONAMES` 
    * `ORG_GEONAMES_ALTERNATENAMES`

***WARNING***  
The `ORG_GEONAMES_BASE_GEO_COUNTRIES` table contains data not only for all 252 countries in the world, but also a special country with the non-standard country code `XX`.

This country code exists in order to identify geopolitical information that does ***not*** belong to any particular country (such as underwater features that exist in international waters).  However, the geopolitical data falling into this category is ***not*** downloaded from the expected `XX.zip` file, but instead from `no-country.zip`.

Data belonging to country `XX` must be treated as a special case in various parts of the coding (E.G. in [`srv/loader.js`](./srv/loader.js#L26))

[Top](#user-content-top)



<!-- *********************************************************************** -->
<a name="functionality"></a>
## Functionality

<a name="startup"></a>
### Startup

When the server starts, an HTTP server is made available that responds to read-only RESTful queries.

Every 24 hours (1440 minutes) the data in the HANA database needs to be refreshed.  This is done from the `/admin` page.  It is not possible to refresh the data more often than once in any given 24 hour period.

When loading all the country data into a productive HANA instance, the refresh can take around 15 to 18 minutes; however, if you are using a trial HANA instance, it could take as long as 30 minutes.

Also, the GeoNames website does not allow more than about 5 open sockets from the same IP address; hence, all download requests must be grouped into batches of 5.  This is the main reason for why the refresh process takes as long as it does.

***IMPORTANT***  
Occasionally, the Geonames server will unexpectedly close an open socket, thus killing the server start up process.  If this happens, simply restart the server and restart the synchronisation process

<a name="refresh"></a>
### Refresh Period

The data in <http://geonames.org> is crowd-sourced and typically changes every day.  Therefore, it is necessary to define a refresh period, after which, the duplicated data in the HANA database must be refreshed.

The refresh period is defined in minutes at the start of file [`srv/config/config.js`](./srv/config/config.js).

```javascript
// DB refresh period in minutes
const refreshFrequency = 1440
```

By default, it is set to 24 hours (1440 minutes)

It is possible however that the data for a certain country has not changed within the last 24 hours.  Therefore, the requests to download a country's ZIP are always made with the `'If-None-Match'` HTTP header field set to the eTag value returned from the last time this ZIP was downloaded.

<a name="batch-size"></a>
### HANA write batch size

By default, when writing data to HANA, table rows are grouped into batches of 20,000 rows.  If needed, the batch size can be changed by altering the value of `hanaWriteBatchSize` at the start of file [`srv/config/config.js`](./srv/config/config.js).

```javascript
// Number of rows to write to HANA in a single batch
const hanaWriteBatchSize = 20000
```

[Top](#user-content-top)



<!-- *********************************************************************** -->
<a name="datamodel"></a>
## Data Model

The CDS data model is derived from the table structure used by <http://geonames.org>.  This geopolitical information is both crowd-sourced and public.

Since the data on <http://geonames.org> is crowd-sourced, it changes regularly.  Consequently, the data in the HANA database will potentially become stale after 24 hours (or 1440 minutes).

From the HTTP server's `/admin` page, you can see a list of all the countries and the timestamp of when each country's data was last refreshed.  Simply hit the "Refresh Server Data" button and as long a gap of at least 1440 minutes has elapsed, the HANA database will be updated from the latest country files available on <http://geonames.org>


### Table Names

The following table names are used by the API.  These names are used only by the API and exist for convenience.  The underlying database tables names are shown in the table below

| API Table Name | API Key<br>Field | API Key<br>Field Type | HANA DB Table Name | Description |
|---|---|---|---|---|
| `geonames` | `geonameId` | `Integer64` | `ORG_GEONAMES_GEONAMES` | All geopolitical data 
| `alternate-names` | `alternateNameId` | `Integer64` | `ORG_GEONAMES_ALTERNATENAMES` |  Colloquial, shortened or language-specific names for entries in the `geonames` table
| `countries` | `countryCode` | `String(2)` | `ORG_GEONAMES_BASE_GEO_COUNTRIES` |  All countries worldwide
| `continents` | `continentCode` | `String(2)` | `ORG_GEONAMES_BASE_GEO_CONTINENTS` |  All continents
| `feature-classes` | `featureClass` | `String(1)` | `ORG_GEONAMES_BASE_FEATURE_CLASSES` |  Broad categorisation of geopolitical features
| `feature-codes` | `featureCode` | `String(10)` | `ORG_GEONAMES_BASE_FEATURE_CODES` |  Sub-categories within a feature class
| `languages` | `iso639-3` | `String(3)` | `ORG_GEONAMES_BASE_LANG_LANGUAGECODES` |  All known languages.  This includes not only langauges that are extinct, ancient, historical or constructed, but also macrolanguages (E.G. There are many regional dialects of Arabic, but all belong to the macrolanguage known as "Generic Arabic")
| `timezones` | `name` | `String(40)` | `ORG_GEONAMES_BASE_TIME_TIMEZONES` |  All timezones

[Top](#user-content-top)



<!-- *********************************************************************** -->
<a name="api"></a>
## API

The server accepts non-modifying HTTP requests.  Query or read requests will be accepted, but update, delete or create requests will be rejected.

When specifying field names in a query string, you must use the camel-cased version of the property name seen in the returned JSON object, or you can use the convenience property names described [below](#user-content-alt-field-names).

<a name="simple-query"></a>
### Simple Query

`https://<hostname>/api/v1/<table-name>`

This will return the first 1000 rows of `<table-name>` as a JSON object

<a name="simple-read"></a>
### Simple Read

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

<a name="parameterised-query"></a>
### Parameterised Query

`https://<hostname>/api/v1/<table-name>?<key-name>=<key-value>`

This will return zero or more rows where `<key-name>` matches `<key-value>`.  For instance, the above READ request shown above can be turned into an equivalent QUERY request as follows:

`https://<hostname>/api/v1/languages?iso639-3=deu`

<a name="alt-field-names"></a>
### Alternative API Field Names

The property names of the returned JSON objects are the field names used in the HANA database tables - and these names are not always intuitive!

For example, the 3-character language code in the `languages` table is stored in field `iso639-3`.  Such field names are both technical and obscure, and therefore don't improve the API's usability.  Consequently, alternate, human-readable names have been configured that can be used in the API as more user-friendly alternatives.

These alternative names are listed in file [`srv/config/config.js`](./srv/config/config.js).  Look at the definition of object `api_v1`.  This object contains multiple properties whose names define the URL paths used to read a particular table.

Each pathname property is itself an object containing a `parameters` property.  For instance, part of the pathname object for `api/v1/countries` contains a property called `parameters` that itself is another object:

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

Each property in the `parameters` object defines the name of a field permitted in the query string.

However, notice that for both the `countryCode` and `iso2` objects, the `colName` properties share the same value of `ISO2`.  Similarly, the `colName` properties of the `countryCode3` and `iso3` objects share the value `ISO3`

This means that in the query string, the actual database field name `ISO2` can be queried using either name `countryCode` or the name `iso2`.  For example, the following pairs of query strings are equivalent:

`https://<hostname>/api/v1/countries?iso2=GB`  
`https://<hostname>/api/v1/countries?countryCode=GB`

Both will return the country having the 2-character country code of `GB` (I.E. Great Britain)

`https://<hostname>/api/v1/countries?iso3=DEU`  
`https://<hostname>/api/v1/countries?countryCode3=DEU`

Both will return the country having the 3-character country code of `DEU` (I.E. Germany)

<a name="gen-field-names"></a>
### API Field Names for Generated HANA DB Column Names

When CDS compiles a data model, any table column declared as having an association to a field in another table will be given a two-part, generated column name.  For instance, we happen to know that New York is also known as "The Big Apple", so we can search the `alternateNames` table as follows:

`https://<hostname>/api/v1/alternate-names?alternateName=Big%20Apple`

This then generates the following result:

```json
[
  {
    "ALTERNATENAMEID": 1554355,
    "ISOLANGUAGE": "en",
    "ALTERNATENAME": "Big Apple",
    "ISPREFERREDNAME": 0,
    "ISSHORTNAME": 0,
    "ISCOLLOQUIAL": 1,
    "ISHISTORIC": 0,
    "INUSEFROM": "",
    "INUSETO": "",
    "GEONAMEID_GEONAMEID": 5128581
  }
]
```

From this response, we can see that the id of New York is  `5128581` in the `geonames` table; however, the table column name is `GEONAMEID_GEONAMEID`, not the expected `GEONAMEID`.  This is due to the declaration of field `GeonameId` in in [`Geonames.cds`](./db/Geonames.cds#L95)

For ease of use, the configuration allows you simply to use the expected field name, instead of the longer generated name.  We can now discover all the alternate names for New York by issuing the URL:

`https://<hostname>/api/v1/alternate-names?geonameId=5128581`

This then returns an array containing 266 different names for New York.

BTW: It is at this point we discover that the `ISOLANGUAGE` field has been overloaded and could contain a variety of values other than a 2- or 3-character ISO language code.  (See the documentation for the entity `AlternateNames` in [`Geonames.cds`](./db/Geonames.cds#L55) for details)

<a name="boolean-fields"></a>
### Querying Boolean Fields

The `alternateNames` table contains four Boolean fields: `ISPREFERREDNAME`, `ISSHORTNAME`, `ISCOLLOQUIAL` and `ISHISTORIC`.

From the above response, we can see that these field values are not displayed as the expected keywords `true` and `false`, but simply as `1` and `0`.

***IMPORTANT***  
When issuing a query against a Boolean field, you must use the `true` and `false` keywords in the query string parameter!

For instance, if you want to show only colloquial names for New York, this query will ***always*** return an empty array:

`https://<hostname>/api/v1/alternate-names?geonameId=5128581&isHistoric=1`

But this query will return an array with one entry

`https://<hostname>/api/v1/alternate-names?geonameId=5128581&isHistoric=true`

<a name="op-values"></a>
### Operator Values in Query String Fields

Often you will need to issue a query that tests a value using some operator other than simple equivalence (`=`)

For instance, if you wish to search for all cities or administrative regions having a population greater than 10 million, you should issue the following query to the `geonames` table:

`https://<hostname>/api/v1/geonames?featureClass=P&population=(GT,10000000)`  

Notice the syntax for the `population` query string parameter: `(GT,10000000)` 

By placing parentheses around the value, you can specify the operator first, followed by a comma, then the value.  The general pattern is:

`(<operator>,<value>)`

The operators that are permitted for a given parameter are defined in the `operators` property of the `parameters` object with each pathname object.

These operators can be specified either as the mathematical symbol (`=`, `>`, `<=` etc), or as their character equivalents (`EQ`, `GT`, `LTE` etc)

Refer to the `numericOperatorsMap` object in file [`srv/config/config.js`](./srv/config/config.js) for a complete list of the permitted operators.

[Top](#user-content-top)



<!-- *********************************************************************** -->
<a name="limitations"></a>
## Limitations

1. All query string parameter values are `And`'ed together.  
    It is not currently possible to create an API query that uses the `OR` operator across the query string parameters

1. Only one parenthesised value can be specified for a given query string parameter

1. If the server remains running for more than 24 hours (the default refresh period), the data in the database will need to be refreshed.  This is done by visiting the `/admin` page and pressing "Refresh Server Data"

[Top](#user-content-top)



<!-- *********************************************************************** -->
<a name="issues"></a>
## Known Issues

None so far...

:-)

[Top](#user-content-top)



<!-- *********************************************************************** -->
<a name="support"></a>
## Support

This project is provided "as-is": there is no guarantee that raised issues will be answered or addressed in future releases.

[Top](#user-content-top)



<!-- *********************************************************************** -->
<a name="contributing"></a>
## Contributing

Chris Whealy  <chris@whealy.com>

[Top](#user-content-top)



<!-- *********************************************************************** -->
<a name="license"></a>
## License

This project is licensed under the Apache Software License, Version 2.0 except as noted otherwise in the [LICENSE](LICENSE) file.

[Top](#user-content-top)
