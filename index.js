const { RTMClient, CLIENT_EVENTS, RTM_EVENTS } = require('@slack/rtm-api');
const token = process.env.CHIPSTOKEN;
const HttpsProxyAgent = require('https-proxy-agent');

const proxyUrl = process.env.http_proxy

const rtm = new RTMClient(token, { agent: new HttpsProxyAgent(proxyUrl)  });

(async () => {
          // Connect to Slack
    const { self, team  } = await rtm.start();
})();

var LunchTimeDeclared = false;
var LunchTime = {
    'h': 12,
    'm': 30
};

rtm.on('message', (event) => {
//    console.log(event);
    if(event.hidden == true){
        return;
    }
    const BotID = "@".concat(rtm.activeUserId);
    if(event.type == 'message'){
        if((event.text.toLowerCase().indexOf("chips") != -1) && (event.text.indexOf(BotID)) == -1){
            rtm.sendMessage("Did someone say chips?", event.channel);
        }
        MsgArgs = parseMessage(event.text);
        if(MsgArgs[0] == "<".concat(BotID.toLowerCase(),">")){
            switch(MsgArgs[1]){
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

function parseMessage(inputString){
    inputString = inputString.toLowerCase();
    var ArrayPos = 0;
    var retArray = [];
    var SpacePos = 0;
    while(inputString.indexOf(" ") != -1){
        SpacePos = inputString.indexOf(" ");
        retArray[ArrayPos++]=inputString.slice(0, SpacePos)
        inputString = inputString.slice(SpacePos+1, inputString.length);
    }
    retArray[ArrayPos++]=inputString
    return retArray;
}

function chipsHandler(MsgArgs, event){
    switch(MsgArgs[2]){
        case "price":
            rtm.sendMessage("Chips are currently 95p.", event.channel);
            break;
        default:
            return;
    }
}

const TimeRegExp = /\d\d:\d\d/;

function lunchtimeHandler(MsgArgs, event){
    switch(MsgArgs[2]){
        case "set":
        case "change":
            var RightForm = TimeRegExp.test(MsgArgs[3]);
            if(RightForm){
                setLunchtime(MsgArgs[3],(MsgArgs[2] == "set" ? "s" : "c"), event.channel);
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
    var ltm = parseInt(TimeIn.slice(3));
    if(lth > 23 || ltm > 59){
        rtm.sendMessage("Please enter a valid time.",channel);
        return;
    }
    LunchTime.h = lth;
    LunchTime.m = ltm;
    LunchTimeDeclared = true;
    sc == "s" ? rtm.sendMessage("Lunchtime set to ".concat(TimeIn.slice(0,2),":",TimeIn.slice(3),"."),channel) : rtm.sendMessage("Lunchtime changed to ".concat(TimeIn.slice(0,2),":",TimeIn.slice(3),"."),channel);
}
