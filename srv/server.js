// const cds = require('@sap/cds')

// var colNames = "GeonameId,Name,Latitude,Longitude,FeatureClass,FeatureCode,CountryCode,CountryCodesAlt,Admin1,Admin2,Admin3,Admin4,Population,Elevation,DEM,Timezone,LastModified"

// var tableRow = [
//   2986043,'Pic de Font Blanca',42.64991,1.53335,'T','PK','AD',null,'00',null,null,null,0,null,2860,'Europe/Andorra','2014-11-05'
// ]

// cds.connect()

// cds.run(
//   `upsert ORG_GEONAMES_GEONAMES (${colNames}) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) with primary key`,
//   tableRow
// )

const http = require('http')
const bfu  = require('basic-formatting-utils')

const vcap_app = JSON.parse(process.env.VCAP_APPLICATION)
const port     = process.env.PORT || 3000

const resp_html = 
  bfu.as_html([],
     bfu.as_body([]
     , [ bfu.create_content(
         [ {title: "VCAP_SERVICES",    value: JSON.parse(process.env.VCAP_SERVICES)}
         , {title: "VCAP_APPLICATION", value: vcap_app}
         , {title: "NodeJS process",   value: process}
         ])
       ].join("")
     )
  )

const server = http.createServer((req, res) => {
  res.statusCode = 200
  res.setHeader('Content-Type', 'text/html')
  res.end(resp_html)
})

server.listen(port, () => console.log(`Server running at ${vcap_app.uris[0]}:${port}/`))


