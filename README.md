<a name="top"></a>
# cloud\_cf\_geonames\_hana


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
1. An HDI container - the default being `geonames-hdi`.  If you decide to use a different name, you must change this name where it appears in lines 21 and 23 of `mta.yml`
1. You have access to SAP Web IDE Full-Stack and have configured it to connect to the Cloud Foundry in which the above HDI Container lives
1. Via Web IDE Full-Stack, you have installed an up-to-date Builder application in your CF account


<!-- *********************************************************************** -->
<a name="download"></a>
## Download and Installation

Clone this repository into Web IDE Full-Stack



<!-- *********************************************************************** -->
<a name="configuration"></a>
## Configuration

1. Build and deploy the `db/` folder.  This will deploy the CDS data model to your HANA instance and load *some* of the tables with static data
1. Run the `srv/` service to start the server.  When this server starts for the first time, it will download all the relevant ZIP files from <http://geonames.org>, unzip them, and transfer the tab-delimited text file data into the two main tables:
    * `ORG_GEONAMES_GEONAMES` 
    * `ORG_GEONAME_ALTERNATENAMES`

    The expected initial load time for the entire database is about 15 minutes, and between them, these two tables will contain around 26 million rows


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

SAP


<a name="license"></a>
## License

Copyright (c) 2019 SAP SE or an SAP affiliate company. All rights reserved.
This project is licensed under the Apache Software License, Version 2.0 except as noted otherwise in the [LICENSE](LICENSE) file.
