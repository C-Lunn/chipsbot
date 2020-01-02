/*****************************************************************
 * CHIPSBOT:
 * A SLACKBOT THAT DEALS PRIMARILY WITH CHIPS
 * **************************************************************/

Object.assign(String.prototype, { //adds functionality to search for multiple words in one function
    contains(){
        var rv = false;
        for(var i = 0; i < arguments.length; i++){
            if(this.indexOf(arguments[i]) != -1) {
                rv = true;
            }
        }
        return rv;

    }

});



//Set up RTM api, proxy, and file system reader
const { RTMClient, CLIENT_EVENTS, RTM_EVENTS } = require('@slack/rtm-api');
const token = process.env.CHIPSTOKEN; //CHIPSTOKEN is an environment variable set with the token in (so it's not published to github)
const HttpsProxyAgent = require('https-proxy-agent');
const proxyUrl = process.env.http_proxy //likewise for the proxy
var fs = require("fs");
const rtm = new RTMClient(token, { agent: new HttpsProxyAgent(proxyUrl)  }); //creates a new RTM bot
//const rtm = new RTMClient(token); //creates a new RTM bot
const Daymap = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const daymap = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
class Lunchtime { //describes a lunchtime
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
        for(var i=0;i<day.length;i++){ //changes days into numbers
            this.dayStr = this.dayStr.concat(Daymap[this.day[i]], (i == day.length-1 ? "" : ", "));
        }
        if (!this.loaded) rtm.sendMessage("Lunchtime has been set for " + this.hh + ":" + (this.mm < 10 ? "0".concat(this.mm) : this.mm) +  ". " + "<@" + this.ev.user + ">, you have been subscribed.", event.channel);
    }
    addSubscriber(event){
        if(this.subscribers.indexOf(event.user) != -1){
            rtm.sendMessage("You are already subscribed, <@".concat(event.user, ">. To unsubscribe, type @chipsbot lunchtime unsubscribe."),event.channel);
        } else {
            this.subscribers.push(event.user);
            rtm.sendMessage("Thanks, <@".concat(event.user, ">. You are now subscribed to lunch warnings."),event.channel);

        }
    }
    removeSubscriber(event){
        if(this.subscribers.indexOf(event.user) == -1){
            rtm.sendMessage("You are not subscribed, <@".concat(event.user, ">. To subscribe, type @chipsbot lunchtime subscribe."),event.channel);

        } else {
            this.subscribers.splice(this.subscribers.indexOf(event.user),1);
            rtm.sendMessage("Thanks, <@".concat(username, ">. You are now unsubscribed from lunch warnings."),event.channel);

        }
    }
    warn(now,dayc){
        if(now == this.mininDay - 15 && !this.alerted && this.day.indexOf(dayc) != -1){
            rtm.sendMessage(subs(this.subscribers).concat(" :rotating_light: :rotating_light: :rotating_light: LUNCH TIME IN 15 MINUTES :rotating_light: :rotating_light: :rotating_light:"),this.channel);
            this.alerted = true;
        }else if(now == this.mininDay && !this.alerted && this.day.indexOf(dayc) != -1){
            rtm.sendMessage(subs(this.subscribers).concat(" :rotating_light: :fries: :rotating_light: :fries: :rotating_light: LUNCH TIME :rotating_light: :fries: :rotating_light: :fries: :rotating_light:"),this.channel);
            this.alerted = true;
            var now2 = new Date();
            if(!this.permanent) this.day.splice(this.day.indexOf(now2.getDay()),1);
        }
        else if(now != this.mininDay && now != this.mininDay - 15){
            this.alerted = false;
        }
    }
    check(now,eventc){
        rtm.sendMessage("Lunchtime is set for ".concat(this.hh,":",(this.mm < 10 ? "0".concat(this.mm) : this.mm), "."),eventc.channel);
        if(this.day.indexOf(now.getDay()) != -1){
            var MID = now.getHours()*60 + now.getMinutes();
            var MinToGo = this.mininDay - MID;
            rtm.sendMessage(((MinToGo > 0) ? "This lunchtime is ".concat(MinToGo, " minutes from now.") : "This lunchtime was ".concat(Math.abs(MinToGo), " minutes ago.")),eventc.channel);
        }

    }
}

//HTTP Server
//var http = require('http');
var qs = require('querystring');

//EXPRESS


const express = require('express')
const app = express()
const port = 3000 //create Express server on port 3000


app.listen(port, () => console.log("")) //listen on port 3000

app.use(express.static('form')) //serve the 'form' folder to browsers

app.post('/', function (request, res) { //stuff to do on POST request (i.e. submitting the menu)
        var body = '';

        request.on('data', function (data) {
            body += data;

        }); //process the data to the body


        request.on('end', function () {
            var post = qs.parse(body); //use QS to extract the POST data
            // use post['blah'], etc.
            ParsePOSTMenu(post);
            res.redirect('done.html');
        });


})

function ParsePOSTMenu(PostMenu){ //get that menu
    newMenu = {
        Soup:[],
        Main:[],
        Theatre:[],
        Light:[],
        Side:[]
    }

    ArrV = []
    for (key in PostMenu) {
        ArrV.push(PostMenu[key]);
    } //turn from a weird key based object thing into a GOOD OLD FASHIONED ARRAY

    for (var j=0;j<25;j+=5){
        newMenu.Soup.push(ArrV[j]);
        newMenu.Main.push(ArrV[j+1]);
        newMenu.Theatre.push(ArrV[j+2]);
        newMenu.Light.push(ArrV[j+3]);
        newMenu.Side.push(ArrV[j+4]);
    } //form of data is known so this is cheap but easy
    TheMenu = newMenu;
    theNow = new Date();

    //get date at end of week

    Sunday = new Date(theNow - (theNow.getDay()*86400000) + (7*86400000)); //get the end of the week
    Sunday.setHours(22);
    Sunday.setMinutes(0); //22:00 on Sunday

    MenuValidUntil = Sunday;
    SaveMenuToFile();
    WriteValidityToFile();
    MenuIsValid = true;

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
    if(fs.existsSync("menu.json")){ //check if menu exists and don't try to load it
    fs.readFile("menu.json", function(err,buf){
        TheMenu = JSON.parse(buf);
    });
    }
}

function GetValidityFromFile(){
    fs.readFile("menuvalid", function(err,buf){
        if (err) {MenuValidUntil = -1; return;} //no validity file found
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

function SaveMenuToFile(){
   fileWrite = JSON.stringify(TheMenu);
    fs.writeFile("menu.json",fileWrite, (err) => {
                            if (err) console.log(err);


    });
}

//Lunchtime functions
function setLunchtime(MsgArgs, event, msgString,wantsToOverwrite){
    if(lunchtimeExistsforChannel(event.channel) != -1 && !wantsToOverwrite){
        rtm.sendMessage("A lunchtime is already set for this channel. Please include the word \"overwrite\" or \"reset\" in your message if you wish to change it." , event.channel);
        return;
    }

    timeHasBeenFound = false;
    for(i = 0; i < MsgArgs.length; i++){
        if(TimeRegExp.test(MsgArgs[i])) timeHasBeenFound = true;
        timeToSet = MsgArgs[i];
    }

    if(timeHasBeenFound){
        var lth = parseInt(timeToSet.slice(0,2));
        var ltm = parseInt(timeToSet.slice(3)); //grab the time in xx:yy and convert to integers
        if(isNaN(lth) || isNaN(ltm)){
            rtm.sendMessage("Couldn't find a valid time.", event.channel);
            return;
        }
        if(lth > 23 || ltm > 59){
            rtm.sendMessage("Please enter a valid time.",event.channel);
            return;
        }
        now = new Date();
        proposedLunchTime = new Date();
        proposedLunchTime.setHours(lth);
        proposedLunchTime.setMinutes(ltm);

        if(proposedLunchTime <= now){
            rtm.sendMessage("Please enter a time in the future.", event.channel);
        } else {
            dayArr = [now.getDay()];
            sub = [event.user];
            ln = lunchtimeExistsforChannel(event.channel);
            if(ln != -1){
                lunchtimes[ln].hh = lth;
                lunchtimes[ln].mm = ltm;
                lunchtimes[ln].mininDay = ltm + (lth*60);
                rtm.sendMessage("Lunchtime updated to " + lth + ":" + (ltm < 10 ? "0" + ltm : ltm) + "." , event.channel);

            } else
            {
            lunchtimes.push(new Lunchtime(lth,ltm,"",dayArr,event,false,sub,false));
            }
        }

    }
}


function attemptSubscribe(event, subunsub) {
    if(lunchtimeExistsforChannel(event.channel) != -1){
        if(subunsub){
            lunchtimes[lunchtimeExistsforChannel(event.channel)].addSubscriber(event);
        } else {
            lunchtimes[lunchtimeExistsforChannel(event.channel)].removeSubscriber(event);
        }
        return;
    } else {
        rtm.sendMessage("Could not find a lunchtime for this channel", event.channel)
    }
}

function lunchtimeExistsforChannel(channel){
    if(lunchtimes.length == 0) return -1;
    rv = -1;
    for(i=0; i<lunchtimes.length; i++){
        if(lunchtimes[i].channel == channel){
            rv = i;
        }
    }
    return rv;
}

function deleteLunchtime(lt){ //just deletes silently
    lunchtimes.splice(lt,1);

}

function lunchtimeCleanup(){ //deletes non-permanent lunchtimes after they've been alerted
    for(i=0;i<lunchtimes.length;i++){
        if(!lunchtimes[i].permanent){
            if(lunchtimes[i].day.length == 0){
                deleteLunchtime(i);
            }
        }
    }
}

//Chat handling functions

rtm.on('message', (event) => { //this is a callback that occurs on every message sent to every channel the bot is in
    if(event.hidden == true){
        return;
    } //don't do stuff on 'hidden' messages such as edits
    const BotID = "@".concat(rtm.activeUserId); //grab the bot ID in @chipsbot form
    if(event.type == 'message'){
       if((event.text.toLowerCase().indexOf("chips") != -1) && (event.text.indexOf(BotID)) == -1){
           var RTM_EVENTS = require('@slack/client').RTM_EVENTS;
           rtm.sendMessage("Did someone say chips?", event.channel);

       } else if((event.text.toLowerCase().indexOf("linux") != -1) && (event.text.indexOf(BotID)) == -1 && event.text.toLowerCase().indexOf("gnu/linux") == -1 && event.text.toLowerCase().indexOf("gnu plus linux") == -1 && event.text.toLowerCase().indexOf("gnu + linux") == -1){
           rtm.addOutgoingEvent(true, 'message', {text : "I'd just like to interject for a moment.  What you're referring to as Linux, is in fact, GNU/Linux, or as I've recently taken to calling it, GNU plus Linux. Linux is not an operating system unto itself, but rather another free component of a fully functioning GNU system made useful by the GNU corelibs, shell utilities and vital system components comprising a full OS as defined by POSIX.\n\n Many computer users run a modified version of the GNU system every day, without realizing it.  Through a peculiar turn of events, the version of GNU which is widely used today is often called \"Linux\", and many of its users are not aware that it is basically the GNU system, developed by the GNU Project. There really is a Linux, and these people are using it, but it is just a part of the system they use. \n\n Linux is the kernel: the program in the system that allocates the machine's resources to the other programs that you run. The kernel is an essential part of an operating system, but useless by itself; it can only function in the context of a complete operating system.  Linux is normally used in combination with the GNU operating system: the whole system is basically GNU with Linux added, or GNU/Linux.  All the so-called \"Linux\" distributions are really distributions of GNU/Linux.", channel : event.channel, thread_ts : event.ts});
       } //if untagged but someone says chips....
        MsgArgs = parseMessage(event.text); //get the message args as an array
        if(MsgArgs[0].includes("<".concat(BotID.toLowerCase(),">"))){  //if first arg of message is @chipsbot then start doing stuff
            switch(MsgArgs[1]){ //switch on the first word
               case "chips":
                    chipsHandler(MsgArgs, event);
                    break;
               case "words":
                    words(MsgArgs, event);
                    break;
               default:
                    getUserIntention(event);
            }
        }
	}
});

function getUserIntention(event){
    msgString = event.text.toLowerCase();
    if(msgString.includes("help")){
        helpIntentHandler(event);
    } else if(msgString.contains("lunchtime", "subscribe", "lunch")){
        lunchtimeIntentHandler(event);
    } else if (msgString.includes("menu")) {
        menuIntentHandler(parseMessage(msgString), event, msgString);
    } else if(msgString.includes("bet")){
        betIntentHandler(event);
    } else {
        rtm.sendMessage("That's not an input I recognise.", event.channel);
    }
}

function words(MsgArgs, event){
    rtm.sendMessage("`C` `H` `I` `P` `S` (1 vowel, 4 consonants)  you have 30 seconds.....", event.channel)
}

function CheckTime(){ //function to run on time callback (every 10 seconds)
    var now = new Date();
    MinInDay = (now.getHours()*60) + now.getMinutes();
    LTtoday = 0;
    for(j = 0;j<lunchtimes.length;j++){
        lunchtimes[j].warn(MinInDay,now.getDay());
        if(lunchtimes[j].day.indexOf(now.getDay()) != -1){
            LTtoday++;
        }
    }
    if(now.getHours() == 10 && now.getMinutes() == 30 && LTtoday == 0 && (now.getDay() != 6 &&  now.getDay() != 0)){
    if (!Reminded) rtm.sendMessage("Nobody has set a lunchtime yet. Think of the chips!","CMZ536P4M");
        Reminded = true;
    }
    else{
        Reminded = false; //only remind once rather than 6 times within the minute
    }
    if(now.getHours() == 0 && bets.length != 0){
    betp.length = 0;
    bets.length = 0;
    }
    CheckMenuValidity(now); //check if the menu is still valid
    lunchtimeCleanup();
    delete(now); //dont create a new date variable every 10 seconds [not really necessary]
}

function parseMessage(inputString){ //return each word in a message as an entry in an array
    return inputString.toLowerCase().split(" ");
}


function lunchtimeIntentHandler(event){
    MsgArgs = parseMessage(event.text.toLowerCase());
    //remove all unncessary info from array and redo string
    for(i=1;i<MsgArgs.length;i++){
        if(MsgArgs[i] == "lunchtime"){
            MsgArgs.splice(i,1);
        }
    }
    MsgArgs.shift();
    stringtoParse = MsgArgs.join(" ");
    lc = lunchtimeExistsforChannel(event.channel);
    if(stringtoParse.includes("set")){
        if(stringtoParse.includes("overwrite") || stringtoParse.includes("reset")){
            setLunchtime(MsgArgs, event, stringtoParse, true);
        } else {
            setLunchtime(MsgArgs, event, stringtoParse, false);
        }
    } else if(stringtoParse.contains("overwrite", "reset", "update")){
        setLunchtime(MsgArgs, event, stringtoParse, true);
    } else if(stringtoParse.includes("subscribe")){
        if(stringtoParse.includes("unsubscribe")){
            attemptSubscribe(event, false);
        } else {
            attemptSubscribe(event, true);
        }
    } else if(stringtoParse.contains("check","when", "what time")){
        if(lc != -1){
            lunchtimes[lc].check(new Date(), event);
        } else {
            rtm.sendMessage("No lunchtime set for this channel.", event.channel);
        }
    } else if(stringtoParse.includes("remove") || stringtoParse.includes("delete")){
        if(lc != -1){
            lunchtimes.splice(lc,1);
            rtm.sendMessage("Lunchtime removed.", event.channel);
        } else {
            rtm.sendMessage("Could not find a lunchtime for this channel.", event.channel);
        }
    }
}

function menuIntentHandler(MsgArgs, event, msgString){
    if(MsgArgs.length == 2 || msgString.contains("today", "view")){
        if(MenuIsValid){
            now = new Date();
            today = (now.getDay()-1);
            if (today < 0) today = 6;
            rtm.sendMessage("MENU FOR ".concat(daymap[today+1].toUpperCase(),":\n"),event.channel)
            ArrtoSend = []
            for(var key in TheMenu){ //iterate through keys in menu JSON
                ArrtoSend.push(key.concat(": ",TheMenu[key][today])); //key is a string (or stringable) but can also be used to reference
            }
            rtm.sendMessage(ArrtoSend.join("\n"),event.channel); //join all elements with a newline
        } else {
        rtm.sendMessage("Menu has not been set for this week.",event.channel);
        }
    } else if (msgString.contains("monday","tuesday","wednesday","thursday","friday")){
        for(i=1;i<6;i++){
            if(msgString.includes(daymap[i])) theDay = i;
        }
        if(MenuIsValid){
        rtm.sendMessage("MENU FOR ".concat(daymap[theDay].toUpperCase(),":\n"),event.channel)
            ArrtoSend = []
            for(var key in TheMenu){ //iterate through keys in menu JSON
                ArrtoSend.push(key.concat(": ",TheMenu[key][theDay-1])); //key is a string (or stringable) but can also be used to reference
            }
            rtm.sendMessage(ArrtoSend.join("\n"),event.channel);
        } else {
            rtm.sendMessage("Menu has not been set for this week.", event.channel)
        }

    } else if (msgString.contains("checkvalid", "check validity", "valid") && !msgString.contains("set")){
        rtm.sendMessage((MenuIsValid ? "Menu is valid until ".concat(MenuValidUntil,".") : "Menu is not valid."),event.channel);
    } else if (msgString.contains("setvalid", "set validity") || (msgString.includes("set") && msgString.includes("validity"))){
        const DatRegEx = /^(\d)?\d\/(\d)?\d$/; //regexp for date
        dateFound = false;
        for(i=0;i<MsgArgs.length;i++){
            if(DatRegEx.test(MsgArgs[i])) dateFound = true;
            d2s = MsgArgs[i];
        }
        slashpos = d2s.indexOf("/");
        d2sd = parseInt(d2s.slice(0,slashpos));
        d2sm = parseInt(d2s.slice(slashpos+1));
        valid = false;
        if(d2sm <= 12){
            if ([1,3,5,7,8,10,12].indexOf(d2sm)){
                if(d2sd <= 31){
                    valid = true;
                }
            } else if ([4,6,9,11].indexOf(d2sm)){
                    if(d2sd <= 30) valid = true;
            } else if (d2sd <= 28) valid = true;
        }

        if(dateFound && valid){
            SetMenuValidity(d2sd,d2sm);
            rtm.sendMessage("Menu valid until ".concat(MenuValidUntil.getDate(),"/",MenuValidUntil.getMonth()+1,"."),event.channel);
            now = new Date();
            CheckMenuValidity(now); //recheck the menu's validity on setting
            return;

        } else {
            rtm.sendMessage("No valid date detected", event.channel);
        }
    }
}

function helpIntentHandler(MsgArgs, event){
    if(MsgArgs.length == 2){
    rtm.sendMessage(
        `CHIPSBOT COMMANDS: \n
        Type 'help <command>' for more info.
        \`lunchtime\`: Set reminders for lunchtimes.
        \`menu\`: Look at this week's menu.`, event.channel
    );}
    else {
        switch(MsgArgs[2]){
            case "lunchtime":
                rtm.sendMessage(
                    `\`lunchtime set <hh:mm> \`: Create a new lunchtime. Day arguments are optional.
                    \`lunchtime subscribe \`: Subscribe to an existing lunchtime.
                    \`lunchtime unsubscribe\`: Unsubscribe from an existing lunchtime.
                    \`lunchtime check [name]\`: Without name for a list of all active lunchtimes for this channel, with name for one specific lunchtime.
                    \`lunchtime remove <name>\`: Remove a lunchtime.
                    `,event.channel
                );
                break;
            case "menu":
                rtm.sendMessage(
                    `\`menu\`: Displays the menu for this week (if one exists).
                    \` menu <day> \`: Displays the menu for a certain day. "today" is a valid input.
                    \`menu validcheck\`: Displays the date until which the menu is valid.
                    `,event.channel
                );
                break;
            case "bet":
                rtm.sendMessage("Don't bother m8.",event.channel);
                break;
            case "default":
                rtm.sendMessage("Didn't find that command.", event.channel);
                break;
        }
    }
}