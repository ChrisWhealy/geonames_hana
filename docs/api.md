<a name="top"></a>
# API for geonames\_hana

Documentation for the HTTP API for requesting geopolitical data from the `geonames_hana` server


## Table of Contents

* [General Behaviour](#user-content-general-behaviour)
* [Simple Query](#user-content-simple-query)
* [Simple Read](#user-content-simple-read)
* [Parameterised Query](#user-content-parameterised-query)
* [Alternative API Field Names](#user-content-alt-field-names)
* [API Field Names for Generated HANA DB Column Names](#user-content-gen-field-names)
* [Querying Boolean Fields](#user-content-boolean-fields)
* [Operator Values in Query String Fields](#user-content-op-values)



<!-- *********************************************************************** -->
<a name="api"></a>
## API

The server accepts non-modifying HTTP requests.  Query or read requests will be accepted, but update, delete or create requests will be rejected.

When specifying parameter names in a query string, you must use either the camel-cased version of the property name seen in the returned JSON object (always starting with a lower-case letter), or if defined, you can use a convenience property name described [below](#user-content-alt-field-names).

<a name="general-behaviour"></a>
### General API Behaviour

* All queries have a hardcoded limit of 1000 rows
* All data is returned as a JSON array
* An array containing zero items means that no data was found to match the query string parameters
* An HTTP 400 "Bad Request" will be returned if a non-permitted operator is used for a parameter value

<a name="simple-query"></a>
### Simple Query

`https://<hostname>/api/v1/<table-name>`

A simple query against a table without any query string will return up to the first 1000 rows of that table as a JSON object.

<a name="simple-read"></a>
### Simple Read

`https://<hostname>/api/v1/<table-name>/<key-value>`

If the key value is known, this can be added directly to the table name URL.  The above query will return either the single row whose key exactly matches `<key-value>`, or an empty list.

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

These alternative names are listed in file [`srv/config/config.js`](../srv/config/config.js).  Look at the definition of object `api_v1`.  This object contains multiple properties whose names define the URL paths used to read a particular table.

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

This means that in the query string, the actual database field name `ISO2` can be queried using either the parameter name `countryCode` or the parameter name `iso2`.  For example, the following URLs are equivalent:

`https://<hostname>/api/v1/countries?iso2=GB`  
`https://<hostname>/api/v1/countries?countryCode=GB`

Both will return the country having the 2-character country code of `GB` (I.E. Great Britain)

`https://<hostname>/api/v1/countries?iso3=DEU`  
`https://<hostname>/api/v1/countries?countryCode3=DEU`

Both will return the country having a 3-character country code of `DEU` (I.E. Germany)

<a name="gen-field-names"></a>
### API Field Names for Generated HANA DB Column Names

When CDS compiles a data model, any table column declared as having an association to another table will be given a two-part, generated column name.  For instance, we happen to know that New York is also known as the "Big Apple", so we can search the `alternateNames` table as follows:

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

From this response, we can see that the `geonames` id of New York is  `5128581`; however, the table column name is `GEONAMEID_GEONAMEID` rather than the expected `GEONAMEID`.  This is due to the declaration of field `GeonameId` in [`Geonames.cds`](../db/Geonames.cds#L95)

For ease of use, the configuration allows you simply to use the shorter, expected field name, instead of the longer generated name.  For any given table, you can discover the accepted parameter names by checking the appropriate configuration file in [`srv/config/`](../srv/config/)

We can now discover all the alternate names for New York by issuing the URL:

`https://<hostname>/api/v1/alternate-names?geonameId=5128581`

This then returns an array containing 266 different names for New York.

***And While I think About It...***  
It is at this point we discover that the `ISOLANGUAGE` field has been overloaded and can contain a variety of values other than a 2- or 3-character ISO language code.  (See the documentation for the entity `AlternateNames` in [`Geonames.cds`](../db/Geonames.cds#L55) for details)

<a name="boolean-fields"></a>
### Querying Boolean Fields

The `alternateNames` table contains four Boolean fields: `ISPREFERREDNAME`, `ISSHORTNAME`, `ISCOLLOQUIAL` and `ISHISTORIC`.

From the above response, we can see that these field values are not displayed using the expected Boolean keywords `true` and `false`, but simply as `1` and `0`.

***IMPORTANT***  
Even though the Boolean data returned from a query is represented numerically, when issuing a query against a Boolean field, you must use the Boolean keywords `true` and `false` as the parameter value.

For instance, if you want to show only New York's historical names, then do not issue this query; it will ***never*** return any data:

`https://<hostname>/api/v1/alternate-names?geonameId=5128581&isHistoric=1`

Instead, you must issue this query:

`https://<hostname>/api/v1/alternate-names?geonameId=5128581&isHistoric=true`

At the time of writing, this query returns an array containing a single element.

<a name="op-values"></a>
### Operator Values in Query String Fields

Often you will need to issue a query that tests a value using some operator other than simple equivalence (`=`)

For instance, if you wish to search for all cities or administrative regions having a population greater than 10 million, then you can issue the following query to the `geonames` table:

`https://<hostname>/api/v1/geonames?featureClass=P&population=(GT,10000000)`  

Notice the syntax for the `population` parameter: `(GT,10000000)` 

By placing parentheses around the value, you can specify the operator first, followed by a comma, then the value.  The general pattern is:

`(<operator>,<value>)`

The operators permitted for a given parameter are defined in the `operators` property of the `parameters` object with each pathname object.  In the above example, the `population` property is configured to accept any operator in `numericOperatorsMap`.  See [`srv/config/geonames.js`](../srv/config/geonames.js#L31) for details.

These operators can be specified either as the mathematical symbol (`=`, `>`, `<=` etc), or as their character equivalents (`EQ`, `GT`, `LTE` etc)

If a query string parameter value contains a non-permitted operator, then this will generate an HTTP 400 "Bad Request" response.

Refer to the `numericOperatorsMap` object in file [`srv/config/config_settings.js`](../srv/config/config_settings.js#L25) for a complete list of the permitted operators.

[Top](#user-content-top)

