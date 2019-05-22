<a name="top"></a>
# Data Model For geonames\_hana

Documentation for the data model used by the HANA database sitting behind the `geonames_hana` HTTP server



<!-- *********************************************************************** -->
<a name="datamodel"></a>
## Data Model

### Table Names

The following table names are used by the API.  These names are used only by the API and exist simply for convenience.  The underlying database tables names are shown in the table below

<table>
<tr><th>API Table Name</th>
    <th>API Key Field</th>
    <th>API Key Field Type</th>
    <th>HANA DB Table Name</th></tr>
<tr><td><tt>geonames</tt></td>
    <td><tt>geonameId</tt></td>
    <td><tt>Integer64</tt></td>
    <td><tt>ORG_GEONAMES_GEONAMES</tt></td></tr>
<tr><td>&nbsp;</td>
    <td colspan="3">All geopolitical data</td></tr>

<tr><td><tt>alternate-names</tt></td>
    <td><tt>alternateNameId</tt></td>
    <td><tt>Integer64</tt></td>
    <td><tt>ORG_GEONAMES_ALTERNATENAMES</tt></td></tr>
<tr><td>&nbsp;</td>
    <td colspan="3">Colloquial, shortened or language-specific names for entries in the <tt>geonames</tt> table</td></tr>

<tr><td><tt>countries</tt></td>
    <td><tt>countryCode</tt></td>
    <td><tt>String(2)</tt></td>
    <td><tt>ORG_GEONAMES_BASE_GEO_COUNTRIES</tt></td></tr>
<tr><td>&nbsp;</td>
    <td colspan="3">All countries worldwide</td></tr>

<tr><td><tt>continents</tt></td>
    <td><tt>continentCode</tt></td>
    <td><tt>String(2)</tt></td>
    <td><tt>ORG_GEONAMES_BASE_GEO_COUNTRIES</tt></td></tr>
<tr><td>&nbsp;</td>
    <td colspan="3">All continents</td></tr>

<tr><td><tt>feature-classes</tt></td>
    <td><tt>featureClass</tt></td>
    <td><tt>String(1)</tt></td>
    <td><tt>ORG_GEONAMES_BASE_FEATURE_CLASSES</tt></td></tr>
<tr><td>&nbsp;</td>
    <td colspan="3">Broad descriptive categories for organising geopolitical features</td></tr>

<tr><td><tt>feature-codes</tt></td>
    <td><tt>featureCode</tt></td>
    <td><tt>String(10)</tt></td>
    <td><tt>ORG_GEONAMES_BASE_FEATURE_CODES</tt></td></tr>
<tr><td>&nbsp;</td>
    <td colspan="3">More specific sub-categories within a broad feature class</td></tr>

<tr><td><tt>languages</tt></td>
    <td><tt>iso639-3</tt></td>
    <td><tt>String(3)</tt></td>
    <td><tt>ORG_GEONAMES_BASE_LANG_LANGUAGECODES</tt></td></tr>
<tr><td>&nbsp;</td>
    <td colspan="3">All known languages.<br>This includes not only languages that are extinct, ancient, historical or constructed, but also macro-languages.  For instance, there are many regional dialects of Arabic, but all belong to the macro-language known as "Generic Arabic"</td></tr>

<tr><td><tt>timezones</tt></td>
    <td><tt>name</tt></td>
    <td><tt>String(40)</tt></td>
    <td><tt>ORG_GEONAMES_BASE_TIME_TIMEZONES</tt></td></tr>
<tr><td>&nbsp;</td>
    <td colspan="3">All timezones</td></tr>

</table>


[Top](#user-content-top)



