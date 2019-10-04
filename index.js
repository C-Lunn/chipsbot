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

//Global variables
var LunchTimeDeclared = false;
var LunchTime = {
    'h': -1,
    'm': -1,
    'MinInDay': -1
}; //default values for lunchtime, don't know how to declare an uninitialised struct
var subscribers = [];
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
ReadSubsIn();
GetMenuFromFile();
GetValidityFromFile();

//Subscriber function defs

function ReadSubsIn(){ //reads the subscribers in from file on startup
    fs.readFile("sub.txt", function(err,buf) {
        ArrayPos = 0;
        ComPos = 0;
        retArray = []
        SubsS = buf.toString();
        while(SubsS.indexOf(",") != -1){
            ComPos = SubsS.indexOf(",");
            retArray[ArrayPos++]=SubsS.slice(0,ComPos);
            SubsS = SubsS.slice(ComPos+1,SubsS.length);
        }
        retArray[ArrayPos]=SubsS;
        subscribers = retArray; //for some reason returning the array caused it to shit a brick so idk
    })
}

function AddSubscriber(username, channel){
    if(subscribers.toString().indexOf(username) == -1){
        subscribers.push(username);
        rtm.sendMessage("Thanks, <@".concat(username, ">. You are now subscribed to lunch warnings."),channel);
        SaveSubsFile();
        }
    else{
        rtm.sendMessage("You are already subscribed, <@".concat(username, ">. To unsubscribe, type @chipsbot lunchtime unsubscribe."),channel);
    }
}

function RemoveSubscriber(username,channel){
    if(subscribers.indexOf(username) != -1){
        subscribers.splice(subscribers.indexOf(username),1);
        rtm.sendMessage("Thanks, <@".concat(username, ">. You are now unsubscribed from lunch warnings."),channel);
        SaveSubsFile();
    }
    else{
        rtm.sendMessage("You are not subscribed, <@".concat(username, ">. To subscribe, type @chipsbot lunchtime subscribe."),channel);
    }
}

function SaveSubsFile(){
    fs.writeFile("sub.txt", subscribers, (err) => {
        if (err) console.log(err);
    });
}

function subs(){ //gets all the subscribers and puts them into a string suitable for message
    var StrToRet = "";
    for (i = 0; i < subscribers.length; i++){
        StrToRet = StrToRet.concat("<@",subscribers[i], "> ");
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
function setLunchtime(TimeIn, sc, channel){
    if(LunchTimeDeclared && sc == "s"){
        rtm.sendMessage("Lunchtime has already been set for today. Please use this command in the form \"lunchtime change <hh:mm>\".",channel);
        return;
    }
    var lth = parseInt(TimeIn.slice(0,2));
    var ltm = parseInt(TimeIn.slice(3)); //grab the time in xx:yy and convert to integers
    if(lth > 23 || ltm > 59){
        rtm.sendMessage("Please enter a valid time.",channel);
        return;
    }
    LunchTime.h = lth;
    LunchTime.m = ltm;
    LunchTime.MinInDay = 60*lth+ltm;
    LunchTimeDeclared = true;
    sc == "s" ? rtm.sendMessage("Lunchtime set to ".concat(TimeIn.slice(0,2),":",TimeIn.slice(3),"."),channel) : rtm.sendMessage("Lunchtime changed to ".concat(TimeIn.slice(0,2),":",TimeIn.slice(3),"."),channel); //I love ternary operators
}


//Chat handling functions

rtm.on('message', (event) => { //this is a callback that occurs on every message sent to every channel the bot is in
    if(event.hidden == true){
        return;
    } //don't do stuff on 'hidden' messages such as edits
    const BotID = "@".concat(rtm.activeUserId); //grab the bot ID in @chipsbot form
    if(event.type == 'message'){
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
                default:
                    rtm.sendMessage("I don't recognise the input \"".concat(MsgArgs[1], "\". Please have some chips and then try again, <@", event.user, ">."), event.channel);
            }
        }
	}
});


function CheckTime(){
    var now = new Date();
    MinInDay = (now.getHours()*60) + now.getMinutes();
    if((MinInDay == (LunchTime.MinInDay-15)) && LunchTimeDeclared){ //15 minutes before set lunchtime
        if (!AlertSent) rtm.sendMessage(subs().concat(" :rotating_light: :rotating_light: :rotating_light: LUNCH IN 15 MINUTES :rotating_light: :rotating_light: :rotating_light:"),"CMZ536P4M");
        AlertSent = true; //don't keep sending alerts
    }
    else if((MinInDay == LunchTime.MinInDay) && LunchTimeDeclared){
        if (!AlertSent) rtm.sendMessage(subs().concat(" :rotating_light: :fries: :rotating_light: :fries: :rotating_light: LUNCH TIME :rotating_light: :fries: :rotating_light: :fries: :rotating_light:"),"CMZ536P4M");
        AlertSent = true;
    }
    else{
        AlertSent = false;
    }
    if(now.getHours() == 10 && now.getMinutes() == 30 && !LunchTimeDeclared && (now.getDay != 6 || now.getDay != 0)){
        if (!Reminded) rtm.sendMessage("Nobody has set a lunchtime yet. Think of the chips!","CMZ536P4M");
        Reminded = true;
    }
    else{
        Reminded = false;
    }
    if(now.getHours() == 0 && LunchTimeDeclared){
        LunchTimeDeclared = false;
    }
    if(now.getHours() == 0 && bets.length != 0){
        betp.length = 0;
        bets.length = 0;
    }
    CheckMenuValidity(now);
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
        case "change":
            var RightForm = TimeRegExp.test(MsgArgs[3]); //check if the time is in the right form
            if(RightForm){
                setLunchtime(MsgArgs[3],(MsgArgs[2] == "set" ? "s" : "c"), event.channel); //if set, then s, if change then c
            }
            else{
                rtm.sendMessage("Please provide 24h time with leading zeroes in the format hh:mm.",event.channel);
            }
            break;
        case "subscribe":
            AddSubscriber(event.user, event.channel);
            break;
        case "unsubscribe":
            RemoveSubscriber(event.user, event.channel);
            break;
        case "check":
            if(LunchTimeDeclared){
                var now = new Date()
                var nowMins = 60*now.getHours()+now.getMinutes();
                var timeLeft = LunchTime.MinInDay-nowMins;}
            if(timeLeft > 0 || !LunchTimeDeclared){
                rtm.sendMessage((LunchTimeDeclared ? "Lunchtime today is set to ".concat(LunchTime.h, ":",  (LunchTime.m < 10 ? "0".concat(LunchTime.m) : LunchTime.m), ", ", timeLeft, " minutes from now.") : "Lunchtime has not been set for today."), event.channel);}
            else{
                rtm.sendMessage("Lunchtime today was set to ".concat(LunchTime.h, ":",  (LunchTime.m < 10 ? "0".concat(LunchTime.m) : LunchTime.m), ", ", Math.abs(timeLeft), " minutes ago."), event.channel);
            }
            break;
        case "menu":
            menuHandler(MsgArgs,event);
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


