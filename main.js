const Discord = require('discord.js');

const client = new Discord.Client({ intents: ["GUILDS", "GUILD_MESSAGES", "GUILD_VOICE_STATES"] })

//Messages starting with the prefix are seen as commands by the bot
const prefix = '-';

const fs = require('fs');

client.commands = new Discord.Collection();

//Find all commands as seperate .js files
const commandFiles = fs.readdirSync('./commands/').filter(file => file.endsWith('.js'));
for (const file of commandFiles)
{
    const command = require(`./commands/${file}`);

    client.commands.set(command.name, command);
}

client.once('ready', () => {
    console.log('Bot ready');
});

//Triggered when a message is sent to a channel the bot can see
client.on('message', message => {
    //Ignore message if it does not start with the prefix or was sent by a bot
    if(!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).split(/ +/);
    const command = args.shift().toLowerCase();

    try
    {
        if (command === 'play')
        {
            client.commands.get('play').execute(message, args)
        }
        else if (command == 'clear')
        {
            client.commands.get('clear').execute(message, args)
        }
        else if (command == 'skip')
        {
            client.commands.get('play').execute(message, args)
        }
        else if (command == 'stop')
        {
            client.commands.get('play').execute(message, args)
        }
        else
        {
            message.channel.send('That isnt a valid command');
        }
    }
    catch (err)
    {
        message.reply('Bot crashed');
        console.log(err);
    }
});

client.login('TOKEN REMOVED FOR GITHUB');
