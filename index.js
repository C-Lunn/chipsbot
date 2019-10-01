const { RTMClient, CLIENT_EVENTS, RTM_EVENTS } = require('@slack/rtm-api');
const token = process.env.CHIPSTOKEN;
const HttpsProxyAgent = require('https-proxy-agent');

const proxyUrl = process.env.http_proxy

const rtm = new RTMClient(token, { agent: new HttpsProxyAgent(proxyUrl)  });

(async () => {
          // Connect to Slack
    const { self, team  } = await rtm.start();
})();



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
