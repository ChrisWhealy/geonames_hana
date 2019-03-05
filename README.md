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

1. A productive HANA instance
1. An HDI container - the default name for this container being `geonames-hdi`.  
    Its fine to use a different HDI container name, but you must then change `geonames-hdi` name where it appears in lines 21 and 23 of `mta.yaml`
1. Access to SAP Web IDE Full-Stack and have configured it to connect to the Cloud Foundry in which the above HDI Container lives
1. Via Web IDE Full-Stack, you have installed an up-to-date Builder application in your CF account


<!-- *********************************************************************** -->
<a name="download"></a>
## Download and Installation

Clone this repository into Web IDE Full-Stack



<!-- *********************************************************************** -->
<a name="configuration"></a>
## Configuration

1. Build and deploy the `db/` folder.  This will deploy the CDS data model to your HANA instance and load ***some*** of the tables with static data
1. Run the `srv/` service to start the server.  When this server starts for the first time, it will download all the relevant ZIP files from <http://geonames.org> (approximately 500 files), unzip them, and transfer the tab-delimited text data into the two main tables:
    * `ORG_GEONAMES_GEONAMES` 
    * `ORG_GEONAMES_ALTERNATENAMES`

    The expected initial load time for the entire database is about 15 minutes, after which these two tables will contain around 26 million rows between them

***WARNING***  
The `ORG_GEONAMES_BASE_GEO_COUNTRIES` table contains data not only for all 252 countries in the world, but also a special country with the country code `XX`.

This is the country code for geopolitical information that does not belong to any particular country.  However, the geopolitical data falling into this category is downloaded from a GeoNames.org file called `no-country.zip` rather than the expected `XX.zip`.

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
