<a name="top"></a>
# Data Model For geonames\_hana

Documentation for the data model used by the HANA database sitting behind the `geonames_hana` HTTP server



<!-- *********************************************************************** -->
<a name="datamodel"></a>
## Data Model

### API Table Names

The table names shown below are used only by the API and exist simply to make the interface more intuitive and convenient.  The corresponding HANA database tables names are shown in the tables below

#### geonames
<table>
<tr><td><b>API Table Name</b></td>    <td><tt>geonames</tt></td></tr>
<tr><td><b>API Key Field</b></td>     <td><tt>geonameId</tt></td></tr>
<tr><td><b>API Key Field Type</b></td><td><tt>Integer64</tt></td></tr>
<tr><td><b>HANA DB Table Name</b></td><td><tt>ORG_GEONAMES_GEONAMES</tt></td></tr>
<tr><td><b>Description</b></td>       <td>All geopolitical data</td></tr>
</table>

#### alternate-names
<table>
<tr><td><b>API Table Name</b></td>    <td><tt>alternate-names</tt></td>
<tr><td><b>API Key Field</b></td>     <td><tt>alternateNameId</tt></td>
<tr><td><b>API Key Field Type</b></td><td><tt>Integer64</tt></td>
<tr><td><b>HANA DB Table Name</b></td><td><tt>ORG_GEONAMES_ALTERNATENAMES</tt></td></tr>
<tr><td><b>Description</b></td>       <td>Colloquial, shortened or language-specific names for entries in the <tt>geonames</tt> table</td></tr>
</table>

#### countries

<table>
<tr><td><b>API Table Name</b></td>    <td><tt>countries</tt></td>
<tr><td><b>API Key Field</b></td>     <td><tt>countryCode</tt></td>
<tr><td><b>API Key Field Type</b></td><td><tt>String(2)</tt></td>
<tr><td><b>HANA DB Table Name</b></td><td><tt>ORG_GEONAMES_BASE_GEO_COUNTRIES</tt></td></tr>
<tr><td><b>Description</b></td>       <td>All countries worldwide</td></tr>
</table>

#### continents

<table>
<tr><td><b>API Table Name</b></td>    <td><tt>continents</tt></td>
<tr><td><b>API Key Field</b></td>     <td><tt>continentCode</tt></td>
<tr><td><b>API Key Field Type</b></td><td><tt>String(2)</tt></td>
<tr><td><b>HANA DB Table Name</b></td><td><tt>ORG_GEONAMES_BASE_GEO_COUNTRIES</tt></td></tr>
<tr><td><b>Description</b></td>       <td>All continents</td></tr>
</table>

#### feature-classes

<table>
<tr><td><b>API Table Name</b></td>    <td><tt>feature-classes</tt></td>
<tr><td><b>API Key Field</b></td>     <td><tt>featureClass</tt></td>
<tr><td><b>API Key Field Type</b></td><td><tt>String(1)</tt></td>
<tr><td><b>HANA DB Table Name</b></td><td><tt>ORG_GEONAMES_BASE_FEATURE_CLASSES</tt></td></tr>
<tr><td><b>Description</b></td>       <td>Broad descriptive categories for organising geopolitical features</td></tr>
</table>

#### feature-codes

<table>
<tr><td><b>API Table Name</b></td>    <td><tt>feature-codes</tt></td>
<tr><td><b>API Key Field</b></td>     <td><tt>featureCode</tt></td>
<tr><td><b>API Key Field Type</b></td><td><tt>String(10)</tt></td>
<tr><td><b>HANA DB Table Name</b></td><td><tt>ORG_GEONAMES_BASE_FEATURE_CODES</tt></td></tr>
<tr><td><b>Description</b></td>       <td>More specific sub-categories within a broad feature class</td></tr>
</table>

#### languages

<table>
<tr><td><b>API Table Name</b></td>    <td><tt>languages</tt></td>
<tr><td><b>API Key Field</b></td>     <td><tt>iso639-3</tt></td>
<tr><td><b>API Key Field Type</b></td><td><tt>String(3)</tt></td>
<tr><td><b>HANA DB Table Name</b></td><td><tt>ORG_GEONAMES_BASE_LANG_LANGUAGECODES</tt></td></tr>
<tr><td><b>Description</b></td>       <td>All known languages.<br>This includes not only languages that are extinct, ancient, historical or constructed, but also macro-languages.  For instance, there are many regional dialects of Arabic, but all belong to the macro-language known as "Generic Arabic"</td></tr>
</table>

#### timezones

<table>
<tr><td><b>API Table Name</b></td>    <td><tt>timezones</tt></td>
<tr><td><b>API Key Field</b></td>     <td><tt>name</tt></td>
<tr><td><b>API Key Field Type</b></td><td><tt>String(40)</tt></td>
<tr><td><b>HANA DB Table Name</b></td><td><tt>ORG_GEONAMES_BASE_TIME_TIMEZONES</tt></td></tr>
<tr><td><b>Description</b></td>       <td colspan="3">All timezones</td></tr>
</table>


[Top](#user-content-top)



