const { RTMClient, CLIENT_EVENTS, RTM_EVENTS } = require('@slack/rtm-api');
const token = process.env.CHIPSTOKEN; //CHIPSTOKEN is an environment variable set with the token in (so it's not published to github)
const HttpsProxyAgent = require('https-proxy-agent');

const proxyUrl = process.env.http_proxy //likewise for the proxy

const rtm = new RTMClient(token, { agent: new HttpsProxyAgent(proxyUrl)  }); //creates a new RTM bot

(async () => { //lmao I have no idea what this bit does I just copied it from the API
          // Connect to Slack
    const { self, team  } = await rtm.start();
})();

var LunchTimeDeclared = false;
var LunchTime = {
    'h': -1,
    'm': -1,
    'MinInDay': -1
}; //default values for lunchtime, don't know how to declare an uninitialised struct

rtm.on('message', (event) => { //this is a callback that occurs on every message sent to every channel the bot is in
//    console.log(event);
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
                default:
                    rtm.sendMessage("I don't recognise the input \"".concat(MsgArgs[1], "\". Please have some chips and then try again."), event.channel)
            }
        }
	}
});

rtm.on('reaction_added', (event) => {
    //console.log(event);
}); // for monitoring reactions

var AlertSent = false;
var TimeChecker = setInterval(CheckTime,10000); //check time every 10 seconds for time based stuff
function CheckTime(){
    var now = new Date();
    MinInDay = (now.getHours()*60) + now.getMinutes();
    delete(now); //dont create a new date variable every 10 seconds
    if((MinInDay == (LunchTime.MinInDay-15)) && LunchTimeDeclared){ //15 minutes before set lunchtime
        if (!AlertSent) rtm.sendMessage(":rotating_light: :rotating_light: :rotating_light: LUNCH IN 15 MINUTES :rotating_light: :rotating_light: :rotating_light:","CMZ536P4M");
        AlertSent = true; //don't keep sending alerts
    }
    else{
        AlertSent = false;
    }
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

const TimeRegExp = /\d\d:\d\d/; //format for time

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


    }
}

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
