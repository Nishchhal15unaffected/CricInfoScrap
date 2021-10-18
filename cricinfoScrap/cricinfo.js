// node cricinfo.js --url="https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results"

//required libraries 
const minimist = require("minimist");
const axios = require("axios");
const jsdom = require("jsdom");
const fs = require("fs");
const excel=require('excel4node');
const path = require("path");
const pdflib=require("pdf-lib");
//input 
const argv = minimist(process.argv);


//get url from cricinfo axios give promises
const urlPrms = axios.get(argv.url);
urlPrms.then(function (url) {

   //get html using url.data and make dom 
   let dom = new jsdom.JSDOM(url.data);
   let document = dom.window.document;
   // get all div box
   let matchCard = document.querySelectorAll(".match-info.match-info-FIXTURES");
   //made array of object for store all relevent info.
   let matches = [];
   // trevel on a div and get all relevent info.
   for (let matchBox = 0; matchBox < matchCard.length; matchBox++) {
      let match = {
      }
      //get both team name
      teamNames = matchCard[matchBox].querySelectorAll("p.name");
      match.t1 = teamNames[0].textContent;
      match.t2 = teamNames[1].textContent;
      //get both teams score
      let scoreSpan = matchCard[matchBox].querySelectorAll("div.score-detail > span.score")
      if (scoreSpan.length == 2) {  //if bat both team
         match.team1Score = scoreSpan[0].textContent;
         match.team2Score = scoreSpan[1].textContent;
      } else if (scoreSpan.length == 1) {  // if bat only one team due to rain
         match.team1Score = scoreSpan[0].textContent;
         match.team2Score = "";
      } else {   // didnt play any team cancel match due to some reasone
         match.team1Score = "";
         match.team1Score = "";
      }
      // get result who is winner
      let result = matchCard[matchBox].querySelector("div.status-text > span");
      match.result = result.textContent;
      //push objects on matches array for relevent info
      matches.push(match);
   }
   // convert jso to json for file save
   let matchesJson = JSON.stringify(matches);
   fs.writeFile("matches.json", matchesJson, function (err) {
      if (err) {
         console.log(err);
      }
   })
   //teams array of object for all info in a manner so we can put it on excel and pdf easily 
   let teams=[];
   //trevel on matches array 
   for(let i=0;i<matches.length;i++){
      pushTeamInTeams(teams,matches[i].t1);
      pushTeamInTeams(teams,matches[i].t2);
   }
   pushDetailsInTeams(teams,matches);
   
   let teamsJson = JSON.stringify(teams);
   fs.writeFile("teams.json", teamsJson, function (err) {
      if (err) {
         console.log(err);
      }
   })
   //made excel sheeet using excel4node
   madeExcelSheet(teams);
   madePdf(teams);
}).catch(function (err) {
   console.log(err);
})


function pushTeamInTeams(teams,Teamname){
       // travel on teams array and check team 1 of matches is available in teams array 
      //if not put it on teams arrry 
      let t1idx=-1;
      for(let j=0;j<teams.length;j++){
         if(Teamname==teams[j].name){
            t1idx=j;
         }
      }
      if(t1idx==-1){
         let team={
            name:Teamname,
            matches:[]
         }
         teams.push(team);
      }
}

//push all details in teams json like all matchest and score result of perticular team in matches of teams array
function pushDetailsInTeams(teams,matches){
   for(let i=0;i<teams.length;i++){
      let name=teams[i].name;
      for(let j=0;j<matches.length;j++){
         if(name==matches[j].t1 || name==matches[j].t2){
            if(name==matches[j].t1 ){
               teams[i].matches.push({
                  opponenetTeam:matches[j].t2,
                  teamScore:matches[j].team1Score,
                  opponentScore:matches[j].team2Score,
                  result:matches[j].result
               })
            }else{
               teams[i].matches.push({
                  opponenetTeam:matches[j].t1,
                  teamScore:matches[j].team2Score,
                  opponentScore:matches[j].team1Score,
                  result:matches[j].result
               })
            }
         }
      }
   }
}

function madeExcelSheet(teams){
   if(!fs.existsSync("WorldCup2019"))
      fs.mkdirSync("WorldCup2019");  
   let wb;
   for(let i=0;i<teams.length;i++){
      wb=new excel.Workbook();
      let folderPath=path.join("WorldCup2019",teams[i].name);
      if(!fs.existsSync(folderPath))
         fs.mkdirSync(folderPath);
      let style=wb.createStyle({
         font:{
            color:"#ff0800",
            size:12
         }
      })
      for(let j=0;j<teams[i].matches.length;j++){
         let ws=wb.addWorksheet(teams[i].matches[j].opponenetTeam);
         ws.cell(1,1).string("team1");
         ws.cell(1,2).string("team2");
         ws.cell(1,3).string("team1Score");
         ws.cell(1,4).string("team2Score");
         ws.cell(1,5).string("result");
         ws.cell(2,1).string(teams[i].name);
         ws.cell(2,2).string(teams[i].matches[j].opponenetTeam);
         if(teams[i].matches[j].teamScore){
         ws.cell(2,3).string(teams[i].matches[j].teamScore);
         }else{
         ws.cell(2,3).string("Not played");
         }
         if(teams[i].matches[j].opponentScore){
         ws.cell(2,4).string(teams[i].matches[j].opponentScore);
         }else{
            ws.cell(2,3).string("Not played");
         }
         ws.cell(2,5).string(teams[i].matches[j].result);
      }
      let fpath=path.join(folderPath,teams[i].name+".csv");
      wb.write(fpath);
   } 
}

function madePdf(teams){
   if(!fs.existsSync("WorldCup2019PDF"))
      fs.mkdirSync("WorldCup2019PDF");
   for(let i=0;i<teams.length;i++){
      let folderPath=path.join("WorldCup2019PDF",teams[i].name);
      if(!fs.existsSync(folderPath))
         fs.mkdirSync(folderPath);

      for(let j=0;j<teams[i].matches.length;j++){
         let pdfName=path.join(folderPath,teams[i].matches[j].opponenetTeam+'.pdf');
         fs.readFile("Template.pdf",function(err,template){
            if(err){
               console.log(err);
            }
            let pmsLoadPdf=pdflib.PDFDocument.load(template);
            pmsLoadPdf.then(function(loadPdf){
               let page=loadPdf.getPage(0);
               page.drawText(teams[i].name,{
                  x:350,
                  y:645,
                  size:11
               });
               page.drawText(teams[i].matches[j].opponenetTeam,{
                  x:350,
                  y:632,
                  size:11
               });
               if(teams[i].matches[j].teamScore){
               page.drawText(teams[i].matches[j].teamScore,{
                  x:350,
                  y:619,
                  size:11
               });
            } else{
               page.drawText("Not Played",{
                  x:350,
                  y:606,
                  size:11
               });
            } 
            if(teams[i].matches[j].opponentScore){
               page.drawText(teams[i].matches[j].opponentScore,{
                  x:350,
                  y:606,
                  size:11
               });
            }else{
               page.drawText("Not Playes",{
                  x:350,
                  y:606,
                  size:11
               });
            }
               page.drawText(teams[i].matches[j].result,{
                  x:350,
                  y:593,
                  size:11
               });
               let pmsSave=loadPdf.save();
               pmsSave.then(function(changedPdf){
                  fs.writeFileSync(pdfName,changedPdf);
               }).catch(function(e){
                  console.log(e);
               })
            }).catch(function(e){
               console.log(e);
            })
         })
      }
   } 
}





















