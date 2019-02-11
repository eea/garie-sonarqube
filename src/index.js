const garie_plugin = require('garie-plugin');
const path = require('path');
const fs = require('fs-extra');
const dateFormat = require('dateformat');
const config = require('../config');
const request = require('request-promise');
const express = require('express');
const serveIndex = require('serve-index');
const urlparser = require('url');


function getTag(url){

        var urlObject = urlparser.parse(url);


        var tag = (urlObject.hostname+urlObject.path.replace("/","-")).toLowerCase();
	
	if ( tag.substring(tag.length-1, tag.length) == '-' ) {
	 tag = tag.substring(0,tag.length-1);
	}
	console.log(` Url ${url} has tag ${tag}`);

	return tag ;
}



const getProjectsByTag = async (tag) => {


  return new Promise(async (resolve, reject) => {
    try {

      const sonarqubeApi = process.env.SONARQUBE_API_URL+"/api/components/search_projects";


        data = await request({
          method: 'GET',
          uri: sonarqubeApi,
          body: {
            'ps':  200, //maximum 
            'filter': `tags%20%3D%20${tag}`
          },
          json: true,
          resolveWithFullResponse: true
        });

    console.log(data['body']);

    // write data
	    //
	    //
      if ( data['body']["paging"]["total"] > data['body']['paging']['pageSize'] ) {
              console.log("No paging implemented, too many projects per url - limit is 500");
              reject("reject");
      }

      resolve(data["components"]);
    } catch (err) {
      console.log(err);
      reject("reject");
    }

  });
}



const getProjectStats = async (projects) => {


  return new Promise(async (resolve, reject) => {
    try {
  
    projectKeys="";
    do_not_count_coverage=","
    for (var i = 0; i < projects.length; i++) {
        projectKeys=projectKeys+projects[i]["key"]+",";
        if ( projects[i]["tags"].indexOf("do-not-report-coverage") >=0 ) 
	{
		do_not_count_coverage=do_not_count_coverage+projects[i]["key"];
	}
    }
 
       projectKeys=projectKeys.substring(0, projectKeys.length-1);


      const sonarqubeApi = process.env.SONARQUBE_API_URL+"/api/measures/search";


        data = await request({
          method: 'GET',
          uri: sonarqubeApi,
          body: {
            'projectKeys':  projectKeys,
            'metricKeys': 'bugs,reliability_rating,vulnerabilities,security_rating,code_smells,sqale_rating,duplicated_lines_density,coverage,lines_to_cover,uncovered_lines,duplicated_lines,lines'
          },
          json: true,
          resolveWithFullResponse: true
        });

    //write data

     console.log(data);

         stats={'bugs':0,'reliability_rating':1,'vulnerabilities':0,'security_rating':1,'code_smells':0,'sqale_rating':1,'duplicated_lines_density':0, 'coverage':0, 'lines_to_cover': 0, 'uncovered_lines': 0, 'duplicated_lines': 0, 'lines': 0 , 'non_duplication_rating': 100, 'coverage_rating': 100 };


          for (var i = 0; i < data["measures"].length; i++) {

           measure=data["measures"][i];
    
	  if ( (measure["metric"] === 'reliability_rating') || (measure["metric"] === 'security_rating' ) ||  (measure["metric"] === 'sqale_rating' )) {
              if (measure["value"] > stats[measure["metric"]] ) {
	          stats[measure["metric"]]=measure["value"];

	      }
	  }
	  else{
               if ( (measure["metric"] === "lines_to_cover" ||  measure["metric"] === "uncovered_lines") && do_not_count_coverage.indexOf(","+measure["component"]+",") >= 0 )
		  {
			  console.log(`Skipping adding coverage stats from ${measure["key"]} `);
		  }
		  else
			  {
		   	stats[measure["metric"]]=stats[measure["metric"]]+measure["value"];
			  }
	  }
         }

         if ( stats['lines'] > 0 ) {
         stats['non_duplication_rating'] = 100 - (stats['duplicated_lines'] *100 / stats['lines']);
	 }
		  if ( stats['lines_to_cover'] > 0 ) {
         
		  stats['coverage_rating'] = 100 - (stats['uncovered_lines'] *100 / stats['lines_to_cover']);
		  }
             resolve(stats);
    } catch (err) {
      console.log(err);
      reject("reject");
    }

  });
}



const getData = async (options) => {
  const {
    url
  } = options.url_settings;

  var result = {}


  return new Promise(async (resolve, reject) => {

    console.log("get tag");
    tag = getTag(url);
    console.log("get projects");

    projects = await getProjectsByTag(tag);

    console.log("get stats");

    stats = await getProjectStats(projects);


    resolve(stats);

  });
};




console.log("Start");


const app = express();
app.use('/reports', express.static('reports'), serveIndex('reports', { icons: true }));

const main = async () => {

  garie_plugin.init({
    database: "sonarqube",
    getData: getData,
    app_name: 'sonarqube-results',
    app_root: path.join(__dirname, '..'),
    config: config
  });

}

if (process.env.ENV !== 'test') {
  app.listen(3000, async () => {
    console.log('Application listening on port 3000');
    await main();
  });
}


