/*****************************************************************
 * CHIPSBOT:
 * A SLACKBOT THAT DEALS PRIMARILY WITH CHIPS
 * **************************************************************/

//Set up RTM api, proxy, and file system reader
const { RTMClient, CLIENT_EVENTS, RTM_EVENTS } = require('@slack/rtm-api');
const token = process.env.CHIPSTOKEN; //CHIPSTOKEN is an environment variable set with the token in (so it's not published to github)
const HttpsProxyAgent = require('https-proxy-agent');
const proxyUrl = process.env.http_proxy //likewise for the proxy
var fs = require("fs");
const rtm = new RTMClient(token, { agent: new HttpsProxyAgent(proxyUrl)  }); //creates a new RTM bot
const Daymap = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const daymap = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
scoreboards = [];

//class definitions
class Lunchtime {
    constructor(hh,mm,name,day,event,permanency,subz,loaded){
        this.ev = event;
        this.hh = hh;
        this.mm = mm;
        this.name = name;
        this.subscribers = subz;
        this.day = day;
        this.permanent = permanency;
        this.channel = event.channel
        this.mininDay = hh*60 + mm;
        this.alerted;
        this.dayStr = "";
        this.loaded = loaded;
        for(var i=0;i<day.length;i++){
            this.dayStr = this.dayStr.concat(Daymap[this.day[i]], (i == day.length-1 ? "" : ", "));
        }
        if (!this.loaded) rtm.sendMessage("Lunchtime ".concat(this.name, " has been set for ",this.hh,":",(this.mm < 10 ? "0".concat(this.mm) : this.mm)," on ", this.dayStr, ". This lunchtime will ", (this.permanent ? "" : "not "), "recur."), event.channel);
    }
    addSubscriber(event){
        if(this.subscribers.indexOf(event.user) != -1){
            rtm.sendMessage("You are already subscribed, <@".concat(event.user, ">. To unsubscribe, type @chipsbot lunchtime ", this.name, " unsubscribe."),event.channel);
        } else {
            this.subscribers.push(event.user);
            rtm.sendMessage("Thanks, <@".concat(event.user, ">. You are now subscribed to lunch warnings for the ",this.name," lunchtime."),event.channel);
            saveLunchtimes();
        }
    }
    removeSubscriber(event){
        if(this.subscribers.indexOf(event.user) == -1){
            rtm.sendMessage("You are not subscribed, <@".concat(event.user, ">. To subscribe, type @chipsbot lunchtime ", this.name, " subscribe."),event.channel);

        } else {
            this.subscribers.splice(this.subscribers.indexOf(event.user),1);
            rtm.sendMessage("Thanks, <@".concat(username, ">. You are now unsubscribed from lunch warnings for the ",this.name," lunchtime."),event.channel);
            saveLunchtimes();
        }
    }
    warn(now,dayc){
        if(now == this.mininDay - 15 && !this.alerted && this.day.indexOf(dayc) != -1){
            rtm.sendMessage(subs(this.subscribers).concat(" :rotating_light: :rotating_light: :rotating_light: LUNCH TIME \"", this.name, "\" IN 15 MINUTES :rotating_light: :rotating_light: :rotating_light:"),this.channel);
            this.alerted = true;
        }else if(now == this.mininDay && !this.alerted && this.day.indexOf(dayc) != -1){
            rtm.sendMessage(subs(this.subscribers).concat(" :rotating_light: :fries: :rotating_light: :fries: :rotating_light: LUNCH TIME \"", this.name, "\" :rotating_light: :fries: :rotating_light: :fries: :rotating_light:"),this.channel);
            this.alerted = true;
            var now2 = new Date();
            if(!this.permanent) this.day.splice(this.day.indexOf(now2.getDay()),1);
        }
        else if(now != this.mininDay && now != this.mininDay - 15){
            this.alerted = false;
        }
    }
    check(now,eventc){
        rtm.sendMessage("This lunchtime \"".concat(this.name,"\", is set for ",this.hh,":",(this.mm < 10 ? "0".concat(this.mm) : this.mm)," on ", this.dayStr,". It will ", (this.permanent ? "" : "not"), " recur."),eventc.channel);
        if(this.day.indexOf(now.getDay()) != -1){
            var MID = now.getHours()*60 + now.getMinutes();
            var MinToGo = this.mininDay - MID;
            rtm.sendMessage(((MinToGo > 0) ? "This lunchtime is ".concat(MinToGo, " minutes from now.") : "This lunchtime was ".concat(Math.abs(MinToGo), " minutes ago.")),eventc.channel);
        }

    }
}

class Score{
    constructor(user,score){
        this.user = user;
        this.name = rtm.webClient.users.info({user: this.user}).name;
        this.score = score;
    }
    addscore(toadd){
        this.score += toadd;
    }
    resetscore(){
        this.score = 0;
    }
}

class Scoreboard{
    constructor(event, scores){
        this.ev = event;
        this.channel = event.channel;
        this.scores = scores;
    }
    addUser(event,score){
        this.scores.push(new Score(event.user,score));
    }
    refreshLeaderboard(){
       this.scores.sort(function(a,b){return b["score"]-a["score"];})
    }
    printScores(event){
        rtm.sendMessage("COUNTDOWN SCOREBOARD:",event.channel);
        var StringToSend = "";
        for(var z = 0; z < this.scores.length; z++){
            StringToSend = StringToSend.concat(z+1,": <@", this.scores[z].user,">: ",this.scores[z].score," points.\n");
        }
        rtm.sendMessage(StringToSend,event.channel);
    }

    queryScore(event){
        var PosInSb = this.getUserPos(event.user);
        if (PosInSb == -1) {rtm.sendMessage("<@".concat(event.user,">, I don't have you down as having any points."),event.channel);}
        else{
        rtm.sendMessage("<@".concat(event.user, ">, you have ",this.scores[PosInSb].score," points. You are number ", PosInSb+1, " on the leaderboard."),event.channel);
        }
    }

    getUserPos(user){
        for(var k = 0; k < this.scores.length; k++){
            if(this.scores[k].user == user){
                return k;
            }
        }
        return -1;
    }
}
//Global variables
var lunchtimes = [];
var TheMenu;
var MenuIsValid = false;
var AlertSent = false;
var MenuValidUntil = -1;
var TimeChecker = setInterval(CheckTime,10000); //check time every 10 seconds for time based stuff
betp = new Array();
bets = new Array();

//RegExp Defs
const TimeRegExp = /\d\d:\d\d/; //format for time


//Setup functions to run
(async () => { //lmao I have no idea what this bit does I just copied it from the API
          // Connect to Slack
    const { self, team  } = await rtm.start();
})();
GetMenuFromFile();
GetValidityFromFile();
loadLunchtimes();
loadScoreboards();
//Subscriber function defs

function subs(inArr){ //gets all the subscribers and puts them into a string suitable for message
    var StrToRet = "";
    for (i = 0; i < inArr.length; i++){
        StrToRet = StrToRet.concat("<@",inArr[i], "> ");
    }
    return StrToRet;
}



//Menu function defs

function GetMenuFromFile(){
    fs.readFile("menu.json", function(err,buf){
        TheMenu = JSON.parse(buf);
    });
}

function GetValidityFromFile(){
    fs.readFile("menuvalid", function(err,buf){
        if (err) {MenuValidUntil = -1; return;}
        MenuValidUntil = new Date(buf.toString());
    });
}

function WriteValidityToFile(){
    fs.writeFile("menuvalid", MenuValidUntil, (err) => {
        if (err) console.log(err);
    });

}

function CheckMenuValidity(time){
    if(MenuValidUntil == -1) { MenuIsValid = false; return; }
    MenuIsValid = (MenuValidUntil > time);
}

function SetMenuValidity(ValDay, ValM){
    time = new Date();
    if(time.getMonth() > ValM-1){
        ValidYear = time.getFullYear() + 1;
    } else { ValidYear = time.getFullYear(); } //if the month is in the past, assume next year
    if(ValM < 10){ ValMS = "0".concat(ValM); } else {ValMS = ValM.toString();} //cast all these bits to string
    if(ValDay < 10){ValDayS = "0".concat(ValDay);} else {ValDayS = ValDay.toString();}
    var ValidUntilStr = ValidYear.toString().concat("-",ValMS,"-",ValDayS,"T22:59:59Z"); //construct ISO date
    MenuValidUntil = new Date(ValidUntilStr);
    WriteValidityToFile();
}

//Betting functions
function PlaceBet(MsgArgs,event){
    inNo = parseInt(MsgArgs[3]);
    if(isNaN(inNo) || parseInt(MsgArgs[3]) < 0 || parseInt(MsgArgs[3]) > 100){ rtm.sendMessage("Please enter a number 0-100.",event.channel); return;}
    if(betp.indexOf(event.user) == -1){
        betp.push(event.user);
        bets.push(inNo);
        rtm.sendMessage("You have placed a bet of ".concat(MsgArgs[3],", <@",event.user,">."),event.channel);
    } else {
        CurPos = betp.indexOf(event.user);
        bets[CurPos] = inNo;
        rtm.sendMessage("Your bet has been updated to ".concat(MsgArgs[3],", <@",event.user,">."),event.channel);
    }

}

function ViewBet(event){
    var Avgbet = 0;
    for(i=0;i<bets.length;i++){
        Avgbet += bets[i];
    }
    Avgbet /= bets.length;
    rtm.sendMessage("Chips likelihood: ".concat(Avgbet, "%."),event.channel);
}

//Lunchtime functions
function setLunchtime(MsgArgs, event){
    for(k=0;k<lunchtimes.length;k++){
        if(lunchtimes[k].name == MsgArgs[3]) {
            rtm.sendMessage("A lunchtime with the name \"".concat(MsgArgs[3], "\" has already been found. To remove this, type @chipsbot lunchtime remove ", MsgArgs[3],"."),event.channel);
            return;
        }
    }
    if(TimeRegExp.test(MsgArgs[3])){rtm.sendMessage("Incorrect command format. Use @chipsbot lunchtime set <name> <hh:mm> [day1] [day2]. Arguments in [] are optional.",event.channel); return;}
    if(!TimeRegExp.test(MsgArgs[4])){rtm.sendMessage("Please enter a time in the form hh:mm.",event.channel); return;}
    var lth = parseInt(MsgArgs[4].slice(0,2));
    var ltm = parseInt(MsgArgs[4].slice(3)); //grab the time in xx:yy and convert to integers
    if(lth > 23 || ltm > 59){
        rtm.sendMessage("Please enter a valid time.",channel);
        return;
    }
    now = new Date();
    if(MsgArgs.length == 5){  // lunchtime set name hh:mm <end>
        dayArr = [now.getDay()];
        lunchtimes.push(new Lunchtime(lth,ltm,MsgArgs[3],dayArr,event,false,[],false));
        return;
    }
    dayArr = [];

    for(i=5;i<MsgArgs.length;i++){
        if(daymap.indexOf(MsgArgs[i]) != -1){
            dayArr.push(daymap.indexOf(MsgArgs[i]));
        }
    }
    if(dayArr.length == 0) {
        dayArr.push(now.getDay());
    }
    lunchtimes.push(new Lunchtime(lth,ltm,MsgArgs[3],dayArr,event,false,[],false));
    saveLunchtimes();
}

function removeLunchtime(MsgArgs,event){
    for(k=0;k<lunchtimes.length;k++){
        if(MsgArgs[3] == lunchtimes[k].name){
            n = lunchtimes[k].name
            deleteLunchtime(k);
            rtm.sendMessage("Lunchtime \"".concat(n , "\" deleted."),event.channel);
            return;
        }
        rtm.sendMessage("Could not find any lunchtime with the name ".concat(MsgArgs[3], "."),event.channel);
    }
}

function deleteLunchtime(lt){
    lunchtimes.splice(lt,1);
    saveLunchtimes();
}

function findLunchtime(inName){
    for(j = 0;j<lunchtimes.length;j++){
        if(lunchtimes[j].name == inName){ return j; }
    }
    return -1;
}

function printLunchtimeInfo(event){
    lts = "LUNCHTIMES FOR THIS CHANNEL:\n";
    for(m=0;m<lunchtimes.length;m++){
        if(lunchtimes[m].channel == event.channel){
            lts = lts.concat(lunchtimes[m].name,": ", (lunchtimes[m].permanent ? "recurring on " : "non-recurring on "), lunchtimes[m].dayStr, " at ", lunchtimes[m].hh, ":", (lunchtimes[m].mm < 10 ? "0".concat(lunchtimes[m].mm) : lunchtimes[m].mm),".\n" );
        }
    }
    rtm.sendMessage(lts,event.channel);
}

function lunchtimeCleanup(){
    for(i=0;i<lunchtimes.length;i++){
        if(!lunchtimes[i].permanent){
            if(lunchtimes[i].day.length == 0){
                deleteLunchtime(i);
            }
        }
    }
}

function saveLunchtimes(){
    ltsarr = [];
    fileToWrite = "";
    for(i=0;i<lunchtimes.length;i++){
        ltsarr[i] = JSON.stringify(lunchtimes[i]);
        fileToWrite=fileToWrite.concat(ltsarr[i],(i == lunchtimes.length-1) ?  "": "%");
    }

    fs.writeFile("lunchtimez",fileToWrite, (err) => {
        if (err) console.log(err);
    });
}

function loadLunchtimes(){
    fs.readFile("lunchtimez", function(err,buf) {
        ArrayPos = 0;
        ComPos = 0;
        retArray = [];
        jsonArray = [];
        parsedarray = []
        strobs = buf.toString();
        while(strobs.indexOf("%") != -1){
            ComPos = strobs.indexOf("%");
            jsonArray[ArrayPos++]=strobs.slice(0,ComPos);
            strobs = strobs.slice(ComPos+1,strobs.length);
        }
        jsonArray[ArrayPos]=strobs;
        for(i = 0; i < jsonArray.length; i++){
            theCurObj = JSON.parse(jsonArray[i]);
            lunchtimes[i] = new Lunchtime(theCurObj.hh,theCurObj.mm,theCurObj.name,theCurObj.day,theCurObj.ev,theCurObj.permanent,theCurObj.subscribers,true);
        }
    })
}

//Vorderbot tracking

function getScoreboardChannelpos(event){
    for(m=0;m<scoreboards.length;m++){
        if(event.channel == scoreboards[m].channel){
            return m;
        }

    }
        return -1;
}

function handleVorderbot(event){
    if(event.text.toLowerCase().indexOf("points") != -1 && event.text.toLowerCase().indexOf("longest") == -1){
        TheUser = event.text.slice(2,11);
        ThePoints = parseInt(event.text.slice(18,19));
        if(getScoreboardChannelpos(event)==-1){
            scoreboards.push(new Scoreboard(event,[]));
        }
        theLoc = getScoreboardChannelpos(event);
        theUserPos = scoreboards[theLoc].getUserPos(TheUser);
        if(theUserPos == -1){
            scoreboards[theLoc].scores.push(new Score(TheUser,ThePoints))
            scoreboards[theLoc].refreshLeaderboard();
            saveScoreboards();
            return;

        }
        scoreboards[theLoc].scores[theUserPos].addscore(ThePoints);
        scoreboards[theLoc].refreshLeaderboard();
        saveScoreboards();
    }
}

function scoresHandler(MsgArgs,event){
    TheBoard = getScoreboardChannelpos(event);
    if(MsgArgs.length == 2){
        if(TheBoard == -1){
            rtm.sendMessage("I don't have any scores stored for this channel.",event.channel);
        }
        else{
            scoreboards[TheBoard].printScores(event);
        }
    }
    else if(MsgArgs[2] == "me"){
        if(TheBoard == -1){
            rtm.sendMessage("I don't have any scores stored for this channel.",event.channel);
        }
        else{
        theUserPos = scoreboards[theLoc].getUserPos(event.user);
            if(theUserPos == -1){
                rtm.sendMessage("I don't have a score stored for <@".concat(event.user,">."),event.channel);
            }
            else{
                scoreboards[TheBoard].refreshLeaderboard();
                scoreboards[TheBoard].queryScore(event);
            }
        }
    }
}

function saveScoreboards(){
    fileWrite = JSON.stringify(scoreboards);
    fs.writeFile("scoreboards",fileWrite, (err) => {
                if (err) console.log(err);

    });
}

function loadScoreboards(){
    fs.readFile("scoreboards", function(err,buf){
        bur = JSON.parse(buf.toString());
        for(i=0;i<bur.length;i++){
            TheScoresArr = [];
            for (k=0;k<bur[i].scores.length;k++){
                TheScoresArr.push(new Score(bur[i].scores[k].user,parseInt(bur[i].scores[k].score)));
            }
            scoreboards.push(new Scoreboard(bur[i].ev, TheScoresArr));
        }
    });
}

//Chat handling functions

rtm.on('message', (event) => { //this is a callback that occurs on every message sent to every channel the bot is in
    if(event.hidden == true){
        return;
    } //don't do stuff on 'hidden' messages such as edits
    const BotID = "@".concat(rtm.activeUserId); //grab the bot ID in @chipsbot form
    if(event.type == 'message'){
        if(event.user == "W8RU4FJ95"){
            handleVorderbot(event);
        }
        if((event.text.toLowerCase().indexOf("chips") != -1) && (event.text.indexOf(BotID)) == -1){
            rtm.sendMessage("Did someone say chips?", event.channel);
        } //if untagged but someone says chips....
        MsgArgs = parseMessage(event.text); //get the message args as an array
        if(MsgArgs[0] == "<".concat(BotID.toLowerCase(),">")){  //if first arg of message is @chipsbot then start doing stuff
            switch(MsgArgs[1]){ //switch on the first word
                case "chips":
                    chipsHandler(MsgArgs, event);
                    break;
                case "lunchtime":
                    lunchtimeHandler(MsgArgs, event);
                    break;
                case "bet":
                    betHandler(MsgArgs,event);
                    break;
                case "scores":
                    scoresHandler(MsgArgs,event);
                    break;
                default:
                    rtm.sendMessage("I don't recognise the input \"".concat(MsgArgs[1], "\". Please have some chips and then try again, <@", event.user, ">."), event.channel);
            }
        }
	}
});


function CheckTime(){
    var now = new Date();
    MinInDay = (now.getHours()*60) + now.getMinutes();
    LTtoday = 0;
    for(j = 0;j<lunchtimes.length;j++){
        lunchtimes[j].warn(MinInDay,now.getDay());
        if(lunchtimes[j].day.indexOf(now.getDay()) != -1){
            LTtoday++;
        }
    }
    if(now.getHours() == 10 && now.getMinutes() == 30 && LTtoday == 0 && (now.getDay() != 6 || now.getDay() != 0)){
    if (!Reminded) rtm.sendMessage("Nobody has set a lunchtime yet. Think of the chips!","CMZ536P4M");
        Reminded = true;
    }
    else{
        Reminded = false;
    }
    if(now.getHours() == 0 && bets.length != 0){
    betp.length = 0;
    bets.length = 0;
    }
    CheckMenuValidity(now);
    lunchtimeCleanup();
    delete(now); //dont create a new date variable every 10 seconds
}

function parseMessage(inputString){ //return each word in a message as an entry in an array
    inputString = inputString.toLowerCase(); //make case insensitive
    var ArrayPos = 0;
    var retArray = [];
    var SpacePos = 0;
    while(inputString.indexOf(" ") != -1){ //iterate around message finding first space and putting word into array
        SpacePos = inputString.indexOf(" ");
        retArray[ArrayPos++]=inputString.slice(0, SpacePos)
        inputString = inputString.slice(SpacePos+1, inputString.length);
    }
    retArray[ArrayPos]=inputString //put remainder of message into last entry of array
    return retArray;
}

function chipsHandler(MsgArgs, event){ //handle chips
    switch(MsgArgs[2]){
        case "price":
            rtm.sendMessage("Chips are currently 95p.", event.channel);
            break;
        default:
            return;
    }
}

function lunchtimeHandler(MsgArgs, event){ //handle lunchtime
    switch(MsgArgs[2]){
        case "set":
            setLunchtime(MsgArgs, event);
            break;
        case "subscribe":
            lts = findLunchtime(MsgArgs[3])
            if(lts != -1) lunchtimes[lts].addSubscriber(event);
            else rtm.sendMessage("Could not find lunchtime with name \"".concat(MsgArgs[3],"\"."),event.channel);
            break;
        case "unsubscribe":
            lts = findLunchtime(MsgArgs[3])
            if(lts != -1) lunchtimes[lts].removeSubscriber(event);
            else rtm.sendMessage("Could not find lunchtime with name \"".concat(MsgArgs[3],"\"."),event.channel);
            break;
        case "check":
            if(MsgArgs.length == 3){
                printLunchtimeInfo(event);
                break;
            }
            jetzt = new Date();
            lts = findLunchtime(MsgArgs[3])
            if(lts != -1) lunchtimes[lts].check(jetzt, event);
            else rtm.sendMessage("Could not find lunchtime with name \"".concat(MsgArgs[3],"\"."),event.channel);
            break;
        case "remove":
            removeLunchtime(MsgArgs,event);
            break;
        case "menu":
            menuHandler(MsgArgs,event);
            break;
        case "unsetperm":
            lts = findLunchtime(MsgArgs[3])
            if(lts != -1){
                lunchtimes[lts].permanent = false;
                rtm.sendMessage("Lunchtime ".concat(MsgArgs[3], " set to non-recurring."), event.channel);
            }
            else { rtm.sendMessage("Could not find lunchtime with name \"".concat(MsgArgs[3],"\"."),event.channel);}
            break;
        case "setperm":
            lts = findLunchtime(MsgArgs[3])
            if(lts != -1){
                lunchtimes[lts].permanent = true;
                rtm.sendMessage("Lunchtime ".concat(MsgArgs[3], " set to recurring."), event.channel);
            }
            else{ rtm.sendMessage("Could not find lunchtime with name \"".concat(MsgArgs[3],"\"."),event.channel);}
            break;
        case "save":
            saveLunchtimes();
            break;
        case "load":
            loadLunchtimes();
            break;
    }
}
function betHandler(MsgArgs,event){
    switch(MsgArgs[2]){
        case "place":
            PlaceBet(MsgArgs,event);
            break;
        case "view":
            ViewBet(event);
            break;
    }
}

function menuHandler(MsgArgs, event){
    DayMap = ["monday","tuesday","wednesday","thursday","friday"];
    if(MsgArgs[3] == "validset"){
        const DatRegEx = /^(\d)?\d\s(\d)?\d$/; //regexp for date
        if(DatRegEx.test(MsgArgs[4].concat(" ",MsgArgs[5]))){
            SetMenuValidity(MsgArgs[4],MsgArgs[5]);
            rtm.sendMessage("Menu valid until ".concat(MenuValidUntil.getDate(),"/",MenuValidUntil.getMonth()+1,"."),event.channel);
            now = new Date();
            CheckMenuValidity(now); //recheck the menu's validity on setting
            return;
        }
        else{
            rtm.sendMessage("Please enter a valid date in the form dd mm.",event.channel);
            return;
        }
    }
    if(MsgArgs[3] == "validcheck") { rtm.sendMessage((MenuIsValid ? "Menu is valid until ".concat(MenuValidUntil,".") : "Menu is not valid."),event.channel); return; }
    if(MenuIsValid){
        if(MsgArgs.length == 3 || MsgArgs[3] == "today"){
            now = new Date();
            today = (now.getDay()-1);
            if (today < 0) today = 6;
            rtm.sendMessage("MENU FOR ".concat(DayMap[today].toUpperCase(),":\n"),event.channel)
            ArrtoSend = []
            for(var key in TheMenu){ //iterate through keys in menu JSON
                ArrtoSend.push(key.concat(": ",TheMenu[key][today])); //key is a string (or stringable) but can also be used to reference
            }
            rtm.sendMessage(ArrtoSend.join("\n"),event.channel); //join all elements with a newline

        }
        else if(DayMap.indexOf(MsgArgs[3]) != -1){
            rtm.sendMessage("MENU FOR ".concat(MsgArgs[3].toUpperCase(),":\n"),event.channel)
            ArrtoSend = []
            for(var key in TheMenu){
                ArrtoSend.push(key.concat(": ",TheMenu[key][DayMap.indexOf(MsgArgs[3])]));
            }
            rtm.sendMessage(ArrtoSend.join("\n"),event.channel);
        }

    } else {
        rtm.sendMessage("Menu has not been set for this week.",event.channel);
    }
}


