# chipsbot
*A bot dealing primarily with chips.*

Node.js slackbot.

## Commands
`lunchtime`:
*`lunchtime set <name> <hh:mm> [day1] [day2]...`: Create a new lunchtime. Day arguments are optional.
*`lunchtime subscribe <name>`: Subscribe to an existing lunchtime.
*`lunchtime unsubscrine <name>`: Unsubscribe from an existing lunchtime.
*`lunchtime check [name]`: Without name for a list of all active lunchtimes for this channel, with name for one specific lunchtime.
*`lunchtime remove <name>`: Remove a lunchtime.
*`lunchtime setperm/unsetperm <name>`: Make a lunchtime recurring or not.

`menu`:
*`menu`: Displays the menu for this week (if one exists).
*`menu <day>`: Displays the menu for a certain day. "today" is a valid input.
*`menu validcheck`: Displays the date until which the menu is valid.
*`menu validset <timedate>`: sets the validity of the menu (not recommended to use).

`help`: for help
`bet`: as-yet unimplemented betting functions

## Menu
TODO: Implement a menu generator.

Takes in a menu.json. Look at `blank_menu.json` for an idea of the format.

## Other fun features
Every time someone says "chips" it will reply.
Every time someone says "linux" without prefacing with GNU/ or GNU + it will interject.
